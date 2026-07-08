import type {
  Announcement,
  AttendancePoint,
  CheckInRecord,
  Gym,
  GymClass,
  GymPortalClient,
  HourlyAttendancePoint,
  LeaderboardEntry,
  LiveOccupancy,
  MemberRecord,
  NewAnnouncementInput,
  NewMemberInput,
  PortalKpis,
  Program,
  RetentionPoint,
  RevenuePoint,
  StaffAccount,
  Challenge as PortalChallenge,
  WorkoutTemplate,
  AdminNotification
} from "@ratlevel/domain";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

/** Thrown on 401s so the app can distinguish "session expired" from other failures. */
export class ApiAuthError extends Error {
  constructor() {
    super("Session expired. Please sign in again.");
    this.name = "ApiAuthError";
  }
}

async function request<T>(path: string, token: string | null, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers
    }
  });

  if (response.status === 401) {
    throw new ApiAuthError();
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const message =
      (body && typeof body.error === "string" && body.error) ||
      (body?.error?.formErrors?.[0] as string | undefined) ||
      `Request failed (${response.status})`;
    throw new Error(message);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}

export interface StaffAuthResult {
  token: string;
  staff: StaffAccount;
}

/** Dev/testing bypass only — the server refuses this once deployed for real. */
export function staffLogin(email: string, password: string): Promise<StaffAuthResult> {
  return request<StaffAuthResult>("/auth/staff/login", null, {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
}

/** The real sign-in path: verifies a Google ID token against an existing staff account. */
export function staffGoogleLogin(idToken: string): Promise<StaffAuthResult> {
  return request<StaffAuthResult>("/auth/staff/google", null, {
    method: "POST",
    body: JSON.stringify({ idToken })
  });
}

/** Real backend implementation of GymPortalClient — swaps in for createMockPortalClient(). */
export function createHttpPortalClient(token: string): GymPortalClient {
  const call = <T>(path: string, init?: RequestInit) => request<T>(`/api/admin${path}`, token, init);

  return {
    auth: {
      // Re-authentication on an existing client; the portal's actual sign-in
      // screen uses the standalone staffLogin() above to capture the token.
      login: async (email, password) => (await staffLogin(email, password)).staff,
      listStaff: () => call<StaffAccount[]>("/staff")
    },
    gym: {
      get: () => call<Gym>("/gym")
    },
    members: {
      list: () => call<MemberRecord[]>("/members"),
      create: (input: NewMemberInput) => call<MemberRecord>("/members", { method: "POST", body: JSON.stringify(input) }),
      update: (member: MemberRecord) =>
        call<MemberRecord>(`/members/${member.id}`, {
          method: "PUT",
          body: JSON.stringify({ plan: member.plan, status: member.status, assignedProgramId: member.assignedProgramId ?? null })
        }),
      remove: (memberId) => call<void>(`/members/${memberId}`, { method: "DELETE" }),
      assignProgram: (memberId, programId) =>
        call<MemberRecord>(`/members/${memberId}/assign-program`, { method: "POST", body: JSON.stringify({ programId }) }),
      recordPayment: (memberId) => call<MemberRecord>(`/members/${memberId}/record-payment`, { method: "POST" }),
      sendPaymentReminder: (memberId) => call<MemberRecord>(`/members/${memberId}/send-reminder`, { method: "POST" })
    },
    attendance: {
      feed: (limit) => call<CheckInRecord[]>(`/attendance/feed${limit ? `?limit=${limit}` : ""}`),
      checkInManual: (memberId) =>
        call<CheckInRecord>("/attendance/checkin-manual", { method: "POST", body: JSON.stringify({ memberId }) }),
      checkInByQr: (qrPayload) =>
        call<CheckInRecord>("/attendance/checkin-qr", { method: "POST", body: JSON.stringify({ qrPayload }) }),
      daily: (days) => call<AttendancePoint[]>(`/attendance/daily?days=${days}`),
      hourlyToday: () => call<HourlyAttendancePoint[]>("/attendance/hourly"),
      live: () => call<LiveOccupancy>("/attendance/live")
    },
    classes: {
      list: () => call<GymClass[]>("/classes")
    },
    programs: {
      list: () => call<Program[]>("/programs"),
      listTemplates: () => call<WorkoutTemplate[]>("/programs/templates")
    },
    announcements: {
      list: () => call<Announcement[]>("/announcements"),
      create: (input: NewAnnouncementInput) => call<Announcement>("/announcements", { method: "POST", body: JSON.stringify(input) }),
      send: (announcementId) => call<Announcement>(`/announcements/${announcementId}/send`, { method: "POST" })
    },
    analytics: {
      kpis: () => call<PortalKpis>("/analytics/kpis"),
      retention: () => call<RetentionPoint[]>("/analytics/retention"),
      revenue: () => call<RevenuePoint[]>("/analytics/revenue")
    },
    challenges: {
      list: () => call<PortalChallenge[]>("/challenges"),
      leaderboard: () => call<LeaderboardEntry[]>("/challenges/leaderboard")
    },
    notifications: {
      list: () => call<AdminNotification[]>("/notifications"),
      markAllRead: () => call<AdminNotification[]>("/notifications/read", { method: "POST" })
    }
  };
}

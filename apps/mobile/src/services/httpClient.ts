import type {
  AchievementState,
  BodyMetricEntry,
  Challenge,
  CheckIn,
  CheckInVerification,
  Gym,
  GymOccupancy,
  LeaderboardEntry,
  MemberNotification,
  Player,
  PlayerClass,
  PlayerSettings,
  Quest,
  RatLevelClient,
  Season,
  WorkoutLog
} from "@ratlevel/domain";
import { API_BASE_URL } from "@/lib/apiConfig";

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

export interface MemberAuthResult {
  token: string;
  player: Player;
}

export type GoogleAuthResult =
  | { isNewUser: false; token: string; player: Player }
  | { isNewUser: true; pendingToken: string; profile: { email: string; name: string } };

/** Public gym list for the sign-up flow's gym picker, before any token exists. */
export function listPublicGyms(): Promise<Gym[]> {
  return request<Gym[]>("/gyms", null);
}

export function googleSignInStatus(): Promise<{ configured: boolean }> {
  return request<{ configured: boolean }>("/auth/google/status", null);
}

/** Verifies a Google ID token server-side. Existing members log straight in;
 *  brand-new members get a short-lived pending token to spend on completeGoogleOnboarding. */
export function googleAuth(idToken: string): Promise<GoogleAuthResult> {
  return request<GoogleAuthResult>("/auth/member/google", null, {
    method: "POST",
    body: JSON.stringify({ idToken })
  });
}

export function completeGoogleOnboarding(input: {
  pendingToken: string;
  name: string;
  playerClass: PlayerClass;
  gymId: string;
  whatsappNumber?: string;
}): Promise<MemberAuthResult> {
  return request<MemberAuthResult>("/auth/member/google/complete", null, {
    method: "POST",
    body: JSON.stringify(input)
  });
}

/** Dev/testing bypass for seeded demo accounts — the server refuses this outside development. */
export function devLogin(email: string): Promise<MemberAuthResult> {
  return request<MemberAuthResult>("/auth/member/dev-login", null, {
    method: "POST",
    body: JSON.stringify({ email })
  });
}

/** Real backend implementation of RatLevelClient — swaps in for createMockClient(). */
export function createHttpClient(token: string): RatLevelClient {
  const call = <T>(path: string, init?: RequestInit) => request<T>(path, token, init);

  return {
    players: {
      getPlayer: () => call<Player>("/api/players/me"),
      savePlayer: (player) =>
        call<Player>("/api/players/me", { method: "PUT", body: JSON.stringify({ whatsappNumber: player.whatsappNumber }) }),
      createCharacter: (input) =>
        call<Player>("/api/players/me/character", { method: "PUT", body: JSON.stringify(input) }),
      getSettings: () => call<PlayerSettings>("/api/players/me/settings"),
      saveSettings: (settings) =>
        call<PlayerSettings>("/api/players/me/settings", { method: "PUT", body: JSON.stringify(settings) })
    },
    gyms: {
      listGyms: () => call<Gym[]>("/api/gyms"),
      getGym: (gymId) => call<Gym>(`/api/gyms/${gymId}`),
      getOccupancy: (gymId) => call<GymOccupancy>(`/api/gyms/${gymId}/occupancy`)
    },
    checkIns: {
      listCheckIns: () => call<CheckIn[]>("/api/checkins"),
      checkIn: (gymId, method, verification?: CheckInVerification) =>
        call<CheckIn>("/api/checkins", { method: "POST", body: JSON.stringify({ gymId, method, ...verification }) })
    },
    workouts: {
      listExercises: () => call("/api/workouts/exercises"),
      listTemplates: () => call("/api/workouts/templates"),
      listHistory: () => call<WorkoutLog[]>("/api/workouts/history"),
      saveWorkout: (log) =>
        call<WorkoutLog>("/api/workouts", {
          method: "POST",
          body: JSON.stringify({ name: log.name, durationMin: log.durationMin, entries: log.entries })
        })
    },
    quests: {
      listQuests: () => call<Quest[]>("/api/quests"),
      saveQuests: (quests) => call<Quest[]>("/api/quests", { method: "PUT", body: JSON.stringify(quests) })
    },
    achievements: {
      listAchievements: () => call<AchievementState[]>("/api/achievements"),
      saveAchievements: (achievements) =>
        call<AchievementState[]>("/api/achievements", { method: "PUT", body: JSON.stringify(achievements) })
    },
    challenges: {
      listChallenges: () => call<Challenge[]>("/api/challenges"),
      saveChallenges: (challenges) =>
        call<Challenge[]>("/api/challenges", { method: "PUT", body: JSON.stringify(challenges) })
    },
    seasons: {
      getCurrentSeason: () => call<Season>("/api/season"),
      getLeaderboard: () => call<LeaderboardEntry[]>("/api/leaderboard")
    },
    body: {
      listBodyMetrics: () => call<BodyMetricEntry[]>("/api/body"),
      addBodyMetric: (entry) => call<BodyMetricEntry>("/api/body", { method: "POST", body: JSON.stringify(entry) })
    },
    notifications: {
      list: () => call<MemberNotification[]>("/api/notifications"),
      markAllRead: () => call<MemberNotification[]>("/api/notifications/read", { method: "POST" })
    }
  };
}

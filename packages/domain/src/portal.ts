import type { AdminNotificationRepository } from "./billing";
import type { Gym, MembershipPlan, MembershipStatus, PlayerClass } from "./player";
import type { Challenge, LeaderboardEntry } from "./gamification";
import type { WorkoutTemplate } from "./workout";

/**
 * Gym-portal (staff/admin) domain. Lives beside the member-facing models so
 * both products share one vocabulary, but nothing here is ever imported by
 * the mobile app's UI.
 */

export type StaffRole = "owner" | "manager" | "frontdesk" | "coach";

export interface StaffAccount {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
  active: boolean;
  lastActiveAt: string;
}

/** Admin view of a gym member — what the front desk sees, not the player fantasy. */
export interface MemberRecord {
  id: string;
  name: string;
  email: string;
  /** Collected for member communication and promotions (opt-in). */
  whatsapp?: string;
  playerClass: PlayerClass;
  level: number;
  plan: MembershipPlan;
  status: MembershipStatus;
  joinedAt: string;
  renewsAt: string;
  monthlyFee: number;
  feeDueAt: string;
  /** Set when staff sends a payment nudge, cleared on payment. */
  reminderSentAt?: string;
  lastCheckInAt?: string;
  totalCheckIns: number;
  streakDays: number;
  seasonXp: number;
  assignedProgramId?: string;
}

export interface NewMemberInput {
  name: string;
  email: string;
  whatsapp?: string;
  plan: MembershipPlan;
  playerClass: PlayerClass;
}

export interface GymClass {
  id: string;
  name: string;
  coachName: string;
  /** 0 = Monday … 6 = Sunday */
  weekday: number;
  startTime: string;
  durationMin: number;
  capacity: number;
  booked: number;
  location: string;
}

export interface Program {
  id: string;
  name: string;
  focus: string;
  weeks: number;
  templateIds: string[];
}

export type AnnouncementStatus = "draft" | "scheduled" | "sent";
export type AnnouncementAudience = "all" | "active" | "at-risk";

export interface Announcement {
  id: string;
  title: string;
  body: string;
  audience: AnnouncementAudience;
  status: AnnouncementStatus;
  scheduledFor?: string;
  sentAt?: string;
}

export interface NewAnnouncementInput {
  title: string;
  body: string;
  audience: AnnouncementAudience;
  scheduledFor?: string;
}

export interface CheckInRecord {
  id: string;
  memberId: string;
  memberName: string;
  at: string;
  method: "qr" | "manual" | "gps";
}

export interface AttendancePoint {
  date: string;
  checkIns: number;
}

export interface HourlyAttendancePoint {
  hour: number;
  checkIns: number;
}

export interface RetentionPoint {
  month: string;
  retainedPct: number;
}

export interface RevenuePoint {
  month: string;
  amount: number;
}

export interface PortalKpis {
  activeMembers: number;
  expiredMembers: number;
  frozenMembers: number;
  checkInsToday: number;
  atRiskMembers: number;
  newThisMonth: number;
  /** Members whose fee is past due. */
  overdueFees: number;
  /** Placeholder until billing exists. */
  monthlyRevenue: number;
}

export interface StaffAuthRepository {
  login(email: string, password: string): Promise<StaffAccount>;
  listStaff(): Promise<StaffAccount[]>;
}

/** The gym this portal instance manages (multi-gym orgs pick one later). */
export interface PortalGymRepository {
  get(): Promise<Gym>;
}

export interface MemberAdminRepository {
  list(): Promise<MemberRecord[]>;
  create(input: NewMemberInput): Promise<MemberRecord>;
  update(member: MemberRecord): Promise<MemberRecord>;
  remove(memberId: string): Promise<void>;
  assignProgram(memberId: string, programId: string | undefined): Promise<MemberRecord>;
  /** Marks the current fee paid and rolls feeDueAt forward one cycle. */
  recordPayment(memberId: string): Promise<MemberRecord>;
  /** Sends a payment-due nudge to the member (push/WhatsApp later; mocked now). */
  sendPaymentReminder(memberId: string): Promise<MemberRecord>;
}

export interface LiveVisitor {
  memberId: string;
  memberName: string;
  since: string;
}

/**
 * Who is on the floor right now. Without exit gates this is estimated from
 * check-ins plus a typical session length; exit scanners make it exact later.
 */
export interface LiveOccupancy {
  current: number;
  comfortCapacity: number;
  visitors: LiveVisitor[];
  updatedAt: string;
}

export interface AttendanceRepository {
  feed(limit?: number): Promise<CheckInRecord[]>;
  checkInManual(memberId: string): Promise<CheckInRecord>;
  /** Staff scans a member's personal QR pass (their phone screen) to check them in. */
  checkInByQr(qrPayload: string): Promise<CheckInRecord>;
  daily(days: number): Promise<AttendancePoint[]>;
  hourlyToday(): Promise<HourlyAttendancePoint[]>;
  live(): Promise<LiveOccupancy>;
}

export interface ClassRepository {
  list(): Promise<GymClass[]>;
}

export interface ProgramRepository {
  list(): Promise<Program[]>;
  listTemplates(): Promise<WorkoutTemplate[]>;
}

export interface AnnouncementRepository {
  list(): Promise<Announcement[]>;
  create(input: NewAnnouncementInput): Promise<Announcement>;
  send(announcementId: string): Promise<Announcement>;
}

export interface PortalAnalyticsRepository {
  kpis(): Promise<PortalKpis>;
  retention(): Promise<RetentionPoint[]>;
  revenue(): Promise<RevenuePoint[]>;
}

export interface PortalChallengeRepository {
  list(): Promise<Challenge[]>;
  leaderboard(): Promise<LeaderboardEntry[]>;
}

export interface GymPortalClient {
  auth: StaffAuthRepository;
  gym: PortalGymRepository;
  members: MemberAdminRepository;
  attendance: AttendanceRepository;
  classes: ClassRepository;
  programs: ProgramRepository;
  announcements: AnnouncementRepository;
  analytics: PortalAnalyticsRepository;
  challenges: PortalChallengeRepository;
  notifications: AdminNotificationRepository;
}

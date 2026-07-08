export type PlayerClass = "Vanguard" | "Strider" | "Sentinel" | "Medic";

export type StatKey =
  | "strength"
  | "endurance"
  | "power"
  | "speed"
  | "discipline"
  | "consistency"
  | "recovery";

export type PlayerStats = Record<StatKey, number>;

export type MembershipPlan = "Core" | "Plus" | "Max";
export type MembershipStatus = "active" | "frozen" | "expired";

export interface Membership {
  plan: MembershipPlan;
  status: MembershipStatus;
  cardNumber: string;
  memberSince: string;
  gymId: string;
  monthlyFee: number;
  feeDueAt: string;
}

export interface Player {
  id: string;
  name: string;
  title: string;
  playerClass: PlayerClass;
  gymId: string;
  totalXp: number;
  seasonXp: number;
  streakDays: number;
  longestStreak: number;
  personalRecords: number;
  membership: Membership;
  stats: PlayerStats;
  joinedAt: string;
  /** Collected for member communication and promotions (opt-in). */
  whatsappNumber?: string;
}

export interface Gym {
  id: string;
  name: string;
  city: string;
  distanceKm: number;
  memberCount: number;
  openNow: boolean;
  latitude: number;
  longitude: number;
  /** Members inside this radius can be auto-checked-in via GPS. */
  geofenceRadiusM: number;
  /** Payload encoded in the QR poster at the gym entrance. */
  entryQrCode: string;
  /** Head count at which the floor starts feeling crowded. */
  comfortCapacity: number;
}

export type OccupancyLevel = "quiet" | "steady" | "busy" | "packed";

/** Member-facing "how busy is my gym right now". */
export interface GymOccupancy {
  current: number;
  comfortCapacity: number;
  level: OccupancyLevel;
  updatedAt: string;
}

export function occupancyLevel(current: number, comfortCapacity: number): OccupancyLevel {
  const ratio = comfortCapacity > 0 ? current / comfortCapacity : 0;
  if (ratio < 0.25) return "quiet";
  if (ratio < 0.55) return "steady";
  if (ratio < 0.85) return "busy";
  return "packed";
}

export type CheckInMethod = "qr" | "manual" | "gps";

const MEMBER_QR_PREFIX = "ratlevel:member:";

/** Payload encoded in a member's personal QR pass — scanned by staff to check them in. */
export function memberQrPayload(playerId: string): string {
  return `${MEMBER_QR_PREFIX}${playerId}`;
}

/** Extracts the player id from a scanned member QR payload, or null if it isn't one. */
export function parseMemberQrPayload(payload: string): string | null {
  return payload.startsWith(MEMBER_QR_PREFIX) ? payload.slice(MEMBER_QR_PREFIX.length) : null;
}

export interface CheckIn {
  id: string;
  gymId: string;
  at: string;
  method: CheckInMethod;
}

export interface BodyMetricEntry {
  id: string;
  recordedAt: string;
  weightKg: number;
  chestCm?: number;
  waistCm?: number;
  armCm?: number;
}

export interface PlayerSettings {
  units: "metric" | "imperial";
  workoutReminders: boolean;
  questAlerts: boolean;
  leaderboardVisible: boolean;
}

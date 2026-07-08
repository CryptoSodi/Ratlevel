import type { MemberNotificationRepository } from "./billing";
import type {
  BodyMetricEntry,
  CheckIn,
  Gym,
  GymOccupancy,
  Player,
  PlayerClass,
  PlayerSettings
} from "./player";
import type { Exercise, WorkoutLog, WorkoutTemplate } from "./workout";
import type {
  AchievementState,
  Challenge,
  LeaderboardEntry,
  Quest,
  Season
} from "./gamification";

/**
 * Backend-ready contracts. The mobile app and the gym portal both talk to
 * these interfaces; today they are implemented by @ratlevel/mock-data, later
 * by a real API client, without touching feature code.
 */
export interface PlayerRepository {
  getPlayer(): Promise<Player>;
  savePlayer(player: Player): Promise<Player>;
  createCharacter(input: {
    name: string;
    playerClass: PlayerClass;
    gymId: string;
    whatsappNumber?: string;
  }): Promise<Player>;
  getSettings(): Promise<PlayerSettings>;
  saveSettings(settings: PlayerSettings): Promise<PlayerSettings>;
}

export interface GymRepository {
  listGyms(): Promise<Gym[]>;
  getGym(gymId: string): Promise<Gym | undefined>;
  /** Live busyness for the member app's "should I go now" glance. */
  getOccupancy(gymId: string): Promise<GymOccupancy>;
}

/** What the server needs to independently verify a check-in, rather than trusting the client's claimed method. */
export interface CheckInVerification {
  /** Raw QR payload as scanned, checked against the gym's entryQrCode. */
  qrPayload?: string;
  /** Device coordinates, checked against the gym's geofence. */
  latitude?: number;
  longitude?: number;
}

export interface CheckInRepository {
  listCheckIns(): Promise<CheckIn[]>;
  checkIn(gymId: string, method: CheckIn["method"], verification?: CheckInVerification): Promise<CheckIn>;
}

export interface WorkoutRepository {
  listExercises(): Promise<Exercise[]>;
  listTemplates(): Promise<WorkoutTemplate[]>;
  listHistory(): Promise<WorkoutLog[]>;
  saveWorkout(log: WorkoutLog): Promise<WorkoutLog>;
}

export interface QuestRepository {
  listQuests(): Promise<Quest[]>;
  saveQuests(quests: Quest[]): Promise<Quest[]>;
}

export interface AchievementRepository {
  listAchievements(): Promise<AchievementState[]>;
  saveAchievements(achievements: AchievementState[]): Promise<AchievementState[]>;
}

export interface ChallengeRepository {
  listChallenges(): Promise<Challenge[]>;
  saveChallenges(challenges: Challenge[]): Promise<Challenge[]>;
}

export interface SeasonRepository {
  getCurrentSeason(): Promise<Season>;
  getLeaderboard(): Promise<LeaderboardEntry[]>;
}

export interface BodyMetricsRepository {
  listBodyMetrics(): Promise<BodyMetricEntry[]>;
  addBodyMetric(entry: Omit<BodyMetricEntry, "id">): Promise<BodyMetricEntry>;
}

export interface RatLevelClient {
  players: PlayerRepository;
  gyms: GymRepository;
  checkIns: CheckInRepository;
  workouts: WorkoutRepository;
  quests: QuestRepository;
  achievements: AchievementRepository;
  challenges: ChallengeRepository;
  seasons: SeasonRepository;
  body: BodyMetricsRepository;
  notifications: MemberNotificationRepository;
}

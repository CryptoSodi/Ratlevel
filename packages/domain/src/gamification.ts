import type { PlayerStats } from "./player";

export type QuestScope = "daily" | "weekly";

export type QuestMetric =
  | "workouts_logged"
  | "volume_kg"
  | "sets_completed"
  | "check_ins"
  | "prs_set"
  | "streak_days";

export interface Quest {
  id: string;
  scope: QuestScope;
  title: string;
  description: string;
  metric: QuestMetric;
  target: number;
  progress: number;
  xp: number;
  completed: boolean;
  claimed: boolean;
}

export type AchievementTier = "bronze" | "silver" | "gold";

export type AchievementMetric =
  | "total_workouts"
  | "total_volume_kg"
  | "total_prs"
  | "longest_streak"
  | "level_reached"
  | "check_ins";

export interface AchievementDefinition {
  id: string;
  title: string;
  description: string;
  icon: string;
  tier: AchievementTier;
  metric: AchievementMetric;
  threshold: number;
  badgeXp: number;
}

export interface AchievementState extends AchievementDefinition {
  unlockedAt?: string;
}

export type ChallengeMetric = "volume_kg" | "workouts_logged" | "check_ins";

export interface Challenge {
  id: string;
  name: string;
  description: string;
  metric: ChallengeMetric;
  goal: number;
  progress: number;
  endsAt: string;
  entrants: number;
  rewardXp: number;
  rewardLabel: string;
  joined: boolean;
}

export interface Season {
  id: string;
  number: number;
  name: string;
  startsAt: string;
  endsAt: string;
}

export type RankTier = "Bronze" | "Silver" | "Gold" | "Platinum" | "Diamond" | "Mythic";

export interface RankStanding {
  tier: RankTier;
  division: 1 | 2 | 3;
  label: string;
  minSeasonXp: number;
  nextLabel?: string;
  xpIntoRank: number;
  xpForNextRank?: number;
  progress: number;
}

export interface LeaderboardEntry {
  playerId: string;
  name: string;
  title: string;
  level: number;
  xp: number;
  isCurrentUser: boolean;
}

export interface XpBreakdownLine {
  label: string;
  xp: number;
}

export interface RewardSummary {
  workoutName: string;
  xpLines: XpBreakdownLine[];
  totalXp: number;
  statGains: Partial<PlayerStats>;
  previousLevel: number;
  newLevel: number;
  leveledUp: boolean;
  questsCompleted: Quest[];
  achievementsUnlocked: AchievementState[];
  streakDays: number;
  prCount: number;
}

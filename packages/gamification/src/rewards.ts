import type {
  AchievementState,
  Challenge,
  Player,
  Quest,
  RewardSummary,
  WorkoutExerciseEntry
} from "@ratlevel/domain";
import { evaluateAchievements, type AchievementContext } from "./achievements";
import { applyEventToChallenges } from "./challenges";
import { workoutEvent } from "./events";
import { levelFromTotalXp } from "./levels";
import { applyEventToQuests } from "./quests";
import { applyStatGains, statGainsForWorkout } from "./stats";
import { calculateWorkoutXp, completedSetCount, totalXp } from "./xp";

export interface SettleWorkoutInput {
  player: Player;
  quests: Quest[];
  achievements: AchievementState[];
  challenges: Challenge[];
  entries: WorkoutExerciseEntry[];
  workoutName: string;
  durationMin: number;
  prCount: number;
  checkedIn: boolean;
  /** Streak *including* this workout — callers decide whether today extends it. */
  streakDays: number;
  /** Lifetime totals *before* this workout, used for achievement rules. */
  lifetime: Omit<AchievementContext, "level" | "longestStreak">;
  now: string;
}

export interface SettleWorkoutResult {
  player: Player;
  quests: Quest[];
  achievements: AchievementState[];
  challenges: Challenge[];
  summary: RewardSummary;
  volumeKg: number;
  setsCompleted: number;
}

/**
 * The single entry point for "a workout happened". Everything downstream of
 * a workout — XP, levels, stats, streak, quests, achievements, challenges —
 * is settled here so the mobile app, the gym portal, and a future backend
 * all agree on the outcome.
 */
export function settleWorkout(input: SettleWorkoutInput): SettleWorkoutResult {
  const { player, streakDays } = input;

  const xpLines = calculateWorkoutXp({
    entries: input.entries,
    durationMin: input.durationMin,
    prCount: input.prCount,
    streakDays
  });

  const event = workoutEvent(input.entries, {
    prCount: input.prCount,
    streakDays,
    checkedIn: input.checkedIn
  });

  const questResult = applyEventToQuests(input.quests, event);
  if (questResult.xpFromQuests > 0) {
    xpLines.push({
      label:
        questResult.completed.length === 1
          ? `Quest: ${questResult.completed[0].title}`
          : `${questResult.completed.length} quests completed`,
      xp: questResult.xpFromQuests
    });
  }

  const previous = levelFromTotalXp(player.totalXp);
  const earnedBeforeAchievements = totalXp(xpLines);

  const achievementResult = evaluateAchievements(
    input.achievements,
    {
      ...input.lifetime,
      totalWorkouts: input.lifetime.totalWorkouts + 1,
      totalVolumeKg: input.lifetime.totalVolumeKg + event.volumeKg,
      totalPrs: input.lifetime.totalPrs + input.prCount,
      totalCheckIns: input.lifetime.totalCheckIns + event.checkIns,
      longestStreak: Math.max(player.longestStreak, streakDays),
      level: levelFromTotalXp(player.totalXp + earnedBeforeAchievements).level
    },
    input.now
  );
  if (achievementResult.xpFromAchievements > 0) {
    xpLines.push({
      label:
        achievementResult.unlocked.length === 1
          ? `Badge: ${achievementResult.unlocked[0].title}`
          : `${achievementResult.unlocked.length} badges unlocked`,
      xp: achievementResult.xpFromAchievements
    });
  }

  const earned = totalXp(xpLines);
  const next = levelFromTotalXp(player.totalXp + earned);
  const statGains = statGainsForWorkout(input.entries, {
    prCount: input.prCount,
    streakDays
  });

  const updatedPlayer: Player = {
    ...player,
    totalXp: player.totalXp + earned,
    seasonXp: player.seasonXp + earned,
    streakDays,
    longestStreak: Math.max(player.longestStreak, streakDays),
    personalRecords: player.personalRecords + input.prCount,
    stats: applyStatGains(player.stats, statGains)
  };

  return {
    player: updatedPlayer,
    quests: questResult.quests,
    achievements: achievementResult.achievements,
    challenges: applyEventToChallenges(input.challenges, event),
    volumeKg: event.volumeKg,
    setsCompleted: completedSetCount(input.entries),
    summary: {
      workoutName: input.workoutName,
      xpLines,
      totalXp: earned,
      statGains,
      previousLevel: previous.level,
      newLevel: next.level,
      leveledUp: next.level > previous.level,
      questsCompleted: questResult.completed,
      achievementsUnlocked: achievementResult.unlocked,
      streakDays,
      prCount: input.prCount
    }
  };
}

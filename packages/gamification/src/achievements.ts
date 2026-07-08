import type { AchievementMetric, AchievementState } from "@ratlevel/domain";

/** Lifetime totals achievements are judged against. */
export interface AchievementContext {
  totalWorkouts: number;
  totalVolumeKg: number;
  totalPrs: number;
  longestStreak: number;
  level: number;
  totalCheckIns: number;
}

const METRIC_FROM_CONTEXT: Record<AchievementMetric, (context: AchievementContext) => number> = {
  total_workouts: (context) => context.totalWorkouts,
  total_volume_kg: (context) => context.totalVolumeKg,
  total_prs: (context) => context.totalPrs,
  longest_streak: (context) => context.longestStreak,
  level_reached: (context) => context.level,
  check_ins: (context) => context.totalCheckIns
};

export interface AchievementEvaluation {
  achievements: AchievementState[];
  unlocked: AchievementState[];
  xpFromAchievements: number;
}

export function evaluateAchievements(
  achievements: AchievementState[],
  context: AchievementContext,
  now: string
): AchievementEvaluation {
  const unlocked: AchievementState[] = [];

  const next = achievements.map((achievement) => {
    if (achievement.unlockedAt) return achievement;
    const value = METRIC_FROM_CONTEXT[achievement.metric](context);
    if (value < achievement.threshold) return achievement;
    const done: AchievementState = { ...achievement, unlockedAt: now };
    unlocked.push(done);
    return done;
  });

  return {
    achievements: next,
    unlocked,
    xpFromAchievements: unlocked.reduce((total, achievement) => total + achievement.badgeXp, 0)
  };
}

export function achievementProgress(
  achievement: AchievementState,
  context: AchievementContext
): number {
  if (achievement.unlockedAt) return 1;
  const value = METRIC_FROM_CONTEXT[achievement.metric](context);
  return Math.min(value / achievement.threshold, 1);
}

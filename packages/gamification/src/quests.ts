import type { Quest, QuestMetric } from "@ratlevel/domain";
import type { ActivityEvent } from "./events";

const METRIC_FROM_EVENT: Record<QuestMetric, (event: ActivityEvent) => number> = {
  workouts_logged: (event) => event.workoutsLogged,
  volume_kg: (event) => event.volumeKg,
  sets_completed: (event) => event.setsCompleted,
  check_ins: (event) => event.checkIns,
  prs_set: (event) => event.prsSet,
  // Streak quests track the absolute streak, not an increment.
  streak_days: (event) => event.streakDays
};

export interface QuestUpdateResult {
  quests: Quest[];
  completed: Quest[];
  xpFromQuests: number;
}

/**
 * Applies an activity event to a quest list. Streak quests are set to the
 * current streak; all other metrics accumulate. Completed quests auto-claim
 * their XP into the reward summary.
 */
export function applyEventToQuests(quests: Quest[], event: ActivityEvent): QuestUpdateResult {
  const completed: Quest[] = [];

  const next = quests.map((quest) => {
    if (quest.completed) return quest;

    const delta = METRIC_FROM_EVENT[quest.metric](event);
    const progress =
      quest.metric === "streak_days"
        ? Math.max(quest.progress, delta)
        : quest.progress + delta;

    if (delta === 0 && quest.metric !== "streak_days") return quest;

    const updated: Quest = {
      ...quest,
      progress: Math.min(progress, quest.target),
      completed: progress >= quest.target,
      claimed: progress >= quest.target
    };
    if (updated.completed && !quest.completed) {
      completed.push(updated);
    }
    return updated;
  });

  return {
    quests: next,
    completed,
    xpFromQuests: completed.reduce((total, quest) => total + quest.xp, 0)
  };
}

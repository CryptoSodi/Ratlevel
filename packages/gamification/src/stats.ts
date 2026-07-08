import type { MuscleGroup, PlayerStats, StatKey, WorkoutExerciseEntry } from "@ratlevel/domain";

export const STAT_KEYS: StatKey[] = [
  "strength",
  "endurance",
  "power",
  "speed",
  "discipline",
  "consistency",
  "recovery"
];

export const EMPTY_STAT_GAINS: Partial<PlayerStats> = {};

const MUSCLE_TO_STATS: Record<MuscleGroup, StatKey[]> = {
  chest: ["strength", "power"],
  back: ["strength", "power"],
  shoulders: ["strength", "power"],
  arms: ["strength"],
  legs: ["strength", "speed"],
  core: ["endurance", "recovery"],
  cardio: ["endurance", "speed"]
};

/**
 * Stat gains scale with completed sets per muscle group, plus small
 * discipline/consistency gains for showing up at all. Values are points on
 * a 0-100 scale, so gains are intentionally small per session.
 */
export function statGainsForWorkout(
  entries: WorkoutExerciseEntry[],
  options: { prCount: number; streakDays: number }
): Partial<PlayerStats> {
  const gains: Partial<PlayerStats> = {};
  const add = (key: StatKey, amount: number) => {
    gains[key] = (gains[key] ?? 0) + amount;
  };

  let anyCompleted = false;
  for (const entry of entries) {
    const completedSets = entry.sets.filter((set) => set.completed).length;
    if (completedSets === 0) continue;
    anyCompleted = true;
    const perSet = entry.isCompound ? 0.5 : 0.3;
    for (const stat of MUSCLE_TO_STATS[entry.muscleGroup]) {
      add(stat, completedSets * perSet);
    }
  }

  if (!anyCompleted) {
    return {};
  }

  add("discipline", 1);
  add("consistency", options.streakDays >= 3 ? 1.5 : 1);
  if (options.prCount > 0) {
    add("power", options.prCount * 1.5);
  }

  for (const key of Object.keys(gains) as StatKey[]) {
    gains[key] = Math.round((gains[key] ?? 0) * 10) / 10;
  }
  return gains;
}

export function applyStatGains(stats: PlayerStats, gains: Partial<PlayerStats>): PlayerStats {
  const next = { ...stats };
  for (const key of STAT_KEYS) {
    const gain = gains[key];
    if (gain) {
      next[key] = Math.min(Math.round((next[key] + gain) * 10) / 10, 100);
    }
  }
  return next;
}

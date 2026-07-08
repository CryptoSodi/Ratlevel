import type { WorkoutExerciseEntry, XpBreakdownLine } from "@ratlevel/domain";
import { streakMultiplier } from "./streaks";

export interface WorkoutXpInput {
  entries: WorkoutExerciseEntry[];
  durationMin: number;
  prCount: number;
  streakDays: number;
}

export function workoutVolumeKg(entries: WorkoutExerciseEntry[]): number {
  return entries.reduce(
    (total, entry) =>
      total +
      entry.sets.reduce(
        (setTotal, set) => (set.completed ? setTotal + set.reps * set.weightKg : setTotal),
        0
      ),
    0
  );
}

export function completedSetCount(entries: WorkoutExerciseEntry[]): number {
  return entries.reduce(
    (total, entry) => total + entry.sets.filter((set) => set.completed).length,
    0
  );
}

const BASE_WORKOUT_XP = 150;
const XP_PER_SET = 18;
const COMPOUND_SET_BONUS = 8;
const XP_PER_1000_KG_VOLUME = 40;
const VOLUME_XP_CAP = 400;
const XP_PER_PR = 120;

/**
 * Deterministic XP for a finished workout. Returns an itemized breakdown so
 * the reward screen can show players exactly why they earned what they earned.
 */
export function calculateWorkoutXp(input: WorkoutXpInput): XpBreakdownLine[] {
  const lines: XpBreakdownLine[] = [];
  const sets = completedSetCount(input.entries);
  if (sets === 0) {
    return lines;
  }

  lines.push({ label: "Workout complete", xp: BASE_WORKOUT_XP });

  const compoundSets = input.entries
    .filter((entry) => entry.isCompound)
    .reduce((total, entry) => total + entry.sets.filter((set) => set.completed).length, 0);
  lines.push({
    label: `${sets} sets completed`,
    xp: sets * XP_PER_SET + compoundSets * COMPOUND_SET_BONUS
  });

  const volume = workoutVolumeKg(input.entries);
  const volumeXp = Math.min(Math.round((volume / 1000) * XP_PER_1000_KG_VOLUME), VOLUME_XP_CAP);
  if (volumeXp > 0) {
    lines.push({ label: `${Math.round(volume).toLocaleString()} kg total volume`, xp: volumeXp });
  }

  if (input.prCount > 0) {
    lines.push({
      label: input.prCount === 1 ? "New personal record" : `${input.prCount} personal records`,
      xp: input.prCount * XP_PER_PR
    });
  }

  const multiplier = streakMultiplier(input.streakDays);
  if (multiplier > 1) {
    const subtotal = lines.reduce((total, line) => total + line.xp, 0);
    lines.push({
      label: `${input.streakDays}-day streak x${multiplier.toFixed(2)}`,
      xp: Math.round(subtotal * (multiplier - 1))
    });
  }

  return lines;
}

export function totalXp(lines: XpBreakdownLine[]): number {
  return lines.reduce((total, line) => total + line.xp, 0);
}

import type { WorkoutExerciseEntry } from "@ratlevel/domain";
import { completedSetCount, workoutVolumeKg } from "./xp";

/** Normalized activity event that quests, challenges and achievements consume. */
export interface ActivityEvent {
  workoutsLogged: number;
  volumeKg: number;
  setsCompleted: number;
  checkIns: number;
  prsSet: number;
  streakDays: number;
}

export function workoutEvent(
  entries: WorkoutExerciseEntry[],
  options: { prCount: number; streakDays: number; checkedIn: boolean }
): ActivityEvent {
  return {
    workoutsLogged: 1,
    volumeKg: workoutVolumeKg(entries),
    setsCompleted: completedSetCount(entries),
    checkIns: options.checkedIn ? 1 : 0,
    prsSet: options.prCount,
    streakDays: options.streakDays
  };
}

export function checkInEvent(streakDays: number): ActivityEvent {
  return {
    workoutsLogged: 0,
    volumeKg: 0,
    setsCompleted: 0,
    checkIns: 1,
    prsSet: 0,
    streakDays
  };
}

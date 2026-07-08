export type MuscleGroup =
  | "chest"
  | "back"
  | "shoulders"
  | "arms"
  | "legs"
  | "core"
  | "cardio";

export interface Exercise {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  equipment: "barbell" | "dumbbell" | "machine" | "cable" | "bodyweight" | "cardio";
  isCompound: boolean;
}

export interface WorkoutSet {
  reps: number;
  weightKg: number;
  completed: boolean;
}

export interface WorkoutExerciseEntry {
  exerciseId: string;
  exerciseName: string;
  muscleGroup: MuscleGroup;
  isCompound: boolean;
  sets: WorkoutSet[];
}

export interface WorkoutTemplate {
  id: string;
  name: string;
  focus: string;
  exerciseIds: string[];
  estimatedMinutes: number;
}

export interface WorkoutLog {
  id: string;
  name: string;
  performedAt: string;
  durationMin: number;
  entries: WorkoutExerciseEntry[];
  totalVolumeKg: number;
  totalSets: number;
  xpAwarded: number;
  prCount: number;
}

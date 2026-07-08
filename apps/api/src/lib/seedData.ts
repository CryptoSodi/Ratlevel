/**
 * Static game content — quest/achievement templates, exercises, workout
 * templates. Used by the DB seed script AND by newly-registered players (who
 * need their own starter quests/achievement rows), so it lives in app code
 * rather than only inside prisma/seed.ts.
 */

export const EXERCISES = [
  { id: "ex-bench", name: "Barbell Bench Press", muscleGroup: "chest", equipment: "barbell", isCompound: true },
  { id: "ex-incline-db", name: "Incline Dumbbell Press", muscleGroup: "chest", equipment: "dumbbell", isCompound: true },
  { id: "ex-chest-fly", name: "Cable Chest Fly", muscleGroup: "chest", equipment: "cable", isCompound: false },
  { id: "ex-pushup", name: "Push-Up", muscleGroup: "chest", equipment: "bodyweight", isCompound: true },
  { id: "ex-dips", name: "Dips", muscleGroup: "chest", equipment: "bodyweight", isCompound: true },
  { id: "ex-deadlift", name: "Deadlift", muscleGroup: "back", equipment: "barbell", isCompound: true },
  { id: "ex-pullup", name: "Pull-Up", muscleGroup: "back", equipment: "bodyweight", isCompound: true },
  { id: "ex-bb-row", name: "Barbell Row", muscleGroup: "back", equipment: "barbell", isCompound: true },
  { id: "ex-lat-pulldown", name: "Lat Pulldown", muscleGroup: "back", equipment: "machine", isCompound: true },
  { id: "ex-cable-row", name: "Seated Cable Row", muscleGroup: "back", equipment: "cable", isCompound: true },
  { id: "ex-ohp", name: "Overhead Press", muscleGroup: "shoulders", equipment: "barbell", isCompound: true },
  { id: "ex-db-shoulder", name: "Dumbbell Shoulder Press", muscleGroup: "shoulders", equipment: "dumbbell", isCompound: true },
  { id: "ex-lateral-raise", name: "Lateral Raise", muscleGroup: "shoulders", equipment: "dumbbell", isCompound: false },
  { id: "ex-face-pull", name: "Face Pull", muscleGroup: "shoulders", equipment: "cable", isCompound: false },
  { id: "ex-bb-curl", name: "Barbell Curl", muscleGroup: "arms", equipment: "barbell", isCompound: false },
  { id: "ex-hammer-curl", name: "Hammer Curl", muscleGroup: "arms", equipment: "dumbbell", isCompound: false },
  { id: "ex-tri-pushdown", name: "Triceps Pushdown", muscleGroup: "arms", equipment: "cable", isCompound: false },
  { id: "ex-skull-crusher", name: "Skull Crusher", muscleGroup: "arms", equipment: "barbell", isCompound: false },
  { id: "ex-preacher-curl", name: "Preacher Curl", muscleGroup: "arms", equipment: "machine", isCompound: false },
  { id: "ex-squat", name: "Barbell Back Squat", muscleGroup: "legs", equipment: "barbell", isCompound: true },
  { id: "ex-front-squat", name: "Front Squat", muscleGroup: "legs", equipment: "barbell", isCompound: true },
  { id: "ex-leg-press", name: "Leg Press", muscleGroup: "legs", equipment: "machine", isCompound: true },
  { id: "ex-rdl", name: "Romanian Deadlift", muscleGroup: "legs", equipment: "barbell", isCompound: true },
  { id: "ex-leg-ext", name: "Leg Extension", muscleGroup: "legs", equipment: "machine", isCompound: false },
  { id: "ex-leg-curl", name: "Lying Leg Curl", muscleGroup: "legs", equipment: "machine", isCompound: false },
  { id: "ex-calf-raise", name: "Standing Calf Raise", muscleGroup: "legs", equipment: "machine", isCompound: false },
  { id: "ex-lunge", name: "Walking Lunge", muscleGroup: "legs", equipment: "dumbbell", isCompound: true },
  { id: "ex-hip-thrust", name: "Hip Thrust", muscleGroup: "legs", equipment: "barbell", isCompound: true },
  { id: "ex-plank", name: "Plank", muscleGroup: "core", equipment: "bodyweight", isCompound: false },
  { id: "ex-leg-raise", name: "Hanging Leg Raise", muscleGroup: "core", equipment: "bodyweight", isCompound: false },
  { id: "ex-cable-crunch", name: "Cable Crunch", muscleGroup: "core", equipment: "cable", isCompound: false },
  { id: "ex-ab-wheel", name: "Ab Wheel Rollout", muscleGroup: "core", equipment: "bodyweight", isCompound: false },
  { id: "ex-run", name: "Treadmill Run", muscleGroup: "cardio", equipment: "cardio", isCompound: false },
  { id: "ex-row-erg", name: "Rowing Machine", muscleGroup: "cardio", equipment: "cardio", isCompound: true },
  { id: "ex-bike", name: "Assault Bike", muscleGroup: "cardio", equipment: "cardio", isCompound: false },
  { id: "ex-stairs", name: "Stair Climber", muscleGroup: "cardio", equipment: "cardio", isCompound: false }
] as const;

export const WORKOUT_TEMPLATES = [
  { id: "tpl-push", name: "Push Day", focus: "Chest · Shoulders · Triceps", exerciseIds: ["ex-bench", "ex-incline-db", "ex-ohp", "ex-lateral-raise", "ex-tri-pushdown"], estimatedMinutes: 60 },
  { id: "tpl-pull", name: "Pull Day", focus: "Back · Biceps", exerciseIds: ["ex-deadlift", "ex-pullup", "ex-cable-row", "ex-face-pull", "ex-bb-curl"], estimatedMinutes: 60 },
  { id: "tpl-legs", name: "Leg Day", focus: "Quads · Hamstrings · Calves", exerciseIds: ["ex-squat", "ex-rdl", "ex-leg-press", "ex-leg-curl", "ex-calf-raise"], estimatedMinutes: 70 },
  { id: "tpl-full", name: "Full Body Express", focus: "Everything · 45 min", exerciseIds: ["ex-squat", "ex-bench", "ex-bb-row", "ex-plank"], estimatedMinutes: 45 },
  { id: "tpl-engine", name: "Engine Builder", focus: "Cardio · Core", exerciseIds: ["ex-row-erg", "ex-bike", "ex-leg-raise", "ex-plank"], estimatedMinutes: 40 }
] as const;

export const ACHIEVEMENT_DEFS = [
  { id: "ach-first-blood", title: "First Blood", description: "Log your first workout.", icon: "barbell", tier: "bronze", metric: "total_workouts", threshold: 1, badgeXp: 100 },
  { id: "ach-regular", title: "Regular", description: "Log 25 workouts.", icon: "calendar", tier: "bronze", metric: "total_workouts", threshold: 25, badgeXp: 250 },
  { id: "ach-centurion", title: "Centurion", description: "Log 100 workouts.", icon: "shield-checkmark", tier: "silver", metric: "total_workouts", threshold: 100, badgeXp: 600 },
  { id: "ach-machine", title: "The Machine", description: "Log 250 workouts.", icon: "cog", tier: "gold", metric: "total_workouts", threshold: 250, badgeXp: 1500 },
  { id: "ach-tonne-club", title: "Tonne Club", description: "Move 100,000 kg lifetime volume.", icon: "trending-up", tier: "bronze", metric: "total_volume_kg", threshold: 100000, badgeXp: 300 },
  { id: "ach-million-club", title: "Million Kilo Club", description: "Move 1,000,000 kg lifetime volume.", icon: "rocket", tier: "gold", metric: "total_volume_kg", threshold: 1000000, badgeXp: 2000 },
  { id: "ach-pr-hunter", title: "PR Hunter", description: "Set 10 personal records.", icon: "flash", tier: "bronze", metric: "total_prs", threshold: 10, badgeXp: 250 },
  { id: "ach-pr-legend", title: "PR Legend", description: "Set 50 personal records.", icon: "flame", tier: "silver", metric: "total_prs", threshold: 50, badgeXp: 800 },
  { id: "ach-week-flame", title: "Week of Flame", description: "Hold a 7-day streak.", icon: "flame", tier: "bronze", metric: "longest_streak", threshold: 7, badgeXp: 200 },
  { id: "ach-month-flame", title: "Month of Flame", description: "Hold a 30-day streak.", icon: "bonfire", tier: "gold", metric: "longest_streak", threshold: 30, badgeXp: 1200 },
  { id: "ach-level-10", title: "Double Digits", description: "Reach level 10.", icon: "star", tier: "bronze", metric: "level_reached", threshold: 10, badgeXp: 200 },
  { id: "ach-level-25", title: "Quarter Century", description: "Reach level 25.", icon: "star-half", tier: "silver", metric: "level_reached", threshold: 25, badgeXp: 700 },
  { id: "ach-level-50", title: "Halfway to Myth", description: "Reach level 50.", icon: "planet", tier: "gold", metric: "level_reached", threshold: 50, badgeXp: 1800 },
  { id: "ach-hundred-visits", title: "Hundred Visits", description: "Check in 100 times.", icon: "location", tier: "silver", metric: "check_ins", threshold: 100, badgeXp: 500 }
] as const;

export function starterQuests() {
  return [
    { scope: "daily", title: "Log a workout", description: "Complete any training session today.", metric: "workouts_logged", target: 1, xp: 250 },
    { scope: "daily", title: "Grind 12 sets", description: "Finish 12 working sets in one day.", metric: "sets_completed", target: 12, xp: 180 },
    { scope: "daily", title: "Show up", description: "Check in at your gym.", metric: "check_ins", target: 1, xp: 100 },
    { scope: "weekly", title: "Consistency chain", description: "Log 4 workouts this week.", metric: "workouts_logged", target: 4, xp: 900 },
    { scope: "weekly", title: "Move 20 tonnes", description: "Accumulate 20,000 kg of volume this week.", metric: "volume_kg", target: 20000, xp: 1200 },
    { scope: "weekly", title: "Break a record", description: "Set a new personal record this week.", metric: "prs_set", target: 1, xp: 600 },
    { scope: "weekly", title: "Keep the flame", description: "Reach a 10-day activity streak.", metric: "streak_days", target: 10, xp: 750 }
  ] as const;
}

export const SEASON_NAME = "Season 01: First Ascent";

export const PLAN_PRICES = { Core: 29, Plus: 44, Max: 59 } as const;

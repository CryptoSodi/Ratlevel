import type {
  AchievementState,
  BodyMetricEntry,
  Challenge,
  CheckIn,
  Gym,
  LeaderboardEntry,
  Player,
  PlayerSettings,
  Quest,
  Season,
  WorkoutLog,
  WorkoutTemplate
} from "@ratlevel/domain";

export function daysAgo(days: number, hour = 18): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
}

export function daysAhead(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(23, 59, 0, 0);
  return date.toISOString();
}

export const seedGyms: Gym[] = [
  { id: "gym-iron-district", name: "Iron District", city: "Amsterdam", distanceKm: 0.8, memberCount: 1284, openNow: true, latitude: 52.3702, longitude: 4.8952, geofenceRadiusM: 100, entryQrCode: "ratlevel:entry:gym-iron-district", comfortCapacity: 60 },
  { id: "gym-forge-west", name: "The Forge West", city: "Amsterdam", distanceKm: 2.3, memberCount: 947, openNow: true, latitude: 52.3728, longitude: 4.8586, geofenceRadiusM: 100, entryQrCode: "ratlevel:entry:gym-forge-west", comfortCapacity: 45 },
  { id: "gym-rathaus", name: "Rathaus Strength Club", city: "Amsterdam", distanceKm: 3.1, memberCount: 512, openNow: true, latitude: 52.3667, longitude: 4.9124, geofenceRadiusM: 80, entryQrCode: "ratlevel:entry:gym-rathaus", comfortCapacity: 30 },
  { id: "gym-pulse-north", name: "Pulse North", city: "Amsterdam", distanceKm: 4.6, memberCount: 1730, openNow: false, latitude: 52.4009, longitude: 4.9143, geofenceRadiusM: 120, entryQrCode: "ratlevel:entry:gym-pulse-north", comfortCapacity: 80 }
];

export const seedPlayer: Player = {
  id: "player-1",
  name: "Tassa",
  title: "Iron Initiate",
  playerClass: "Vanguard",
  gymId: "gym-iron-district",
  totalXp: 46800,
  seasonXp: 7420,
  streakDays: 8,
  longestStreak: 15,
  personalRecords: 14,
  membership: {
    plan: "Plus",
    status: "active",
    cardNumber: "8471 2290 5518 3364",
    memberSince: daysAgo(240),
    gymId: "gym-iron-district",
    monthlyFee: 44,
    feeDueAt: daysAhead(3)
  },
  whatsappNumber: "+31 6 1234 5678",
  stats: {
    strength: 74,
    endurance: 58,
    power: 66,
    speed: 51,
    discipline: 81,
    consistency: 77,
    recovery: 46
  },
  joinedAt: daysAgo(240)
};

export const seedSettings: PlayerSettings = {
  units: "metric",
  workoutReminders: true,
  questAlerts: true,
  leaderboardVisible: true
};

export const seedQuests: Quest[] = [
  {
    id: "daily-log-workout",
    scope: "daily",
    title: "Log a workout",
    description: "Complete any training session today.",
    metric: "workouts_logged",
    target: 1,
    progress: 0,
    xp: 250,
    completed: false,
    claimed: false
  },
  {
    id: "daily-12-sets",
    scope: "daily",
    title: "Grind 12 sets",
    description: "Finish 12 working sets in one day.",
    metric: "sets_completed",
    target: 12,
    progress: 0,
    xp: 180,
    completed: false,
    claimed: false
  },
  {
    id: "daily-check-in",
    scope: "daily",
    title: "Show up",
    description: "Check in at your gym.",
    metric: "check_ins",
    target: 1,
    progress: 0,
    xp: 100,
    completed: false,
    claimed: false
  },
  {
    id: "weekly-4-workouts",
    scope: "weekly",
    title: "Consistency chain",
    description: "Log 4 workouts this week.",
    metric: "workouts_logged",
    target: 4,
    progress: 2,
    xp: 900,
    completed: false,
    claimed: false
  },
  {
    id: "weekly-20t-volume",
    scope: "weekly",
    title: "Move 20 tonnes",
    description: "Accumulate 20,000 kg of volume this week.",
    metric: "volume_kg",
    target: 20000,
    progress: 11350,
    xp: 1200,
    completed: false,
    claimed: false
  },
  {
    id: "weekly-pr",
    scope: "weekly",
    title: "Break a record",
    description: "Set a new personal record this week.",
    metric: "prs_set",
    target: 1,
    progress: 0,
    xp: 600,
    completed: false,
    claimed: false
  },
  {
    id: "weekly-streak-7",
    scope: "weekly",
    title: "Keep the flame",
    description: "Reach a 10-day activity streak.",
    metric: "streak_days",
    target: 10,
    progress: 8,
    xp: 750,
    completed: false,
    claimed: false
  }
];

export const seedAchievements: AchievementState[] = [
  { id: "ach-first-blood", title: "First Blood", description: "Log your first workout.", icon: "barbell", tier: "bronze", metric: "total_workouts", threshold: 1, badgeXp: 100, unlockedAt: daysAgo(238) },
  { id: "ach-regular", title: "Regular", description: "Log 25 workouts.", icon: "calendar", tier: "bronze", metric: "total_workouts", threshold: 25, badgeXp: 250, unlockedAt: daysAgo(150) },
  { id: "ach-centurion", title: "Centurion", description: "Log 100 workouts.", icon: "shield-checkmark", tier: "silver", metric: "total_workouts", threshold: 100, badgeXp: 600 },
  { id: "ach-machine", title: "The Machine", description: "Log 250 workouts.", icon: "cog", tier: "gold", metric: "total_workouts", threshold: 250, badgeXp: 1500 },
  { id: "ach-tonne-club", title: "Tonne Club", description: "Move 100,000 kg lifetime volume.", icon: "trending-up", tier: "bronze", metric: "total_volume_kg", threshold: 100000, badgeXp: 300, unlockedAt: daysAgo(90) },
  { id: "ach-million-club", title: "Million Kilo Club", description: "Move 1,000,000 kg lifetime volume.", icon: "rocket", tier: "gold", metric: "total_volume_kg", threshold: 1000000, badgeXp: 2000 },
  { id: "ach-pr-hunter", title: "PR Hunter", description: "Set 10 personal records.", icon: "flash", tier: "bronze", metric: "total_prs", threshold: 10, badgeXp: 250, unlockedAt: daysAgo(60) },
  { id: "ach-pr-legend", title: "PR Legend", description: "Set 50 personal records.", icon: "flame", tier: "silver", metric: "total_prs", threshold: 50, badgeXp: 800 },
  { id: "ach-week-flame", title: "Week of Flame", description: "Hold a 7-day streak.", icon: "flame", tier: "bronze", metric: "longest_streak", threshold: 7, badgeXp: 200, unlockedAt: daysAgo(120) },
  { id: "ach-month-flame", title: "Month of Flame", description: "Hold a 30-day streak.", icon: "bonfire", tier: "gold", metric: "longest_streak", threshold: 30, badgeXp: 1200 },
  { id: "ach-level-10", title: "Double Digits", description: "Reach level 10.", icon: "star", tier: "bronze", metric: "level_reached", threshold: 10, badgeXp: 200, unlockedAt: daysAgo(100) },
  { id: "ach-level-25", title: "Quarter Century", description: "Reach level 25.", icon: "star-half", tier: "silver", metric: "level_reached", threshold: 25, badgeXp: 700 },
  { id: "ach-level-50", title: "Halfway to Myth", description: "Reach level 50.", icon: "planet", tier: "gold", metric: "level_reached", threshold: 50, badgeXp: 1800 },
  { id: "ach-hundred-visits", title: "Hundred Visits", description: "Check in 100 times.", icon: "location", tier: "silver", metric: "check_ins", threshold: 100, badgeXp: 500 }
];

export const seedChallenges: Challenge[] = [
  {
    id: "chal-strength-ladder",
    name: "July Strength Ladder",
    description: "Move 60,000 kg before the ladder closes.",
    metric: "volume_kg",
    goal: 60000,
    progress: 38200,
    endsAt: daysAhead(12),
    entrants: 128,
    rewardXp: 2500,
    rewardLabel: "Top 10 unlock the Neon Vanguard badge",
    joined: true
  },
  {
    id: "chal-boss-rush",
    name: "Gym Floor Boss Rush",
    description: "Log 5 workouts in 7 days.",
    metric: "workouts_logged",
    goal: 5,
    progress: 2,
    endsAt: daysAhead(3),
    entrants: 42,
    rewardXp: 1200,
    rewardLabel: "Bonus XP for your whole squad",
    joined: true
  },
  {
    id: "chal-attendance",
    name: "Never Skip",
    description: "Check in 12 times this month.",
    metric: "check_ins",
    goal: 12,
    progress: 0,
    endsAt: daysAhead(20),
    entrants: 231,
    rewardXp: 1500,
    rewardLabel: "Season XP boost + Never Skip badge",
    joined: false
  }
];

export const seedSeason: Season = {
  id: "season-1",
  number: 1,
  name: "Season 01: First Ascent",
  startsAt: daysAgo(34),
  endsAt: daysAhead(56)
};

export const seedLeaderboard: LeaderboardEntry[] = [
  { playerId: "leader-1", name: "Nadia", title: "Diamond Vanguard", level: 31, xp: 18320, isCurrentUser: false },
  { playerId: "leader-2", name: "Marco", title: "Gold Strider", level: 26, xp: 15880, isCurrentUser: false },
  { playerId: "leader-3", name: "Yuki", title: "Gold Sentinel", level: 24, xp: 12140, isCurrentUser: false },
  { playerId: "player-1", name: "Tassa", title: "Gold Iron Initiate", level: 18, xp: 7420, isCurrentUser: true },
  { playerId: "leader-4", name: "Jess", title: "Silver Sentinel", level: 16, xp: 6905, isCurrentUser: false },
  { playerId: "leader-5", name: "Omar", title: "Silver Medic", level: 14, xp: 5310, isCurrentUser: false },
  { playerId: "leader-6", name: "Priya", title: "Silver Strider", level: 12, xp: 4480, isCurrentUser: false },
  { playerId: "leader-7", name: "Ben", title: "Bronze Vanguard", level: 9, xp: 2130, isCurrentUser: false }
];

export const seedTemplates: WorkoutTemplate[] = [
  { id: "tpl-push", name: "Push Day", focus: "Chest · Shoulders · Triceps", exerciseIds: ["ex-bench", "ex-incline-db", "ex-ohp", "ex-lateral-raise", "ex-tri-pushdown"], estimatedMinutes: 60 },
  { id: "tpl-pull", name: "Pull Day", focus: "Back · Biceps", exerciseIds: ["ex-deadlift", "ex-pullup", "ex-cable-row", "ex-face-pull", "ex-bb-curl"], estimatedMinutes: 60 },
  { id: "tpl-legs", name: "Leg Day", focus: "Quads · Hamstrings · Calves", exerciseIds: ["ex-squat", "ex-rdl", "ex-leg-press", "ex-leg-curl", "ex-calf-raise"], estimatedMinutes: 70 },
  { id: "tpl-full", name: "Full Body Express", focus: "Everything · 45 min", exerciseIds: ["ex-squat", "ex-bench", "ex-bb-row", "ex-plank"], estimatedMinutes: 45 },
  { id: "tpl-engine", name: "Engine Builder", focus: "Cardio · Core", exerciseIds: ["ex-row-erg", "ex-bike", "ex-leg-raise", "ex-plank"], estimatedMinutes: 40 }
];

function log(
  id: string,
  name: string,
  days: number,
  durationMin: number,
  entries: WorkoutLog["entries"],
  xpAwarded: number,
  prCount = 0
): WorkoutLog {
  const totalVolumeKg = entries.reduce(
    (total, entry) => total + entry.sets.reduce((s, set) => s + set.reps * set.weightKg, 0),
    0
  );
  const totalSets = entries.reduce((total, entry) => total + entry.sets.length, 0);
  return { id, name, performedAt: daysAgo(days), durationMin, entries, totalVolumeKg, totalSets, xpAwarded, prCount };
}

const sets = (count: number, reps: number, weightKg: number) =>
  Array.from({ length: count }, () => ({ reps, weightKg, completed: true }));

export const seedHistory: WorkoutLog[] = [
  log("log-1", "Leg Day", 1, 68, [
    { exerciseId: "ex-squat", exerciseName: "Barbell Back Squat", muscleGroup: "legs", isCompound: true, sets: sets(4, 6, 110) },
    { exerciseId: "ex-rdl", exerciseName: "Romanian Deadlift", muscleGroup: "legs", isCompound: true, sets: sets(3, 8, 90) },
    { exerciseId: "ex-leg-press", exerciseName: "Leg Press", muscleGroup: "legs", isCompound: true, sets: sets(3, 10, 180) },
    { exerciseId: "ex-calf-raise", exerciseName: "Standing Calf Raise", muscleGroup: "legs", isCompound: false, sets: sets(4, 12, 60) }
  ], 612, 1),
  log("log-2", "Engine Builder", 2, 41, [
    { exerciseId: "ex-row-erg", exerciseName: "Rowing Machine", muscleGroup: "cardio", isCompound: true, sets: sets(4, 1, 0) },
    { exerciseId: "ex-plank", exerciseName: "Plank", muscleGroup: "core", isCompound: false, sets: sets(3, 1, 0) }
  ], 284),
  log("log-3", "Push Day", 3, 63, [
    { exerciseId: "ex-bench", exerciseName: "Barbell Bench Press", muscleGroup: "chest", isCompound: true, sets: sets(4, 5, 92.5) },
    { exerciseId: "ex-incline-db", exerciseName: "Incline Dumbbell Press", muscleGroup: "chest", isCompound: true, sets: sets(3, 8, 32) },
    { exerciseId: "ex-ohp", exerciseName: "Overhead Press", muscleGroup: "shoulders", isCompound: true, sets: sets(3, 6, 55) },
    { exerciseId: "ex-tri-pushdown", exerciseName: "Triceps Pushdown", muscleGroup: "arms", isCompound: false, sets: sets(3, 12, 30) }
  ], 548, 1),
  log("log-4", "Pull Day", 5, 59, [
    { exerciseId: "ex-deadlift", exerciseName: "Deadlift", muscleGroup: "back", isCompound: true, sets: sets(3, 5, 150) },
    { exerciseId: "ex-pullup", exerciseName: "Pull-Up", muscleGroup: "back", isCompound: true, sets: sets(4, 8, 0) },
    { exerciseId: "ex-cable-row", exerciseName: "Seated Cable Row", muscleGroup: "back", isCompound: true, sets: sets(3, 10, 65) },
    { exerciseId: "ex-bb-curl", exerciseName: "Barbell Curl", muscleGroup: "arms", isCompound: false, sets: sets(3, 10, 35) }
  ], 571),
  log("log-5", "Full Body Express", 6, 44, [
    { exerciseId: "ex-squat", exerciseName: "Barbell Back Squat", muscleGroup: "legs", isCompound: true, sets: sets(3, 8, 95) },
    { exerciseId: "ex-bench", exerciseName: "Barbell Bench Press", muscleGroup: "chest", isCompound: true, sets: sets(3, 8, 80) },
    { exerciseId: "ex-bb-row", exerciseName: "Barbell Row", muscleGroup: "back", isCompound: true, sets: sets(3, 8, 70) }
  ], 462)
];

export const seedCheckIns: CheckIn[] = [
  { id: "checkin-1", gymId: "gym-iron-district", at: daysAgo(1, 17), method: "qr" },
  { id: "checkin-2", gymId: "gym-iron-district", at: daysAgo(2, 7), method: "qr" },
  { id: "checkin-3", gymId: "gym-iron-district", at: daysAgo(3, 18), method: "manual" },
  { id: "checkin-4", gymId: "gym-iron-district", at: daysAgo(5, 17), method: "qr" }
];

export const seedBodyMetrics: BodyMetricEntry[] = [
  { id: "body-1", recordedAt: daysAgo(84), weightKg: 82.4, chestCm: 104, waistCm: 88, armCm: 37 },
  { id: "body-2", recordedAt: daysAgo(70), weightKg: 81.8 },
  { id: "body-3", recordedAt: daysAgo(56), weightKg: 81.1, waistCm: 87 },
  { id: "body-4", recordedAt: daysAgo(42), weightKg: 80.6, chestCm: 105 },
  { id: "body-5", recordedAt: daysAgo(28), weightKg: 80.2, armCm: 37.5 },
  { id: "body-6", recordedAt: daysAgo(14), weightKg: 79.5, waistCm: 86 },
  { id: "body-7", recordedAt: daysAgo(7), weightKg: 79.2 },
  { id: "body-8", recordedAt: daysAgo(2), weightKg: 78.9, chestCm: 106, waistCm: 85, armCm: 38 }
];

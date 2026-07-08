import { z } from "zod";

export const playerClassSchema = z.enum(["Vanguard", "Strider", "Sentinel", "Medic"]);
export const membershipPlanSchema = z.enum(["Core", "Plus", "Max"]);
export const membershipStatusSchema = z.enum(["active", "frozen", "expired"]);
export const checkInMethodSchema = z.enum(["qr", "manual", "gps"]);
export const staffRoleSchema = z.enum(["owner", "manager", "frontdesk", "coach"]);

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export const googleAuthSchema = z.object({
  idToken: z.string().min(1)
});

export const staffGoogleAuthSchema = z.object({
  idToken: z.string().min(1)
});

export const googleCompleteSchema = z.object({
  pendingToken: z.string().min(1),
  name: z.string().min(1).max(40),
  playerClass: playerClassSchema,
  gymId: z.string().min(1),
  whatsappNumber: z.string().optional()
});

/** Dev/testing bypass only — never enabled in production. See routes/auth.ts. */
export const devLoginSchema = z.object({
  email: z.string().email()
});

export const workoutSetSchema = z.object({
  reps: z.number().int().min(0),
  weightKg: z.number().min(0),
  completed: z.boolean()
});

export const workoutEntrySchema = z.object({
  exerciseId: z.string().min(1),
  exerciseName: z.string().min(1),
  muscleGroup: z.enum(["chest", "back", "shoulders", "arms", "legs", "core", "cardio"]),
  isCompound: z.boolean(),
  sets: z.array(workoutSetSchema).min(1)
});

export const finishWorkoutSchema = z.object({
  name: z.string().min(1).max(60),
  durationMin: z.number().int().min(1),
  entries: z.array(workoutEntrySchema).min(1)
});

export const checkInSchema = z.object({
  gymId: z.string().min(1),
  method: checkInMethodSchema
});

export const gpsCheckInSchema = z.object({
  latitude: z.number(),
  longitude: z.number()
});

export const playerSettingsSchema = z.object({
  units: z.enum(["metric", "imperial"]),
  workoutReminders: z.boolean(),
  questAlerts: z.boolean(),
  leaderboardVisible: z.boolean()
});

export const bodyMetricInputSchema = z.object({
  recordedAt: z.string().datetime(),
  weightKg: z.number().min(0),
  chestCm: z.number().min(0).optional(),
  waistCm: z.number().min(0).optional(),
  armCm: z.number().min(0).optional()
});

export const updateWhatsappSchema = z.object({
  whatsappNumber: z.string().max(24).optional()
});

export const updateCharacterSchema = z.object({
  name: z.string().min(1).max(40),
  playerClass: playerClassSchema,
  gymId: z.string().min(1),
  whatsappNumber: z.string().optional()
});

export const newMemberSchema = z.object({
  name: z.string().min(1).max(60),
  email: z.string().email(),
  whatsapp: z.string().optional(),
  plan: membershipPlanSchema,
  playerClass: playerClassSchema
});

export const updateMemberSchema = z.object({
  plan: membershipPlanSchema.optional(),
  status: membershipStatusSchema.optional(),
  assignedProgramId: z.string().nullable().optional()
});

export const newAnnouncementSchema = z.object({
  title: z.string().min(1).max(120),
  body: z.string().min(1).max(2000),
  audience: z.enum(["all", "active", "at-risk"]),
  scheduledFor: z.string().datetime().optional()
});

import type {
  Player as PlayerRow,
  Membership as MembershipRow,
  Gym as GymRow,
  CheckIn as CheckInRow,
  Exercise as ExerciseRow,
  WorkoutTemplate as WorkoutTemplateRow,
  WorkoutLog as WorkoutLogRow,
  Quest as QuestRow,
  AchievementDefinition as AchievementDefRow,
  PlayerAchievement as PlayerAchievementRow,
  Challenge as ChallengeRow,
  ChallengeParticipant as ChallengeParticipantRow,
  Season as SeasonRow,
  BodyMetricEntry as BodyMetricRow,
  MemberNotification as MemberNotificationRow,
  AdminNotification as AdminNotificationRow,
  StaffAccount as StaffAccountRow,
  GymClass as GymClassRow,
  Program as ProgramRow,
  Announcement as AnnouncementRow
} from "@prisma/client";
import { levelFromTotalXp } from "@ratlevel/gamification";
import type {
  AchievementState,
  Announcement,
  Challenge as MemberChallenge,
  CheckIn,
  Exercise,
  Gym,
  GymClass,
  MembershipPlan,
  MembershipStatus,
  Player,
  PlayerClass,
  Program,
  Quest,
  Season,
  StaffAccount,
  StaffRole,
  WorkoutExerciseEntry,
  WorkoutLog,
  WorkoutTemplate
} from "@ratlevel/domain";

export function toGym(row: GymRow, memberCount: number, distanceKm = 0): Gym {
  return {
    id: row.id,
    name: row.name,
    city: row.city,
    distanceKm,
    memberCount,
    openNow: row.openNow,
    latitude: row.latitude,
    longitude: row.longitude,
    geofenceRadiusM: row.geofenceRadiusM,
    entryQrCode: row.entryQrCode,
    comfortCapacity: row.comfortCapacity
  };
}

export function toStaffAccount(row: StaffAccountRow): StaffAccount {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role as StaffRole,
    active: row.active,
    lastActiveAt: row.lastActiveAt.toISOString()
  };
}

export function toPlayer(row: PlayerRow & { membership: MembershipRow | null }): Player {
  if (!row.membership) {
    throw new Error(`Player ${row.id} has no membership row`);
  }
  return {
    id: row.id,
    name: row.name,
    title: row.title,
    playerClass: row.playerClass as PlayerClass,
    gymId: row.gymId,
    totalXp: row.totalXp,
    seasonXp: row.seasonXp,
    streakDays: row.streakDays,
    longestStreak: row.longestStreak,
    personalRecords: row.personalRecords,
    whatsappNumber: row.whatsappNumber ?? undefined,
    joinedAt: row.joinedAt.toISOString(),
    membership: {
      plan: row.membership.plan as MembershipPlan,
      status: row.membership.status as MembershipStatus,
      cardNumber: row.membership.cardNumber,
      memberSince: row.membership.memberSince.toISOString(),
      gymId: row.membership.gymId,
      monthlyFee: row.membership.monthlyFee,
      feeDueAt: row.membership.feeDueAt.toISOString()
    },
    stats: {
      strength: row.strength,
      endurance: row.endurance,
      power: row.power,
      speed: row.speed,
      discipline: row.discipline,
      consistency: row.consistency,
      recovery: row.recovery
    }
  };
}

export function toSettings(row: PlayerRow) {
  return {
    units: row.units as "metric" | "imperial",
    workoutReminders: row.workoutReminders,
    questAlerts: row.questAlerts,
    leaderboardVisible: row.leaderboardVisible
  };
}

export function toCheckIn(row: CheckInRow): CheckIn {
  return {
    id: row.id,
    gymId: row.gymId,
    at: row.at.toISOString(),
    method: row.method as CheckIn["method"]
  };
}

export function toExercise(row: ExerciseRow): Exercise {
  return {
    id: row.id,
    name: row.name,
    muscleGroup: row.muscleGroup as Exercise["muscleGroup"],
    equipment: row.equipment as Exercise["equipment"],
    isCompound: row.isCompound
  };
}

export function toWorkoutTemplate(row: WorkoutTemplateRow): WorkoutTemplate {
  return {
    id: row.id,
    name: row.name,
    focus: row.focus,
    exerciseIds: JSON.parse(row.exerciseIds) as string[],
    estimatedMinutes: row.estimatedMinutes
  };
}

export function toWorkoutLog(row: WorkoutLogRow): WorkoutLog {
  return {
    id: row.id,
    name: row.name,
    performedAt: row.performedAt.toISOString(),
    durationMin: row.durationMin,
    entries: JSON.parse(row.entries) as WorkoutExerciseEntry[],
    totalVolumeKg: row.totalVolumeKg,
    totalSets: row.totalSets,
    xpAwarded: row.xpAwarded,
    prCount: row.prCount
  };
}

export function toQuest(row: QuestRow): Quest {
  return {
    id: row.id,
    scope: row.scope as Quest["scope"],
    title: row.title,
    description: row.description,
    metric: row.metric as Quest["metric"],
    target: row.target,
    progress: row.progress,
    xp: row.xp,
    completed: row.completed,
    claimed: row.claimed
  };
}

export function toAchievementState(
  row: PlayerAchievementRow & { achievement: AchievementDefRow }
): AchievementState {
  return {
    id: row.achievement.id,
    title: row.achievement.title,
    description: row.achievement.description,
    icon: row.achievement.icon,
    tier: row.achievement.tier as AchievementState["tier"],
    metric: row.achievement.metric as AchievementState["metric"],
    threshold: row.achievement.threshold,
    badgeXp: row.achievement.badgeXp,
    unlockedAt: row.unlockedAt?.toISOString()
  };
}

export function toMemberChallenge(
  row: ChallengeRow,
  participant: ChallengeParticipantRow | undefined,
  entrants: number
): MemberChallenge {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    metric: row.metric as MemberChallenge["metric"],
    goal: row.goal,
    progress: participant?.progress ?? 0,
    endsAt: row.endsAt.toISOString(),
    entrants,
    rewardXp: row.rewardXp,
    rewardLabel: row.rewardLabel,
    joined: participant?.joined ?? false
  };
}

export function toSeason(row: SeasonRow): Season {
  return {
    id: row.id,
    number: row.number,
    name: row.name,
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt.toISOString()
  };
}

export function toBodyMetric(row: BodyMetricRow) {
  return {
    id: row.id,
    recordedAt: row.recordedAt.toISOString(),
    weightKg: row.weightKg,
    chestCm: row.chestCm ?? undefined,
    waistCm: row.waistCm ?? undefined,
    armCm: row.armCm ?? undefined
  };
}

export function toMemberNotification(row: MemberNotificationRow) {
  return {
    id: row.id,
    type: row.type as "payment_due" | "payment_overdue" | "info",
    title: row.title,
    body: row.body,
    createdAt: row.createdAt.toISOString(),
    read: row.read
  };
}

export function toAdminNotification(row: AdminNotificationRow) {
  return {
    id: row.id,
    type: row.type as "fee_overdue" | "info",
    memberId: row.memberId ?? undefined,
    memberName: row.memberName ?? undefined,
    title: row.title,
    body: row.body,
    createdAt: row.createdAt.toISOString(),
    read: row.read
  };
}

export function toGymClass(row: GymClassRow): GymClass {
  return {
    id: row.id,
    name: row.name,
    coachName: row.coachName,
    weekday: row.weekday,
    startTime: row.startTime,
    durationMin: row.durationMin,
    capacity: row.capacity,
    booked: row.booked,
    location: row.location
  };
}

export function toProgram(row: ProgramRow): Program {
  return {
    id: row.id,
    name: row.name,
    focus: row.focus,
    weeks: row.weeks,
    templateIds: JSON.parse(row.templateIds) as string[]
  };
}

export function toAnnouncement(row: AnnouncementRow): Announcement {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    audience: row.audience as Announcement["audience"],
    status: row.status as Announcement["status"],
    scheduledFor: row.scheduledFor?.toISOString(),
    sentAt: row.sentAt?.toISOString()
  };
}

/** Level derived the same way both apps derive it — never stored, always computed. */
export function playerLevel(totalXp: number): number {
  return levelFromTotalXp(totalXp).level;
}

/** Admin "MemberRecord" view is a projection over Player + Membership + aggregates — not a separate table. */
export function toMemberRecord(
  row: PlayerRow & { membership: MembershipRow | null },
  aggregates: { lastCheckInAt?: Date; totalCheckIns: number }
) {
  if (!row.membership) {
    throw new Error(`Player ${row.id} has no membership row`);
  }
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    whatsapp: row.whatsappNumber ?? undefined,
    playerClass: row.playerClass as PlayerClass,
    level: playerLevel(row.totalXp),
    plan: row.membership.plan as MembershipPlan,
    status: row.membership.status as MembershipStatus,
    joinedAt: row.joinedAt.toISOString(),
    renewsAt: row.membership.feeDueAt.toISOString(),
    monthlyFee: row.membership.monthlyFee,
    feeDueAt: row.membership.feeDueAt.toISOString(),
    reminderSentAt: row.membership.reminderSentAt?.toISOString(),
    lastCheckInAt: aggregates.lastCheckInAt?.toISOString(),
    totalCheckIns: aggregates.totalCheckIns,
    streakDays: row.streakDays,
    seasonXp: row.seasonXp,
    assignedProgramId: row.assignedProgramId ?? undefined
  };
}

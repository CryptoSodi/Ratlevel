import type { FastifyInstance } from "fastify";
import { distanceMeters, occupancyLevel } from "@ratlevel/domain";
import { applyEventToQuests, checkInEvent, levelFromTotalXp, settleWorkout } from "@ratlevel/gamification";
import { requireMember } from "../lib/auth";
import { db } from "../lib/db";
import {
  toAchievementState,
  toBodyMetric,
  toCheckIn,
  toExercise,
  toGym,
  toMemberChallenge,
  toMemberNotification,
  toPlayer,
  toQuest,
  toSeason,
  toSettings,
  toWorkoutLog,
  toWorkoutTemplate
} from "../lib/mappers";
import { ensureMemberFeeNotification } from "../lib/notifications";
import {
  bodyMetricInputSchema,
  checkInSchema,
  finishWorkoutSchema,
  playerSettingsSchema,
  updateCharacterSchema,
  updateWhatsappSchema
} from "../lib/schemas";

const CHECK_IN_XP = 50;

function playerId(request: { auth?: { kind: string; playerId?: string } }): string {
  if (request.auth?.kind !== "member" || !request.auth.playerId) {
    throw new Error("Not authenticated as a member");
  }
  return request.auth.playerId;
}

function isSameCalendarDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export async function memberRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("preHandler", requireMember);

  // ---------- players ----------

  app.get("/players/me", async (request) => {
    const player = await db.player.findUniqueOrThrow({
      where: { id: playerId(request) },
      include: { membership: true }
    });
    return toPlayer(player);
  });

  app.put("/players/me", async (request, reply) => {
    const parsed = updateWhatsappSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }
    // Only whatsappNumber is client-editable here; XP/stats/streak are
    // server-authoritative and only change via /checkins and /workouts.
    const player = await db.player.update({
      where: { id: playerId(request) },
      data: { whatsappNumber: parsed.data.whatsappNumber },
      include: { membership: true }
    });
    return toPlayer(player);
  });

  // "Create/edit character" for an already-authenticated account — the
  // interface's createCharacter is a profile respec, not account signup
  // (signup + character creation happen together at /auth/member/register).
  app.put("/players/me/character", async (request, reply) => {
    const parsed = updateCharacterSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }
    const gym = await db.gym.findUnique({ where: { id: parsed.data.gymId } });
    if (!gym) return reply.code(400).send({ error: "Unknown gym." });

    const player = await db.player.update({
      where: { id: playerId(request) },
      data: {
        name: parsed.data.name,
        playerClass: parsed.data.playerClass,
        gymId: parsed.data.gymId,
        whatsappNumber: parsed.data.whatsappNumber,
        membership: { update: { gymId: parsed.data.gymId } }
      },
      include: { membership: true }
    });
    return toPlayer(player);
  });

  app.get("/players/me/settings", async (request) => {
    const player = await db.player.findUniqueOrThrow({ where: { id: playerId(request) } });
    return toSettings(player);
  });

  app.put("/players/me/settings", async (request, reply) => {
    const parsed = playerSettingsSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }
    const player = await db.player.update({ where: { id: playerId(request) }, data: parsed.data });
    return toSettings(player);
  });

  // ---------- gyms ----------

  app.get("/gyms", async () => {
    const gyms = await db.gym.findMany();
    const counts = await db.player.groupBy({ by: ["gymId"], _count: true });
    const countByGym = new Map(counts.map((row) => [row.gymId, row._count]));
    return gyms.map((gym) => toGym(gym, countByGym.get(gym.id) ?? 0));
  });

  app.get<{ Params: { gymId: string } }>("/gyms/:gymId", async (request, reply) => {
    const gym = await db.gym.findUnique({ where: { id: request.params.gymId } });
    if (!gym) return reply.code(404).send({ error: "Gym not found" });
    const memberCount = await db.player.count({ where: { gymId: gym.id } });
    return toGym(gym, memberCount);
  });

  app.get<{ Params: { gymId: string } }>("/gyms/:gymId/occupancy", async (request, reply) => {
    const gym = await db.gym.findUnique({ where: { id: request.params.gymId } });
    if (!gym) return reply.code(404).send({ error: "Gym not found" });
    if (!gym.openNow) {
      return { current: 0, comfortCapacity: gym.comfortCapacity, level: "quiet", updatedAt: new Date().toISOString() };
    }
    const current = await estimateLiveHeadcount(gym.id);
    return {
      current,
      comfortCapacity: gym.comfortCapacity,
      level: occupancyLevel(current, gym.comfortCapacity),
      updatedAt: new Date().toISOString()
    };
  });

  // ---------- check-ins (the attendance feature) ----------

  app.get("/checkins", async (request) => {
    const checkIns = await db.checkIn.findMany({
      where: { playerId: playerId(request) },
      orderBy: { at: "desc" }
    });
    return checkIns.map(toCheckIn);
  });

  app.post("/checkins", async (request, reply) => {
    const parsed = checkInSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }
    const { gymId, method } = parsed.data;
    const id = playerId(request);

    const gym = await db.gym.findUnique({ where: { id: gymId } });
    if (!gym) {
      return reply.code(400).send({ error: "Unknown gym." });
    }

    // Server-side proof, not a trusted client claim.
    if (method === "qr") {
      const { qrPayload } = request.body as { qrPayload?: string };
      if (!qrPayload || qrPayload !== gym.entryQrCode) {
        return reply.code(422).send({ error: "That QR code doesn't match this gym's entry poster." });
      }
    } else if (method === "gps") {
      const { latitude, longitude } = request.body as { latitude?: number; longitude?: number };
      if (typeof latitude !== "number" || typeof longitude !== "number") {
        return reply.code(422).send({ error: "Location coordinates are required for GPS check-in." });
      }
      const distance = distanceMeters(latitude, longitude, gym.latitude, gym.longitude);
      if (distance > gym.geofenceRadiusM) {
        return reply.code(422).send({ error: `You're ${Math.round(distance)}m away — too far to check in via GPS.` });
      }
    }

    const checkIn = await db.checkIn.create({ data: { playerId: id, gymId, method } });

    // Award XP + quest progress server-side (authoritative — see task notes).
    const quests = await db.quest.findMany({ where: { playerId: id, completed: false } });
    const player = await db.player.findUniqueOrThrow({ where: { id } });
    const event = checkInEvent(player.streakDays);
    const result = applyEventToQuests(quests.map(toQuest), event);
    const earned = CHECK_IN_XP + result.xpFromQuests;

    await db.$transaction([
      db.player.update({ where: { id }, data: { totalXp: { increment: earned }, seasonXp: { increment: earned } } }),
      ...result.quests
        .filter((quest) => quest.completed)
        .map((quest) =>
          db.quest.update({ where: { id: quest.id }, data: { progress: quest.progress, completed: true, claimed: true } })
        ),
      ...result.quests
        .filter((quest) => !quest.completed)
        .map((quest) => db.quest.update({ where: { id: quest.id }, data: { progress: quest.progress } }))
    ]);

    return reply.code(201).send(toCheckIn(checkIn));
  });

  // ---------- workouts ----------

  app.get("/workouts/exercises", async () => (await db.exercise.findMany()).map(toExercise));

  app.get("/workouts/templates", async () => (await db.workoutTemplate.findMany()).map(toWorkoutTemplate));

  app.get("/workouts/history", async (request) => {
    const logs = await db.workoutLog.findMany({
      where: { playerId: playerId(request) },
      orderBy: { performedAt: "desc" }
    });
    return logs.map(toWorkoutLog);
  });

  app.post("/workouts", async (request, reply) => {
    const parsed = finishWorkoutSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }
    const id = playerId(request);
    const { name, durationMin, entries } = parsed.data;
    const now = new Date();

    const [player, quests, achievementRows, challengeRows, history] = await Promise.all([
      db.player.findUniqueOrThrow({ where: { id }, include: { membership: true } }),
      db.quest.findMany({ where: { playerId: id } }),
      db.playerAchievement.findMany({ where: { playerId: id }, include: { achievement: true } }),
      db.challengeParticipant.findMany({ where: { playerId: id }, include: { challenge: true } }),
      db.workoutLog.findMany({ where: { playerId: id } })
    ]);

    // PRs are computed from real history, not trusted from the client.
    const historicalMax = new Map<string, number>();
    for (const log of history) {
      const logEntries = JSON.parse(log.entries) as typeof entries;
      for (const entry of logEntries) {
        const max = Math.max(...entry.sets.map((set) => set.weightKg), 0);
        historicalMax.set(entry.exerciseId, Math.max(historicalMax.get(entry.exerciseId) ?? 0, max));
      }
    }
    let prCount = 0;
    for (const entry of entries) {
      const sessionMax = Math.max(...entry.sets.filter((set) => set.completed).map((set) => set.weightKg), 0);
      if (sessionMax > 0 && sessionMax > (historicalMax.get(entry.exerciseId) ?? 0)) {
        prCount += 1;
      }
    }

    const trainedToday = history.some((log) => isSameCalendarDay(log.performedAt, now));
    const streakDays = trainedToday ? player.streakDays : player.streakDays + 1;

    const totalCheckIns = await db.checkIn.count({ where: { playerId: id } });

    const result = settleWorkout({
      player: toPlayer(player),
      quests: quests.map(toQuest),
      achievements: achievementRows.map(toAchievementState),
      challenges: challengeRows.map((row) => toMemberChallenge(row.challenge, row, 0)),
      entries,
      workoutName: name,
      durationMin,
      prCount,
      checkedIn: false,
      streakDays,
      lifetime: {
        totalWorkouts: history.length,
        totalVolumeKg: history.reduce((total, log) => total + log.totalVolumeKg, 0),
        totalPrs: player.personalRecords,
        totalCheckIns
      },
      now: now.toISOString()
    });

    const workoutLog = await db.$transaction(async (tx) => {
      const log = await tx.workoutLog.create({
        data: {
          playerId: id,
          name,
          performedAt: now,
          durationMin,
          entries: JSON.stringify(entries),
          totalVolumeKg: result.volumeKg,
          totalSets: result.setsCompleted,
          xpAwarded: result.summary.totalXp,
          prCount
        }
      });

      await tx.player.update({
        where: { id },
        data: {
          totalXp: result.player.totalXp,
          seasonXp: result.player.seasonXp,
          streakDays: result.player.streakDays,
          longestStreak: result.player.longestStreak,
          personalRecords: result.player.personalRecords,
          strength: result.player.stats.strength,
          endurance: result.player.stats.endurance,
          power: result.player.stats.power,
          speed: result.player.stats.speed,
          discipline: result.player.stats.discipline,
          consistency: result.player.stats.consistency,
          recovery: result.player.stats.recovery
        }
      });

      for (const quest of result.quests) {
        await tx.quest.update({
          where: { id: quest.id },
          data: { progress: quest.progress, completed: quest.completed, claimed: quest.claimed }
        });
      }
      for (const achievement of result.achievements) {
        if (achievement.unlockedAt) {
          await tx.playerAchievement.updateMany({
            where: { playerId: id, achievementId: achievement.id, unlockedAt: null },
            data: { unlockedAt: new Date(achievement.unlockedAt) }
          });
        }
      }
      for (const challenge of result.challenges) {
        await tx.challengeParticipant.updateMany({
          where: { playerId: id, challengeId: challenge.id },
          data: { progress: challenge.progress }
        });
      }

      return log;
    });

    return reply.code(201).send(toWorkoutLog(workoutLog));
  });

  // ---------- quests / achievements / challenges / season ----------

  app.get("/quests", async (request) => (await db.quest.findMany({ where: { playerId: playerId(request) } })).map(toQuest));

  app.put("/quests", async (request) => {
    const id = playerId(request);
    const quests = request.body as Array<{ id: string; progress: number; completed: boolean; claimed: boolean }>;
    await db.$transaction(
      quests.map((quest) =>
        db.quest.updateMany({
          where: { id: quest.id, playerId: id },
          data: { progress: quest.progress, completed: quest.completed, claimed: quest.claimed }
        })
      )
    );
    return (await db.quest.findMany({ where: { playerId: id } })).map(toQuest);
  });

  app.get("/achievements", async (request) =>
    (
      await db.playerAchievement.findMany({
        where: { playerId: playerId(request) },
        include: { achievement: true }
      })
    ).map(toAchievementState)
  );

  app.put("/achievements", async (request) => {
    const id = playerId(request);
    const achievements = request.body as Array<{ id: string; unlockedAt?: string }>;
    await db.$transaction(
      achievements
        .filter((achievement) => achievement.unlockedAt)
        .map((achievement) =>
          db.playerAchievement.updateMany({
            where: { playerId: id, achievementId: achievement.id, unlockedAt: null },
            data: { unlockedAt: new Date(achievement.unlockedAt as string) }
          })
        )
    );
    return (
      await db.playerAchievement.findMany({ where: { playerId: id }, include: { achievement: true } })
    ).map(toAchievementState);
  });

  app.put("/challenges", async (request) => {
    const id = playerId(request);
    const challenges = request.body as Array<{ id: string; progress: number; joined: boolean }>;
    await db.$transaction(
      challenges.map((challenge) =>
        db.challengeParticipant.upsert({
          where: { challengeId_playerId: { challengeId: challenge.id, playerId: id } },
          update: { progress: challenge.progress, joined: challenge.joined },
          create: { challengeId: challenge.id, playerId: id, progress: challenge.progress, joined: challenge.joined }
        })
      )
    );
    const challengeRows = await db.challenge.findMany();
    const participants = await db.challengeParticipant.findMany({ where: { playerId: id } });
    return challengeRows.map((row) => toMemberChallenge(row, participants.find((p) => p.challengeId === row.id), 0));
  });

  app.get("/challenges", async (request) => {
    const id = playerId(request);
    const challenges = await db.challenge.findMany();
    const participants = await db.challengeParticipant.findMany({ where: { playerId: id } });
    const entrantCounts = await db.challengeParticipant.groupBy({
      by: ["challengeId"],
      where: { joined: true },
      _count: true
    });
    const entrantsByChallenge = new Map(entrantCounts.map((row) => [row.challengeId, row._count]));
    return challenges.map((challenge) =>
      toMemberChallenge(
        challenge,
        participants.find((row) => row.challengeId === challenge.id),
        entrantsByChallenge.get(challenge.id) ?? 0
      )
    );
  });

  app.post<{ Params: { challengeId: string } }>("/challenges/:challengeId/join", async (request, reply) => {
    const id = playerId(request);
    const { challengeId } = request.params;
    const participant = await db.challengeParticipant.upsert({
      where: { challengeId_playerId: { challengeId, playerId: id } },
      update: { joined: true },
      create: { challengeId, playerId: id, joined: true, progress: 0 },
      include: { challenge: true }
    });
    const entrants = await db.challengeParticipant.count({ where: { challengeId, joined: true } });
    return toMemberChallenge(participant.challenge, participant, entrants);
  });

  app.get("/season", async () => {
    const season = await db.season.findFirst({ orderBy: { number: "desc" } });
    if (!season) throw new Error("No season configured");
    return toSeason(season);
  });

  app.get("/leaderboard", async (request) => {
    const id = playerId(request);
    const player = await db.player.findUniqueOrThrow({ where: { id } });
    const top = await db.player.findMany({
      where: { gymId: player.gymId },
      orderBy: { seasonXp: "desc" },
      take: 20
    });
    return top.map((row) => ({
      playerId: row.id,
      name: row.name,
      title: row.title,
      level: levelFromTotalXp(row.totalXp).level,
      xp: row.seasonXp,
      isCurrentUser: row.id === id
    }));
  });

  // ---------- body metrics ----------

  app.get("/body", async (request) =>
    (
      await db.bodyMetricEntry.findMany({ where: { playerId: playerId(request) }, orderBy: { recordedAt: "asc" } })
    ).map(toBodyMetric)
  );

  app.post("/body", async (request, reply) => {
    const parsed = bodyMetricInputSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }
    const entry = await db.bodyMetricEntry.create({
      data: {
        playerId: playerId(request),
        recordedAt: new Date(parsed.data.recordedAt),
        weightKg: parsed.data.weightKg,
        chestCm: parsed.data.chestCm,
        waistCm: parsed.data.waistCm,
        armCm: parsed.data.armCm
      }
    });
    return reply.code(201).send(toBodyMetric(entry));
  });

  // ---------- notifications ----------

  app.get("/notifications", async (request) => {
    const id = playerId(request);
    await ensureMemberFeeNotification(id);
    const notifications = await db.memberNotification.findMany({
      where: { playerId: id },
      orderBy: { createdAt: "desc" }
    });
    return notifications.map(toMemberNotification);
  });

  app.post("/notifications/read", async (request) => {
    const id = playerId(request);
    await db.memberNotification.updateMany({ where: { playerId: id }, data: { read: true } });
    return (await db.memberNotification.findMany({ where: { playerId: id }, orderBy: { createdAt: "desc" } })).map(
      toMemberNotification
    );
  });
}

/** Same estimation heuristic used by the portal's live floor (no exit gates yet). */
async function estimateLiveHeadcount(gymId: string): Promise<number> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const todaysCheckIns = await db.checkIn.findMany({ where: { gymId, at: { gte: startOfDay } } });
  const now = Date.now();
  const seen = new Set<string>();
  let count = 0;
  for (const checkIn of todaysCheckIns.sort((a, b) => b.at.getTime() - a.at.getTime())) {
    if (seen.has(checkIn.playerId)) continue;
    seen.add(checkIn.playerId);
    let hash = 0;
    for (let index = 0; index < checkIn.id.length; index += 1) hash = (hash * 31 + checkIn.id.charCodeAt(index)) | 0;
    const dwellMinutes = 45 + (Math.abs(hash) % 76);
    if (now < checkIn.at.getTime() + dwellMinutes * 60000) count += 1;
  }
  return count;
}

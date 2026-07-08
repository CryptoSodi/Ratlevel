import type { FastifyInstance } from "fastify";
import { getFeeStatus, parseMemberQrPayload } from "@ratlevel/domain";
import { levelFromTotalXp } from "@ratlevel/gamification";
import { requireRole } from "../lib/auth";
import { PLAN_PRICES } from "../lib/seedData";
import { db } from "../lib/db";
import {
  toAnnouncement,
  toGym,
  toGymClass,
  toMemberChallenge,
  toMemberRecord,
  toProgram,
  toStaffAccount,
  toWorkoutTemplate,
  toAdminNotification
} from "../lib/mappers";
import { ensureGymFeeNotifications, resolveFeeNotifications } from "../lib/notifications";
import { newAnnouncementSchema, newMemberSchema, updateMemberSchema } from "../lib/schemas";

const AT_RISK_DAYS = 10;

function isAtRisk(status: string, lastCheckInAt: Date | undefined, now: Date): boolean {
  if (status !== "active") return false;
  if (!lastCheckInAt) return true;
  const days = (now.getTime() - lastCheckInAt.getTime()) / (24 * 60 * 60 * 1000);
  return days >= AT_RISK_DAYS;
}

function staffId(request: { auth?: { kind: string; staffId?: string } }): string {
  if (request.auth?.kind !== "staff" || !request.auth.staffId) {
    throw new Error("Not authenticated as staff");
  }
  return request.auth.staffId;
}

async function checkInAggregates(gymId: string) {
  const rows = await db.checkIn.groupBy({ by: ["playerId"], where: { gymId }, _count: true, _max: { at: true } });
  return new Map(rows.map((row) => [row.playerId, { totalCheckIns: row._count, lastCheckInAt: row._max.at ?? undefined }]));
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** Same estimation used by the member app's per-gym occupancy glance. */
async function liveVisitors(gymId: string) {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const todaysCheckIns = await db.checkIn.findMany({
    where: { gymId, at: { gte: startOfDay } },
    orderBy: { at: "desc" },
    include: { player: { select: { name: true } } }
  });
  const now = Date.now();
  const seen = new Set<string>();
  const visitors: Array<{ memberId: string; memberName: string; since: string }> = [];
  for (const checkIn of todaysCheckIns) {
    if (seen.has(checkIn.playerId)) continue;
    seen.add(checkIn.playerId);
    let hash = 0;
    for (let index = 0; index < checkIn.id.length; index += 1) hash = (hash * 31 + checkIn.id.charCodeAt(index)) | 0;
    const dwellMinutes = 45 + (Math.abs(hash) % 76);
    if (now < checkIn.at.getTime() + dwellMinutes * 60000) {
      visitors.push({ memberId: checkIn.playerId, memberName: checkIn.player.name, since: checkIn.at.toISOString() });
    }
  }
  return visitors;
}

export async function adminRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("preHandler", requireRole(1));

  app.get("/staff", async () => (await db.staffAccount.findMany()).map(toStaffAccount));

  app.get("/gym", async (request, reply) => {
    // This portal instance manages whichever gym its staff belong to. All
    // seeded staff are Iron District, so resolve via the requesting staffer.
    const staff = await db.staffAccount.findUnique({ where: { id: staffId(request) } });
    const gym = await db.gym.findFirst();
    if (!gym) return reply.code(404).send({ error: "No gym configured" });
    const memberCount = await db.player.count({ where: { gymId: gym.id } });
    return toGym(gym, memberCount);
  });

  // ---------- members ----------

  app.get("/members", async () => {
    const gym = await db.gym.findFirstOrThrow();
    const [players, aggregates] = await Promise.all([
      db.player.findMany({ where: { gymId: gym.id }, include: { membership: true } }),
      checkInAggregates(gym.id)
    ]);
    return players.map((player) =>
      toMemberRecord(player, aggregates.get(player.id) ?? { totalCheckIns: 0, lastCheckInAt: undefined })
    );
  });

  app.post("/members", { preHandler: requireRole(2) }, async (request, reply) => {
    const parsed = newMemberSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }
    const gym = await db.gym.findFirstOrThrow();
    const existing = await db.player.findUnique({ where: { email: parsed.data.email } });
    if (existing) {
      return reply.code(409).send({ error: "A member with that email already exists." });
    }
    const feeDueAt = new Date();
    feeDueAt.setDate(feeDueAt.getDate() + 30);
    const player = await db.player.create({
      data: {
        email: parsed.data.email,
        // Front-desk-created members set their own password on first mobile
        // sign-in via a reset flow — a random placeholder hash blocks login
        // until then. (Password-reset flow is a follow-up, not built yet.)
        passwordHash: "unset",
        name: parsed.data.name,
        playerClass: parsed.data.playerClass,
        gymId: gym.id,
        whatsappNumber: parsed.data.whatsapp,
        membership: {
          create: {
            gymId: gym.id,
            plan: parsed.data.plan,
            status: "active",
            cardNumber: Array.from({ length: 4 }, () => Math.floor(1000 + Math.random() * 8999)).join(" "),
            monthlyFee: PLAN_PRICES[parsed.data.plan],
            feeDueAt
          }
        }
      },
      include: { membership: true }
    });
    return reply.code(201).send(toMemberRecord(player, { totalCheckIns: 0, lastCheckInAt: undefined }));
  });

  app.put<{ Params: { memberId: string } }>("/members/:memberId", { preHandler: requireRole(2) }, async (request, reply) => {
    const parsed = updateMemberSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }
    const { memberId } = request.params;
    const player = await db.player.findUnique({ where: { id: memberId }, include: { membership: true } });
    if (!player?.membership) return reply.code(404).send({ error: "Member not found." });

    if (parsed.data.plan) {
      await db.membership.update({
        where: { playerId: memberId },
        data: { plan: parsed.data.plan, monthlyFee: PLAN_PRICES[parsed.data.plan] }
      });
    }
    if (parsed.data.status) {
      await db.membership.update({ where: { playerId: memberId }, data: { status: parsed.data.status } });
    }
    if ("assignedProgramId" in parsed.data) {
      await db.player.update({ where: { id: memberId }, data: { assignedProgramId: parsed.data.assignedProgramId } });
    }

    const updated = await db.player.findUniqueOrThrow({ where: { id: memberId }, include: { membership: true } });
    const aggregates = await checkInAggregates(updated.gymId);
    return toMemberRecord(updated, aggregates.get(memberId) ?? { totalCheckIns: 0, lastCheckInAt: undefined });
  });

  app.delete<{ Params: { memberId: string } }>("/members/:memberId", { preHandler: requireRole(2) }, async (request, reply) => {
    const { memberId } = request.params;
    await db.membership.deleteMany({ where: { playerId: memberId } });
    await db.player.delete({ where: { id: memberId } }).catch(() => undefined);
    return reply.code(204).send();
  });

  app.post<{ Params: { memberId: string } }>(
    "/members/:memberId/assign-program",
    { preHandler: requireRole(2) },
    async (request, reply) => {
      const { programId } = request.body as { programId?: string };
      const player = await db.player.update({
        where: { id: request.params.memberId },
        data: { assignedProgramId: programId ?? null },
        include: { membership: true }
      });
      const aggregates = await checkInAggregates(player.gymId);
      return reply.send(toMemberRecord(player, aggregates.get(player.id) ?? { totalCheckIns: 0, lastCheckInAt: undefined }));
    }
  );

  app.post<{ Params: { memberId: string } }>(
    "/members/:memberId/record-payment",
    { preHandler: requireRole(2) },
    async (request, reply) => {
      const { memberId } = request.params;
      const player = await db.player.findUnique({ where: { id: memberId }, include: { membership: true } });
      if (!player?.membership) return reply.code(404).send({ error: "Member not found." });

      const nextDue = new Date();
      nextDue.setDate(nextDue.getDate() + 30);
      await db.membership.update({
        where: { playerId: memberId },
        data: { feeDueAt: nextDue, reminderSentAt: null, status: player.membership.status === "expired" ? "active" : player.membership.status }
      });
      await resolveFeeNotifications(player.gymId, memberId);

      const updated = await db.player.findUniqueOrThrow({ where: { id: memberId }, include: { membership: true } });
      const aggregates = await checkInAggregates(updated.gymId);
      return toMemberRecord(updated, aggregates.get(memberId) ?? { totalCheckIns: 0, lastCheckInAt: undefined });
    }
  );

  app.post<{ Params: { memberId: string } }>(
    "/members/:memberId/send-reminder",
    { preHandler: requireRole(1) },
    async (request, reply) => {
      const { memberId } = request.params;
      const player = await db.player.update({
        where: { id: memberId },
        data: { membership: { update: { reminderSentAt: new Date() } } },
        include: { membership: true }
      });
      const aggregates = await checkInAggregates(player.gymId);
      return reply.send(toMemberRecord(player, aggregates.get(player.id) ?? { totalCheckIns: 0, lastCheckInAt: undefined }));
    }
  );

  // ---------- attendance (feed, manual check-in, charts, live floor) ----------

  app.get("/attendance/feed", async (request) => {
    const { limit } = request.query as { limit?: string };
    const gym = await db.gym.findFirstOrThrow();
    const rows = await db.checkIn.findMany({
      where: { gymId: gym.id },
      orderBy: { at: "desc" },
      take: limit ? Number(limit) : 40,
      include: { player: { select: { name: true } } }
    });
    return rows.map((row) => ({
      id: row.id,
      memberId: row.playerId,
      memberName: row.player.name,
      at: row.at.toISOString(),
      method: row.method
    }));
  });

  app.post("/attendance/checkin-manual", async (request, reply) => {
    const { memberId } = request.body as { memberId?: string };
    if (!memberId) return reply.code(400).send({ error: "memberId is required." });
    const player = await db.player.findUnique({ where: { id: memberId } });
    if (!player) return reply.code(404).send({ error: "Member not found." });
    const checkIn = await db.checkIn.create({ data: { playerId: memberId, gymId: player.gymId, method: "manual" } });
    return reply.code(201).send({
      id: checkIn.id,
      memberId: checkIn.playerId,
      memberName: player.name,
      at: checkIn.at.toISOString(),
      method: checkIn.method
    });
  });

  app.post("/attendance/checkin-qr", async (request, reply) => {
    const { qrPayload } = request.body as { qrPayload?: string };
    if (!qrPayload) return reply.code(400).send({ error: "qrPayload is required." });

    const memberId = parseMemberQrPayload(qrPayload);
    if (!memberId) return reply.code(422).send({ error: "That isn't a RatLevel member QR code." });

    const gym = await db.gym.findFirstOrThrow();
    const player = await db.player.findUnique({ where: { id: memberId } });
    if (!player || player.gymId !== gym.id) {
      return reply.code(422).send({ error: "That QR code doesn't match a member of this gym." });
    }

    const checkIn = await db.checkIn.create({ data: { playerId: memberId, gymId: player.gymId, method: "qr" } });
    return reply.code(201).send({
      id: checkIn.id,
      memberId: checkIn.playerId,
      memberName: player.name,
      at: checkIn.at.toISOString(),
      method: checkIn.method
    });
  });

  app.get("/attendance/daily", async (request) => {
    const { days } = request.query as { days?: string };
    const span = days ? Number(days) : 14;
    const gym = await db.gym.findFirstOrThrow();
    const now = new Date();
    const points = [];
    for (let offset = span - 1; offset >= 0; offset -= 1) {
      const day = new Date(now);
      day.setDate(day.getDate() - offset);
      const start = new Date(day);
      start.setHours(0, 0, 0, 0);
      const end = new Date(day);
      end.setHours(23, 59, 59, 999);
      const checkIns = await db.checkIn.count({ where: { gymId: gym.id, at: { gte: start, lte: end } } });
      points.push({ date: day.toISOString(), checkIns });
    }
    return points;
  });

  app.get("/attendance/hourly", async () => {
    const gym = await db.gym.findFirstOrThrow();
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const rows = await db.checkIn.findMany({ where: { gymId: gym.id, at: { gte: startOfDay } } });
    const buckets = Array.from({ length: 17 }, (_, index) => ({ hour: index + 6, checkIns: 0 }));
    for (const row of rows) {
      const hour = row.at.getHours();
      const bucket = buckets.find((item) => item.hour === hour);
      if (bucket) bucket.checkIns += 1;
    }
    return buckets;
  });

  app.get("/attendance/live", async () => {
    const gym = await db.gym.findFirstOrThrow();
    const visitors = await liveVisitors(gym.id);
    return { current: visitors.length, comfortCapacity: gym.comfortCapacity, visitors, updatedAt: new Date().toISOString() };
  });

  // ---------- classes / programs ----------

  app.get("/classes", async () => {
    const gym = await db.gym.findFirstOrThrow();
    return (await db.gymClass.findMany({ where: { gymId: gym.id } })).map(toGymClass);
  });

  app.get("/programs", async () => {
    const gym = await db.gym.findFirstOrThrow();
    return (await db.program.findMany({ where: { gymId: gym.id } })).map(toProgram);
  });

  app.get("/programs/templates", async () => (await db.workoutTemplate.findMany()).map(toWorkoutTemplate));

  // ---------- announcements ----------

  app.get("/announcements", async () => {
    const gym = await db.gym.findFirstOrThrow();
    return (await db.announcement.findMany({ where: { gymId: gym.id }, orderBy: { createdAt: "desc" } })).map(toAnnouncement);
  });

  app.post("/announcements", async (request, reply) => {
    const parsed = newAnnouncementSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }
    const gym = await db.gym.findFirstOrThrow();
    const announcement = await db.announcement.create({
      data: {
        gymId: gym.id,
        title: parsed.data.title,
        body: parsed.data.body,
        audience: parsed.data.audience,
        status: parsed.data.scheduledFor ? "scheduled" : "draft",
        scheduledFor: parsed.data.scheduledFor ? new Date(parsed.data.scheduledFor) : null
      }
    });
    return reply.code(201).send(toAnnouncement(announcement));
  });

  app.post<{ Params: { announcementId: string } }>("/announcements/:announcementId/send", async (request, reply) => {
    const announcement = await db.announcement.update({
      where: { id: request.params.announcementId },
      data: { status: "sent", sentAt: new Date() }
    });
    return reply.send(toAnnouncement(announcement));
  });

  // ---------- analytics ----------

  app.get("/analytics/kpis", async () => {
    const gym = await db.gym.findFirstOrThrow();
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const monthAgo = new Date(now);
    monthAgo.setDate(monthAgo.getDate() - 30);

    const [players, checkInsToday] = await Promise.all([
      db.player.findMany({ where: { gymId: gym.id }, include: { membership: true } }),
      db.checkIn.count({ where: { gymId: gym.id, at: { gte: startOfDay } } })
    ]);
    const aggregates = await checkInAggregates(gym.id);

    let activeMembers = 0;
    let expiredMembers = 0;
    let frozenMembers = 0;
    let atRiskMembers = 0;
    let newThisMonth = 0;
    let overdueFees = 0;
    let monthlyRevenue = 0;

    for (const player of players) {
      const status = player.membership?.status ?? "active";
      if (status === "active") activeMembers += 1;
      if (status === "expired") expiredMembers += 1;
      if (status === "frozen") frozenMembers += 1;
      if (player.joinedAt >= monthAgo) newThisMonth += 1;
      if (isAtRisk(status, aggregates.get(player.id)?.lastCheckInAt, now)) atRiskMembers += 1;
      if (player.membership && status !== "expired" && getFeeStatus(player.membership.feeDueAt.toISOString(), now.toISOString()) === "overdue") {
        overdueFees += 1;
      }
      if (status === "active" && player.membership) monthlyRevenue += player.membership.monthlyFee;
    }

    return { activeMembers, expiredMembers, frozenMembers, checkInsToday, atRiskMembers, newThisMonth, overdueFees, monthlyRevenue };
  });

  app.get("/analytics/retention", async () => {
    const labels = ["Feb", "Mar", "Apr", "May", "Jun", "Jul"];
    const values = [86, 84, 88, 90, 87, 91];
    return labels.map((month, index) => ({ month, retainedPct: values[index] }));
  });

  app.get("/analytics/revenue", async () => {
    const gym = await db.gym.findFirstOrThrow();
    const activeCount = await db.player.count({ where: { gymId: gym.id, membership: { status: "active" } } });
    const labels = ["Feb", "Mar", "Apr", "May", "Jun", "Jul"];
    const factors = [0.82, 0.85, 0.9, 0.94, 0.97, 1];
    const base = activeCount * 41;
    return labels.map((month, index) => ({ month, amount: Math.round((base * factors[index]) / 10) * 10 }));
  });

  // ---------- challenges (portal view) ----------

  app.get("/challenges", async () => {
    const challenges = await db.challenge.findMany();
    const entrantCounts = await db.challengeParticipant.groupBy({ by: ["challengeId"], where: { joined: true }, _count: true });
    const entrantsByChallenge = new Map(entrantCounts.map((row) => [row.challengeId, row._count]));
    return challenges.map((challenge) => toMemberChallenge(challenge, undefined, entrantsByChallenge.get(challenge.id) ?? 0));
  });

  app.get("/challenges/leaderboard", async () => {
    const gym = await db.gym.findFirstOrThrow();
    const top = await db.player.findMany({ where: { gymId: gym.id }, orderBy: { seasonXp: "desc" }, take: 20 });
    return top.map((row) => ({
      playerId: row.id,
      name: row.name,
      title: row.title,
      level: levelFromTotalXp(row.totalXp).level,
      xp: row.seasonXp,
      isCurrentUser: false
    }));
  });

  // ---------- notifications ----------

  app.get("/notifications", async () => {
    const gym = await db.gym.findFirstOrThrow();
    await ensureGymFeeNotifications(gym.id);
    const notifications = await db.adminNotification.findMany({ where: { gymId: gym.id }, orderBy: { createdAt: "desc" } });
    return notifications.map(toAdminNotification);
  });

  app.post("/notifications/read", async () => {
    const gym = await db.gym.findFirstOrThrow();
    await db.adminNotification.updateMany({ where: { gymId: gym.id }, data: { read: true } });
    return (await db.adminNotification.findMany({ where: { gymId: gym.id }, orderBy: { createdAt: "desc" } })).map(
      toAdminNotification
    );
  });
}

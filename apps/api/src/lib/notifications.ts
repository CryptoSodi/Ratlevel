import { daysUntilDue, getFeeStatus } from "@ratlevel/domain";
import { db } from "./db";

/**
 * Fee alerts are derived, not stored-and-forgotten: every read re-checks the
 * membership's feeDueAt and keeps at most one open (unread) notification per
 * player in sync with the current status. This is the server-side version of
 * what the mock clients computed at construction time.
 */
export async function ensureMemberFeeNotification(playerId: string): Promise<void> {
  const player = await db.player.findUnique({ where: { id: playerId }, include: { membership: true } });
  if (!player?.membership) return;

  const now = new Date().toISOString();
  const status = getFeeStatus(player.membership.feeDueAt.toISOString(), now);
  const existing = await db.memberNotification.findFirst({
    where: { playerId, type: { in: ["payment_due", "payment_overdue"] }, read: false }
  });

  if (status === "paid") {
    return;
  }

  const days = daysUntilDue(player.membership.feeDueAt.toISOString(), now);
  const type = status === "overdue" ? "payment_overdue" : "payment_due";
  const title = status === "overdue" ? "Membership fee overdue" : "Membership fee due soon";
  const body =
    status === "overdue"
      ? `Your €${player.membership.monthlyFee} ${player.membership.plan} fee was due ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} ago. Settle it at the front desk to keep gym access.`
      : `Your €${player.membership.monthlyFee} ${player.membership.plan} fee is due in ${days} day${days === 1 ? "" : "s"}. Pay on time to keep your streak — and your access — alive.`;

  if (existing) {
    if (existing.type !== type || existing.body !== body) {
      await db.memberNotification.update({ where: { id: existing.id }, data: { type, title, body } });
    }
  } else {
    await db.memberNotification.create({ data: { playerId, type, title, body } });
  }
}

/** Same idea for staff: one open fee_overdue alert per member with a lapsed fee. */
export async function ensureGymFeeNotifications(gymId: string): Promise<void> {
  const now = new Date();
  const overdue = await db.player.findMany({
    where: { gymId, membership: { status: { not: "expired" }, feeDueAt: { lt: now } } },
    include: { membership: true }
  });

  for (const player of overdue) {
    if (!player.membership) continue;
    const existing = await db.adminNotification.findFirst({
      where: { gymId, memberId: player.id, type: "fee_overdue", read: false }
    });
    const body = `€${player.membership.monthlyFee} ${player.membership.plan} fee was due ${player.membership.feeDueAt.toLocaleDateString()}. Record the payment or send a reminder.`;
    if (existing) {
      if (existing.body !== body) {
        await db.adminNotification.update({ where: { id: existing.id }, data: { body } });
      }
    } else {
      await db.adminNotification.create({
        data: {
          gymId,
          type: "fee_overdue",
          memberId: player.id,
          memberName: player.name,
          title: `Fee overdue: ${player.name}`,
          body
        }
      });
    }
  }
}

/** Clears the open fee alert for a member once their payment is recorded. */
export async function resolveFeeNotifications(gymId: string, playerId: string): Promise<void> {
  await db.adminNotification.updateMany({
    where: { gymId, memberId: playerId, type: "fee_overdue", read: false },
    data: { read: true }
  });
  await db.memberNotification.updateMany({
    where: { playerId, type: { in: ["payment_due", "payment_overdue"] }, read: false },
    data: { read: true }
  });
}

import type {
  AdminNotification,
  Announcement,
  AttendancePoint,
  CheckInRecord,
  GymPortalClient,
  HourlyAttendancePoint,
  MemberRecord,
  NewAnnouncementInput,
  NewMemberInput,
  PortalKpis,
  RetentionPoint,
  RevenuePoint,
  StaffAccount
} from "@ratlevel/domain";
import { getFeeStatus, parseMemberQrPayload } from "@ratlevel/domain";
import { seedChallenges, seedGyms, seedLeaderboard, seedTemplates } from "./data/seed";
import { buildPortalSeed, PLAN_PRICES } from "./data/portal-seed";

const NETWORK_DELAY_MS = 250;

function delay(ms: number = NETWORK_DELAY_MS): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

let idCounter = 0;
function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${Date.now()}-${idCounter}`;
}

function isSameDay(iso: string, reference: Date): boolean {
  const date = new Date(iso);
  return (
    date.getFullYear() === reference.getFullYear() &&
    date.getMonth() === reference.getMonth() &&
    date.getDate() === reference.getDate()
  );
}

const AT_RISK_DAYS = 10;

export function isAtRisk(member: MemberRecord, now = new Date()): boolean {
  if (member.status !== "active") return false;
  if (!member.lastCheckInAt) return true;
  const days = (now.getTime() - new Date(member.lastCheckInAt).getTime()) / (24 * 60 * 60 * 1000);
  return days >= AT_RISK_DAYS;
}

/**
 * In-memory implementation of the gym-portal backend contracts. Same deal as
 * the member client: swap for a real API client at construction time.
 */
export function createMockPortalClient(): GymPortalClient {
  const db = buildPortalSeed();

  // A real backend raises these when a fee lapses; the mock derives them
  // from the seeded fee state at startup.
  const now = new Date().toISOString();
  let notifications: AdminNotification[] = db.members
    .filter((member) => member.status !== "expired" && getFeeStatus(member.feeDueAt, now) === "overdue")
    .map((member) => ({
      id: `admnotif-${member.id}`,
      type: "fee_overdue" as const,
      memberId: member.id,
      memberName: member.name,
      title: `Fee overdue: ${member.name}`,
      body: `€${member.monthlyFee} ${member.plan} fee was due ${new Date(member.feeDueAt).toLocaleDateString()}. Record the payment or send a reminder.`,
      createdAt: member.feeDueAt,
      read: false
    }));

  const resolveFeeNotification = (memberId: string) => {
    notifications = notifications.filter(
      (item) => !(item.type === "fee_overdue" && item.memberId === memberId)
    );
  };

  return {
    auth: {
      async login(email, _password) {
        await delay(500);
        const account = db.staff.find(
          (staff) => staff.email.toLowerCase() === email.trim().toLowerCase() && staff.active
        );
        if (!account) {
          throw new Error("No active staff account with that email.");
        }
        return clone(account);
      },
      async listStaff() {
        await delay();
        return clone(db.staff);
      }
    },
    gym: {
      async get() {
        await delay(100);
        // This portal instance manages Iron District.
        return clone(seedGyms[0]);
      }
    },
    members: {
      async list() {
        await delay();
        return clone(db.members);
      },
      async create(input: NewMemberInput) {
        await delay();
        const created = new Date();
        const renews = new Date(created);
        renews.setDate(renews.getDate() + 30);
        const member: MemberRecord = {
          id: nextId("member"),
          name: input.name,
          email: input.email,
          whatsapp: input.whatsapp,
          playerClass: input.playerClass,
          level: 1,
          plan: input.plan,
          status: "active",
          joinedAt: created.toISOString(),
          renewsAt: renews.toISOString(),
          monthlyFee: PLAN_PRICES[input.plan],
          feeDueAt: renews.toISOString(),
          totalCheckIns: 0,
          streakDays: 0,
          seasonXp: 0
        };
        db.members = [member, ...db.members];
        return clone(member);
      },
      async update(member) {
        await delay();
        db.members = db.members.map((item) => (item.id === member.id ? clone(member) : item));
        return clone(member);
      },
      async remove(memberId) {
        await delay();
        db.members = db.members.filter((item) => item.id !== memberId);
      },
      async assignProgram(memberId, programId) {
        await delay();
        const member = db.members.find((item) => item.id === memberId);
        if (!member) {
          throw new Error("Member not found.");
        }
        member.assignedProgramId = programId;
        return clone(member);
      },
      async recordPayment(memberId) {
        await delay();
        const member = db.members.find((item) => item.id === memberId);
        if (!member) {
          throw new Error("Member not found.");
        }
        const nextDue = new Date();
        nextDue.setDate(nextDue.getDate() + 30);
        member.feeDueAt = nextDue.toISOString();
        member.reminderSentAt = undefined;
        if (member.status === "expired") {
          member.status = "active";
        }
        resolveFeeNotification(memberId);
        return clone(member);
      },
      async sendPaymentReminder(memberId) {
        await delay();
        const member = db.members.find((item) => item.id === memberId);
        if (!member) {
          throw new Error("Member not found.");
        }
        member.reminderSentAt = new Date().toISOString();
        return clone(member);
      }
    },
    attendance: {
      async feed(limit = 40) {
        await delay();
        return clone(db.checkIns.slice(0, limit));
      },
      async checkInManual(memberId) {
        await delay();
        const member = db.members.find((item) => item.id === memberId);
        if (!member) {
          throw new Error("Member not found.");
        }
        const record: CheckInRecord = {
          id: nextId("pcheck"),
          memberId: member.id,
          memberName: member.name,
          at: new Date().toISOString(),
          method: "manual"
        };
        db.checkIns = [record, ...db.checkIns];
        member.lastCheckInAt = record.at;
        member.totalCheckIns += 1;
        return clone(record);
      },
      async checkInByQr(qrPayload) {
        await delay();
        const memberId = parseMemberQrPayload(qrPayload);
        const member = memberId ? db.members.find((item) => item.id === memberId) : undefined;
        if (!member) {
          throw new Error("That QR code doesn't match a member of this gym.");
        }
        const record: CheckInRecord = {
          id: nextId("pcheck"),
          memberId: member.id,
          memberName: member.name,
          at: new Date().toISOString(),
          method: "qr"
        };
        db.checkIns = [record, ...db.checkIns];
        member.lastCheckInAt = record.at;
        member.totalCheckIns += 1;
        return clone(record);
      },
      async daily(days) {
        await delay();
        const now = new Date();
        const points: AttendancePoint[] = [];
        for (let offset = days - 1; offset >= 0; offset -= 1) {
          const day = new Date(now);
          day.setDate(day.getDate() - offset);
          points.push({
            date: day.toISOString(),
            checkIns: db.checkIns.filter((record) => isSameDay(record.at, day)).length
          });
        }
        return points;
      },
      async hourlyToday() {
        await delay();
        const current = new Date();
        const buckets: HourlyAttendancePoint[] = Array.from({ length: 17 }, (_, index) => ({
          hour: index + 6,
          checkIns: 0
        }));
        for (const record of db.checkIns) {
          if (!isSameDay(record.at, current)) continue;
          const hour = new Date(record.at).getHours();
          const bucket = buckets.find((item) => item.hour === hour);
          if (bucket) bucket.checkIns += 1;
        }
        return buckets;
      },
      async live() {
        await delay(180);
        const current = new Date();
        // No exit gates yet: assume a 45–120 min session, deterministic per
        // check-in so the estimate is stable between polls.
        const dwellMinutes = (id: string) => {
          let hash = 0;
          for (let index = 0; index < id.length; index += 1) {
            hash = (hash * 31 + id.charCodeAt(index)) | 0;
          }
          return 45 + (Math.abs(hash) % 76);
        };
        const seen = new Set<string>();
        const visitors = db.checkIns
          .filter((record) => {
            const at = new Date(record.at).getTime();
            if (at > current.getTime() || !isSameDay(record.at, current)) return false;
            return current.getTime() < at + dwellMinutes(record.id) * 60000;
          })
          .filter((record) => {
            if (seen.has(record.memberId)) return false;
            seen.add(record.memberId);
            return true;
          })
          .map((record) => ({
            memberId: record.memberId,
            memberName: record.memberName,
            since: record.at
          }))
          .sort((a, b) => new Date(b.since).getTime() - new Date(a.since).getTime());

        return {
          current: visitors.length,
          comfortCapacity: 60,
          visitors,
          updatedAt: current.toISOString()
        };
      }
    },
    classes: {
      async list() {
        await delay();
        return clone(db.classes);
      }
    },
    programs: {
      async list() {
        await delay();
        return clone(db.programs);
      },
      async listTemplates() {
        await delay();
        return clone(seedTemplates);
      }
    },
    announcements: {
      async list() {
        await delay();
        return clone(db.announcements);
      },
      async create(input: NewAnnouncementInput) {
        await delay();
        const announcement: Announcement = {
          id: nextId("ann"),
          title: input.title,
          body: input.body,
          audience: input.audience,
          status: input.scheduledFor ? "scheduled" : "draft",
          scheduledFor: input.scheduledFor
        };
        db.announcements = [announcement, ...db.announcements];
        return clone(announcement);
      },
      async send(announcementId) {
        await delay();
        const announcement = db.announcements.find((item) => item.id === announcementId);
        if (!announcement) {
          throw new Error("Announcement not found.");
        }
        announcement.status = "sent";
        announcement.sentAt = new Date().toISOString();
        return clone(announcement);
      }
    },
    analytics: {
      async kpis() {
        await delay();
        const current = new Date();
        const monthAgo = new Date(current);
        monthAgo.setDate(monthAgo.getDate() - 30);
        const kpis: PortalKpis = {
          activeMembers: db.members.filter((member) => member.status === "active").length,
          expiredMembers: db.members.filter((member) => member.status === "expired").length,
          frozenMembers: db.members.filter((member) => member.status === "frozen").length,
          checkInsToday: db.checkIns.filter((record) => isSameDay(record.at, current)).length,
          atRiskMembers: db.members.filter((member) => isAtRisk(member, current)).length,
          newThisMonth: db.members.filter((member) => new Date(member.joinedAt) >= monthAgo).length,
          overdueFees: db.members.filter(
            (member) =>
              member.status !== "expired" &&
              getFeeStatus(member.feeDueAt, current.toISOString()) === "overdue"
          ).length,
          monthlyRevenue: db.members
            .filter((member) => member.status === "active")
            .reduce((total, member) => total + PLAN_PRICES[member.plan], 0)
        };
        return kpis;
      },
      async retention() {
        await delay();
        const labels = ["Feb", "Mar", "Apr", "May", "Jun", "Jul"];
        const values = [86, 84, 88, 90, 87, 91];
        return labels.map((month, index): RetentionPoint => ({ month, retainedPct: values[index] }));
      },
      async revenue() {
        await delay();
        const labels = ["Feb", "Mar", "Apr", "May", "Jun", "Jul"];
        const base = db.members.filter((member) => member.status === "active").length * 41;
        const factors = [0.82, 0.85, 0.9, 0.94, 0.97, 1];
        return labels.map((month, index): RevenuePoint => ({
          month,
          amount: Math.round((base * factors[index]) / 10) * 10
        }));
      }
    },
    challenges: {
      async list() {
        await delay();
        return clone(seedChallenges);
      },
      async leaderboard() {
        await delay();
        return clone(seedLeaderboard);
      }
    },
    notifications: {
      async list() {
        await delay(150);
        return clone(notifications).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      },
      async markAllRead() {
        await delay(100);
        notifications = notifications.map((item) => ({ ...item, read: true }));
        return clone(notifications);
      }
    }
  };
}

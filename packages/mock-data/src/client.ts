import type {
  AchievementState,
  BodyMetricEntry,
  Challenge,
  CheckIn,
  Gym,
  LeaderboardEntry,
  MemberNotification,
  Player,
  PlayerClass,
  PlayerSettings,
  Quest,
  RatLevelClient,
  Season,
  WorkoutLog,
  WorkoutTemplate
} from "@ratlevel/domain";
import { daysUntilDue, getFeeStatus, occupancyLevel } from "@ratlevel/domain";

/**
 * Time-of-day busyness curve (morning + evening peaks) with a small wobble so
 * repeated polls feel live. Replaced by real gate data once a backend exists.
 */
function simulatedHeadCount(now: Date, comfortCapacity: number): number {
  const hour = now.getHours() + now.getMinutes() / 60;
  if (hour < 6 || hour >= 23) return 0;
  const morningPeak = 0.7 * Math.exp(-((hour - 7.5) ** 2) / 3);
  const middayFloor = 0.25 * Math.exp(-((hour - 13) ** 2) / 10);
  const eveningPeak = Math.exp(-((hour - 18.5) ** 2) / 4.5);
  const load = Math.min(morningPeak + middayFloor + eveningPeak, 1);
  const wobble = (now.getMinutes() % 7) - 3;
  return Math.max(0, Math.round(load * comfortCapacity * 0.92 + wobble));
}
import { exercises } from "./data/exercises";
import {
  daysAgo,
  seedAchievements,
  seedBodyMetrics,
  seedChallenges,
  seedCheckIns,
  seedGyms,
  seedHistory,
  seedLeaderboard,
  seedPlayer,
  seedQuests,
  seedSeason,
  seedSettings,
  seedTemplates
} from "./data/seed";

const NETWORK_DELAY_MS = 350;

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

interface MockDb {
  player: Player;
  settings: PlayerSettings;
  quests: Quest[];
  achievements: AchievementState[];
  challenges: Challenge[];
  season: Season;
  leaderboard: LeaderboardEntry[];
  templates: WorkoutTemplate[];
  history: WorkoutLog[];
  checkIns: CheckIn[];
  bodyMetrics: BodyMetricEntry[];
  gyms: Gym[];
  notifications: MemberNotification[];
}

/** A real backend pushes these; the mock derives them from the fee state at startup. */
function buildPaymentNotifications(player: Player, now: string): MemberNotification[] {
  const status = getFeeStatus(player.membership.feeDueAt, now);
  if (status === "paid") return [];
  const days = daysUntilDue(player.membership.feeDueAt, now);
  if (status === "overdue") {
    return [
      {
        id: "notif-payment-overdue",
        type: "payment_overdue",
        title: "Membership fee overdue",
        body: `Your €${player.membership.monthlyFee} ${player.membership.plan} fee was due ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} ago. Settle it at the front desk to keep gym access.`,
        createdAt: now,
        read: false
      }
    ];
  }
  return [
    {
      id: "notif-payment-due",
      type: "payment_due",
      title: "Membership fee due soon",
      body: `Your €${player.membership.monthlyFee} ${player.membership.plan} fee is due in ${days} day${days === 1 ? "" : "s"}. Pay on time to keep your streak — and your access — alive.`,
      createdAt: now,
      read: false
    }
  ];
}

/**
 * In-memory implementation of the RatLevel backend contracts. State lives
 * for the lifetime of the JS process; swapping this for a real API client is
 * a one-line change where the client is constructed.
 */
export function createMockClient(): RatLevelClient {
  const db: MockDb = clone({
    player: seedPlayer,
    settings: seedSettings,
    quests: seedQuests,
    achievements: seedAchievements,
    challenges: seedChallenges,
    season: seedSeason,
    leaderboard: seedLeaderboard,
    templates: seedTemplates,
    history: seedHistory,
    checkIns: seedCheckIns,
    bodyMetrics: seedBodyMetrics,
    gyms: seedGyms,
    notifications: [
      ...buildPaymentNotifications(seedPlayer, new Date().toISOString()),
      {
        id: "notif-welcome-season",
        type: "info" as const,
        title: "Season 01 is live",
        body: "Climb the ladder before it closes — top 10 unlock the Neon Vanguard badge.",
        createdAt: daysAgo(3, 10),
        read: true
      }
    ]
  });

  const syncLeaderboard = () => {
    const entry = db.leaderboard.find((item) => item.isCurrentUser);
    if (entry) {
      entry.xp = db.player.seasonXp;
      entry.name = db.player.name;
    }
    db.leaderboard.sort((a, b) => b.xp - a.xp);
  };

  return {
    players: {
      async getPlayer() {
        await delay();
        return clone(db.player);
      },
      async savePlayer(player) {
        await delay(150);
        db.player = clone(player);
        syncLeaderboard();
        return clone(db.player);
      },
      async createCharacter(input: {
        name: string;
        playerClass: PlayerClass;
        gymId: string;
        whatsappNumber?: string;
      }) {
        await delay();
        db.player = {
          ...db.player,
          name: input.name,
          playerClass: input.playerClass,
          gymId: input.gymId,
          whatsappNumber: input.whatsappNumber ?? db.player.whatsappNumber,
          membership: { ...db.player.membership, gymId: input.gymId }
        };
        syncLeaderboard();
        return clone(db.player);
      },
      async getSettings() {
        await delay(120);
        return clone(db.settings);
      },
      async saveSettings(settings) {
        await delay(120);
        db.settings = clone(settings);
        return clone(db.settings);
      }
    },
    gyms: {
      async listGyms() {
        await delay();
        return clone(db.gyms);
      },
      async getGym(gymId) {
        await delay(100);
        return clone(db.gyms.find((gym) => gym.id === gymId));
      },
      async getOccupancy(gymId) {
        await delay(120);
        const gym = db.gyms.find((item) => item.id === gymId);
        if (!gym) {
          throw new Error("Gym not found.");
        }
        const now = new Date();
        const current = gym.openNow ? simulatedHeadCount(now, gym.comfortCapacity) : 0;
        return {
          current,
          comfortCapacity: gym.comfortCapacity,
          level: occupancyLevel(current, gym.comfortCapacity),
          updatedAt: now.toISOString()
        };
      }
    },
    checkIns: {
      async listCheckIns() {
        await delay(150);
        return clone(db.checkIns);
      },
      async checkIn(gymId, method, _verification) {
        // Verification is only meaningful against a real gym record; the
        // mock trusts the client the same way the old mobile-only demo did.
        await delay();
        const entry: CheckIn = { id: nextId("checkin"), gymId, at: new Date().toISOString(), method };
        db.checkIns = [entry, ...db.checkIns];
        return clone(entry);
      }
    },
    workouts: {
      async listExercises() {
        await delay(150);
        return clone(exercises);
      },
      async listTemplates() {
        await delay(150);
        return clone(db.templates);
      },
      async listHistory() {
        await delay(150);
        return clone(db.history);
      },
      async saveWorkout(logEntry) {
        await delay();
        db.history = [clone(logEntry), ...db.history];
        return clone(logEntry);
      }
    },
    quests: {
      async listQuests() {
        await delay(150);
        return clone(db.quests);
      },
      async saveQuests(quests) {
        await delay(120);
        db.quests = clone(quests);
        return clone(db.quests);
      }
    },
    achievements: {
      async listAchievements() {
        await delay(150);
        return clone(db.achievements);
      },
      async saveAchievements(achievements) {
        await delay(120);
        db.achievements = clone(achievements);
        return clone(db.achievements);
      }
    },
    challenges: {
      async listChallenges() {
        await delay(150);
        return clone(db.challenges);
      },
      async saveChallenges(challenges) {
        await delay(120);
        db.challenges = clone(challenges);
        return clone(db.challenges);
      }
    },
    seasons: {
      async getCurrentSeason() {
        await delay(100);
        return clone(db.season);
      },
      async getLeaderboard() {
        await delay();
        syncLeaderboard();
        return clone(db.leaderboard);
      }
    },
    notifications: {
      async list() {
        await delay(120);
        return clone(db.notifications).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      },
      async markAllRead() {
        await delay(100);
        db.notifications = db.notifications.map((item) => ({ ...item, read: true }));
        return clone(db.notifications);
      }
    },
    body: {
      async listBodyMetrics() {
        await delay(150);
        return clone(db.bodyMetrics);
      },
      async addBodyMetric(entry) {
        await delay();
        const record: BodyMetricEntry = { ...clone(entry), id: nextId("body") };
        db.bodyMetrics = [...db.bodyMetrics, record].sort(
          (a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()
        );
        return clone(record);
      }
    }
  };
}

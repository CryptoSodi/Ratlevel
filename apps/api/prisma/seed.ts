import { PrismaClient } from "@prisma/client";
import { totalXpForLevel } from "@ratlevel/gamification";
import {
  buildPortalSeed,
  daysAgo,
  seedBodyMetrics,
  seedChallenges,
  seedCheckIns,
  seedGyms,
  seedHistory,
  seedPlayer,
  seedQuests,
  seedSeason,
  seedSettings
} from "@ratlevel/mock-data";
import { ACHIEVEMENT_DEFS, EXERCISES, WORKOUT_TEMPLATES } from "../src/lib/seedData";
import { hashPassword } from "../src/lib/auth";

const db = new PrismaClient();

/** Deterministic PRNG so re-seeding produces the same demo data every time. */
function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DEMO_PASSWORD = "ratlevel-demo";
const HERO_GYM_ID = seedGyms[0].id; // gym-iron-district

async function main() {
  console.log("Clearing existing data...");
  await db.$transaction([
    db.memberNotification.deleteMany(),
    db.adminNotification.deleteMany(),
    db.bodyMetricEntry.deleteMany(),
    db.checkIn.deleteMany(),
    db.workoutLog.deleteMany(),
    db.quest.deleteMany(),
    db.playerAchievement.deleteMany(),
    db.challengeParticipant.deleteMany(),
    db.announcement.deleteMany(),
    db.program.deleteMany(),
    db.gymClass.deleteMany(),
    db.membership.deleteMany(),
    db.player.deleteMany(),
    db.staffAccount.deleteMany(),
    db.challenge.deleteMany(),
    db.season.deleteMany(),
    db.workoutTemplate.deleteMany(),
    db.exercise.deleteMany(),
    db.achievementDefinition.deleteMany(),
    db.gym.deleteMany()
  ]);

  console.log("Seeding gyms...");
  for (const gym of seedGyms) {
    await db.gym.create({
      data: {
        id: gym.id,
        name: gym.name,
        city: gym.city,
        latitude: gym.latitude,
        longitude: gym.longitude,
        geofenceRadiusM: gym.geofenceRadiusM,
        entryQrCode: gym.entryQrCode,
        comfortCapacity: gym.comfortCapacity,
        openNow: gym.openNow
      }
    });
  }

  console.log("Seeding exercises & workout templates...");
  await db.exercise.createMany({ data: EXERCISES.map((exercise) => ({ ...exercise })) });
  await db.workoutTemplate.createMany({
    data: WORKOUT_TEMPLATES.map((template) => ({
      id: template.id,
      name: template.name,
      focus: template.focus,
      exerciseIds: JSON.stringify(template.exerciseIds),
      estimatedMinutes: template.estimatedMinutes
    }))
  });

  console.log("Seeding achievement definitions...");
  await db.achievementDefinition.createMany({ data: ACHIEVEMENT_DEFS.map((def) => ({ ...def })) });

  console.log("Seeding season & challenges...");
  await db.season.create({
    data: {
      id: seedSeason.id,
      number: seedSeason.number,
      name: seedSeason.name,
      startsAt: new Date(seedSeason.startsAt),
      endsAt: new Date(seedSeason.endsAt)
    }
  });
  for (const challenge of seedChallenges) {
    await db.challenge.create({
      data: {
        id: challenge.id,
        name: challenge.name,
        description: challenge.description,
        metric: challenge.metric,
        goal: challenge.goal,
        endsAt: new Date(challenge.endsAt),
        rewardXp: challenge.rewardXp,
        rewardLabel: challenge.rewardLabel
      }
    });
  }

  console.log("Seeding staff accounts...");
  const portalSeed = buildPortalSeed();
  const staffPasswordHash = await hashPassword(DEMO_PASSWORD);
  for (const staff of portalSeed.staff) {
    await db.staffAccount.create({
      data: {
        id: staff.id,
        name: staff.name,
        email: staff.email,
        passwordHash: staffPasswordHash,
        role: staff.role,
        active: staff.active,
        lastActiveAt: new Date(staff.lastActiveAt)
      }
    });
  }

  console.log("Seeding hero player (Tassa)...");
  // No passwordHash / googleId: members sign in with Google in production;
  // this seeded account is reachable locally via POST /auth/member/dev-login.
  await db.player.create({
    data: {
      id: seedPlayer.id,
      email: "tassa@ratlevel.dev",
      name: seedPlayer.name,
      title: seedPlayer.title,
      playerClass: seedPlayer.playerClass,
      gymId: seedPlayer.gymId,
      totalXp: seedPlayer.totalXp,
      seasonXp: seedPlayer.seasonXp,
      streakDays: seedPlayer.streakDays,
      longestStreak: seedPlayer.longestStreak,
      personalRecords: seedPlayer.personalRecords,
      whatsappNumber: seedPlayer.whatsappNumber,
      joinedAt: new Date(seedPlayer.joinedAt),
      units: seedSettings.units,
      workoutReminders: seedSettings.workoutReminders,
      questAlerts: seedSettings.questAlerts,
      leaderboardVisible: seedSettings.leaderboardVisible,
      strength: seedPlayer.stats.strength,
      endurance: seedPlayer.stats.endurance,
      power: seedPlayer.stats.power,
      speed: seedPlayer.stats.speed,
      discipline: seedPlayer.stats.discipline,
      consistency: seedPlayer.stats.consistency,
      recovery: seedPlayer.stats.recovery,
      membership: {
        create: {
          gymId: seedPlayer.membership.gymId,
          plan: seedPlayer.membership.plan,
          status: seedPlayer.membership.status,
          cardNumber: seedPlayer.membership.cardNumber,
          memberSince: new Date(seedPlayer.membership.memberSince),
          monthlyFee: seedPlayer.membership.monthlyFee,
          feeDueAt: new Date(seedPlayer.membership.feeDueAt)
        }
      }
    }
  });

  console.log("Seeding hero quests, achievements, history, check-ins, body metrics...");
  await db.quest.createMany({
    data: seedQuests.map((quest) => ({
      id: quest.id,
      playerId: seedPlayer.id,
      scope: quest.scope,
      title: quest.title,
      description: quest.description,
      metric: quest.metric,
      target: quest.target,
      progress: quest.progress,
      xp: quest.xp,
      completed: quest.completed,
      claimed: quest.claimed
    }))
  });

  const { seedAchievements } = await import("@ratlevel/mock-data");
  for (const achievement of seedAchievements) {
    await db.playerAchievement.create({
      data: {
        playerId: seedPlayer.id,
        achievementId: achievement.id,
        unlockedAt: achievement.unlockedAt ? new Date(achievement.unlockedAt) : null
      }
    });
  }

  await db.workoutLog.createMany({
    data: seedHistory.map((log) => ({
      id: log.id,
      playerId: seedPlayer.id,
      name: log.name,
      performedAt: new Date(log.performedAt),
      durationMin: log.durationMin,
      entries: JSON.stringify(log.entries),
      totalVolumeKg: log.totalVolumeKg,
      totalSets: log.totalSets,
      xpAwarded: log.xpAwarded,
      prCount: log.prCount
    }))
  });

  await db.checkIn.createMany({
    data: seedCheckIns.map((checkIn) => ({
      id: checkIn.id,
      playerId: seedPlayer.id,
      gymId: checkIn.gymId,
      at: new Date(checkIn.at),
      method: checkIn.method
    }))
  });

  await db.bodyMetricEntry.createMany({
    data: seedBodyMetrics.map((entry) => ({
      id: entry.id,
      playerId: seedPlayer.id,
      recordedAt: new Date(entry.recordedAt),
      weightKg: entry.weightKg,
      chestCm: entry.chestCm,
      waistCm: entry.waistCm,
      armCm: entry.armCm
    }))
  });

  await db.challengeParticipant.createMany({
    data: seedChallenges.map((challenge) => ({
      challengeId: challenge.id,
      playerId: seedPlayer.id,
      progress: challenge.progress,
      joined: challenge.joined
    }))
  });

  console.log(`Seeding ${portalSeed.members.length} additional gym members...`);
  for (const member of portalSeed.members) {
    await db.player.create({
      data: {
        id: member.id,
        email: member.email,
        name: member.name,
        playerClass: member.playerClass,
        gymId: HERO_GYM_ID,
        totalXp: totalXpForLevel(member.level),
        seasonXp: member.seasonXp,
        streakDays: member.streakDays,
        longestStreak: member.streakDays,
        whatsappNumber: member.whatsapp,
        joinedAt: new Date(member.joinedAt),
        assignedProgramId: member.assignedProgramId,
        membership: {
          create: {
            gymId: HERO_GYM_ID,
            plan: member.plan,
            status: member.status,
            cardNumber: `${4000 + Math.floor(Math.random() * 5999)} ${1000 + Math.floor(Math.random() * 8999)} ${1000 + Math.floor(Math.random() * 8999)} ${1000 + Math.floor(Math.random() * 8999)}`,
            memberSince: new Date(member.joinedAt),
            monthlyFee: member.monthlyFee,
            feeDueAt: new Date(member.feeDueAt)
          }
        }
      }
    });
  }

  console.log("Seeding member check-ins (this powers the live floor & attendance charts)...");
  await db.checkIn.createMany({
    data: portalSeed.checkIns.map((checkIn) => ({
      playerId: checkIn.memberId,
      gymId: HERO_GYM_ID,
      at: new Date(checkIn.at),
      method: checkIn.method
    }))
  });

  console.log("Seeding challenge participation for the wider member base...");
  const random = mulberry32(7331);
  const joinRateByChallenge: Record<string, number> = {
    "chal-strength-ladder": 0.55,
    "chal-boss-rush": 0.3,
    "chal-attendance": 0.2
  };
  for (const member of portalSeed.members) {
    for (const challenge of seedChallenges) {
      const joined = random() < (joinRateByChallenge[challenge.id] ?? 0.3);
      await db.challengeParticipant.create({
        data: {
          challengeId: challenge.id,
          playerId: member.id,
          joined,
          progress: joined ? Math.floor(random() * challenge.goal) : 0
        }
      });
    }
  }

  console.log("Seeding classes, programs, announcements...");
  await db.gymClass.createMany({
    data: portalSeed.classes.map((gymClass) => ({ ...gymClass, gymId: HERO_GYM_ID }))
  });
  await db.program.createMany({
    data: portalSeed.programs.map((program) => ({
      id: program.id,
      gymId: HERO_GYM_ID,
      name: program.name,
      focus: program.focus,
      weeks: program.weeks,
      templateIds: JSON.stringify(program.templateIds)
    }))
  });
  await db.announcement.createMany({
    data: portalSeed.announcements.map((announcement) => ({
      id: announcement.id,
      gymId: HERO_GYM_ID,
      title: announcement.title,
      body: announcement.body,
      audience: announcement.audience,
      status: announcement.status,
      scheduledFor: announcement.scheduledFor ? new Date(announcement.scheduledFor) : null,
      sentAt: announcement.sentAt ? new Date(announcement.sentAt) : null
    }))
  });

  const totalMembers = portalSeed.members.length + 1;
  console.log(`\nDone. Seeded ${totalMembers} members across ${seedGyms.length} gyms.`);
  console.log(`\nDemo logins:`);
  console.log(`  Member app (dev bypass, no real Google account needed) -> POST /auth/member/dev-login { email: "tassa@ratlevel.dev" }`);
  console.log(`  Staff portal (password: "${DEMO_PASSWORD}" for all) -> owner@irondistrict.gym (or sam@, kim@, andre@irondistrict.gym)`);
  console.log(`  Reference: ${daysAgo(0)}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });

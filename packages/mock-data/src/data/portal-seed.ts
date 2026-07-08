import type {
  Announcement,
  CheckInRecord,
  GymClass,
  MemberRecord,
  MembershipPlan,
  MembershipStatus,
  PlayerClass,
  Program,
  StaffAccount
} from "@ratlevel/domain";
import { daysAgo, daysAhead } from "./seed";

/** Deterministic PRNG so portal analytics stay stable between reloads. */
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

const FIRST_NAMES = [
  "Nadia", "Marco", "Yuki", "Jess", "Omar", "Priya", "Ben", "Lena", "Tomás", "Aisha",
  "Viktor", "Sofia", "Daan", "Emma", "Noah", "Zoe", "Liam", "Mila", "Finn", "Sara",
  "Ravi", "Elif", "Jonas", "Ines", "Kofi", "Anouk", "Pavel", "Rosa", "Dmitri", "Chloe",
  "Hugo", "Freya", "Mateo", "Ida", "Sven", "Nora", "Tariq", "Eva", "Bram", "Luna",
  "Oscar", "Maya", "Felix", "Amara", "Jan", "Tess", "Ciro", "Vera"
];
const LAST_NAMES = [
  "Visser", "Rossi", "Tanaka", "Bakker", "Haddad", "Sharma", "Cole", "Meyer", "Silva",
  "Khan", "Novak", "Costa", "Jansen", "Weber", "Berg", "Lang", "Smit", "Mori", "Dekker",
  "Lindqvist", "Kaya", "Petrov", "Mensah", "Vos", "Marino", "Fischer", "Olsen", "Diaz"
];

const PLANS: MembershipPlan[] = ["Core", "Plus", "Max"];
const CLASSES_POOL: PlayerClass[] = ["Vanguard", "Strider", "Sentinel", "Medic"];
export const PLAN_PRICES: Record<MembershipPlan, number> = { Core: 29, Plus: 44, Max: 59 };

export interface PortalSeed {
  staff: StaffAccount[];
  members: MemberRecord[];
  checkIns: CheckInRecord[];
  classes: GymClass[];
  programs: Program[];
  announcements: Announcement[];
}

export function buildPortalSeed(): PortalSeed {
  const random = mulberry32(1337);
  const pick = <T>(items: T[]): T => items[Math.floor(random() * items.length)];

  const staff: StaffAccount[] = [
    { id: "staff-1", name: "Robin Hart", email: "owner@irondistrict.gym", role: "owner", active: true, lastActiveAt: daysAgo(0, 9) },
    { id: "staff-2", name: "Sam Idrissi", email: "sam@irondistrict.gym", role: "manager", active: true, lastActiveAt: daysAgo(0, 8) },
    { id: "staff-3", name: "Kim Verhoeven", email: "kim@irondistrict.gym", role: "frontdesk", active: true, lastActiveAt: daysAgo(1, 17) },
    { id: "staff-4", name: "Andre Costa", email: "andre@irondistrict.gym", role: "coach", active: true, lastActiveAt: daysAgo(0, 7) },
    { id: "staff-5", name: "Mo Farouk", email: "mo@irondistrict.gym", role: "coach", active: false, lastActiveAt: daysAgo(45) }
  ];

  const members: MemberRecord[] = [];
  const usedNames = new Set<string>();
  for (let index = 0; index < 48; index += 1) {
    let name = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
    while (usedNames.has(name)) {
      name = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
    }
    usedNames.add(name);

    const joinedDaysAgo = Math.floor(random() * 700) + 10;
    const roll = random();
    const status: MembershipStatus = roll < 0.78 ? "active" : roll < 0.88 ? "frozen" : "expired";
    const lastCheckInDaysAgo =
      status === "expired"
        ? 30 + Math.floor(random() * 90)
        : random() < 0.25
          ? 10 + Math.floor(random() * 20)
          : Math.floor(random() * 7);
    const level = 1 + Math.floor(random() * 34);
    const plan = pick(PLANS);
    // ~15% of non-expired members have an overdue fee; the rest are due within a month.
    const feeRoll = random();
    const feeDueAt =
      status === "expired" || feeRoll < 0.15
        ? daysAgo(1 + Math.floor(random() * 20))
        : daysAhead(1 + Math.floor(random() * 30));

    members.push({
      id: `member-${index + 1}`,
      name,
      email: `${name.toLowerCase().replace(/[^a-z]+/g, ".")}@example.com`,
      whatsapp: random() < 0.8 ? `+31 6 ${1000 + Math.floor(random() * 9000)} ${1000 + Math.floor(random() * 9000)}` : undefined,
      playerClass: pick(CLASSES_POOL),
      level,
      plan,
      status,
      joinedAt: daysAgo(joinedDaysAgo),
      renewsAt: status === "expired" ? daysAgo(Math.floor(random() * 60) + 1) : daysAhead(Math.floor(random() * 90) + 3),
      monthlyFee: PLAN_PRICES[plan],
      feeDueAt,
      lastCheckInAt: daysAgo(lastCheckInDaysAgo, 7 + Math.floor(random() * 14)),
      totalCheckIns: Math.floor(joinedDaysAgo * (0.15 + random() * 0.35)),
      streakDays: status === "active" && lastCheckInDaysAgo <= 1 ? Math.floor(random() * 21) : 0,
      seasonXp: Math.floor(random() * 19000),
      assignedProgramId: random() < 0.4 ? `prog-${1 + Math.floor(random() * 4)}` : undefined
    });
  }

  const checkIns: CheckInRecord[] = [];
  let checkInId = 0;
  const activeMembers = members.filter((member) => member.status !== "expired");
  for (let day = 34; day >= 0; day -= 1) {
    const weekday = (new Date(daysAgo(day)).getDay() + 6) % 7;
    const base = weekday >= 5 ? 18 : 34;
    const count = base + Math.floor(random() * 14) - (day === 0 ? 8 : 0);
    for (let visit = 0; visit < Math.max(count, 4); visit += 1) {
      const member = pick(activeMembers);
      const hour = random() < 0.45 ? 17 + Math.floor(random() * 4) : 6 + Math.floor(random() * 11);
      checkInId += 1;
      checkIns.push({
        id: `pcheck-${checkInId}`,
        memberId: member.id,
        memberName: member.name,
        at: daysAgo(day, hour),
        method: random() < 0.85 ? "qr" : "manual"
      });
    }
  }
  checkIns.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  const classes: GymClass[] = [
    { id: "class-1", name: "Strength Foundations", coachName: "Andre Costa", weekday: 0, startTime: "07:00", durationMin: 60, capacity: 14, booked: 12, location: "Lifting floor" },
    { id: "class-2", name: "Boss Rush HIIT", coachName: "Mo Farouk", weekday: 0, startTime: "18:30", durationMin: 45, capacity: 20, booked: 20, location: "Studio A" },
    { id: "class-3", name: "Mobility & Recovery", coachName: "Andre Costa", weekday: 1, startTime: "19:00", durationMin: 45, capacity: 16, booked: 9, location: "Studio B" },
    { id: "class-4", name: "Engine Builder Row", coachName: "Mo Farouk", weekday: 2, startTime: "06:30", durationMin: 45, capacity: 12, booked: 11, location: "Cardio deck" },
    { id: "class-5", name: "Squad PR Night", coachName: "Andre Costa", weekday: 3, startTime: "18:00", durationMin: 75, capacity: 18, booked: 16, location: "Lifting floor" },
    { id: "class-6", name: "Strength Foundations", coachName: "Andre Costa", weekday: 4, startTime: "07:00", durationMin: 60, capacity: 14, booked: 8, location: "Lifting floor" },
    { id: "class-7", name: "Weekend Warriors", coachName: "Mo Farouk", weekday: 5, startTime: "10:00", durationMin: 60, capacity: 24, booked: 19, location: "Studio A" },
    { id: "class-8", name: "Long Zone 2", coachName: "Mo Farouk", weekday: 6, startTime: "09:00", durationMin: 90, capacity: 15, booked: 6, location: "Cardio deck" }
  ];

  const programs: Program[] = [
    { id: "prog-1", name: "Onboarding: First Ascent", focus: "New member fundamentals", weeks: 4, templateIds: ["tpl-full", "tpl-engine"] },
    { id: "prog-2", name: "Strength Block A", focus: "Push / pull / legs split", weeks: 8, templateIds: ["tpl-push", "tpl-pull", "tpl-legs"] },
    { id: "prog-3", name: "Engine Season", focus: "Conditioning + core", weeks: 6, templateIds: ["tpl-engine", "tpl-full"] },
    { id: "prog-4", name: "PR Prep", focus: "Peaking for testing week", weeks: 3, templateIds: ["tpl-push", "tpl-legs"] }
  ];

  const announcements: Announcement[] = [
    {
      id: "ann-1",
      title: "Season 01 leaderboard rewards",
      body: "Top 10 season finishers unlock the Neon Vanguard badge and a free PT session. Ladder closes soon — check the app.",
      audience: "all",
      status: "sent",
      sentAt: daysAgo(3, 10)
    },
    {
      id: "ann-2",
      title: "New class: Boss Rush HIIT",
      body: "Monday 18:30 with coach Mo. 45 minutes, brutal, worth double streak XP during launch week.",
      audience: "active",
      status: "sent",
      sentAt: daysAgo(9, 12)
    },
    {
      id: "ann-3",
      title: "We miss you — comeback week",
      body: "Your streak is waiting. Check in this week and we'll restore 3 streak days.",
      audience: "at-risk",
      status: "draft"
    }
  ];

  return { staff, members, checkIns, classes, programs, announcements };
}

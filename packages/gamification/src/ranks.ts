import type { RankStanding, RankTier } from "@ratlevel/domain";

interface RankStep {
  tier: RankTier;
  division: 1 | 2 | 3;
  minSeasonXp: number;
}

const TIERS: Array<{ tier: RankTier; base: number; step: number }> = [
  { tier: "Bronze", base: 0, step: 800 },
  { tier: "Silver", base: 2400, step: 1200 },
  { tier: "Gold", base: 6000, step: 1800 },
  { tier: "Platinum", base: 11400, step: 2600 },
  { tier: "Diamond", base: 19200, step: 3600 },
  { tier: "Mythic", base: 30000, step: 6000 }
];

/** Full ladder, Bronze III -> Mythic I. Division 3 is the entry division of each tier. */
export const RANK_LADDER: RankStep[] = TIERS.flatMap(({ tier, base, step }) =>
  ([3, 2, 1] as const).map((division, index) => ({
    tier,
    division,
    minSeasonXp: base + index * step
  }))
);

export function rankLabel(step: Pick<RankStep, "tier" | "division">): string {
  const numerals: Record<1 | 2 | 3, string> = { 1: "I", 2: "II", 3: "III" };
  return `${step.tier} ${numerals[step.division]}`;
}

export function rankFromSeasonXp(seasonXp: number): RankStanding {
  const xp = Math.max(0, seasonXp);
  let index = 0;
  for (let i = RANK_LADDER.length - 1; i >= 0; i -= 1) {
    if (xp >= RANK_LADDER[i].minSeasonXp) {
      index = i;
      break;
    }
  }

  const step = RANK_LADDER[index];
  const next = index + 1 < RANK_LADDER.length ? RANK_LADDER[index + 1] : undefined;
  const xpIntoRank = xp - step.minSeasonXp;
  const xpForNextRank = next ? next.minSeasonXp - step.minSeasonXp : undefined;

  return {
    tier: step.tier,
    division: step.division,
    label: rankLabel(step),
    minSeasonXp: step.minSeasonXp,
    nextLabel: next ? rankLabel(next) : undefined,
    xpIntoRank,
    xpForNextRank,
    progress: xpForNextRank ? Math.min(xpIntoRank / xpForNextRank, 1) : 1
  };
}

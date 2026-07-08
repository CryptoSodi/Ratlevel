export const MAX_LEVEL = 100;

/** XP needed to advance from `level` to `level + 1`. Grows super-linearly so early levels feel fast and late levels feel earned. */
export function xpRequiredForLevel(level: number): number {
  const clamped = Math.max(1, Math.min(level, MAX_LEVEL));
  return Math.round(600 + 140 * Math.pow(clamped, 1.28));
}

/** Total XP required to reach `level` from level 1. */
export function totalXpForLevel(level: number): number {
  let total = 0;
  for (let current = 1; current < level; current += 1) {
    total += xpRequiredForLevel(current);
  }
  return total;
}

export interface LevelProgress {
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  progress: number;
}

export function levelFromTotalXp(totalXp: number): LevelProgress {
  const safeXp = Math.max(0, Math.floor(totalXp));
  let level = 1;
  let remaining = safeXp;

  while (level < MAX_LEVEL && remaining >= xpRequiredForLevel(level)) {
    remaining -= xpRequiredForLevel(level);
    level += 1;
  }

  const xpForNextLevel = xpRequiredForLevel(level);
  return {
    level,
    xpIntoLevel: remaining,
    xpForNextLevel,
    progress: Math.min(remaining / xpForNextLevel, 1)
  };
}

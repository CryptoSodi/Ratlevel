const DAY_MS = 24 * 60 * 60 * 1000;

function dayStamp(iso: string): number {
  const date = new Date(iso);
  return Math.floor(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / DAY_MS
  );
}

export interface StreakResult {
  current: number;
  longest: number;
}

/**
 * Streak = consecutive calendar days (UTC) with at least one activity,
 * counting back from today or yesterday (so a streak survives until the
 * end of the following day).
 */
export function computeStreak(activityDates: string[], now: string): StreakResult {
  const days = [...new Set(activityDates.map(dayStamp))].sort((a, b) => a - b);
  if (days.length === 0) {
    return { current: 0, longest: 0 };
  }

  let longest = 1;
  let run = 1;
  for (let index = 1; index < days.length; index += 1) {
    run = days[index] === days[index - 1] + 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
  }

  const today = dayStamp(now);
  const lastDay = days[days.length - 1];
  if (lastDay !== today && lastDay !== today - 1) {
    return { current: 0, longest };
  }

  let current = 1;
  for (let index = days.length - 1; index > 0; index -= 1) {
    if (days[index] === days[index - 1] + 1) {
      current += 1;
    } else {
      break;
    }
  }
  return { current, longest };
}

/** Multiplier applied to workout XP. Capped so streaks reward consistency without dwarfing effort. */
export function streakMultiplier(streakDays: number): number {
  if (streakDays >= 30) return 1.25;
  if (streakDays >= 14) return 1.15;
  if (streakDays >= 7) return 1.1;
  if (streakDays >= 3) return 1.05;
  return 1;
}

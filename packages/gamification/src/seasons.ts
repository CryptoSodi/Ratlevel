import type { Season } from "@ratlevel/domain";

export interface SeasonProgress {
  daysLeft: number;
  elapsed: number;
}

export function seasonProgress(season: Season, now: string): SeasonProgress {
  const start = new Date(season.startsAt).getTime();
  const end = new Date(season.endsAt).getTime();
  const current = new Date(now).getTime();
  const daysLeft = Math.max(0, Math.ceil((end - current) / (24 * 60 * 60 * 1000)));
  const elapsed = end > start ? Math.min(Math.max((current - start) / (end - start), 0), 1) : 1;
  return { daysLeft, elapsed };
}

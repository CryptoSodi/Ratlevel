import type { Challenge, ChallengeMetric } from "@ratlevel/domain";
import type { ActivityEvent } from "./events";

const METRIC_FROM_EVENT: Record<ChallengeMetric, (event: ActivityEvent) => number> = {
  volume_kg: (event) => event.volumeKg,
  workouts_logged: (event) => event.workoutsLogged,
  check_ins: (event) => event.checkIns
};

export function applyEventToChallenges(challenges: Challenge[], event: ActivityEvent): Challenge[] {
  return challenges.map((challenge) => {
    if (!challenge.joined || challenge.progress >= challenge.goal) return challenge;
    const delta = METRIC_FROM_EVENT[challenge.metric](event);
    if (delta === 0) return challenge;
    return { ...challenge, progress: Math.min(challenge.progress + delta, challenge.goal) };
  });
}

export function challengeProgress(challenge: Challenge): number {
  return Math.min(challenge.progress / challenge.goal, 1);
}

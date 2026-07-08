import { challengeProgress } from "@ratlevel/gamification";

import { EmptyState, ErrorCard, LoadingCard, ProgressBar } from "@/components/ui";
import { formatDate, initials } from "@/lib/format";
import { useAsync } from "@/lib/useAsync";
import { usePortal } from "@/state/PortalStore";

export function ChallengesPage() {
  const { client } = usePortal();
  const state = useAsync(async () => {
    const [challenges, leaderboard] = await Promise.all([
      client.challenges.list(),
      client.challenges.leaderboard()
    ]);
    return { challenges, leaderboard };
  });

  if (state.error) return <ErrorCard message={state.error} onRetry={() => void state.reload()} />;
  if (state.loading || !state.data) return <LoadingCard height={420} />;

  const { challenges, leaderboard } = state.data;

  return (
    <div className="page-row two-col">
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {challenges.length === 0 && (
          <div className="card">
            <EmptyState icon="★" message="No challenges running. Create one to spike engagement." />
          </div>
        )}
        {challenges.map((challenge) => (
          <div key={challenge.id} className="card">
            <div className="card-title">
              {challenge.name}
              <span className="hint">ends {formatDate(challenge.endsAt)}</span>
            </div>
            <div className="muted" style={{ fontSize: 13, fontWeight: 600 }}>
              {challenge.description}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <ProgressBar progress={challengeProgress(challenge)} color="var(--c-xp)" />
              <span className="muted" style={{ fontSize: 12, whiteSpace: "nowrap" }}>
                {Math.round(challengeProgress(challenge) * 100)}%
              </span>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span className="badge blue">{challenge.entrants.toLocaleString()} entrants</span>
              <span className="badge purple">+{challenge.rewardXp.toLocaleString()} XP</span>
              <span className="badge gray">{challenge.rewardLabel}</span>
            </div>
          </div>
        ))}
        <div className="card">
          <div className="muted" style={{ fontSize: 12, fontWeight: 600 }}>
            Challenge creation ships with the backend — today's challenges are seeded and shared
            with the member app.
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">
          Gym leaderboard
          <span className="hint muted">Season XP</span>
        </div>
        {leaderboard.length === 0 ? (
          <EmptyState icon="★" message="No ranked members yet." />
        ) : (
          <div className="feed">
            {leaderboard.map((entry, index) => (
              <div key={entry.playerId} className="feed-row">
                <span
                  className={`badge ${index === 0 ? "amber" : index < 3 ? "blue" : "gray"}`}
                  style={{ minWidth: 32, justifyContent: "center" }}
                >
                  #{index + 1}
                </span>
                <div className="avatar" aria-hidden>
                  {initials(entry.name)}
                </div>
                <div>
                  <div style={{ fontWeight: 700 }}>{entry.name}</div>
                  <div className="muted" style={{ fontSize: 12 }}>
                    {entry.title} · LVL {entry.level}
                  </div>
                </div>
                <div className="feed-time">{entry.xp.toLocaleString()} XP</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

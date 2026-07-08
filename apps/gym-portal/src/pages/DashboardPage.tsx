import { useNavigate } from "react-router-dom";
import { isAtRisk } from "@ratlevel/mock-data";

import { BarChart, LineChart } from "@/components/charts";
import { EmptyState, ErrorCard, KpiCard, LoadingCard } from "@/components/ui";
import { formatCurrency, formatRelative, formatTime, initials } from "@/lib/format";
import { useAsync } from "@/lib/useAsync";
import { usePortal } from "@/state/PortalStore";

export function DashboardPage() {
  const { client } = usePortal();
  const navigate = useNavigate();

  const state = useAsync(async () => {
    const [kpis, daily, hourly, feed, members, live] = await Promise.all([
      client.analytics.kpis(),
      client.attendance.daily(14),
      client.attendance.hourlyToday(),
      client.attendance.feed(8),
      client.members.list(),
      client.attendance.live()
    ]);
    return { kpis, daily, hourly, feed, members, live };
  });

  if (state.error) return <ErrorCard message={state.error} onRetry={() => void state.reload()} />;
  if (state.loading || !state.data) {
    return (
      <>
        <div className="kpi-grid">
          {Array.from({ length: 5 }, (_, index) => (
            <LoadingCard key={index} height={110} />
          ))}
        </div>
        <LoadingCard height={280} />
      </>
    );
  }

  const { kpis, daily, hourly, feed, members, live } = state.data;
  const atRisk = members.filter((member) => isAtRisk(member)).slice(0, 6);

  return (
    <>
      <div className="kpi-grid">
        <KpiCard label="In the gym now" value={`${live.current}`} trend="Live floor estimate" trendUp />
        <KpiCard label="Active members" value={`${kpis.activeMembers}`} trend={`+${kpis.newThisMonth} this month`} trendUp />
        <KpiCard label="Check-ins today" value={`${kpis.checkInsToday}`} />
        <KpiCard label="Overdue fees" value={`${kpis.overdueFees}`} trend="Needs follow-up" trendUp={false} />
        <KpiCard label="At-risk members" value={`${kpis.atRiskMembers}`} trend="No visit in 10+ days" trendUp={false} />
        <KpiCard label="Expired plans" value={`${kpis.expiredMembers}`} />
        <KpiCard label="Est. monthly revenue" value={formatCurrency(kpis.monthlyRevenue)} trend="Billing placeholder" trendUp />
      </div>

      <div className="page-row two-col">
        <div className="card">
          <div className="card-title">
            Check-ins · last 14 days
            <span className="hint muted">Daily totals</span>
          </div>
          <LineChart
            points={daily.map((point) => ({
              label: new Date(point.date).toLocaleDateString(undefined, { day: "numeric", month: "numeric" }),
              value: point.checkIns
            }))}
          />
        </div>
        <div className="card">
          <div className="card-title">
            Today by hour
            <span className="hint muted">06:00 – 22:00</span>
          </div>
          <BarChart
            points={hourly.map((point) => ({ label: `${point.hour}`, value: point.checkIns }))}
            color="var(--c-xp)"
          />
        </div>
      </div>

      <div className="page-row two-col">
        <div className="card">
          <div className="card-title">
            Gate feed
            <button type="button" className="btn small" onClick={() => navigate("/checkins")}>
              View all
            </button>
          </div>
          {feed.length === 0 ? (
            <EmptyState icon="◈" message="No check-ins yet today." />
          ) : (
            <div className="feed">
              {feed.map((record) => (
                <div key={record.id} className="feed-row">
                  <div className="avatar" aria-hidden>
                    {initials(record.memberName)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700 }}>{record.memberName}</div>
                    <div className="muted" style={{ fontSize: 12 }}>
                      {record.method === "qr" ? "QR scan" : "Manual entry"}
                    </div>
                  </div>
                  <div className="feed-time">{formatTime(record.at)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-title">
            At-risk members
            <button type="button" className="btn small" onClick={() => navigate("/members")}>
              Open members
            </button>
          </div>
          {atRisk.length === 0 ? (
            <EmptyState icon="✓" message="Nobody is slipping. Great retention week." />
          ) : (
            <div className="feed">
              {atRisk.map((member) => (
                <div key={member.id} className="feed-row">
                  <div className="avatar" aria-hidden>
                    {initials(member.name)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700 }}>{member.name}</div>
                    <div className="muted" style={{ fontSize: 12 }}>
                      {member.plan} plan · LVL {member.level}
                    </div>
                  </div>
                  <div className="feed-time">last visit {formatRelative(member.lastCheckInAt)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

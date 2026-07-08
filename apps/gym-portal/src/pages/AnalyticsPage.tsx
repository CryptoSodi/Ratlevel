import { BarChart, LineChart } from "@/components/charts";
import { ErrorCard, KpiCard, LoadingCard } from "@/components/ui";
import { formatCurrency } from "@/lib/format";
import { useAsync } from "@/lib/useAsync";
import { usePortal } from "@/state/PortalStore";

export function AnalyticsPage() {
  const { client } = usePortal();
  const state = useAsync(async () => {
    const [kpis, retention, revenue, daily] = await Promise.all([
      client.analytics.kpis(),
      client.analytics.retention(),
      client.analytics.revenue(),
      client.attendance.daily(30)
    ]);
    return { kpis, retention, revenue, daily };
  });

  if (state.error) return <ErrorCard message={state.error} onRetry={() => void state.reload()} />;
  if (state.loading || !state.data) return <LoadingCard height={420} />;

  const { kpis, retention, revenue, daily } = state.data;
  const monthlyVisits = daily.reduce((total, point) => total + point.checkIns, 0);
  const perActiveMember = kpis.activeMembers > 0 ? monthlyVisits / kpis.activeMembers : 0;
  const latestRetention = retention[retention.length - 1];

  return (
    <>
      <div className="kpi-grid">
        <KpiCard label="30-day check-ins" value={monthlyVisits.toLocaleString()} />
        <KpiCard label="Visits per active member" value={perActiveMember.toFixed(1)} trend="last 30 days" trendUp />
        <KpiCard
          label="Retention"
          value={`${latestRetention?.retainedPct ?? 0}%`}
          trend="rolling monthly"
          trendUp
        />
        <KpiCard
          label="Est. MRR"
          value={formatCurrency(kpis.monthlyRevenue)}
          trend="billing placeholder"
          trendUp
        />
      </div>

      <div className="card">
        <div className="card-title">
          Attendance · last 30 days
          <span className="hint muted">Check-ins per day</span>
        </div>
        <LineChart
          points={daily.map((point) => ({
            label: new Date(point.date).toLocaleDateString(undefined, { day: "numeric", month: "numeric" }),
            value: point.checkIns
          }))}
        />
      </div>

      <div className="page-row two-col">
        <div className="card">
          <div className="card-title">
            Member retention
            <span className="hint muted">% retained month over month</span>
          </div>
          <LineChart
            points={retention.map((point) => ({ label: point.month, value: point.retainedPct }))}
            color="var(--c-success)"
            formatValue={(value) => `${value}%`}
          />
        </div>
        <div className="card">
          <div className="card-title">
            Revenue trend
            <span className="hint muted">Placeholder until billing integration</span>
          </div>
          <BarChart
            points={revenue.map((point) => ({ label: point.month, value: point.amount }))}
            color="var(--c-warning)"
            formatValue={(value) => formatCurrency(value)}
          />
        </div>
      </div>
    </>
  );
}

import type { MembershipPlan } from "@ratlevel/domain";
import { PLAN_PRICES } from "@ratlevel/mock-data";

import { EmptyState, ErrorCard, LoadingCard, StatusBadge } from "@/components/ui";
import { formatCurrency, formatDate, initials } from "@/lib/format";
import { useAsync } from "@/lib/useAsync";
import { usePortal } from "@/state/PortalStore";

const PLAN_DETAILS: Record<MembershipPlan, { blurb: string }> = {
  Core: { blurb: "Gym access + RatLevel app, single home gym." },
  Plus: { blurb: "All Core benefits, classes included, multi-gym access." },
  Max: { blurb: "Everything, plus PT credits and priority class booking." }
};

const RENEWAL_WINDOW_DAYS = 21;

export function MembershipsPage() {
  const { client } = usePortal();
  const state = useAsync(() => client.members.list());

  if (state.error) return <ErrorCard message={state.error} onRetry={() => void state.reload()} />;
  if (state.loading || !state.data) return <LoadingCard height={420} />;

  const members = state.data;
  const plans = (Object.keys(PLAN_DETAILS) as MembershipPlan[]).map((plan) => ({
    plan,
    price: PLAN_PRICES[plan],
    active: members.filter((member) => member.plan === plan && member.status === "active").length,
    total: members.filter((member) => member.plan === plan).length
  }));

  const now = Date.now();
  const soonMs = RENEWAL_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const renewingSoon = members
    .filter(
      (member) =>
        member.status === "active" &&
        new Date(member.renewsAt).getTime() - now < soonMs &&
        new Date(member.renewsAt).getTime() > now
    )
    .sort((a, b) => new Date(a.renewsAt).getTime() - new Date(b.renewsAt).getTime());
  const expired = members
    .filter((member) => member.status === "expired")
    .sort((a, b) => new Date(b.renewsAt).getTime() - new Date(a.renewsAt).getTime());

  return (
    <>
      <div className="kpi-grid">
        {plans.map((entry) => (
          <div key={entry.plan} className="card">
            <div className="card-title">
              {entry.plan}
              <span className="hint">{formatCurrency(entry.price)}/mo</span>
            </div>
            <div className="kpi-value">{entry.active}</div>
            <div className="kpi-label">active · {entry.total} total</div>
            <div className="muted" style={{ fontSize: 12 }}>
              {PLAN_DETAILS[entry.plan].blurb}
            </div>
          </div>
        ))}
      </div>

      <div className="page-row two-col">
        <div className="card">
          <div className="card-title">
            Renewing within {RENEWAL_WINDOW_DAYS} days
            <span className="hint muted">{renewingSoon.length} members</span>
          </div>
          {renewingSoon.length === 0 ? (
            <EmptyState icon="▤" message="No renewals due in this window." />
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Plan</th>
                    <th>Renews</th>
                  </tr>
                </thead>
                <tbody>
                  {renewingSoon.slice(0, 12).map((member) => (
                    <tr key={member.id}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div className="avatar" aria-hidden>
                            {initials(member.name)}
                          </div>
                          <span className="strong">{member.name}</span>
                        </div>
                      </td>
                      <td>
                        <span className="badge blue">{member.plan}</span>
                      </td>
                      <td className="muted">{formatDate(member.renewsAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-title">
            Expired memberships
            <span className="hint muted">{expired.length} members</span>
          </div>
          {expired.length === 0 ? (
            <EmptyState icon="✓" message="No expired memberships. Everyone renewed." />
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Status</th>
                    <th>Lapsed</th>
                  </tr>
                </thead>
                <tbody>
                  {expired.slice(0, 12).map((member) => (
                    <tr key={member.id}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div className="avatar" aria-hidden>
                            {initials(member.name)}
                          </div>
                          <span className="strong">{member.name}</span>
                        </div>
                      </td>
                      <td>
                        <StatusBadge status={member.status} />
                      </td>
                      <td className="muted">{formatDate(member.renewsAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

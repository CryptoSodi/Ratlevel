import type { StaffRole } from "@ratlevel/domain";

import { EmptyState, ErrorCard, LoadingCard } from "@/components/ui";
import { formatRelative, initials } from "@/lib/format";
import { useAsync } from "@/lib/useAsync";
import { usePortal } from "@/state/PortalStore";

const ROLE_BADGES: Record<StaffRole, { className: string; label: string; blurb: string }> = {
  owner: { className: "purple", label: "Owner", blurb: "Full access, billing, staff management" },
  manager: { className: "blue", label: "Manager", blurb: "Members, classes, challenges, announcements" },
  frontdesk: { className: "green", label: "Front desk", blurb: "Check-ins, member lookup, day-to-day ops" },
  coach: { className: "amber", label: "Coach", blurb: "Programs, templates, assigned members" }
};

export function StaffPage() {
  const { client, staff: me } = usePortal();
  const state = useAsync(() => client.auth.listStaff());

  if (state.error) return <ErrorCard message={state.error} onRetry={() => void state.reload()} />;
  if (state.loading || !state.data) return <LoadingCard height={420} />;

  return (
    <>
      <div className="kpi-grid">
        {(Object.keys(ROLE_BADGES) as StaffRole[]).map((role) => (
          <div key={role} className="card">
            <div className="card-title">
              {ROLE_BADGES[role].label}
              <span className={`badge ${ROLE_BADGES[role].className}`}>
                {state.data?.filter((account) => account.role === role && account.active).length ?? 0}
              </span>
            </div>
            <div className="muted" style={{ fontSize: 12 }}>
              {ROLE_BADGES[role].blurb}
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-title">
          Staff accounts
          <span className="hint muted">Invites & role editing ship with real auth</span>
        </div>
        {state.data.length === 0 ? (
          <EmptyState icon="⚙" message="No staff accounts." />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Last active</th>
                </tr>
              </thead>
              <tbody>
                {state.data.map((account) => (
                  <tr key={account.id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div className="avatar" aria-hidden>
                          {initials(account.name)}
                        </div>
                        <div>
                          <div className="strong">
                            {account.name}
                            {me?.id === account.id ? " (you)" : ""}
                          </div>
                          <div className="muted" style={{ fontSize: 12 }}>
                            {account.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${ROLE_BADGES[account.role].className}`}>
                        {ROLE_BADGES[account.role].label}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${account.active ? "green" : "gray"}`}>
                        {account.active ? "Active" : "Disabled"}
                      </span>
                    </td>
                    <td className="muted">{formatRelative(account.lastActiveAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

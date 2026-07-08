import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { formatRelative } from "@/lib/format";
import { useAsync } from "@/lib/useAsync";
import { usePortal } from "@/state/PortalStore";

/** Topbar bell: fee-overdue alerts and other staff notifications. */
export function NotificationsBell() {
  const { client } = usePortal();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const state = useAsync(() => client.notifications.list());

  const notifications = state.data ?? [];
  const unread = notifications.filter((item) => !item.read).length;

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) {
      const marked = await client.notifications.markAllRead();
      state.setData(() => marked);
    }
  };

  return (
    <div className="bell-wrap">
      <button
        type="button"
        className="icon-btn bell-btn"
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
        aria-expanded={open}
        onClick={() => void toggle()}
      >
        🔔
        {unread > 0 && <span className="bell-count">{unread}</span>}
      </button>

      {open && (
        <>
          <div className="bell-backdrop" onClick={() => setOpen(false)} aria-hidden />
          <div className="notif-panel" role="dialog" aria-label="Notifications">
            <div className="notif-head">
              <span>Notifications</span>
              <span className="muted" style={{ fontWeight: 600 }}>
                {notifications.length} total
              </span>
            </div>
            {state.loading && <div className="notif-empty">Loading…</div>}
            {!state.loading && notifications.length === 0 && (
              <div className="notif-empty">All clear — no overdue fees, nothing pending.</div>
            )}
            {notifications.slice(0, 12).map((notification) => (
              <button
                key={notification.id}
                type="button"
                className="notif-row"
                onClick={() => {
                  setOpen(false);
                  if (notification.memberId) navigate("/members");
                }}
              >
                <span className="notif-icon" aria-hidden>
                  {notification.type === "fee_overdue" ? "€" : "◇"}
                </span>
                <span className="notif-body">
                  <span className="notif-title">{notification.title}</span>
                  <span className="notif-text">{notification.body}</span>
                  <span className="notif-time">{formatRelative(notification.createdAt)}</span>
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

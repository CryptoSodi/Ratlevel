import type { PropsWithChildren, ReactNode } from "react";
import type { FeeStatus, MembershipStatus } from "@ratlevel/domain";

export function KpiCard({
  label,
  value,
  trend,
  trendUp
}: {
  label: string;
  value: string;
  trend?: string;
  trendUp?: boolean;
}) {
  return (
    <div className="card">
      <div className="kpi-value">{value}</div>
      <div className="kpi-label">{label}</div>
      {trend && <div className={`kpi-trend ${trendUp ? "up" : "down"}`}>{trend}</div>}
    </div>
  );
}

const STATUS_BADGE: Record<MembershipStatus, { className: string; label: string }> = {
  active: { className: "green", label: "Active" },
  frozen: { className: "amber", label: "Frozen" },
  expired: { className: "red", label: "Expired" }
};

export function StatusBadge({ status }: { status: MembershipStatus }) {
  const badge = STATUS_BADGE[status];
  return <span className={`badge ${badge.className}`}>{badge.label}</span>;
}

const FEE_BADGE: Record<FeeStatus, { className: string; label: string }> = {
  paid: { className: "green", label: "Paid" },
  due_soon: { className: "amber", label: "Due soon" },
  overdue: { className: "red", label: "Overdue" }
};

export function FeeBadge({ status }: { status: FeeStatus }) {
  const badge = FEE_BADGE[status];
  return <span className={`badge ${badge.className}`}>{badge.label}</span>;
}

export function Drawer({
  title,
  onClose,
  children,
  footer
}: PropsWithChildren<{ title: string; onClose: () => void; footer?: ReactNode }>) {
  return (
    <>
      <div className="overlay" onClick={onClose} aria-hidden />
      <aside className="drawer" role="dialog" aria-label={title}>
        <div className="panel-header">
          <div className="panel-title">{title}</div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close panel">
            ✕
          </button>
        </div>
        {children}
        {footer}
      </aside>
    </>
  );
}

export function Modal({
  title,
  onClose,
  children
}: PropsWithChildren<{ title: string; onClose: () => void }>) {
  return (
    <>
      <div className="overlay" onClick={onClose} aria-hidden />
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="panel-header">
          <div className="panel-title">{title}</div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close dialog">
            ✕
          </button>
        </div>
        {children}
      </div>
    </>
  );
}

export function EmptyState({ icon, message }: { icon: string; message: string }) {
  return (
    <div className="empty-state">
      <div style={{ fontSize: 26 }}>{icon}</div>
      <div>{message}</div>
    </div>
  );
}

export function LoadingCard({ height = 180 }: { height?: number }) {
  return <div className="skeleton" style={{ height }} aria-label="Loading" role="progressbar" />;
}

export function ErrorCard({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="card" role="alert">
      <div className="error-text">{message}</div>
      <div>
        <button type="button" className="btn small" onClick={onRetry}>
          Retry
        </button>
      </div>
    </div>
  );
}

export function ProgressBar({ progress, color }: { progress: number; color?: string }) {
  const clamped = Math.max(0, Math.min(progress, 1));
  return (
    <div
      className="progress-track"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped * 100)}
    >
      <div
        className="progress-fill"
        style={{ width: `${clamped * 100}%`, ...(color ? { background: color } : {}) }}
      />
    </div>
  );
}

import { ErrorCard, LoadingCard, ProgressBar } from "@/components/ui";
import { useAsync } from "@/lib/useAsync";
import { usePortal } from "@/state/PortalStore";

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export function ClassesPage() {
  const { client } = usePortal();
  const state = useAsync(() => client.classes.list());

  if (state.error) return <ErrorCard message={state.error} onRetry={() => void state.reload()} />;
  if (state.loading || !state.data) return <LoadingCard height={420} />;

  const classes = state.data;
  const totalCapacity = classes.reduce((total, item) => total + item.capacity, 0);
  const totalBooked = classes.reduce((total, item) => total + item.booked, 0);
  const fullClasses = classes.filter((item) => item.booked >= item.capacity).length;

  return (
    <>
      <div className="kpi-grid">
        <div className="card">
          <div className="kpi-value">{classes.length}</div>
          <div className="kpi-label">Classes this week</div>
        </div>
        <div className="card">
          <div className="kpi-value">{Math.round((totalBooked / Math.max(totalCapacity, 1)) * 100)}%</div>
          <div className="kpi-label">Average fill rate</div>
        </div>
        <div className="card">
          <div className="kpi-value">{fullClasses}</div>
          <div className="kpi-label">Fully booked</div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">
          Weekly schedule
          <span className="hint muted">Bookings are mocked; class CRUD lands with the backend</span>
        </div>
        <div className="week-grid">
          {WEEKDAYS.map((day, weekday) => {
            const dayClasses = classes
              .filter((item) => item.weekday === weekday)
              .sort((a, b) => a.startTime.localeCompare(b.startTime));
            return (
              <div key={day} className="day-col">
                <div className="day-head">{day}</div>
                {dayClasses.length === 0 && (
                  <div className="muted" style={{ fontSize: 12 }}>
                    —
                  </div>
                )}
                {dayClasses.map((item) => {
                  const full = item.booked >= item.capacity;
                  return (
                    <div key={item.id} className="class-card">
                      <div className="t">{item.name}</div>
                      <div className="m">
                        {item.startTime} · {item.durationMin} min
                      </div>
                      <div className="m">
                        {item.coachName} · {item.location}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <ProgressBar
                          progress={item.booked / item.capacity}
                          color={full ? "var(--c-warning)" : undefined}
                        />
                        <span className="m" style={{ whiteSpace: "nowrap" }}>
                          {item.booked}/{item.capacity}
                        </span>
                      </div>
                      {full && <span className="badge amber">Full</span>}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

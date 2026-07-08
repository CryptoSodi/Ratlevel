import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import type { Gym, LiveOccupancy } from "@ratlevel/domain";
import { occupancyLevel } from "@ratlevel/domain";

import { BarChart } from "@/components/charts";
import { MemberQrScanner } from "@/components/MemberQrScanner";
import { EmptyState, ErrorCard, LoadingCard, ProgressBar } from "@/components/ui";
import { formatRelative, formatTime, initials } from "@/lib/format";
import { useAsync } from "@/lib/useAsync";
import { usePortal } from "@/state/PortalStore";

const LIVE_POLL_MS = 10000;

const LEVEL_STYLE: Record<string, { color: string; label: string }> = {
  quiet: { color: "var(--c-success)", label: "Quiet" },
  steady: { color: "var(--c-primary)", label: "Steady" },
  busy: { color: "var(--c-warning)", label: "Busy" },
  packed: { color: "var(--c-danger)", label: "Packed" }
};

function minutesIn(since: string): string {
  const minutes = Math.max(1, Math.round((Date.now() - new Date(since).getTime()) / 60000));
  return minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${minutes} min`;
}

function EntryQrCard() {
  const { client } = usePortal();
  const [gym, setGym] = useState<Gym | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const gymInfo = await client.gym.get();
        const dataUrl = await QRCode.toDataURL(gymInfo.entryQrCode, {
          width: 480,
          margin: 2,
          errorCorrectionLevel: "M",
          color: { dark: "#0D1117", light: "#FFFFFF" }
        });
        if (active) {
          setGym(gymInfo);
          setQrDataUrl(dataUrl);
        }
      } catch {
        if (active) setError("Could not generate the entry QR code.");
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [client]);

  if (error) {
    return (
      <div className="card" role="alert">
        <div className="error-text">{error}</div>
      </div>
    );
  }

  if (!gym || !qrDataUrl) {
    return <LoadingCard height={220} />;
  }

  return (
    <div className="card">
      <div className="card-title">
        Entry QR poster
        <span className="hint muted">Print this and mount it at the door</span>
      </div>
      <div style={{ display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap" }}>
        <img
          src={qrDataUrl}
          alt={`Entry QR code for ${gym.name}`}
          style={{
            width: 168,
            height: 168,
            borderRadius: 12,
            background: "#FFFFFF",
            padding: 6,
            flexShrink: 0
          }}
        />
        <div style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 220, flex: 1 }}>
          <div className="muted" style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.5 }}>
            Members scan this with the RatLevel app ("Scan entry QR" on their membership screen)
            to sign attendance at {gym.name}. Scans from other gyms' posters are rejected.
          </div>
          <div className="field">
            <span className="field-label">Encoded payload (not a web link)</span>
            <code
              style={{
                background: "var(--c-background)",
                border: "1px solid var(--c-border)",
                borderRadius: 8,
                padding: "8px 10px",
                fontSize: 13,
                fontWeight: 700
              }}
            >
              {gym.entryQrCode}
            </code>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <a
              className="btn primary"
              href={qrDataUrl}
              download={`ratlevel-entry-${gym.id}.png`}
              style={{ textDecoration: "none" }}
            >
              Download PNG (print-ready)
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function LiveFloor() {
  const { client } = usePortal();
  const [live, setLive] = useState<LiveOccupancy | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const poll = async () => {
      try {
        const data = await client.attendance.live();
        if (active) {
          setLive(data);
          setError(null);
        }
      } catch {
        if (active) setError("Live feed unavailable — retrying.");
      }
    };
    void poll();
    const timer = setInterval(() => void poll(), LIVE_POLL_MS);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [client]);

  if (!live) {
    return <LoadingCard height={150} />;
  }

  const level = LEVEL_STYLE[occupancyLevel(live.current, live.comfortCapacity)];

  return (
    <div className="card">
      <div className="card-title">
        Live floor
        <span className="hint muted">
          auto-refreshes every {LIVE_POLL_MS / 1000}s · estimated from check-ins (no exit gates yet)
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
        <div>
          <div className="kpi-value" style={{ fontSize: 40 }}>
            {live.current}
          </div>
          <div className="kpi-label">in the gym now</div>
        </div>
        <div style={{ flex: 1, minWidth: 200, display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ color: level.color, fontWeight: 900, fontSize: 14 }}>{level.label}</span>
            <span className="muted" style={{ fontSize: 12, fontWeight: 600 }}>
              comfort capacity {live.comfortCapacity} · updated {formatTime(live.updatedAt)}
            </span>
          </div>
          <ProgressBar progress={live.current / live.comfortCapacity} color={level.color} />
        </div>
      </div>
      {error && <div className="error-text">{error}</div>}
      {live.visitors.length === 0 ? (
        <div className="muted" style={{ fontSize: 12.5, fontWeight: 600 }}>
          Floor is empty right now.
        </div>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {live.visitors.slice(0, 14).map((visitor) => (
            <span key={visitor.memberId} className="badge gray" title={`Checked in ${formatTime(visitor.since)}`}>
              {visitor.memberName} · {minutesIn(visitor.since)}
            </span>
          ))}
          {live.visitors.length > 14 && (
            <span className="badge blue">+{live.visitors.length - 14} more</span>
          )}
        </div>
      )}
    </div>
  );
}

export function CheckInsPage() {
  const { client } = usePortal();
  const state = useAsync(async () => {
    const [feed, hourly, members] = await Promise.all([
      client.attendance.feed(60),
      client.attendance.hourlyToday(),
      client.members.list()
    ]);
    return { feed, hourly, members };
  });

  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const candidates = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query || !state.data) return [];
    return state.data.members
      .filter((member) => member.status !== "expired" && member.name.toLowerCase().includes(query))
      .slice(0, 5);
  }, [search, state.data]);

  if (state.error) return <ErrorCard message={state.error} onRetry={() => void state.reload()} />;
  if (state.loading || !state.data) return <LoadingCard height={420} />;

  const manualCheckIn = async (memberId: string, memberName: string) => {
    if (busyId) return;
    setBusyId(memberId);
    setError(null);
    setNotice(null);
    try {
      const record = await client.attendance.checkInManual(memberId);
      state.setData((current) => ({
        ...current,
        feed: [record, ...current.feed],
        hourly: current.hourly.map((bucket) =>
          bucket.hour === new Date(record.at).getHours()
            ? { ...bucket, checkIns: bucket.checkIns + 1 }
            : bucket
        )
      }));
      setNotice(`${memberName} checked in.`);
      setSearch("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Check-in failed.");
    } finally {
      setBusyId(null);
    }
  };

  const { feed, hourly } = state.data;
  const today = feed.filter((record) => new Date(record.at).toDateString() === new Date().toDateString());

  const scanMemberQr = async (payload: string) => {
    const record = await client.attendance.checkInByQr(payload);
    state.setData((current) => ({
      ...current,
      feed: [record, ...current.feed],
      hourly: current.hourly.map((bucket) =>
        bucket.hour === new Date(record.at).getHours() ? { ...bucket, checkIns: bucket.checkIns + 1 } : bucket
      )
    }));
  };

  return (
    <>
      <LiveFloor />
      <EntryQrCard />
      <div className="page-row two-col">
        <MemberQrScanner onScan={scanMemberQr} />
        <div className="card">
          <div className="card-title">
            Manual check-in
            <span className="hint muted">Front desk fallback when nothing else works</span>
          </div>
          <div className="search">
            <input
              className="input"
              placeholder="Type a member name…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Search member to check in"
            />
          </div>
          {candidates.length > 0 && (
            <div className="feed">
              {candidates.map((member) => (
                <div key={member.id} className="feed-row">
                  <div className="avatar" aria-hidden>
                    {initials(member.name)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700 }}>{member.name}</div>
                    <div className="muted" style={{ fontSize: 12 }}>
                      {member.plan} · last visit {formatRelative(member.lastCheckInAt)}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn small primary"
                    style={{ marginLeft: "auto" }}
                    disabled={busyId !== null}
                    onClick={() => void manualCheckIn(member.id, member.name)}
                  >
                    {busyId === member.id ? "…" : "Check in"}
                  </button>
                </div>
              ))}
            </div>
          )}
          {search.trim() && candidates.length === 0 && (
            <EmptyState icon="◉" message="No active members match that name." />
          )}
          {notice && <div className="success-text">{notice}</div>}
          {error && <div className="error-text" role="alert">{error}</div>}
        </div>
      </div>

      <div className="card">
        <div className="card-title">
          Today by hour
          <span className="hint muted">{today.length} check-ins today</span>
        </div>
        <BarChart points={hourly.map((point) => ({ label: `${point.hour}`, value: point.checkIns }))} />
      </div>

      <div className="card">
        <div className="card-title">
          Gate feed
          <span className="hint muted">Latest {feed.length} check-ins</span>
        </div>
        {feed.length === 0 ? (
          <EmptyState icon="◈" message="No check-ins recorded yet." />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Method</th>
                  <th>When</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {feed.map((record) => (
                  <tr key={record.id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div className="avatar" aria-hidden>
                          {initials(record.memberName)}
                        </div>
                        <span className="strong">{record.memberName}</span>
                      </div>
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          record.method === "qr" ? "blue" : record.method === "gps" ? "purple" : "gray"
                        }`}
                      >
                        {record.method === "qr" ? "QR gate" : record.method === "gps" ? "GPS" : "Manual"}
                      </span>
                    </td>
                    <td className="muted">{formatRelative(record.at)}</td>
                    <td className="muted">{formatTime(record.at)}</td>
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

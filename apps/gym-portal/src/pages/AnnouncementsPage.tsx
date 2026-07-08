import { useState, type FormEvent } from "react";
import type { AnnouncementAudience, AnnouncementStatus } from "@ratlevel/domain";

import { EmptyState, ErrorCard, LoadingCard } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { useAsync } from "@/lib/useAsync";
import { usePortal } from "@/state/PortalStore";

const AUDIENCE_LABELS: Record<AnnouncementAudience, string> = {
  all: "All members",
  active: "Active members",
  "at-risk": "At-risk members"
};

const STATUS_BADGES: Record<AnnouncementStatus, string> = {
  draft: "gray",
  scheduled: "amber",
  sent: "green"
};

export function AnnouncementsPage() {
  const { client } = usePortal();
  const state = useAsync(() => client.announcements.list());

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<AnnouncementAudience>("all");
  const [busy, setBusy] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (state.error) return <ErrorCard message={state.error} onRetry={() => void state.reload()} />;
  if (state.loading || !state.data) return <LoadingCard height={420} />;

  const create = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const announcement = await client.announcements.create({
        title: title.trim(),
        body: body.trim(),
        audience
      });
      state.setData((current) => [announcement, ...current]);
      setTitle("");
      setBody("");
      setAudience("all");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save the announcement.");
    } finally {
      setBusy(false);
    }
  };

  const send = async (announcementId: string) => {
    if (sendingId) return;
    setSendingId(announcementId);
    setError(null);
    try {
      const sent = await client.announcements.send(announcementId);
      state.setData((current) => current.map((item) => (item.id === sent.id ? sent : item)));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not send the announcement.");
    } finally {
      setSendingId(null);
    }
  };

  return (
    <div className="page-row two-col">
      <div className="card">
        <div className="card-title">
          Sent & drafts
          <span className="hint muted">Push/email delivery is mocked</span>
        </div>
        {state.data.length === 0 ? (
          <EmptyState icon="◇" message="Nothing announced yet." />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {state.data.map((announcement) => (
              <div key={announcement.id} className="class-card">
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span className="t" style={{ fontSize: 14 }}>
                    {announcement.title}
                  </span>
                  <span className={`badge ${STATUS_BADGES[announcement.status]}`}>
                    {announcement.status}
                  </span>
                  <span className="badge gray">{AUDIENCE_LABELS[announcement.audience]}</span>
                </div>
                <div className="m" style={{ whiteSpace: "normal" }}>
                  {announcement.body}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span className="m">
                    {announcement.sentAt
                      ? `Sent ${formatDate(announcement.sentAt)}`
                      : announcement.scheduledFor
                        ? `Scheduled for ${formatDate(announcement.scheduledFor)}`
                        : "Draft"}
                  </span>
                  {announcement.status !== "sent" && (
                    <button
                      type="button"
                      className="btn small primary"
                      style={{ marginLeft: "auto" }}
                      disabled={sendingId !== null}
                      onClick={() => void send(announcement.id)}
                    >
                      {sendingId === announcement.id ? "Sending…" : "Send now"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <form className="card" onSubmit={(event) => void create(event)}>
        <div className="card-title">Compose</div>
        <div className="field">
          <label className="field-label" htmlFor="ann-title">
            Title
          </label>
          <input
            id="ann-title"
            className="input"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Season 02 starts Monday"
            required
          />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="ann-body">
            Message
          </label>
          <textarea
            id="ann-body"
            className="textarea"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Keep it short, energetic and progression-oriented."
            required
          />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="ann-audience">
            Audience
          </label>
          <select
            id="ann-audience"
            className="select"
            value={audience}
            onChange={(event) => setAudience(event.target.value as AnnouncementAudience)}
          >
            {(Object.keys(AUDIENCE_LABELS) as AnnouncementAudience[]).map((option) => (
              <option key={option} value={option}>
                {AUDIENCE_LABELS[option]}
              </option>
            ))}
          </select>
        </div>
        {error && <div className="error-text" role="alert">{error}</div>}
        <button type="submit" className="btn primary" disabled={busy}>
          {busy ? "Saving…" : "Save as draft"}
        </button>
      </form>
    </div>
  );
}

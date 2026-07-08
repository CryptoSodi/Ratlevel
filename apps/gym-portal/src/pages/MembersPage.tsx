import { useMemo, useState, type FormEvent } from "react";
import type {
  MemberRecord,
  MembershipPlan,
  MembershipStatus,
  PlayerClass,
  Program
} from "@ratlevel/domain";
import { getFeeStatus } from "@ratlevel/domain";
import { isAtRisk } from "@ratlevel/mock-data";

import {
  Drawer,
  EmptyState,
  ErrorCard,
  FeeBadge,
  LoadingCard,
  Modal,
  StatusBadge
} from "@/components/ui";
import { formatCurrency, formatDate, formatRelative, initials } from "@/lib/format";
import { useAsync } from "@/lib/useAsync";
import { usePortal } from "@/state/PortalStore";

const PLANS: MembershipPlan[] = ["Core", "Plus", "Max"];
const CLASSES: PlayerClass[] = ["Vanguard", "Strider", "Sentinel", "Medic"];
const STATUS_FILTERS: Array<MembershipStatus | "all" | "at-risk" | "fee-overdue"> = [
  "all",
  "active",
  "frozen",
  "expired",
  "at-risk",
  "fee-overdue"
];

function feeStatusOf(member: MemberRecord): ReturnType<typeof getFeeStatus> {
  return getFeeStatus(member.feeDueAt, new Date().toISOString());
}

export function MembersPage() {
  const { client } = usePortal();
  const state = useAsync(async () => {
    const [members, programs] = await Promise.all([client.members.list(), client.programs.list()]);
    return { members, programs };
  });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>("all");
  const [planFilter, setPlanFilter] = useState<MembershipPlan | "all">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const filtered = useMemo(() => {
    const members = state.data?.members ?? [];
    const query = search.trim().toLowerCase();
    return members.filter((member) => {
      if (query && !`${member.name} ${member.email}`.toLowerCase().includes(query)) return false;
      if (planFilter !== "all" && member.plan !== planFilter) return false;
      if (statusFilter === "at-risk") return isAtRisk(member);
      if (statusFilter === "fee-overdue")
        return member.status !== "expired" && feeStatusOf(member) === "overdue";
      if (statusFilter !== "all" && member.status !== statusFilter) return false;
      return true;
    });
  }, [state.data, search, statusFilter, planFilter]);

  const [copied, setCopied] = useState(false);
  const whatsappNumbers = filtered
    .map((member) => member.whatsapp)
    .filter((value): value is string => Boolean(value));

  const copyWhatsappList = async () => {
    try {
      await navigator.clipboard.writeText(whatsappNumbers.join(", "));
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard unavailable (permissions) — nothing to do in the mock.
    }
  };

  if (state.error) return <ErrorCard message={state.error} onRetry={() => void state.reload()} />;
  if (state.loading || !state.data) return <LoadingCard height={420} />;

  const selected = state.data.members.find((member) => member.id === selectedId) ?? null;

  return (
    <>
      <div className="card">
        <div className="toolbar">
          <div className="search">
            <input
              className="input"
              placeholder="Search name or email"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Search members"
            />
          </div>
          <select
            className="select"
            style={{ width: 150 }}
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
            aria-label="Filter by status"
          >
            {STATUS_FILTERS.map((option) => (
              <option key={option} value={option}>
                {option === "all"
                  ? "All statuses"
                  : option === "at-risk"
                    ? "At risk"
                    : option === "fee-overdue"
                      ? "Fee overdue"
                      : option}
              </option>
            ))}
          </select>
          <select
            className="select"
            style={{ width: 130 }}
            value={planFilter}
            onChange={(event) => setPlanFilter(event.target.value as MembershipPlan | "all")}
            aria-label="Filter by plan"
          >
            <option value="all">All plans</option>
            {PLANS.map((plan) => (
              <option key={plan} value={plan}>
                {plan}
              </option>
            ))}
          </select>
          <div className="spacer" />
          <span className="muted" style={{ fontSize: 12, fontWeight: 600 }}>
            {filtered.length} of {state.data.members.length} members
          </span>
          <button
            type="button"
            className="btn"
            disabled={whatsappNumbers.length === 0}
            title="Copy the WhatsApp numbers of the currently filtered members — for broadcasts and promotions"
            onClick={() => void copyWhatsappList()}
          >
            {copied ? "✓ Copied" : `Copy WhatsApp (${whatsappNumbers.length})`}
          </button>
          <button type="button" className="btn primary" onClick={() => setAdding(true)}>
            + Add member
          </button>
        </div>

        {filtered.length === 0 ? (
          <EmptyState icon="◉" message="No members match these filters." />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Status</th>
                  <th>Fee</th>
                  <th>Plan</th>
                  <th>Level</th>
                  <th>Last visit</th>
                  <th>Visits</th>
                  <th>Renews</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((member) => (
                  <tr
                    key={member.id}
                    className="clickable"
                    onClick={() => setSelectedId(member.id)}
                  >
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div className="avatar" aria-hidden>
                          {initials(member.name)}
                        </div>
                        <div>
                          <div className="strong">{member.name}</div>
                          <div className="muted" style={{ fontSize: 12 }}>
                            {member.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <StatusBadge status={member.status} />{" "}
                      {isAtRisk(member) && <span className="badge amber">At risk</span>}
                    </td>
                    <td>
                      <FeeBadge status={feeStatusOf(member)} />
                    </td>
                    <td className="strong">{member.plan}</td>
                    <td>
                      <span className="badge purple">LVL {member.level}</span>
                    </td>
                    <td className="muted">{formatRelative(member.lastCheckInAt)}</td>
                    <td className="muted">{member.totalCheckIns}</td>
                    <td className="muted">{formatDate(member.renewsAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected && (
        <MemberDrawer
          member={selected}
          programs={state.data.programs}
          onClose={() => setSelectedId(null)}
          onChanged={(updated) =>
            state.setData((current) => ({
              ...current,
              members: current.members.map((item) => (item.id === updated.id ? updated : item))
            }))
          }
          onRemoved={(memberId) => {
            setSelectedId(null);
            state.setData((current) => ({
              ...current,
              members: current.members.filter((item) => item.id !== memberId)
            }));
          }}
        />
      )}

      {adding && (
        <AddMemberModal
          onClose={() => setAdding(false)}
          onCreated={(member) => {
            setAdding(false);
            state.setData((current) => ({ ...current, members: [member, ...current.members] }));
          }}
        />
      )}
    </>
  );
}

function MemberDrawer({
  member,
  programs,
  onClose,
  onChanged,
  onRemoved
}: {
  member: MemberRecord;
  programs: Program[];
  onClose: () => void;
  onChanged: (member: MemberRecord) => void;
  onRemoved: (memberId: string) => void;
}) {
  const { client } = usePortal();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const run = async (key: string, action: () => Promise<void>) => {
    if (busy) return;
    setBusy(key);
    setError(null);
    try {
      await action();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Action failed.");
    } finally {
      setBusy(null);
    }
  };

  const setStatus = (status: MembershipStatus) =>
    run("status", async () => {
      const updated = await client.members.update({ ...member, status });
      onChanged(updated);
    });

  const setPlan = (plan: MembershipPlan) =>
    run("plan", async () => {
      const updated = await client.members.update({ ...member, plan });
      onChanged(updated);
    });

  const assignProgram = (programId: string | undefined) =>
    run("program", async () => {
      const updated = await client.members.assignProgram(member.id, programId);
      onChanged(updated);
    });

  const checkIn = () =>
    run("checkin", async () => {
      await client.attendance.checkInManual(member.id);
      onChanged({
        ...member,
        lastCheckInAt: new Date().toISOString(),
        totalCheckIns: member.totalCheckIns + 1
      });
    });

  const recordPayment = () =>
    run("payment", async () => {
      const updated = await client.members.recordPayment(member.id);
      onChanged(updated);
    });

  const sendReminder = () =>
    run("reminder", async () => {
      const updated = await client.members.sendPaymentReminder(member.id);
      onChanged(updated);
    });

  const remove = () =>
    run("delete", async () => {
      await client.members.remove(member.id);
      onRemoved(member.id);
    });

  return (
    <Drawer title={member.name} onClose={onClose}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <StatusBadge status={member.status} />
        <span className="badge blue">{member.plan}</span>
        <span className="badge purple">LVL {member.level}</span>
        <span className="badge gray">{member.playerClass}</span>
        {isAtRisk(member) && <span className="badge amber">At risk</span>}
      </div>

      <div className="stat-list">
        <div className="stat-item">
          <div className="v">{member.totalCheckIns}</div>
          <div className="l">Total visits</div>
        </div>
        <div className="stat-item">
          <div className="v">{member.streakDays}d</div>
          <div className="l">Current streak</div>
        </div>
        <div className="stat-item">
          <div className="v">{member.seasonXp.toLocaleString()}</div>
          <div className="l">Season XP</div>
        </div>
        <div className="stat-item">
          <div className="v">{formatRelative(member.lastCheckInAt)}</div>
          <div className="l">Last visit</div>
        </div>
      </div>

      <div className="field">
        <span className="field-label">Contact</span>
        <div className="muted" style={{ fontSize: 13 }}>
          {member.email}
          <br />
          {member.whatsapp ? (
            <>WhatsApp: {member.whatsapp}</>
          ) : (
            <>No WhatsApp on file — ask at the next visit.</>
          )}
          <br />
          Joined {formatDate(member.joinedAt)} · renews {formatDate(member.renewsAt)}
        </div>
      </div>

      <div className="field">
        <span className="field-label">Billing</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <FeeBadge status={feeStatusOf(member)} />
          <span className="muted" style={{ fontSize: 12.5, fontWeight: 600 }}>
            {formatCurrency(member.monthlyFee)}/mo ·{" "}
            {feeStatusOf(member) === "overdue" ? "was due" : "due"} {formatDate(member.feeDueAt)}
          </span>
        </div>
        {member.reminderSentAt && feeStatusOf(member) !== "paid" && (
          <span className="muted" style={{ fontSize: 12 }}>
            Reminder sent {formatRelative(member.reminderSentAt)}
          </span>
        )}
        {feeStatusOf(member) !== "paid" && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              className="btn small primary"
              disabled={busy !== null}
              onClick={() => void recordPayment()}
            >
              {busy === "payment" ? "Recording…" : `Record ${formatCurrency(member.monthlyFee)} payment`}
            </button>
            <button
              type="button"
              className="btn small"
              disabled={busy !== null || Boolean(member.reminderSentAt)}
              title={member.whatsapp ? `Nudges the member in-app and via WhatsApp (${member.whatsapp})` : "Nudges the member in the app"}
              onClick={() => void sendReminder()}
            >
              {busy === "reminder"
                ? "Sending…"
                : member.reminderSentAt
                  ? "Reminder sent"
                  : "Send payment reminder"}
            </button>
          </div>
        )}
      </div>

      <div className="field">
        <label className="field-label" htmlFor="member-plan">
          Plan
        </label>
        <select
          id="member-plan"
          className="select"
          value={member.plan}
          disabled={busy !== null}
          onChange={(event) => void setPlan(event.target.value as MembershipPlan)}
        >
          {PLANS.map((plan) => (
            <option key={plan} value={plan}>
              {plan}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label className="field-label" htmlFor="member-status">
          Membership status
        </label>
        <select
          id="member-status"
          className="select"
          value={member.status}
          disabled={busy !== null}
          onChange={(event) => void setStatus(event.target.value as MembershipStatus)}
        >
          <option value="active">Active</option>
          <option value="frozen">Frozen</option>
          <option value="expired">Expired</option>
        </select>
      </div>

      <div className="field">
        <label className="field-label" htmlFor="member-program">
          Assigned program
        </label>
        <select
          id="member-program"
          className="select"
          value={member.assignedProgramId ?? ""}
          disabled={busy !== null}
          onChange={(event) => void assignProgram(event.target.value || undefined)}
        >
          <option value="">No program</option>
          {programs.map((program) => (
            <option key={program.id} value={program.id}>
              {program.name}
            </option>
          ))}
        </select>
      </div>

      {error && <div className="error-text" role="alert">{error}</div>}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" className="btn primary" disabled={busy !== null} onClick={() => void checkIn()}>
          {busy === "checkin" ? "Checking in…" : "Manual check-in"}
        </button>
        {confirmDelete ? (
          <>
            <button type="button" className="btn danger" disabled={busy !== null} onClick={() => void remove()}>
              {busy === "delete" ? "Deleting…" : "Confirm delete"}
            </button>
            <button type="button" className="btn" onClick={() => setConfirmDelete(false)}>
              Cancel
            </button>
          </>
        ) : (
          <button type="button" className="btn danger" onClick={() => setConfirmDelete(true)}>
            Delete member
          </button>
        )}
      </div>
    </Drawer>
  );
}

function AddMemberModal({
  onClose,
  onCreated
}: {
  onClose: () => void;
  onCreated: (member: MemberRecord) => void;
}) {
  const { client } = usePortal();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [plan, setPlan] = useState<MembershipPlan>("Core");
  const [playerClass, setPlayerClass] = useState<PlayerClass>("Vanguard");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const member = await client.members.create({
        name: name.trim(),
        email: email.trim(),
        whatsapp: whatsapp.trim() || undefined,
        plan,
        playerClass
      });
      onCreated(member);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not create member.");
      setBusy(false);
    }
  };

  return (
    <Modal title="Add member" onClose={onClose}>
      <form onSubmit={(event) => void submit(event)} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div className="field">
          <label className="field-label" htmlFor="new-name">
            Full name
          </label>
          <input
            id="new-name"
            className="input"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="new-email">
            Email
          </label>
          <input
            id="new-email"
            className="input"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="new-whatsapp">
            WhatsApp (optional — for updates & promotions)
          </label>
          <input
            id="new-whatsapp"
            className="input"
            type="tel"
            placeholder="+31 6 1234 5678"
            value={whatsapp}
            onChange={(event) => setWhatsapp(event.target.value)}
          />
        </div>
        <div className="form-grid">
          <div className="field">
            <label className="field-label" htmlFor="new-plan">
              Plan
            </label>
            <select
              id="new-plan"
              className="select"
              value={plan}
              onChange={(event) => setPlan(event.target.value as MembershipPlan)}
            >
              {PLANS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="field-label" htmlFor="new-class">
              Starting class
            </label>
            <select
              id="new-class"
              className="select"
              value={playerClass}
              onChange={(event) => setPlayerClass(event.target.value as PlayerClass)}
            >
              {CLASSES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        </div>
        {error && <div className="error-text" role="alert">{error}</div>}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn primary" disabled={busy}>
            {busy ? "Creating…" : "Create member"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

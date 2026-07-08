/**
 * Billing + notification domain shared by both products. Payments themselves
 * are mocked until a billing provider is integrated — what matters now is the
 * fee lifecycle (paid → due soon → overdue) and who gets told about it.
 */

export type FeeStatus = "paid" | "due_soon" | "overdue";

export const DUE_SOON_DAYS = 5;

/** Fee state derived from the next due date — no stored flags to drift. */
export function getFeeStatus(feeDueAt: string, now: string, dueSoonDays = DUE_SOON_DAYS): FeeStatus {
  const due = new Date(feeDueAt).getTime();
  const current = new Date(now).getTime();
  if (current > due) return "overdue";
  if (due - current <= dueSoonDays * 24 * 60 * 60 * 1000) return "due_soon";
  return "paid";
}

export function daysUntilDue(feeDueAt: string, now: string): number {
  return Math.ceil((new Date(feeDueAt).getTime() - new Date(now).getTime()) / (24 * 60 * 60 * 1000));
}

export type MemberNotificationType = "payment_due" | "payment_overdue" | "info";

/** Notification shown inside the member app. */
export interface MemberNotification {
  id: string;
  type: MemberNotificationType;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
}

export type AdminNotificationType = "fee_overdue" | "info";

/** Notification shown to gym staff in the portal. */
export interface AdminNotification {
  id: string;
  type: AdminNotificationType;
  memberId?: string;
  memberName?: string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
}

export interface MemberNotificationRepository {
  list(): Promise<MemberNotification[]>;
  markAllRead(): Promise<MemberNotification[]>;
}

export interface AdminNotificationRepository {
  list(): Promise<AdminNotification[]>;
  markAllRead(): Promise<AdminNotification[]>;
}

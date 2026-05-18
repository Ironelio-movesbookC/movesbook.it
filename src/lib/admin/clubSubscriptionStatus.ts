import { parseClubDescriptionMeta } from '@/lib/club/clubSidebarLabel';

export type ClubSubscriptionDisplayStatus =
  | 'Active'
  | 'Expiring'
  | 'Expired';

export type ClubSubscriptionStatusTone =
  | 'active'
  | 'expiring'
  | 'partial-expired'
  | 'all-expired';

export type ClubSubscriptionRowStatus = {
  label: ClubSubscriptionDisplayStatus;
  tone: ClubSubscriptionStatusTone;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const EXPIRING_WINDOW_DAYS = 30;

export function parseClubSubscriptionEndDate(
  description: string | null | undefined,
  clubCreatedAt?: Date | string | null
): Date | null {
  const meta = parseClubDescriptionMeta(description) as {
    subscriptionEnd?: string;
  };
  const raw = meta.subscriptionEnd?.trim();
  if (raw) {
    const d = new Date(raw);
    if (!Number.isNaN(d.getTime())) return d;
  }
  if (clubCreatedAt) {
    const created = new Date(clubCreatedAt);
    if (!Number.isNaN(created.getTime())) {
      const inferred = new Date(created);
      inferred.setFullYear(inferred.getFullYear() + 1);
      return inferred;
    }
  }
  return null;
}

export function classifyClubSubscriptionEnd(
  endDate: Date | null,
  now: Date = new Date()
): 'active' | 'expiring' | 'expired' {
  if (!endDate) return 'active';
  const end = endDate.getTime();
  const nowMs = now.getTime();
  if (end > nowMs + EXPIRING_WINDOW_DAYS * MS_PER_DAY) return 'active';
  if (end > nowMs) return 'expiring';
  return 'expired';
}

/** Aggregate network subscription status for all clubs owned by one club admin. */
export function aggregateClubAdminSubscriptionStatus(
  clubEndDates: (Date | null)[],
  now: Date = new Date()
): ClubSubscriptionRowStatus {
  if (clubEndDates.length === 0) {
    return { label: 'Active', tone: 'active' };
  }

  const states = clubEndDates.map((d) => classifyClubSubscriptionEnd(d, now));
  const expiredCount = states.filter((s) => s === 'expired').length;
  const expiringCount = states.filter((s) => s === 'expiring').length;
  const total = states.length;

  if (expiredCount === total) {
    return { label: 'Expired', tone: 'all-expired' };
  }
  if (expiredCount > 0) {
    return { label: 'Expired', tone: 'partial-expired' };
  }
  if (expiringCount > 0) {
    return { label: 'Expiring', tone: 'expiring' };
  }
  return { label: 'Active', tone: 'active' };
}

export function defaultClubSubscriptionEndDate(from: Date = new Date()): string {
  const end = new Date(from);
  end.setFullYear(end.getFullYear() + 1);
  return end.toISOString().slice(0, 10);
}

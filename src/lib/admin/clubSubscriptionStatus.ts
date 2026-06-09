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

/** Fixed renewal duration until per-version durations are configured. */
export const MEMBERSHIP_RENEWAL_DURATION_DAYS = 365;

/** When end is missing, default to start + standard membership duration (365 days). */
export function inferMembershipEndDateYmd(
  dateStart: string | null | undefined,
  dateEnd?: string | null,
): string | null {
  const normalizedEnd = dateEnd?.trim().slice(0, 10);
  if (normalizedEnd) return normalizedEnd;
  const start = dateStart?.trim().slice(0, 10);
  if (!start) return null;
  const base = new Date(`${start}T12:00:00.000Z`);
  if (Number.isNaN(base.getTime())) return null;
  base.setUTCDate(base.getUTCDate() + MEMBERSHIP_RENEWAL_DURATION_DAYS);
  return base.toISOString().slice(0, 10);
}

export function parseClubSubscriptionStartDate(
  description: string | null | undefined,
  clubCreatedAt?: Date | string | null,
): string {
  const meta = parseClubDescriptionMeta(description) as { subscriptionStart?: string };
  const raw = meta.subscriptionStart?.trim();
  if (raw) {
    const d = new Date(raw);
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }
  if (clubCreatedAt) {
    const created = new Date(clubCreatedAt);
    if (!Number.isNaN(created.getTime())) return created.toISOString().slice(0, 10);
  }
  return '';
}

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
  const startYmd = parseClubSubscriptionStartDate(description, clubCreatedAt);
  const inferredYmd = inferMembershipEndDateYmd(startYmd, null);
  if (inferredYmd) {
    return new Date(`${inferredYmd}T12:00:00.000Z`);
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

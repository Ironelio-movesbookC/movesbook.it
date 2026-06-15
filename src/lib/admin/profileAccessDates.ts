import { inferMembershipEndDateYmd, MEMBERSHIP_STATUS_NOT_YET_ACTIVE } from '@/lib/admin/clubSubscriptionStatus';
import { periodStatusFromDates } from '@/lib/admin/networkSubscriptionHistory';
import type { PcuAccessSettings } from '@/lib/admin/userPcuAccessSettings';

export type ProfileSubscriptionDateRow = {
  id?: string;
  dateStart: string;
  dateEnd?: string | null;
  status?: string;
};

function isNotYetActiveStatus(status?: string): boolean {
  return (status?.trim() || '').toLowerCase() === MEMBERSHIP_STATUS_NOT_YET_ACTIVE.toLowerCase();
}

function rowStatus(row: ProfileSubscriptionDateRow): string {
  return (
    row.status?.trim() ||
    periodStatusFromDates({ dateStart: row.dateStart, dateEnd: row.dateEnd ?? null })
  );
}

function sortRowsByStartDesc(rows: ProfileSubscriptionDateRow[]): ProfileSubscriptionDateRow[] {
  return [...rows].sort((a, b) => {
    const sa = a.dateStart?.trim().slice(0, 10) || '';
    const sb = b.dateStart?.trim().slice(0, 10) || '';
    return sb.localeCompare(sa);
  });
}

/** Last membership that is active, expiring, or expired — never not-yet-active. */
export function pickPcuDisplayMembershipRow(
  rows: ProfileSubscriptionDateRow[],
): ProfileSubscriptionDateRow | null {
  if (rows.length === 0) return null;
  const eligible = rows.filter((r) => !isNotYetActiveStatus(rowStatus(r)));
  if (eligible.length === 0) return null;
  return sortRowsByStartDesc(eligible)[0]!;
}

/** True when any subscription row is not-yet-active (renewed, pending start). */
export function hasPendingMembershipRenewal(rows: ProfileSubscriptionDateRow[]): boolean {
  return rows.some((r) => isNotYetActiveStatus(rowStatus(r)));
}

/** Start/End fields at the top of the PCU — never a not-yet-active membership. */
export function resolveProfileAccessDates(
  rows: ProfileSubscriptionDateRow[],
  pcuAccess?: PcuAccessSettings | null,
  fallback?: { start?: string; end?: string | null },
): { accessStart: string; accessEnd: string; alreadyRenewed: boolean } {
  const alreadyRenewed = hasPendingMembershipRenewal(rows);
  const displayRow = pickPcuDisplayMembershipRow(rows);
  if (displayRow) {
    const start = displayRow.dateStart?.trim().slice(0, 10) || '';
    const end =
      inferMembershipEndDateYmd(displayRow.dateStart, displayRow.dateEnd) ||
      displayRow.dateEnd?.trim().slice(0, 10) ||
      '';
    return { accessStart: start, accessEnd: end, alreadyRenewed };
  }

  const pcuStart = pcuAccess?.accessStartIso?.trim().slice(0, 10) || '';
  const pcuEnd = pcuAccess?.accessEndIso?.trim().slice(0, 10) || '';
  if (
    pcuStart &&
    periodStatusFromDates({ dateStart: pcuStart, dateEnd: pcuEnd || null }) !==
      MEMBERSHIP_STATUS_NOT_YET_ACTIVE
  ) {
    return { accessStart: pcuStart, accessEnd: pcuEnd, alreadyRenewed };
  }

  return {
    accessStart: fallback?.start?.trim() || '',
    accessEnd: fallback?.end?.trim() || '',
    alreadyRenewed,
  };
}

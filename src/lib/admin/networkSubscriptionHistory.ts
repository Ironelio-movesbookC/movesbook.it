import { parseAdminSettingsJson } from '@/lib/admin/userProfilePanelSettings';
import {
  classifyClubSubscriptionEnd,
  inferMembershipEndDateYmd,
  MEMBERSHIP_RENEWAL_DURATION_DAYS,
} from '@/lib/admin/clubSubscriptionStatus';
import {
  mergePcuAccessIntoAdminSettings,
  readPcuAccessSettings,
} from '@/lib/admin/userPcuAccessSettings';
import type { RegisteredUserListRow } from '@/lib/admin/expandRegisteredUserListRows';

/** One Movesbook network membership period (typically 6 months or 1 year). */
export type NetworkSubscriptionPeriod = {
  id: string;
  dateStart: string;
  dateEnd: string | null;
  version?: string;
  entityId?: string | null;
  companyName?: string;
  username?: string;
  status?: string;
  archivedAt?: string;
};

export type MembershipViewMode = 'all' | 'current' | 'last' | 'lastPerUser';

/** Default list sort per membership toolbar button. */
export type MembershipListSortOrder =
  | 'fullname'
  | 'date_start_desc'
  | 'date_end_asc'
  | 'username'
  | 'date';

const HISTORY_KEY = 'networkSubscriptionHistory';
const DELETED_SUBSCRIPTIONS_KEY = 'deletedSubscriptionPeriods';
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function parseYmdMs(value: string | null | undefined): number {
  if (!value?.trim()) return 0;
  const t = new Date(value.trim()).getTime();
  return Number.isNaN(t) ? 0 : t;
}

export function sliceYmd(value: string | null | undefined): string {
  return value?.trim().slice(0, 10) ?? '';
}

export function addDaysYmd(ymd: string, days: number): string {
  const d = new Date(ymd.trim());
  if (Number.isNaN(d.getTime())) return ymd;
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Returns an error message when end is before start; otherwise null. */
export function validateSubscriptionDateRange(
  dateStart: string | null | undefined,
  dateEnd: string | null | undefined,
): string | null {
  const startMs = parseYmdMs(dateStart);
  const endMs = parseYmdMs(dateEnd);
  if (!startMs || !endMs) return null;
  if (endMs < startMs) return 'End date cannot be earlier than start date';
  return null;
}

/**
 * Movesbook renewal start date:
 * - previous subscription already expired → today
 * - previous subscription still valid → day after previous end
 */
export function computeRenewalStartDate(
  previousEnd: string | null | undefined,
  now: Date = new Date(),
): string {
  const today = now.toISOString().slice(0, 10);
  const todayMs = parseYmdMs(today);
  const prevEndMs = parseYmdMs(previousEnd);
  if (!prevEndMs || prevEndMs < todayMs) return today;
  return addDaysYmd(sliceYmd(previousEnd), 1);
}

export type PcuAccessWindow = {
  accessStartIso: string;
  accessEndIso: string;
};

/** The single current membership among historical + live periods. */
export function pickCurrentSubscriptionPeriod(
  periods: NetworkSubscriptionPeriod[],
  pcuAccess?: PcuAccessWindow | null,
): NetworkSubscriptionPeriod | null {
  if (periods.length === 0) return null;
  const accessStart = sliceYmd(pcuAccess?.accessStartIso);
  const accessEnd = sliceYmd(pcuAccess?.accessEndIso);
  if (accessStart) {
    const exact = periods.find(
      (p) => sliceYmd(p.dateStart) === accessStart && sliceYmd(p.dateEnd) === accessEnd,
    );
    if (exact) return exact;
  }
  const active = periods.filter((p) => periodStatusFromDates(p) !== 'Expired');
  if (active.length > 0) {
    return [...active].sort((a, b) => {
      const startDiff = parseYmdMs(b.dateStart) - parseYmdMs(a.dateStart);
      if (startDiff !== 0) return startDiff;
      return parseYmdMs(b.dateEnd) - parseYmdMs(a.dateEnd);
    })[0]!;
  }
  return [...periods].sort((a, b) => {
    const startDiff = parseYmdMs(b.dateStart) - parseYmdMs(a.dateStart);
    if (startDiff !== 0) return startDiff;
    return parseYmdMs(b.dateEnd) - parseYmdMs(a.dateEnd);
  })[0]!;
}

function periodDedupeKey(period: NetworkSubscriptionPeriod): string {
  return `${period.entityId ?? ''}|${sliceYmd(period.dateStart)}|${sliceYmd(period.dateEnd)}`;
}

function pickPreferredSubscriptionPeriod(
  a: NetworkSubscriptionPeriod,
  b: NetworkSubscriptionPeriod,
): NetworkSubscriptionPeriod {
  const aCurrent = a.id.startsWith('current-');
  const bCurrent = b.id.startsWith('current-');
  if (aCurrent && !bCurrent) return a;
  if (bCurrent && !aCurrent) return b;
  const aArchived = parseYmdMs(a.archivedAt);
  const bArchived = parseYmdMs(b.archivedAt);
  if (bArchived > aArchived) return b;
  return a;
}

/** Collapse duplicate history rows that share the same entity + start + end dates. */
export function dedupeSubscriptionPeriods(
  periods: NetworkSubscriptionPeriod[],
): NetworkSubscriptionPeriod[] {
  const byKey = new Map<string, NetworkSubscriptionPeriod>();
  for (const period of periods) {
    const key = periodDedupeKey(period);
    const existing = byKey.get(key);
    byKey.set(key, existing ? pickPreferredSubscriptionPeriod(existing, period) : period);
  }
  return Array.from(byKey.values());
}

/**
 * Active / Expired / Expiring from subscription dates.
 * Expired only after the end date; future start dates before end remain Active/Expiring.
 */
export function periodStatusFromDates(
  period: Pick<NetworkSubscriptionPeriod, 'dateStart' | 'dateEnd'>,
  now: Date = new Date(),
): string {
  const todayMs = parseYmdMs(now.toISOString().slice(0, 10));
  const effectiveEnd = inferMembershipEndDateYmd(period.dateStart, period.dateEnd);
  const endMs = effectiveEnd ? parseYmdMs(effectiveEnd) : null;

  if (endMs && todayMs > endMs) return 'Expired';

  return periodDisplayStatus(effectiveEnd);
}

/** Derive list/profile status from dates (never from stored status flags). */
export function resolveMembershipPeriodStatus(
  period: NetworkSubscriptionPeriod,
  _current?: NetworkSubscriptionPeriod | null,
  now?: Date,
): string {
  void _current;
  return periodStatusFromDates(period, now);
}

function withResolvedMembershipStatuses(
  periods: NetworkSubscriptionPeriod[],
  _pcuAccess?: PcuAccessWindow | null,
): NetworkSubscriptionPeriod[] {
  void _pcuAccess;
  return dedupeSubscriptionPeriods(periods).map((p) => ({
    ...p,
    status: periodStatusFromDates(p),
  }));
}

export function computeRenewalEndDate(
  startYmd: string,
  durationDays: number = MEMBERSHIP_RENEWAL_DURATION_DAYS,
): string {
  return addDaysYmd(startYmd, durationDays);
}

export type MembershipRenewalInput = {
  dateStart: string;
  dateEnd: string | null;
  version?: string;
  entityId?: string | null;
  companyName?: string;
  username?: string;
};

/** Archive the previous period and prepare admin settings for a renewed membership. */
export function applyMembershipRenewalToAdminSettings(
  adminSettingsRaw: string | null | undefined,
  previous: MembershipRenewalInput,
  nextStart: string,
  nextEnd: string,
): string {
  return appendArchivedPeriodIfChanged(
    adminSettingsRaw,
    { accessStartIso: previous.dateStart, accessEndIso: previous.dateEnd ?? '' },
    { accessStartIso: nextStart, accessEndIso: nextEnd },
    {
      version: previous.version,
      entityId: previous.entityId ?? null,
      companyName: previous.companyName,
      username: previous.username,
    },
  );
}

/** Whether global PCU access dates should move forward with this entity renewal. */
export function shouldSyncPcuAccessOnRenewal(
  entityId: string | null | undefined,
  primaryEntityId: string | null | undefined,
  previous: MembershipRenewalInput,
  pcuAccess: PcuAccessWindow,
): boolean {
  if (!entityId) return true;
  if (primaryEntityId && entityId === primaryEntityId) return true;
  const prevStart = sliceYmd(previous.dateStart);
  const prevEnd = sliceYmd(previous.dateEnd);
  const pcuStart = sliceYmd(pcuAccess.accessStartIso);
  const pcuEnd = sliceYmd(pcuAccess.accessEndIso);
  return prevStart === pcuStart && prevEnd === pcuEnd;
}

export function periodDisplayStatus(dateEnd: string | null | undefined): string {
  if (!dateEnd?.trim()) return 'Active';
  const end = new Date(dateEnd);
  if (Number.isNaN(end.getTime())) return 'Active';
  const tone = classifyClubSubscriptionEnd(end);
  if (tone === 'expired') return 'Expired';
  if (tone === 'expiring') return 'Expiring';
  return 'Active';
}

export function isActiveMembershipPeriod(
  dateStart: string | null | undefined,
  dateEnd?: string | null | undefined,
): boolean {
  return periodStatusFromDates({ dateStart: dateStart ?? '', dateEnd: dateEnd ?? null }) !== 'Expired';
}

export function readNetworkSubscriptionHistory(
  adminSettingsRaw: string | null | undefined,
): NetworkSubscriptionPeriod[] {
  const adminSettings = parseAdminSettingsJson(adminSettingsRaw);
  const block = adminSettings[HISTORY_KEY];
  if (!block || typeof block !== 'object') return [];
  const periods = (block as { periods?: unknown }).periods;
  if (!Array.isArray(periods)) return [];
  const parsed = periods
    .filter((p): p is Record<string, unknown> => Boolean(p && typeof p === 'object'))
    .map((p, index) => ({
      id: String(p.id ?? `hist-${index}`),
      dateStart: String(p.dateStart ?? '').slice(0, 10),
      dateEnd: p.dateEnd != null && String(p.dateEnd).trim() ? String(p.dateEnd).slice(0, 10) : null,
      version: typeof p.version === 'string' ? p.version : undefined,
      entityId: typeof p.entityId === 'string' ? p.entityId : null,
      companyName: typeof p.companyName === 'string' ? p.companyName : undefined,
      username: typeof p.username === 'string' ? p.username : undefined,
      status: typeof p.status === 'string' ? p.status : undefined,
      archivedAt: typeof p.archivedAt === 'string' ? p.archivedAt : undefined,
    }))
    .filter((p) => Boolean(p.dateStart));
  return dedupeSubscriptionPeriods(parsed);
}

export function mergeNetworkSubscriptionHistory(
  adminSettingsRaw: string | null | undefined,
  periods: NetworkSubscriptionPeriod[],
): string {
  const adminSettings = parseAdminSettingsJson(adminSettingsRaw);
  return JSON.stringify({
    ...adminSettings,
    [HISTORY_KEY]: {
      periods: dedupeSubscriptionPeriods(periods),
      updatedAt: new Date().toISOString(),
    },
  });
}

/** Archive the previous access window when admin changes subscription dates. */
export function appendArchivedPeriodIfChanged(
  adminSettingsRaw: string | null | undefined,
  previous: { accessStartIso: string; accessEndIso: string },
  next: { accessStartIso: string; accessEndIso: string },
  meta?: Pick<NetworkSubscriptionPeriod, 'version' | 'entityId' | 'companyName' | 'username'>,
): string {
  const prevStart = previous.accessStartIso.trim().slice(0, 10);
  const prevEnd = previous.accessEndIso.trim().slice(0, 10) || null;
  const nextStart = next.accessStartIso.trim().slice(0, 10);
  const nextEnd = next.accessEndIso.trim().slice(0, 10) || null;
  if (!prevStart || (prevStart === nextStart && prevEnd === nextEnd)) {
    return adminSettingsRaw?.trim() || '{}';
  }

  const history = readNetworkSubscriptionHistory(adminSettingsRaw);
  const archived: NetworkSubscriptionPeriod = {
    id: `archived-${Date.now()}`,
    dateStart: prevStart,
    dateEnd: prevEnd,
    version: meta?.version,
    entityId: meta?.entityId ?? null,
    companyName: meta?.companyName,
    username: meta?.username,
    status: periodDisplayStatus(prevEnd),
    archivedAt: new Date().toISOString(),
  };
  const samePeriod = (p: NetworkSubscriptionPeriod) =>
    p.dateStart === archived.dateStart &&
    (p.dateEnd ?? '') === (archived.dateEnd ?? '') &&
    (p.entityId ?? null) === (archived.entityId ?? null);

  if (history.some(samePeriod)) {
    return adminSettingsRaw?.trim() || '{}';
  }

  const deduped = history.filter((p) => !samePeriod(p));
  return mergeNetworkSubscriptionHistory(adminSettingsRaw, [...deduped, archived]);
}

function rowUsesPcuAccessDates(
  row: RegisteredUserListRow,
  pcuAccess?: PcuAccessWindow | null,
): boolean {
  if (!sliceYmd(pcuAccess?.accessStartIso)) return false;
  if (!row.entityId) return true;
  if (row.primaryClubId && row.entityId === row.primaryClubId) return true;
  return false;
}

function rowToPeriod(
  row: RegisteredUserListRow,
  pcuAccess?: PcuAccessWindow | null,
): NetworkSubscriptionPeriod {
  const usePcu = rowUsesPcuAccessDates(row, pcuAccess);
  const dateStart = usePcu ? sliceYmd(pcuAccess!.accessStartIso) : row.dateStart;
  const dateEnd = usePcu
    ? sliceYmd(pcuAccess!.accessEndIso) || null
    : row.dateEnd;
  return {
    id: `current-${row.rowKey}`,
    dateStart,
    dateEnd,
    version: row.version,
    entityId: row.entityId ?? null,
    companyName: row.companyName,
    username: row.username,
    status: periodDisplayStatus(dateEnd),
  };
}

export function readDeletedSubscriptionPeriods(
  adminSettingsRaw: string | null | undefined,
): SubscriptionPeriodDeletion[] {
  const adminSettings = parseAdminSettingsJson(adminSettingsRaw);
  const arr = adminSettings[DELETED_SUBSCRIPTIONS_KEY];
  if (!Array.isArray(arr)) return [];
  return arr
    .filter((p): p is Record<string, unknown> => Boolean(p && typeof p === 'object'))
    .map((p) => ({
      periodId: String(p.periodId ?? '').trim(),
      entityId:
        p.entityId === null || p.entityId === undefined
          ? undefined
          : String(p.entityId).trim() || null,
      dateStart: typeof p.dateStart === 'string' ? p.dateStart.trim() : undefined,
      dateEnd:
        p.dateEnd === null
          ? null
          : typeof p.dateEnd === 'string'
            ? p.dateEnd.trim() || null
            : undefined,
    }))
    .filter((p) => Boolean(p.periodId));
}

function deletionRecordKey(del: SubscriptionPeriodDeletion): string {
  return [
    del.periodId,
    del.entityId ?? '',
    del.dateStart ?? '',
    del.dateEnd ?? '',
  ].join('|');
}

function mergeDeletedSubscriptionPeriods(
  adminSettingsRaw: string | null | undefined,
  deletions: SubscriptionPeriodDeletion[],
): string {
  const adminSettings = parseAdminSettingsJson(adminSettingsRaw);
  const existing = readDeletedSubscriptionPeriods(adminSettingsRaw);
  const seen = new Set(existing.map(deletionRecordKey));
  const merged = [...existing];
  for (const del of deletions) {
    const key = deletionRecordKey(del);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(del);
  }
  return JSON.stringify({
    ...adminSettings,
    [DELETED_SUBSCRIPTIONS_KEY]: merged,
  });
}

export function isSubscriptionPeriodDeleted(
  period: NetworkSubscriptionPeriod,
  deletions: SubscriptionPeriodDeletion[],
  rowKey?: string,
): boolean {
  if (deletions.length === 0) return false;
  return deletions.some((del) => {
    if (periodMatchesDeletion(period, del)) return true;
    if (rowKey && del.periodId === `current-${rowKey}` && period.id === `current-${rowKey}`) {
      return true;
    }
    if (
      del.dateStart &&
      period.dateStart === del.dateStart.slice(0, 10) &&
      (period.dateEnd ?? '') === (del.dateEnd?.trim().slice(0, 10) ?? '') &&
      (del.entityId === undefined || (period.entityId ?? null) === (del.entityId ?? null))
    ) {
      return (
        del.periodId === period.id ||
        del.periodId.startsWith('current-') ||
        del.periodId.startsWith('account-')
      );
    }
    return false;
  });
}

function periodsForRow(
  row: RegisteredUserListRow,
  userHistory: NetworkSubscriptionPeriod[],
  deleted: SubscriptionPeriodDeletion[] = [],
  pcuAccess?: PcuAccessWindow | null,
): NetworkSubscriptionPeriod[] {
  const entityId = row.entityId ?? null;
  const matching = userHistory.filter((p) => {
    const pEntity = p.entityId ?? null;
    return entityId ? pEntity === entityId : !pEntity;
  });

  const current = rowToPeriod(row, pcuAccess);
  const sameAsCurrent = (p: NetworkSubscriptionPeriod) =>
    p.dateStart === current.dateStart && (p.dateEnd ?? '') === (current.dateEnd ?? '');

  const merged = [...matching.filter((p) => !sameAsCurrent(p)), current].filter(
    (p) => !isSubscriptionPeriodDeleted(p, deleted, row.rowKey),
  );
  const sorted = merged.sort((a, b) => parseYmdMs(a.dateStart) - parseYmdMs(b.dateStart));
  return withResolvedMembershipStatuses(sorted, pcuAccess);
}

function periodToListRow(
  row: RegisteredUserListRow,
  period: NetworkSubscriptionPeriod,
): RegisteredUserListRow {
  const status = periodStatusFromDates(period);
  return {
    ...row,
    rowKey: `${row.rowKey}-period-${period.id}`,
    dateStart: period.dateStart,
    dateEnd: inferMembershipEndDateYmd(period.dateStart, period.dateEnd),
    version: period.version?.trim() || row.version,
    companyName: period.companyName?.trim() || row.companyName,
    username: period.username?.trim() || row.username,
    status,
    statusTone:
      status === 'Expired'
        ? 'all-expired'
        : status === 'Expiring'
          ? 'expiring'
          : 'active',
  };
}

/** The chronologically last membership period (latest start date). */
export function pickLatestMembershipRow(
  rows: RegisteredUserListRow[],
): RegisteredUserListRow | null {
  if (rows.length === 0) return null;
  return [...rows].sort((a, b) => {
    const startDiff = parseYmdMs(b.dateStart) - parseYmdMs(a.dateStart);
    if (startDiff !== 0) return startDiff;
    return parseYmdMs(b.dateEnd) - parseYmdMs(a.dateEnd);
  })[0]!;
}

/** Latest membership row per owned entity (club/team/group). */
export function pickLatestMembershipRowPerEntity(
  rows: RegisteredUserListRow[],
): RegisteredUserListRow[] {
  const byEntity = new Map<string, RegisteredUserListRow[]>();
  for (const row of rows) {
    const key = membershipEntityGroupKey(row);
    const list = byEntity.get(key) ?? [];
    list.push(row);
    byEntity.set(key, list);
  }
  return Array.from(byEntity.values())
    .map((group) => pickLatestMembershipRow(group))
    .filter((r): r is RegisteredUserListRow => r != null);
}

function isMembershipStartedInLast30Days(dateStart: string): boolean {
  const startMs = parseYmdMs(dateStart);
  if (!startMs) return false;
  return startMs >= Date.now() - THIRTY_DAYS_MS;
}

export function getDefaultMembershipSortOrder(mode: MembershipViewMode): MembershipListSortOrder {
  switch (mode) {
    case 'lastPerUser':
      return 'fullname';
    case 'current':
      return 'date_end_asc';
    case 'last':
    case 'all':
    default:
      return 'date_start_desc';
  }
}

export function sortMembershipListRows(
  rows: RegisteredUserListRow[],
  order: string | null | undefined,
  mode?: MembershipViewMode,
): RegisteredUserListRow[] {
  const resolved =
    (order ?? '').trim() || (mode ? getDefaultMembershipSortOrder(mode) : 'date_start_desc');
  const sorted = [...rows];

  switch (resolved) {
    case 'fullname':
      sorted.sort((a, b) =>
        (a.displayName || '').localeCompare(b.displayName || '', undefined, {
          sensitivity: 'base',
        }),
      );
      break;
    case 'date_end_asc':
    case 'date_end':
      sorted.sort((a, b) => {
        const ae = a.dateEnd?.trim() ? parseYmdMs(a.dateEnd) : Number.MAX_SAFE_INTEGER;
        const be = b.dateEnd?.trim() ? parseYmdMs(b.dateEnd) : Number.MAX_SAFE_INTEGER;
        return ae - be;
      });
      break;
    case 'username':
      sorted.sort((a, b) =>
        (a.accountUsername ?? a.username).localeCompare(
          b.accountUsername ?? b.username,
          undefined,
          { sensitivity: 'base' },
        ),
      );
      break;
    case 'date':
    case 'date_start_desc':
    default:
      sorted.sort((a, b) => parseYmdMs(b.dateStart) - parseYmdMs(a.dateStart));
      break;
  }

  return sorted;
}

/** Expand each list row into one row per stored + current membership period. */
export function expandListRowsWithMembershipPeriods(
  rows: RegisteredUserListRow[],
  historyByUserId: Map<string, NetworkSubscriptionPeriod[]>,
  deletedByUserId?: Map<string, SubscriptionPeriodDeletion[]>,
  pcuAccessByUserId?: Map<string, PcuAccessWindow>,
): RegisteredUserListRow[] {
  return rows.flatMap((row) => {
    const deleted = deletedByUserId?.get(row.id) ?? [];
    const periods = periodsForRow(
      row,
      historyByUserId.get(row.id) ?? [],
      deleted,
      pcuAccessByUserId?.get(row.id),
    );
    if (periods.length === 0) return [];
    if (periods.length <= 1) {
      const only = periods[0];
      return only ? [periodToListRow(row, only)] : [];
    }
    return periods.map((p) => periodToListRow(row, p));
  });
}

/** Stable key: one membership stream per user + owned entity (club/team/group). */
export function membershipEntityGroupKey(row: RegisteredUserListRow): string {
  const entityPart = row.entityId?.trim() || 'account';
  return `${row.id}:${entityPart}`;
}

/**
 * Apply admin membership toolbar mode (same rules for every segment).
 *
 * - **all**: every membership period (user may appear multiple times).
 * - **current**: only non-expired, currently valid memberships.
 * - **last**: memberships whose start date falls within the last 30 days.
 * - **lastPerUser**: latest renewal per owned entity (each club/team/group separately).
 */
export function applyMembershipView(
  rows: RegisteredUserListRow[],
  mode: MembershipViewMode,
): RegisteredUserListRow[] {
  if (rows.length === 0) return rows;

  if (mode === 'current') {
    return rows.filter((r) => isActiveMembershipPeriod(r.dateStart, r.dateEnd));
  }

  if (mode === 'last') {
    return rows.filter((r) => isMembershipStartedInLast30Days(r.dateStart));
  }

  if (mode === 'lastPerUser') {
    const byEntity = new Map<string, RegisteredUserListRow[]>();
    for (const row of rows) {
      const key = membershipEntityGroupKey(row);
      const list = byEntity.get(key) ?? [];
      list.push(row);
      byEntity.set(key, list);
    }
    return Array.from(byEntity.values())
      .map((group) => pickLatestMembershipRow(group))
      .filter((r): r is RegisteredUserListRow => r != null);
  }

  return rows;
}

export function buildMembershipListRows(
  rows: RegisteredUserListRow[],
  historyByUserId: Map<string, NetworkSubscriptionPeriod[]>,
  mode: MembershipViewMode,
  sortOrder?: string | null,
  deletedByUserId?: Map<string, SubscriptionPeriodDeletion[]>,
  pcuAccessByUserId?: Map<string, PcuAccessWindow>,
): RegisteredUserListRow[] {
  const withPeriods = expandListRowsWithMembershipPeriods(
    rows,
    historyByUserId,
    deletedByUserId,
    pcuAccessByUserId,
  );
  const filtered = mode === 'all' ? withPeriods : applyMembershipView(withPeriods, mode);
  return sortMembershipListRows(filtered, sortOrder, mode);
}

export type SubscriptionDateField = 'dateStart' | 'dateEnd';

export function parseSubscriptionDateField(
  raw: string | null | undefined,
): SubscriptionDateField {
  return raw?.trim() === 'dateEnd' ? 'dateEnd' : 'dateStart';
}

/** Filter list rows by Date Start or Date End within an inclusive YYYY-MM-DD range. */
export function filterListRowsBySubscriptionDateRange(
  rows: RegisteredUserListRow[],
  field: SubscriptionDateField,
  from: string,
  to: string,
): RegisteredUserListRow[] {
  if (!from.trim() && !to.trim()) return rows;
  const fromMs = from.trim() ? parseYmdMs(from.trim()) : 0;
  const toMs = to.trim() ? parseYmdMs(to.trim()) : 0;
  const fromBound = fromMs || null;
  const toBound = toMs || null;

  return rows.filter((row) => {
    const raw = field === 'dateStart' ? row.dateStart : row.dateEnd;
    const valMs = parseYmdMs(raw ?? '');
    if (!valMs) return false;
    if (fromBound && valMs < fromBound) return false;
    if (toBound && valMs > toBound) return false;
    return true;
  });
}

export type SubscriptionPeriodDeletion = {
  periodId: string;
  entityId?: string | null;
  dateStart?: string;
  dateEnd?: string | null;
};

function periodMatchesDeletion(
  period: NetworkSubscriptionPeriod,
  del: SubscriptionPeriodDeletion,
): boolean {
  if (period.id !== del.periodId) return false;
  if (del.entityId === undefined) return true;
  return (period.entityId ?? null) === (del.entityId ?? null);
}

function deletionTouchesCurrentAccess(
  del: SubscriptionPeriodDeletion,
  accessStartIso: string,
  accessEndIso: string,
): boolean {
  if (del.periodId.startsWith('account-') || del.periodId.startsWith('current-')) {
    return true;
  }
  const start = del.dateStart?.trim().slice(0, 10);
  if (!start) return false;
  const accessStart = accessStartIso.trim().slice(0, 10);
  const accessEnd = accessEndIso.trim().slice(0, 10) || null;
  const delEnd = del.dateEnd?.trim().slice(0, 10) || null;
  return start === accessStart && delEnd === accessEnd;
}

/** Remove selected subscription periods from admin settings (history + current access when needed). */
export function applySubscriptionPeriodDeletions(
  adminSettingsRaw: string | null | undefined,
  deletions: SubscriptionPeriodDeletion[],
  defaults?: { accessStartIso: string; accessEndIso: string },
): string {
  if (deletions.length === 0) return adminSettingsRaw?.trim() || '{}';

  const history = readNetworkSubscriptionHistory(adminSettingsRaw);
  const nextHistory = history.filter(
    (p) => !deletions.some((del) => periodMatchesDeletion(p, del)),
  );
  let next = mergeNetworkSubscriptionHistory(adminSettingsRaw, nextHistory);

  const pcu = readPcuAccessSettings(next, defaults ?? { accessStartIso: '', accessEndIso: '' });
  const clearAccess = deletions.some((del) =>
    deletionTouchesCurrentAccess(del, pcu.accessStartIso, pcu.accessEndIso),
  );
  if (clearAccess) {
    next = mergePcuAccessIntoAdminSettings(next, {
      accessStartIso: '',
      accessEndIso: '',
      suspend: true,
    });
  }

  return mergeDeletedSubscriptionPeriods(next, deletions);
}

export function parseMembershipViewMode(raw: string | null | undefined): MembershipViewMode {
  switch ((raw ?? '').trim()) {
    case 'current':
      return 'current';
    case 'last':
      return 'last';
    case 'lastPerUser':
      return 'lastPerUser';
    case 'all':
    default:
      return 'all';
  }
}

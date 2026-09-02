/**
 * Scope convention shared by every club archive.
 *
 * Selecting a row in one archive and opening a sibling tab must show the detail of THAT record
 * only. The target archive then offers three widths, in this order:
 *
 *   Record selected  → rows of the selected record (default whenever a record was selected)
 *   Member selected  → every row of that record's member
 *   All members      → the whole club
 *
 * The selection travels in the URL as `recordId` + `memberId`, so any archive — including ones
 * not written yet — only has to read `useArchiveScope()` and render `<ArchiveScopeRadios />`.
 */
export type ArchiveScope = 'record' | 'member' | 'all';

export type ArchiveScopeFilters = {
  recordId?: string;
  memberId?: string;
};

/** Query string that carries the selected row onto a sibling archive tab. */
export function archiveScopeQuery(
  recordId?: string | null,
  memberId?: string | null
): string {
  const qs = new URLSearchParams();
  if (recordId) qs.set('recordId', recordId);
  if (memberId) qs.set('memberId', memberId);
  const query = qs.toString();
  return query ? `?${query}` : '';
}

export function defaultArchiveScope(
  recordId?: string | null,
  memberId?: string | null
): ArchiveScope {
  if (recordId) return 'record';
  if (memberId) return 'member';
  return 'all';
}

/** Filters for the list endpoint: narrower scopes win, "all members" sends nothing. */
export function archiveScopeFilters(
  scope: ArchiveScope,
  recordId?: string | null,
  memberId?: string | null
): ArchiveScopeFilters {
  if (scope === 'record' && recordId) return { recordId };
  if (scope === 'member' && memberId) return { memberId };
  return {};
}

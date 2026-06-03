/** Build `/subscriptionuserlists/historyuser/[id]` URL with admin search context preserved. */
export function buildPcuHistoryUserUrl(
  userId: string,
  opts?: {
    scope?: string | null;
    q?: string | null;
    /** Summary page (eye icon from user search). */
    view?: 'overview';
    /** PCU top tab: purchases, profile, admin, functions, alert, … */
    tab?: string | null;
    /** Specific clubs_new row when search matched a club name. */
    clubId?: string | null;
  },
): string {
  const params = new URLSearchParams();
  const scope = opts?.scope?.trim();
  const q = opts?.q?.trim();
  if (scope) params.set('scope', scope);
  if (q) params.set('q', q);
  if (opts?.clubId?.trim()) params.set('clubId', opts.clubId.trim());
  if (opts?.view === 'overview') params.set('view', 'overview');
  if (opts?.tab?.trim()) params.set('tab', opts.tab.trim());
  const qs = params.toString();
  return `/subscriptionuserlists/historyuser/${encodeURIComponent(userId)}${qs ? `?${qs}` : ''}`;
}

export function resolvePcuDefaultTab(
  searchParams: { get: (key: string) => string | null } | null | undefined,
): string {
  if (!searchParams) return 'purchases';
  const tab = searchParams.get('tab')?.trim();
  if (tab) return tab;
  if (searchParams.get('q') === 'new') return 'functions';
  return 'purchases';
}

/** Build `/subscriptionuserlists/historyuser/[id]` URL with admin search context preserved. */
export function buildPcuHistoryUserUrl(
  userId: string,
  opts?: {
    scope?: string | null;
    /** Registered-users list segment (all, clubs, teams, …). */
    segment?: string | null;
    q?: string | null;
    /** Summary page (eye icon from user search). */
    view?: 'overview';
    /** PCU top tab: purchases, profile, admin, functions, alert, … */
    tab?: string | null;
    /** Profile tab sub-view: admin (Admin Profile) or entity (club/team/group/coach profile). */
    profileSubTab?: 'admin' | 'entity' | null;
    /** Specific entity row (club, team, group, coaching group). */
    clubId?: string | null;
  },
): string {
  const params = new URLSearchParams();
  const scope = opts?.scope?.trim();
  const segment = opts?.segment?.trim();
  const q = opts?.q?.trim();
  if (scope) params.set('scope', scope);
  if (segment) params.set('segment', segment);
  if (q) params.set('q', q);
  if (opts?.clubId?.trim()) params.set('clubId', opts.clubId.trim());
  if (opts?.view === 'overview') params.set('view', 'overview');
  if (opts?.tab?.trim()) params.set('tab', opts.tab.trim());
  if (opts?.profileSubTab === 'admin' || opts?.profileSubTab === 'entity') {
    params.set('profileSubTab', opts.profileSubTab);
  }
  const qs = params.toString();
  return `/subscriptionuserlists/historyuser/${encodeURIComponent(userId)}${qs ? `?${qs}` : ''}`;
}

export function resolvePcuProfileSubTab(
  searchParams: { get: (key: string) => string | null } | null | undefined,
): 'admin' | 'entity' {
  const raw = searchParams?.get('profileSubTab')?.trim().toLowerCase();
  return raw === 'entity' ? 'entity' : 'admin';
}

export function resolvePcuDefaultTab(
  searchParams: { get: (key: string) => string | null } | null | undefined,
): string {
  if (!searchParams) return 'purchases';
  const tab = searchParams.get('tab')?.trim();
  if (tab) return tab;
  const profileSub = searchParams.get('profileSubTab')?.trim().toLowerCase();
  if (profileSub === 'admin' || profileSub === 'entity') return 'profile';
  if (searchParams.get('q') === 'new') return 'functions';
  return 'purchases';
}

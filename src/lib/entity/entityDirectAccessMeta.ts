export type EntityDirectAccessKind = 'club' | 'team' | 'group' | 'coach';

export function getEntityProfilePath(
  kind: EntityDirectAccessKind,
  entityId: string,
): string {
  switch (kind) {
    case 'club':
      return `/my-club?clubId=${encodeURIComponent(entityId)}`;
    case 'team':
      return `/my-team?teamId=${encodeURIComponent(entityId)}`;
    case 'group':
      return `/my-group?groupId=${encodeURIComponent(entityId)}`;
    case 'coach':
      return `/my-coaching-group?groupId=${encodeURIComponent(entityId)}`;
  }
}

export function getEntityDashboardPath(kind: EntityDirectAccessKind): string {
  switch (kind) {
    case 'club':
      return '/club/dashboard';
    case 'team':
      return '/team/dashboard';
    case 'group':
      return '/group/dashboard';
    case 'coach':
      return '/coach/dashboard';
  }
}

export function parseEntityRedirectMeta(redirectTo: string): {
  kind: EntityDirectAccessKind;
  entityId: string;
} | null {
  const path = redirectTo.split('?')[0] ?? '';
  if (path.includes('/my-club')) {
    const m = redirectTo.match(/[?&]clubId=([^&]+)/);
    return m?.[1] ? { kind: 'club', entityId: decodeURIComponent(m[1]) } : null;
  }
  if (path.includes('/my-coaching-group')) {
    const m = redirectTo.match(/[?&]groupId=([^&]+)/);
    return m?.[1] ? { kind: 'coach', entityId: decodeURIComponent(m[1]) } : null;
  }
  if (path.includes('/my-team')) {
    const m = redirectTo.match(/[?&]teamId=([^&]+)/);
    return m?.[1] ? { kind: 'team', entityId: decodeURIComponent(m[1]) } : null;
  }
  if (path.includes('/my-group')) {
    const m = redirectTo.match(/[?&]groupId=([^&]+)/);
    return m?.[1] ? { kind: 'group', entityId: decodeURIComponent(m[1]) } : null;
  }
  return null;
}

const BLOCKED_DASHBOARD_PREFIXES: Record<EntityDirectAccessKind, string[]> = {
  club: ['/club/dashboard', '/my-page'],
  team: ['/team/dashboard', '/my-page'],
  group: ['/group/dashboard', '/my-page'],
  coach: ['/coach/dashboard', '/my-page'],
};

const PROFILE_PREFIX: Record<EntityDirectAccessKind, string> = {
  club: '/my-club',
  team: '/my-team',
  group: '/my-group',
  coach: '/my-coaching-group',
};

const ID_QUERY_PARAM: Record<EntityDirectAccessKind, string> = {
  club: 'clubId',
  team: 'teamId',
  group: 'groupId',
  coach: 'groupId',
};

export function isMyPageBlockedForEntityKind(
  pathname: string,
  kind: EntityDirectAccessKind,
): boolean {
  const prefixes = BLOCKED_DASHBOARD_PREFIXES[kind];
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function isWrongEntityProfilePath(
  pathname: string,
  search: string,
  kind: EntityDirectAccessKind,
  entityId: string,
): boolean {
  const prefix = PROFILE_PREFIX[kind];
  if (!pathname.startsWith(prefix)) return false;
  const params = new URLSearchParams(search);
  const id = params.get(ID_QUERY_PARAM[kind]);
  return Boolean(id && id !== entityId);
}

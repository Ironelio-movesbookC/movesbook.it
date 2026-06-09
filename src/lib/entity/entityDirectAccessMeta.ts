import {
  ENTITY_WORKSPACE_DASHBOARD,
  getEntityWorkspaceDashboardPath,
} from '@/lib/entity/entityWorkspaceDashboard';

export type EntityDirectAccessKind = 'club' | 'team' | 'group' | 'coach';

/** @deprecated Use `getEntityWorkspaceDashboardPath('club', clubId)`. */
export function getClubEntityDashboardPath(clubId: string): string {
  return getEntityWorkspaceDashboardPath('club', clubId);
}

export function getEntityProfilePath(
  kind: EntityDirectAccessKind,
  entityId: string,
): string {
  return getEntityWorkspaceDashboardPath(kind, entityId);
}

export function getEntityDashboardPath(kind: EntityDirectAccessKind): string {
  return ENTITY_WORKSPACE_DASHBOARD[kind].dashboardPath;
}

export function parseEntityRedirectMeta(redirectTo: string): {
  kind: EntityDirectAccessKind;
  entityId: string;
} | null {
  const path = redirectTo.split('?')[0] ?? '';

  for (const kind of Object.keys(ENTITY_WORKSPACE_DASHBOARD) as EntityDirectAccessKind[]) {
    const config = ENTITY_WORKSPACE_DASHBOARD[kind];
    if (
      path.includes(config.dashboardPath) ||
      path.includes(config.legacyProfilePrefix)
    ) {
      const m = redirectTo.match(
        new RegExp(`[?&]${config.idQueryParam}=([^&]+)`),
      );
      return m?.[1]
        ? { kind, entityId: decodeURIComponent(m[1]) }
        : null;
    }
  }

  return null;
}

const BLOCKED_DASHBOARD_PREFIXES: Record<EntityDirectAccessKind, string[]> = {
  club: ['/my-page'],
  team: ['/my-page'],
  group: ['/my-page'],
  coach: ['/my-page'],
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
  const config = ENTITY_WORKSPACE_DASHBOARD[kind];
  const params = new URLSearchParams(search);
  const id = params.get(config.idQueryParam);

  if (pathname.startsWith(config.dashboardPath)) {
    return Boolean(id && id !== entityId);
  }

  if (pathname.startsWith(config.legacyProfilePrefix)) {
    return Boolean(id && id !== entityId);
  }

  return false;
}

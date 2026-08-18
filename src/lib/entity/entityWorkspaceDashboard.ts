import type { EntityDirectAccessKind } from '@/lib/entity/entityDirectAccessMeta';
import {
  getEntityCompanyLoginSession,
  getEntityDirectAccessLock,
} from '@/lib/entity/entityDirectAccessSession';

export type EntityWorkspaceDashboardConfig = {
  kind: EntityDirectAccessKind;
  dashboardPath: string;
  storageKey: string;
  idQueryParam: string;
  legacyProfilePrefix: string;
};

export const ENTITY_WORKSPACE_DASHBOARD: Record<
  EntityDirectAccessKind,
  EntityWorkspaceDashboardConfig
> = {
  club: {
    kind: 'club',
    dashboardPath: '/club/dashboard',
    storageKey: 'selectedClub',
    idQueryParam: 'clubId',
    legacyProfilePrefix: '/my-club',
  },
  team: {
    kind: 'team',
    dashboardPath: '/team/dashboard',
    storageKey: 'selectedTeam',
    idQueryParam: 'teamId',
    legacyProfilePrefix: '/my-team',
  },
  group: {
    kind: 'group',
    dashboardPath: '/group/dashboard',
    storageKey: 'selectedGroup',
    idQueryParam: 'groupId',
    legacyProfilePrefix: '/my-group',
  },
  coach: {
    kind: 'coach',
    dashboardPath: '/coach/dashboard',
    storageKey: 'selectedCoachingGroup',
    idQueryParam: 'groupId',
    legacyProfilePrefix: '/my-coaching-group',
  },
};

export function getEntityWorkspaceDashboardPath(
  kind: EntityDirectAccessKind,
  entityId: string,
): string {
  const config = ENTITY_WORKSPACE_DASHBOARD[kind];
  return `${config.dashboardPath}?${config.idQueryParam}=${encodeURIComponent(entityId)}&tab=my-entity`;
}

export function resolveEntityWorkspaceEntityId(
  kind: EntityDirectAccessKind,
  options?: {
    urlEntityId?: string | null;
  },
): string | null {
  const config = ENTITY_WORKSPACE_DASHBOARD[kind];
  const directLock = getEntityDirectAccessLock();
  if (directLock?.kind === kind) return directLock.entityId;

  const companyLogin = getEntityCompanyLoginSession();
  if (companyLogin?.kind === kind) return companyLogin.entityId;

  if (options?.urlEntityId) return options.urlEntityId;

  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(config.storageKey);
    if (saved) return saved;
  }

  return null;
}

export function shouldOpenEntityWorkspaceTab(
  kind: EntityDirectAccessKind,
  options?: {
    urlEntityId?: string | null;
    urlTab?: string | null;
  },
): boolean {
  const directLock = getEntityDirectAccessLock();
  if (directLock?.kind === kind) return true;

  const companyLogin = getEntityCompanyLoginSession();
  if (companyLogin?.kind === kind) return true;

  return options?.urlTab === 'my-entity' && Boolean(options?.urlEntityId);
}

export function isLegacyEntityProfilePath(
  kind: EntityDirectAccessKind,
  pathname: string,
): boolean {
  return pathname.startsWith(ENTITY_WORKSPACE_DASHBOARD[kind].legacyProfilePrefix);
}

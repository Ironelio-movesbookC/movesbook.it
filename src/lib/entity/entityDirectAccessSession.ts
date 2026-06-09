import {
  getEntityProfilePath,
  type EntityDirectAccessKind,
} from '@/lib/entity/entityDirectAccessMeta';

/** Unified session flag: entity username + Direct Access (entity workspace only). */
export const ENTITY_DIRECT_ACCESS_LOCK_KEY = 'movesbook.entityDirectAccessLock';

/** One-shot: entity username + company password → open entity tab on dashboard. */
export const ENTITY_COMPANY_LOGIN_KEY = 'movesbook.entityCompanyLogin';

export type EntityCompanyLoginSession = {
  kind: EntityDirectAccessKind;
  entityId: string;
};

/** @deprecated Legacy club-only key — migrated on read. */
export const CLUB_DIRECT_ACCESS_LOCK_KEY = 'movesbook.clubDirectAccessLock';

export type EntityDirectAccessLock = {
  kind: EntityDirectAccessKind;
  entityId: string;
};

export function setEntityDirectAccessLock(
  kind: EntityDirectAccessKind,
  entityId: string,
): void {
  if (typeof window === 'undefined') return;
  try {
    const lock: EntityDirectAccessLock = {
      kind,
      entityId: entityId.trim(),
    };
    localStorage.setItem(ENTITY_DIRECT_ACCESS_LOCK_KEY, JSON.stringify(lock));
    localStorage.removeItem(CLUB_DIRECT_ACCESS_LOCK_KEY);
  } catch {
    /* ignore quota */
  }
}

export function clearEntityDirectAccessLock(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ENTITY_DIRECT_ACCESS_LOCK_KEY);
  localStorage.removeItem(CLUB_DIRECT_ACCESS_LOCK_KEY);
}

function migrateLegacyClubLock(): EntityDirectAccessLock | null {
  try {
    const raw = localStorage.getItem(CLUB_DIRECT_ACCESS_LOCK_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { clubId?: string };
    if (!parsed?.clubId?.trim()) return null;
    const lock: EntityDirectAccessLock = { kind: 'club', entityId: parsed.clubId.trim() };
    localStorage.setItem(ENTITY_DIRECT_ACCESS_LOCK_KEY, JSON.stringify(lock));
    localStorage.removeItem(CLUB_DIRECT_ACCESS_LOCK_KEY);
    return lock;
  } catch {
    return null;
  }
}

export function getEntityDirectAccessLock(): EntityDirectAccessLock | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(ENTITY_DIRECT_ACCESS_LOCK_KEY);
    if (!raw) return migrateLegacyClubLock();
    const parsed = JSON.parse(raw) as EntityDirectAccessLock;
    if (!parsed?.kind || !parsed?.entityId?.trim()) return migrateLegacyClubLock();
    return { kind: parsed.kind, entityId: parsed.entityId.trim() };
  } catch {
    return migrateLegacyClubLock();
  }
}

export function isEntityDirectAccessLocked(): boolean {
  return getEntityDirectAccessLock() !== null;
}

export function getEntityDirectAccessProfilePath(
  lock?: EntityDirectAccessLock | null,
): string {
  const resolved = lock ?? getEntityDirectAccessLock();
  if (!resolved) return '/my-page';
  return getEntityProfilePath(resolved.kind, resolved.entityId);
}

export function setEntityCompanyLoginSession(
  kind: EntityDirectAccessKind,
  entityId: string,
): void {
  if (typeof window === 'undefined') return;
  try {
    const session: EntityCompanyLoginSession = {
      kind,
      entityId: entityId.trim(),
    };
    sessionStorage.setItem(ENTITY_COMPANY_LOGIN_KEY, JSON.stringify(session));
  } catch {
    /* ignore quota */
  }
}

export function getEntityCompanyLoginSession(): EntityCompanyLoginSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(ENTITY_COMPANY_LOGIN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as EntityCompanyLoginSession;
    if (!parsed?.kind || !parsed?.entityId?.trim()) return null;
    return { kind: parsed.kind, entityId: parsed.entityId.trim() };
  } catch {
    return null;
  }
}

export function clearEntityCompanyLoginSession(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(ENTITY_COMPANY_LOGIN_KEY);
}

/** True when logged in via entity username + company password or direct access. */
export function isEntityWorkspaceSession(
  kind: EntityDirectAccessKind,
): boolean {
  const lock = getEntityDirectAccessLock();
  if (lock?.kind === kind) return true;
  return getEntityCompanyLoginSession()?.kind === kind;
}

/** @deprecated Use `isEntityWorkspaceSession('club')`. */
export function isEntityClubWorkspaceSession(): boolean {
  return isEntityWorkspaceSession('club');
}

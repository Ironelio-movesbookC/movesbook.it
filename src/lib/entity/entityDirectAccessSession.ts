import {
  getEntityProfilePath,
  type EntityDirectAccessKind,
} from '@/lib/entity/entityDirectAccessMeta';

/** Unified session flag: entity username + Direct Access (entity workspace only). */
export const ENTITY_DIRECT_ACCESS_LOCK_KEY = 'movesbook.entityDirectAccessLock';

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

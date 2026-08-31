import {
  clearEntityDirectAccessLock,
  getEntityDirectAccessLock,
  getEntityDirectAccessProfilePath,
  isEntityDirectAccessLocked,
  setEntityDirectAccessLock,
  CLUB_DIRECT_ACCESS_LOCK_KEY,
} from '@/lib/entity/entityDirectAccessSession';

export { CLUB_DIRECT_ACCESS_LOCK_KEY };

export type ClubDirectAccessLock = { clubId: string };

export function setClubDirectAccessLock(clubId: string): void {
  setEntityDirectAccessLock('club', clubId);
}

export function clearClubDirectAccessLock(): void {
  clearEntityDirectAccessLock();
}

export function getClubDirectAccessLock(): ClubDirectAccessLock | null {
  const lock = getEntityDirectAccessLock();
  if (!lock || lock.kind !== 'club') return null;
  return { clubId: lock.entityId };
}

export function isClubDirectAccessLocked(): boolean {
  const lock = getEntityDirectAccessLock();
  return lock?.kind === 'club';
}

export function getClubDirectAccessMyClubPath(lock?: ClubDirectAccessLock | null): string {
  if (lock) {
    return getEntityDirectAccessProfilePath({ kind: 'club', entityId: lock.clubId });
  }
  return getEntityDirectAccessProfilePath(
    getEntityDirectAccessLock()?.kind === 'club'
      ? getEntityDirectAccessLock()
      : null,
  );
}

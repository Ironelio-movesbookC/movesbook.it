import { isStaffPanelSession, type PanelSessionUser } from '@/lib/panelSession';

export function isOwnStaffProfile(
  session: PanelSessionUser | null,
  profileId: string,
): boolean {
  return Boolean(session?.id && session.id === profileId);
}

/** Staff may edit only their own profile; super admin / legacy admin may edit any. */
export function canEditStaffProfile(
  session: PanelSessionUser | null,
  profileId: string,
): boolean {
  if (!isStaffPanelSession(session)) return true;
  return isOwnStaffProfile(session, profileId);
}

export function canDeleteStaffProfile(session: PanelSessionUser | null): boolean {
  return !isStaffPanelSession(session);
}

/** Super Admin / panel admin → any; co-admin → self + linked operators; operators → none. */
export function canAssignMovesbookUsersToStaff(
  session: PanelSessionUser | null,
  targetStaffAccountId: string,
  targetStaffKind: 'OPERATOR' | 'CO_ADMIN',
  linkedOperatorIds: string[] = [],
): boolean {
  if (!targetStaffAccountId) return false;
  if (!isStaffPanelSession(session)) return true;
  if (session?.staffKind === 'OPERATOR') return false;
  if (session?.staffKind === 'CO_ADMIN') {
    if (targetStaffKind === 'CO_ADMIN' && session.id === targetStaffAccountId) {
      return true;
    }
    if (targetStaffKind === 'OPERATOR' && linkedOperatorIds.includes(targetStaffAccountId)) {
      return true;
    }
  }
  return false;
}

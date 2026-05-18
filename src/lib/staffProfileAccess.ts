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

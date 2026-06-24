import {
  isClubAccountUserType,
  isManagedEntityAdminUserType,
} from '@/utils/dashboardRouting';

type ClubWithAdmin = {
  id?: string;
  adminId?: string | null;
  admin?: { id?: string } | null;
};

export function getClubAdminId(club: ClubWithAdmin | null | undefined): string | null {
  if (!club) return null;
  return club.adminId ?? club.admin?.id ?? null;
}

export function isUserClubAdmin(
  userId: string | null | undefined,
  club: ClubWithAdmin | null | undefined,
): boolean {
  if (!userId || !club) return false;
  const adminId = getClubAdminId(club);
  return Boolean(adminId && adminId === userId);
}

/**
 * Club website (bacheca / topics / subtopics) may be edited when:
 * - CLUB account (may bootstrap a club before one exists), or
 * - the signed-in user is adminId of the selected club and has an entity-admin role.
 *
 * Members and non-admin athletes always get read-only.
 */
export function canManageClubWebsite(
  userId: string | null | undefined,
  userType: string,
  club: ClubWithAdmin | null | undefined,
): boolean {
  if (isClubAccountUserType(userType)) return true;
  if (!isManagedEntityAdminUserType(userType)) return false;
  return isUserClubAdmin(userId, club);
}

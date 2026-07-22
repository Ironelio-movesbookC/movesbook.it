import { isClubAccountUserType } from '@/utils/dashboardRouting';

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
 * Club website / desk may be managed when:
 * - CLUB account (may bootstrap a club before one exists), or
 * - the signed-in user is `adminId` of the selected club (any Movesbook role:
 *   ID5 athlete, ID6 coach, ID7 team, ID8 club, ID9 group).
 *
 * Ordinary members who are not the club admin always get read-only.
 */
export function canManageClubWebsite(
  userId: string | null | undefined,
  userType: string,
  club: ClubWithAdmin | null | undefined,
): boolean {
  if (isClubAccountUserType(userType)) return true;
  return isUserClubAdmin(userId, club);
}

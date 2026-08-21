/**
 * Default dashboard route after login and for the navbar "Dashboard" action.
 */
export function getDashboardPathForUserType(userType: string): string {
  switch (userType) {
    case 'ADMIN':
    case 'ATHLETE':
      return '/athlete/dashboard';
    case 'COACH':
      return '/coach/dashboard';
    case 'TEAM':
    case 'TEAM_MANAGER':
      return '/team/dashboard';
    case 'CLUB_TRAINER':
    case 'CLUB_COADMIN':
    case 'CLUB_OPERATOR':
    case 'CLUB_COLLABORATOR':
    case 'CLUB':
      return '/club/dashboard';
    case 'GROUP':
    case 'GROUP_ADMIN':
      return '/group/dashboard';
    default:
      return '/my-page';
  }
}

export function isClubAccountUserType(userType: string): boolean {
  return userType === 'CLUB_TRAINER' || userType === 'CLUB';
}

/** Club staff accounts created from MY CLUB → Staff (coadmin / operator / collaborator). */
export function isClubStaffAccountUserType(userType: string): boolean {
  return (
    userType === 'CLUB_COADMIN' ||
    userType === 'CLUB_OPERATOR' ||
    userType === 'CLUB_COLLABORATOR'
  );
}

/** Club admin/trainer or club staff — may use `/club/dashboard` workspace shell. */
export function canAccessClubWorkspace(userType: string): boolean {
  return isClubAccountUserType(userType) || isClubStaffAccountUserType(userType);
}

/** Team admin accounts (DB stores `TEAM`; legacy UI may use `TEAM_MANAGER`). */
export function isTeamAccountUserType(userType: string): boolean {
  return userType === 'TEAM' || userType === 'TEAM_MANAGER';
}

/** Group admin accounts (DB may store `GROUP` or `GROUP_ADMIN`). */
export function isGroupAccountUserType(userType: string): boolean {
  return userType === 'GROUP' || userType === 'GROUP_ADMIN';
}

/** Coach, team, group, or club account — may administer an entity workspace. */
export function isManagedEntityAdminUserType(userType: string): boolean {
  return (
    isClubAccountUserType(userType) ||
    userType === 'COACH' ||
    isTeamAccountUserType(userType) ||
    isGroupAccountUserType(userType)
  );
}

/**
 * Legacy role ID5 = Single User (ATHLETE).
 * Only these accounts do NOT own a Movesbook website / bacheca / personal topics.
 * Coach, team, group, and club accounts each have their own website data.
 */
export function userOwnsMovesbookWebsite(userType: string): boolean {
  return isManagedEntityAdminUserType(userType);
}

/** True when this user type has a dedicated dashboard (not legacy `/my-page`). */
export function hasDedicatedDashboard(userType: string): boolean {
  return getDashboardPathForUserType(userType) !== '/my-page';
}

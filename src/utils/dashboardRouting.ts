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

/** Team admin accounts (DB stores `TEAM`; legacy UI may use `TEAM_MANAGER`). */
export function isTeamAccountUserType(userType: string): boolean {
  return userType === 'TEAM' || userType === 'TEAM_MANAGER';
}

/** Group admin accounts (DB may store `GROUP` or `GROUP_ADMIN`). */
export function isGroupAccountUserType(userType: string): boolean {
  return userType === 'GROUP' || userType === 'GROUP_ADMIN';
}

/** True when this user type has a dedicated dashboard (not legacy `/my-page`). */
export function hasDedicatedDashboard(userType: string): boolean {
  return getDashboardPathForUserType(userType) !== '/my-page';
}

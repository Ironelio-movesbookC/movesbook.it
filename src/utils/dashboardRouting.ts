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
    case 'TEAM_MANAGER':
      return '/team/dashboard';
    case 'CLUB_TRAINER':
    case 'CLUB':
      return '/club/dashboard';
    case 'GROUP_ADMIN':
      return '/group/dashboard';
    default:
      return '/my-page';
  }
}

export function isClubAccountUserType(userType: string): boolean {
  return userType === 'CLUB_TRAINER' || userType === 'CLUB';
}

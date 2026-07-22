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

/** Coach, team, group, or club account — may administer an entity workspace. */
export function isManagedEntityAdminUserType(userType: string): boolean {
  return (
    isClubAccountUserType(userType) ||
    userType === 'COACH' ||
    isTeamAccountUserType(userType) ||
    isGroupAccountUserType(userType)
  );
}

/** Suggest Movesbook on MY PAGE — legacy role 5 (Athlete) only. */
export function showSuggestMovesbookOnMyPage(userType: string): boolean {
  return userType === 'ATHLETE';
}

/** Suggest Movesbook in entity workspace (My Club, My Teams, …) — legacy roles 6–9. */
export function showSuggestMovesbookOnEntityWorkspace(userType: string): boolean {
  return isManagedEntityAdminUserType(userType);
}

/** Whether Suggest Movesbook should appear for the active workspace tab. */
export function showSuggestMovesbookForTab(
  userType: string,
  tab: 'my-page' | 'my-entity'
): boolean {
  if (tab === 'my-page') return showSuggestMovesbookOnMyPage(userType);
  return showSuggestMovesbookOnEntityWorkspace(userType);
}

/** True when this user type has a dedicated dashboard (not legacy `/my-page`). */
export function hasDedicatedDashboard(userType: string): boolean {
  return getDashboardPathForUserType(userType) !== '/my-page';
}

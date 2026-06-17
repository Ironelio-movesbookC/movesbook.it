export const CLUB_WORKSPACE_ACTIVE_TAB_KEY = 'clubWorkspaceActiveTab';
export const CLUB_HAS_FORM_PROFILE_KEY = 'clubHasFormProfile';

export type ClubWorkspaceTab = 'my-page' | 'my-entity';

export function readClubWorkspaceTab(): ClubWorkspaceTab | null {
  if (typeof window === 'undefined') return null;
  const value = localStorage.getItem(CLUB_WORKSPACE_ACTIVE_TAB_KEY);
  return value === 'my-page' || value === 'my-entity' ? value : null;
}

export function writeClubWorkspaceTab(tab: ClubWorkspaceTab): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CLUB_WORKSPACE_ACTIVE_TAB_KEY, tab);
}

/** True when a club was opened from the sidebar (persisted for hydration). */
export function readSelectedClubHint(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(localStorage.getItem('selectedClub'));
}

/** Optimistic hint so My Club tab does not flash away while clubs are still loading. */
export function readClubFormProfileHint(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    localStorage.getItem(CLUB_HAS_FORM_PROFILE_KEY) === 'true' ||
    Boolean(localStorage.getItem('selectedClub')) ||
    readClubWorkspaceTab() === 'my-entity'
  );
}

export function writeClubFormProfileHint(hasProfile: boolean): void {
  if (typeof window === 'undefined') return;
  if (hasProfile) {
    localStorage.setItem(CLUB_HAS_FORM_PROFILE_KEY, 'true');
  } else {
    localStorage.removeItem(CLUB_HAS_FORM_PROFILE_KEY);
  }
}
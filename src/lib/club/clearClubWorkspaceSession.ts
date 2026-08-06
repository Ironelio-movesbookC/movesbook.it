import {
  CLUB_HAS_FORM_PROFILE_KEY,
  CLUB_WORKSPACE_ACTIVE_TAB_KEY,
} from '@/lib/club/clubWorkspaceTab';

/** Keys that can leave the next login on the wrong club / tab. */
const SESSION_HINT_KEYS = [
  'selectedClub',
  'selectedCoachingGroup',
  'selectedTeam',
  'selectedGroup',
  CLUB_WORKSPACE_ACTIVE_TAB_KEY,
  CLUB_HAS_FORM_PROFILE_KEY,
] as const;

/**
 * Clear sidebar/workspace hints on logout so the next account does not inherit
 * another user's selected club or My Club / My Page tab.
 */
export function clearClubWorkspaceSessionOnLogout(): void {
  if (typeof window === 'undefined') return;
  for (const key of SESSION_HINT_KEYS) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  }
}

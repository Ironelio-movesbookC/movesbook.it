/** Fired when club website friend-list or topics localStorage changes (same tab). */
export const CLUB_WEBSITE_SETTINGS_CHANGED_EVENT = 'club-website-settings-changed';

export function dispatchClubWebsiteSettingsChanged(clubId?: string): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent(CLUB_WEBSITE_SETTINGS_CHANGED_EVENT, { detail: { clubId } })
  );
}

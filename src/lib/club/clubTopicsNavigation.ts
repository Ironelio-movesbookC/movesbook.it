export const CLUB_OPEN_TOPICS_SECTION_KEY = 'clubOpenTopicsSection';

/** After picking a club for topics, expand Club Topics under MY CLUB on arrival. */
export function requestOpenClubTopicsSection(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(CLUB_OPEN_TOPICS_SECTION_KEY, '1');
}

export function consumeOpenClubTopicsSection(): boolean {
  if (typeof window === 'undefined') return false;
  if (sessionStorage.getItem(CLUB_OPEN_TOPICS_SECTION_KEY) !== '1') return false;
  sessionStorage.removeItem(CLUB_OPEN_TOPICS_SECTION_KEY);
  return true;
}

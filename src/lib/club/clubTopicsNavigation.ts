export const CLUB_OPEN_TOPICS_SECTION_KEY = 'clubOpenTopicsSection';
export const PERSONAL_OPEN_TOPICS_SECTION_KEY = 'personalOpenTopicsSection';

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

/** After picking a team/group/trained entity, expand My Topics display under My Page. */
export function requestOpenPersonalTopicsSection(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(PERSONAL_OPEN_TOPICS_SECTION_KEY, '1');
}

export function consumeOpenPersonalTopicsSection(): boolean {
  if (typeof window === 'undefined') return false;
  if (sessionStorage.getItem(PERSONAL_OPEN_TOPICS_SECTION_KEY) !== '1') return false;
  sessionStorage.removeItem(PERSONAL_OPEN_TOPICS_SECTION_KEY);
  return true;
}

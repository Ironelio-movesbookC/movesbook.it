export const CLUB_WEBSITE_LANGUAGE_TABS = [
  { code: 'en', label: 'en' },
  { code: 'fr', label: 'fr' },
  { code: 'de', label: 'de' },
  { code: 'it', label: 'it' },
  { code: 'es', label: 'es' },
  { code: 'por', label: 'por' },
  { code: 'rus', label: 'rus' },
  { code: 'ind', label: 'ind' },
  { code: 'chin', label: 'chin' },
  { code: 'arab', label: 'arab' },
] as const;

export type ClubWebsiteLanguageCode = (typeof CLUB_WEBSITE_LANGUAGE_TABS)[number]['code'];

export function emptyClubWebsiteLangRecord(): Record<string, string> {
  return Object.fromEntries(CLUB_WEBSITE_LANGUAGE_TABS.map((l) => [l.code, '']));
}

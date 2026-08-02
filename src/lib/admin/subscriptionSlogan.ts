/** Map registration / standard locale codes to subscription admin language keys. */
const LOCALE_TO_SUBSCRIPTION_LANG: Record<string, string> = {
  pt: 'por',
  ru: 'rus',
  hi: 'ind',
  id: 'ind',
  zh: 'chin',
  ar: 'arab',
};

export function resolveSubscriptionLangCode(lang: string): string {
  const code = lang.toLowerCase().split('-')[0];
  return LOCALE_TO_SUBSCRIPTION_LANG[code] ?? code;
}

/**
 * Rich-text per language with fallbacks: user locale → subscription key → English.
 * If the user language has no text, English is shown.
 */
export function getLocalizedRichTextForLang(
  byLang: Record<string, string> | undefined,
  lang: string,
): string {
  if (!byLang) return '';
  const subscriptionLang = resolveSubscriptionLangCode(lang);
  const direct = byLang[lang]?.trim();
  const mapped = byLang[subscriptionLang]?.trim();
  const english = byLang.en?.trim();
  return direct || mapped || english || '';
}

/** Rich-text slogan for a version (registration version selection). */
export function getSloganForLang(
  sloganByLang: Record<string, string> | undefined,
  lang: string,
): string {
  return getLocalizedRichTextForLang(sloganByLang, lang);
}

/** Last news about a version (registration Last news tab / news modal). */
export function getLastNewsForLang(
  lastNewsByLang: Record<string, string> | undefined,
  lang: string,
): string {
  return getLocalizedRichTextForLang(lastNewsByLang, lang);
}

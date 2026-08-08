import { ALL_LANGUAGES } from '@/constants/language.constants';
import { normalizeLegacyLanguageCode } from '@/lib/promocodes/legacyLanguageCode';

/** App codes used by Version History editor (`ALL_LANGUAGES.code`) keyed by numeric lang_id. */
const APP_CODE_BY_LANG_ID: Record<number, string> = Object.fromEntries(
  ALL_LANGUAGES.map((l) => [Number(l.id), l.code]),
);

/** Legacy / alias tokens → app code (matches editor + ALL_LANGUAGES). */
const TO_APP_CODE: Record<string, string> = {
  en: 'en',
  english: 'en',
  fr: 'fr',
  french: 'fr',
  de: 'de',
  german: 'de',
  deutsch: 'de',
  it: 'it',
  italian: 'it',
  italiano: 'it',
  es: 'es',
  spanish: 'es',
  por: 'pt',
  pt: 'pt',
  portuguese: 'pt',
  rus: 'ru',
  ru: 'ru',
  russian: 'ru',
  // Legacy PHP used "ind" for Hindi in this codebase
  ind: 'hi',
  hi: 'hi',
  hindi: 'hi',
  chin: 'zh',
  zh: 'zh',
  chinese: 'zh',
  arab: 'ar',
  ar: 'ar',
  arabic: 'ar',
  jap: 'ja',
  ja: 'ja',
  japanese: 'ja',
  id: 'id',
  indonesian: 'id',
};

function toAppCode(raw: string | null | undefined): string {
  const trimmed = raw?.trim().toLowerCase() ?? '';
  if (!trimmed) return 'en';
  if (TO_APP_CODE[trimmed]) return TO_APP_CODE[trimmed];
  const normalized = normalizeLegacyLanguageCode(trimmed);
  if (TO_APP_CODE[normalized]) return TO_APP_CODE[normalized];
  if (ALL_LANGUAGES.some((l) => l.code === trimmed)) return trimmed;
  return 'en';
}

/** Numeric lang_id for a language code (app or legacy alias). Matches ALL_LANGUAGES ids 1–12. */
export function legacyLanguageIdFromCode(code: string | null | undefined): number {
  const appCode = toAppCode(code);
  const lang = ALL_LANGUAGES.find((l) => l.code === appCode);
  return lang ? Number(lang.id) : 1;
}

/** App language code for a numeric lang_id (for editor translation keys). */
export function legacyCodeFromLangId(langId: number | string): string {
  const id = Number(langId);
  if (APP_CODE_BY_LANG_ID[id]) return APP_CODE_BY_LANG_ID[id];
  return 'en';
}

export function langIdFromCode(code: string): string {
  return String(legacyLanguageIdFromCode(code));
}

export function languageDisplayNameFromId(
  langId: number | string,
  fallback?: string | null,
): string {
  const id = Number(langId);
  const lang = ALL_LANGUAGES.find((l) => Number(l.id) === id);
  if (lang) return lang.name;
  if (fallback && !/^Lang\s+\d+$/i.test(fallback) && fallback.length > 2) {
    return fallback;
  }
  return fallback?.trim() || `Language ${id}`;
}

export type VersionHistoryLangOption = { id: string; name: string; code: string };

/** Full catalog for Version History filter dropdown (always 12 languages). */
export function listAllVersionHistoryLanguages(): VersionHistoryLangOption[] {
  return ALL_LANGUAGES.map((l) => ({
    id: l.id,
    code: l.code,
    name: l.name,
  }));
}

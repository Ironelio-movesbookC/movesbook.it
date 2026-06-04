import { SUPPORTED_LANGUAGES } from '@/constants/tools.constants';

export type TranslationMap = Record<string, string>;

const LEGACY_LANG_CODES: Record<string, string> = {
  por: 'pt',
  rus: 'ru',
  ind: 'hi',
  chin: 'zh',
  arab: 'ar',
};

export const FOOD_LANG_FLAGS: Record<string, string> = {
  en: '🇬🇧',
  fr: '🇫🇷',
  de: '🇩🇪',
  it: '🇮🇹',
  es: '🇪🇸',
  pt: '🇵🇹',
  ru: '🇷🇺',
  hi: '🇮🇳',
  ja: '🇯🇵',
  id: '🇮🇩',
  zh: '🇨🇳',
  ar: '🇸🇦',
};

export function normalizeLangCode(code: string): string {
  const lower = code.toLowerCase().trim();
  return LEGACY_LANG_CODES[lower] || lower;
}

export function parseTranslations(raw: string | null | undefined): TranslationMap {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    const out: TranslationMap = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === 'string' && value.trim()) {
        out[normalizeLangCode(key)] = value.trim();
      }
    }
    return out;
  } catch {
    return {};
  }
}

export function serializeTranslations(map: TranslationMap): string | null {
  const cleaned: TranslationMap = {};
  for (const [key, value] of Object.entries(map)) {
    const code = normalizeLangCode(key);
    if (value?.trim()) cleaned[code] = value.trim();
  }
  return Object.keys(cleaned).length > 0 ? JSON.stringify(cleaned) : null;
}

export function getSupportedFoodLanguages() {
  return SUPPORTED_LANGUAGES;
}

export function getTranslationForLang(map: TranslationMap, lang: string, fallback = ''): string {
  const code = normalizeLangCode(lang);
  return map[code] || fallback;
}

export function resolveLocalizedLabel(
  defaultName: string,
  translationsRaw: string | null | undefined,
  lang: string
): string {
  const map = parseTranslations(translationsRaw);
  const code = normalizeLangCode(lang);
  if (code === 'en') {
    return map.en || defaultName;
  }
  return map[code] || map.en || defaultName;
}

export function getLanguageSelectLabel(code: string): string {
  const normalized = normalizeLangCode(code);
  const flag = FOOD_LANG_FLAGS[normalized] || '🌐';
  const short = normalized === 'en' ? 'En' : normalized.charAt(0).toUpperCase() + normalized.slice(1);
  return `${flag} ${short}`;
}

export function buildTranslationsFromEnglish(englishName: string, existing?: TranslationMap): TranslationMap {
  const map = { ...(existing || {}) };
  if (englishName.trim()) {
    map.en = englishName.trim().toUpperCase();
  }
  return map;
}

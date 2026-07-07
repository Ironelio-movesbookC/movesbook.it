import { ALL_LANGUAGES } from '@/constants/language.constants';
import {
  LEGACY_LANG_CODE_BY_ID,
  normalizeLegacyLanguageCode,
} from '@/lib/promocodes/legacyLanguageCode';

export function legacyLanguageIdFromCode(code: string | null | undefined): number {
  const normalized = normalizeLegacyLanguageCode(code);
  for (const [id, langCode] of Object.entries(LEGACY_LANG_CODE_BY_ID)) {
    if (langCode === normalized) return Number(id);
  }
  return 1;
}

export function legacyCodeFromLangId(langId: number | string): string {
  const id = Number(langId);
  if (LEGACY_LANG_CODE_BY_ID[id]) {
    return normalizeLegacyLanguageCode(LEGACY_LANG_CODE_BY_ID[id]);
  }
  const fromAll = ALL_LANGUAGES.find((l) => Number(l.id) === id);
  return fromAll?.code ?? 'en';
}

export function langIdFromCode(code: string): string {
  return String(legacyLanguageIdFromCode(code));
}

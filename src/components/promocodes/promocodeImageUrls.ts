import { countryFlagSrc } from '@/lib/countries/countryFlag';
import { legacyFlagFilename, normalizeLegacyLanguageCode } from '@/lib/promocodes/legacyLanguageCode';

export const PROMOCODE_NO_PROFILE_IMAGE = '/img/no_image.svg';
export const PROMOCODE_NO_FLAG_IMAGE = '/img/no_flag.svg';

const PLACEHOLDER_PROFILE_NAMES = new Set(['', 'default.png', 'no_image.jpg', 'no_image.png']);

const LANGUAGE_FLAG_FILES = new Set([
  'en.png',
  'fr.png',
  'de.png',
  'it.png',
  'es.png',
  'por.png',
  'rus.png',
  'ind.png',
  'chin.png',
  'arab.png',
  'jap.png',
  'id.png',
]);

const LEGACY_COUNTRY_FLAG_ORIGIN = 'https://movesbook.com';

export type PromocodeFlagOptions = {
  /** ISO-3166 alpha-2 from `countries.code` — CDN fallback when legacy file missing */
  countryCode?: string | null;
  /** Legacy language code (`it`, `en`, …) for send-invite language flags */
  languageCode?: string | null;
  /** PHP parity: prefer `flags.flag_img` over ISO code when both exist */
  preferLegacyFlag?: boolean;
};

function normalizeIso2(code: string | null | undefined): string {
  const trimmed = code?.trim().toUpperCase() ?? '';
  return /^[A-Z]{2}$/.test(trimmed) ? trimmed : '';
}

export function promocodeProfileImageUrl(image: string | null | undefined): string {
  const trimmed = image?.trim() ?? '';
  if (PLACEHOLDER_PROFILE_NAMES.has(trimmed.toLowerCase())) {
    return PROMOCODE_NO_PROFILE_IMAGE;
  }
  if (trimmed.startsWith('/') || trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  return `/img/profile_images/${trimmed}`;
}

/** Language flag beside send-invite content (PHP: `/img/flags/it.png`). */
export function promocodeLanguageFlagUrl(languageCode: string | null | undefined): string {
  const code = normalizeLegacyLanguageCode(languageCode ?? 'en');
  return `/img/flags/${legacyFlagFilename(code)}`;
}

function legacyCountryFlagPath(filename: string): string {
  const base = filename.replace(/^\/+/, '');
  if (base.startsWith('img/flags/')) return `${LEGACY_COUNTRY_FLAG_ORIGIN}/${base}`;
  if (base.startsWith('flags/')) return `${LEGACY_COUNTRY_FLAG_ORIGIN}/img/${base}`;
  return `${LEGACY_COUNTRY_FLAG_ORIGIN}/img/flags/${base}`;
}

/** Country flag from PHP `flags.flag_img` (Countries admin uploads). */
export function promocodeCountryFlagImageUrl(
  flagImage: string | null | undefined,
  countryCode?: string | null,
  options?: { preferLegacyFlag?: boolean }
): string {
  const trimmed = flagImage?.trim() ?? '';
  if (trimmed && options?.preferLegacyFlag) {
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
    if (trimmed.startsWith('/')) return trimmed;
    const lower = trimmed.toLowerCase();
    if (LANGUAGE_FLAG_FILES.has(lower)) {
      return `/flags/${lower}`;
    }
    return legacyCountryFlagPath(trimmed);
  }

  const iso = normalizeIso2(countryCode);
  if (iso) {
    const cdn = countryFlagSrc(iso, 'w40');
    if (cdn) return cdn;
  }

  if (trimmed) {
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
    if (trimmed.startsWith('/')) return trimmed;
    const lower = trimmed.toLowerCase();
    if (LANGUAGE_FLAG_FILES.has(lower)) {
      return `/flags/${lower}`;
    }
    return legacyCountryFlagPath(trimmed);
  }

  return PROMOCODE_NO_FLAG_IMAGE;
}

/** Resolve promocode flag URL (country DB filename and/or ISO fallback). */
export function promocodeFlagImageUrl(
  flagImage: string | null | undefined,
  options?: PromocodeFlagOptions
): string {
  if (options?.languageCode) {
    return promocodeLanguageFlagUrl(options.languageCode);
  }
  return promocodeCountryFlagImageUrl(flagImage, options?.countryCode, {
    preferLegacyFlag: options?.preferLegacyFlag,
  });
}

/** CDN fallback when a legacy `/img/flags/*` asset 404s locally. */
export function promocodeFlagCdnFallback(countryCode: string | null | undefined): string | null {
  const iso = normalizeIso2(countryCode);
  if (!iso) return null;
  const cdn = countryFlagSrc(iso, 'w40');
  return cdn || null;
}

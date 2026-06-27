import { COUNTRIES_WITH_CODES } from '@/lib/news/countries';
import { flagEmojiFromCode, flagEmojiFromCountryName } from '@/lib/admin/countryFlag';

export function resolveAuthorCountryFields(country?: string | null): {
  authorCountry: string | null;
  authorCountryName: string | null;
  authorCountryFlag: string | null;
} {
  if (!country?.trim()) {
    return { authorCountry: null, authorCountryName: null, authorCountryFlag: null };
  }

  const trimmed = country.trim();
  const upper = trimmed.toUpperCase();

  if (upper.length === 2) {
    const match = COUNTRIES_WITH_CODES.find((c) => c.id === upper);
    return {
      authorCountry: upper,
      authorCountryName: match?.name ?? trimmed,
      authorCountryFlag: flagEmojiFromCode(upper),
    };
  }

  const code = COUNTRIES_WITH_CODES.find((c) => c.name === trimmed)?.id ?? null;
  return {
    authorCountry: code ?? trimmed,
    authorCountryName: trimmed,
    authorCountryFlag: flagEmojiFromCountryName(trimmed),
  };
}

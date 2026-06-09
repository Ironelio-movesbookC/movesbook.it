import { COUNTRIES_WITH_CODES } from '@/lib/news/countries';

export function flagEmojiFromCode(code: string): string {
  const cc = (code || '').trim().toUpperCase();
  if (cc.length !== 2) return '';
  const A = 0x1f1e6;
  const base = 'A'.charCodeAt(0);
  return String.fromCodePoint(A + cc.charCodeAt(0) - base, A + cc.charCodeAt(1) - base);
}

export function countryCodeFromName(name: string): string {
  if (!name.trim()) return '';
  return COUNTRIES_WITH_CODES.find((c) => c.name === name.trim())?.id ?? '';
}

export function flagEmojiFromCountryName(country: string | null | undefined): string {
  if (!country?.trim()) return '';
  return flagEmojiFromCode(countryCodeFromName(country));
}

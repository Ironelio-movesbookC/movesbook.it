/** Same-origin flag URLs (proxied to flagcdn via next.config rewrites). */
export function countryFlagSrc(iso2: string, size: '24x18' | 'w40' = '24x18'): string {
  const code = iso2.trim().toLowerCase();
  if (!/^[a-z]{2}$/.test(code)) return '';
  return `/country-flags/${size}/${code}.png`;
}

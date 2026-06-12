import { SUPPORTED_LANGUAGES } from '@/constants/tools.constants';

export function emptyLangMap(fallback = ''): Record<string, string> {
  return Object.fromEntries(SUPPORTED_LANGUAGES.map((l) => [l.code, fallback]));
}

export function getPackageDisplayTitle(
  titlesByLang: Record<string, string>,
  lang: string,
): string {
  return (
    titlesByLang[lang] ||
    titlesByLang.en ||
    Object.values(titlesByLang).find(Boolean) ||
    'Untitled package'
  );
}

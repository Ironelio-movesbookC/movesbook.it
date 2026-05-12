import { SUPPORTED_LANGUAGES } from '@/constants/tools.constants';

export function normalizeToolsLanguage(code: string | undefined): string {
  if (!code) return 'en';
  const lower = code.toLowerCase().trim();
  if (SUPPORTED_LANGUAGES.some((l) => l.code === lower)) return lower;
  const two = lower.split('-')[0] || 'en';
  return SUPPORTED_LANGUAGES.some((l) => l.code === two) ? two : 'en';
}

/** Signed-in user's profile language (for Movesbook loads / archive — not the Tools display-language picker). */
export function resolveProfileLanguageCodeForToolsLoad(): string {
  if (typeof window === 'undefined') return 'en';
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return 'en';
    const parsed = JSON.parse(raw) as { language?: string };
    const profileLanguage =
      typeof parsed?.language === 'string' ? parsed.language.trim().toLowerCase() : '';
    return normalizeToolsLanguage(profileLanguage.split('-')[0] || profileLanguage);
  } catch {
    return 'en';
  }
}

export function getToolsProfileLanguageDisplayName(code: string): string {
  const c = normalizeToolsLanguage(code);
  return SUPPORTED_LANGUAGES.find((l) => l.code === c)?.name || c.toUpperCase();
}

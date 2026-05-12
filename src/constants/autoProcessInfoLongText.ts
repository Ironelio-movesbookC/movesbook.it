export const AUTO_PROCESS_INFO_DEFAULT_EN =
  'Automatic processing fills distribution-based exercise counts and default pauses where they are empty.';

/** DB / Language settings translation key (see prisma seed-translations). */
export const AUTO_PROCESS_INFO_KEY = 'auto_process_info' as const;

export function parseAutoProcessInfo(_raw: string): Record<string, unknown> | null {
  return null;
}

export function resolveAutoProcessInfoText(language: string, _key: string): string {
  void language;
  return AUTO_PROCESS_INFO_DEFAULT_EN;
}

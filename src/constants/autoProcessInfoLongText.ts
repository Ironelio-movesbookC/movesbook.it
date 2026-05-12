export const AUTO_PROCESS_INFO_DEFAULT_EN =
  'Automatic processing fills distribution-based exercise counts and default pauses where they are empty.';

export function parseAutoProcessInfo(_raw: string): Record<string, unknown> | null {
  return null;
}

export function resolveAutoProcessInfoText(language: string, _key: string): string {
  void language;
  return AUTO_PROCESS_INFO_DEFAULT_EN;
}

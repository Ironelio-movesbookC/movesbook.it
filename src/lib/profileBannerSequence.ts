/** Parse `profileBannerSequence` JSON from DB into ordered public paths. */
export function parseBannerSequenceJson(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return [];
  try {
    const j = JSON.parse(raw) as unknown;
    if (!Array.isArray(j)) return [];
    return j.filter((x): x is string => typeof x === 'string' && x.trim().length > 0).map((x) => x.trim());
  } catch {
    return [];
  }
}

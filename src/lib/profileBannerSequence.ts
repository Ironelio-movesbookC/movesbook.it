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

export const DEFAULT_HERO_BANNER_URL = '/images/banner.jpg';

/** Resolved URL for hero / strip backgrounds (matches athlete dashboard logic). */
export function getHeroBannerDisplayUrl(
  p: {
    profileBanner?: string | null;
    profileBannerSequence?: string | null;
    profileBannerVideo?: string | null;
  } | null | undefined
): string {
  if (!p) return DEFAULT_HERO_BANNER_URL;
  if (p.profileBannerVideo?.trim()) {
    return DEFAULT_HERO_BANNER_URL;
  }
  const seq = parseBannerSequenceJson(p.profileBannerSequence);
  const raw = (seq[0] ?? p.profileBanner)?.trim();
  if (!raw) return DEFAULT_HERO_BANNER_URL;
  // Legacy disk uploads often missing under `next start` — prefer default until re-uploaded as data URL.
  if (raw.startsWith('/uploads/profile_banners/') || raw.startsWith('/uploads/profile_avatars/')) {
    return DEFAULT_HERO_BANNER_URL;
  }
  if (
    raw.startsWith('data:') ||
    raw.startsWith('/') ||
    raw.startsWith('http://') ||
    raw.startsWith('https://')
  ) {
    return raw;
  }
  return `/img/profile_images/${raw}`;
}

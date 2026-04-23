/** Stored under `UserSettings.socialSettings` (JSON). */
export const YOUTUBE_CHANNEL_URL_KEY = 'youtubeChannelUrl';

function stripWrappingQuotes(s: string): string {
  let v = s.trim().replace(/^\uFEFF/, '');
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1).trim();
  }
  return v;
}

/**
 * Returns a safe http(s) URL to open, or null if we cannot derive one.
 * Strips quotes/BOM, collapses internal whitespace, adds https when missing.
 */
export function normalizeYoutubeUrlForOpen(raw: string): string | null {
  let v = stripWrappingQuotes(raw);
  if (!v) return null;
  v = v.replace(/\u00a0/g, ' ').trim();
  const collapsed = v.replace(/\s+/g, '');
  if (!collapsed) return null;

  let candidate = collapsed;
  if (!/^https?:\/\//i.test(candidate)) {
    candidate = `https://${candidate.replace(/^\/+/, '')}`;
  }

  try {
    const u = new URL(candidate);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    return u.href;
  } catch {
    return null;
  }
}

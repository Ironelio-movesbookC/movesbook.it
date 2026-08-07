/** Absolute share URL for a user's My Music (public, no login required). */
export function getMyMusicShareUrl(userKey: string, origin?: string): string {
  const key = (userKey || '').trim();
  const base =
    origin ??
    (typeof window !== 'undefined' ? window.location.origin : '');
  if (!key) return base ? `${base}/music` : '/music';
  return `${base}/music/${encodeURIComponent(key)}`;
}

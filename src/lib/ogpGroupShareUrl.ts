export type OgpGroupShareKind = 'news' | 'music';

/** Absolute share URL for an OGP News/Music group (public, no login required). */
export function getOgpGroupShareUrl(
  groupId: string,
  origin?: string,
  kind: OgpGroupShareKind = 'news'
): string {
  const base =
    origin ??
    (typeof window !== 'undefined' ? window.location.origin : '');
  const path = kind === 'music' ? 'music' : 'news';
  return `${base}/${path}/group/${groupId}`;
}

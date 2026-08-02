/** Absolute share URL for an OGP News group (public, no login required). */
export function getOgpGroupShareUrl(groupId: string, origin?: string): string {
  const base =
    origin ??
    (typeof window !== 'undefined' ? window.location.origin : '');
  return `${base}/news/group/${groupId}`;
}

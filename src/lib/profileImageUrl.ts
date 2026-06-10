/** Resolve `users_new.image` (or legacy filename) to a browser-usable URL. */
export function resolvePublicImageUrl(path: string | null | undefined): string | null {
  if (!path || !path.trim()) return null;
  const p = path.trim();
  if (p.startsWith('http://') || p.startsWith('https://') || p.startsWith('data:')) return p;
  if (p.startsWith('/')) return p;
  return `/img/profile_images/${p}`;
}

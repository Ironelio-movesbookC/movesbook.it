/** Resolve a typology `image` DB value to a public URL path. */
export function getTypologyIconUrl(image: string): string | null {
  const value = image.trim();
  if (!value || /^https?:\/\//i.test(value)) return null;

  const normalized = value.replace(/^\/+/, '');
  if (normalized.includes('/')) {
    return `/${normalized}`;
  }

  return `/img/typology_image/${normalized}`;
}

/** Same as {@link getTypologyIconUrl} but falls back to the default built-in icon. */
export function getTypologyIconUrlWithDefault(image: string, fallback = 'Cat_1.png'): string {
  return getTypologyIconUrl(image) ?? `/img/typology_image/${fallback}`;
}

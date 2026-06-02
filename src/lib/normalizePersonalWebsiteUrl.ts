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
 * Returns a safe http(s) URL to open in a new tab, or null if invalid / empty.
 * Client-safe (no Node / Prisma dependencies).
 */
export function normalizePersonalWebsiteUrl(raw: string): string | null {
  let v = stripWrappingQuotes(raw);
  if (!v) return null;
  v = v.replace(/\u00a0/g, ' ').trim();
  const collapsed = v.replace(/\s+/g, '');
  if (!collapsed) return null;

  let candidate = collapsed;
  if (!/^https?:\/\//i.test(candidate) && !/^\/\//.test(candidate)) {
    candidate = `https://${candidate.replace(/^\/+/, '')}`;
  } else if (/^\/\//.test(candidate)) {
    candidate = `https:${candidate}`;
  }

  try {
    const u = new URL(candidate);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    return u.href;
  } catch {
    return null;
  }
}

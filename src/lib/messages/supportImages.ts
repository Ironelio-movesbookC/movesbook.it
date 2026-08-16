/** Shared support-feedback image helpers (safe for client + server). */

export const MAX_SUPPORT_IMAGES = 3;

export function normalizeSupportImageUrls(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const urls: string[] = [];
  for (const item of raw) {
    if (typeof item !== 'string') continue;
    const url = item.trim();
    if (!url) continue;
    if (!url.startsWith('/') && !/^https?:\/\//i.test(url)) continue;
    urls.push(url);
    if (urls.length >= MAX_SUPPORT_IMAGES) break;
  }
  return urls;
}

export function parseSupportImageUrlsJson(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return [];
  try {
    return normalizeSupportImageUrls(JSON.parse(raw));
  } catch {
    return [];
  }
}

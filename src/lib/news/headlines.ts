/** Compact News Headlines Panel: 3 headlines per carousel page. */
export const HEADLINES_PER_PAGE = 3;
/** Match the MSN widget: three pages (dots) in the compact panel. */
export const HEADLINES_COMPACT_PAGES = 3;
export const HEADLINES_COMPACT_LIMIT = HEADLINES_PER_PAGE * HEADLINES_COMPACT_PAGES;
/** Expanded “Top Stories” carousel size. */
export const TOP_STORIES_COUNT = 7;
/** Auto-advance interval for Top Stories carousel (ms). */
export const TOP_STORIES_AUTO_MS = 2200;

export function sourceName(article: {
  siteName?: string | null;
  url?: string;
  creatorUsername?: string | null;
}): string {
  const site = typeof article.siteName === 'string' ? article.siteName.trim() : '';
  if (site) return site;
  try {
    if (article.url) {
      const host = new URL(article.url).hostname.replace(/^www\./, '');
      if (host) return host;
    }
  } catch {
    /* ignore */
  }
  return article.creatorUsername?.trim() || 'News';
}

export function faviconUrl(url?: string | null): string | null {
  if (!url) return null;
  try {
    const host = new URL(url).hostname;
    if (!host) return null;
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=32`;
  } catch {
    return null;
  }
}

/** Short relative time similar to MSN (“2h”, “1d”). */
export function formatRelativeShort(iso?: string): string {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diffMs = Date.now() - then;
  if (diffMs < 0) return 'now';
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function estimateReadingMinutes(
  ...texts: Array<string | null | undefined>
): number {
  const words = texts
    .filter((t): t is string => typeof t === 'string' && t.trim().length > 0)
    .join(' ')
    .replace(/<[^>]+>/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(Math.max(words, 80) / 200));
}

export function rankHeadlines<T extends { savedAt?: string; id: string }>(
  articles: T[],
  getViewCount: (article: T) => number
): T[] {
  return [...articles].sort((a, b) => {
    const views = getViewCount(b) - getViewCount(a);
    if (views !== 0) return views;
    return new Date(b.savedAt ?? 0).getTime() - new Date(a.savedAt ?? 0).getTime();
  });
}

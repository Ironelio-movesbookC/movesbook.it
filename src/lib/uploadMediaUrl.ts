/**
 * Runtime uploads live under `public/uploads/` but nginx often does not serve
 * files written after deploy. Serve them via `/api/media/uploads/...` instead.
 */

const UPLOADS_PREFIX = '/uploads/';
const MEDIA_API_PREFIX = '/api/media/uploads/';

/** `/uploads/news/foo.jpg` → `/api/media/uploads/news/foo.jpg` */
export function toMediaApiPath(path: string | null | undefined): string | null {
  if (!path?.trim()) return null;

  let s = path.trim().replace(/\\/g, '/');

  if (s.startsWith(MEDIA_API_PREFIX)) return s;

  const lower = s.toLowerCase();
  const uploadsIdx = lower.indexOf(UPLOADS_PREFIX);
  if (uploadsIdx !== -1 && !/^https?:\/\//i.test(s)) {
    s = s.slice(uploadsIdx);
  }

  if (s.startsWith('/public/uploads/')) {
    s = s.slice('/public'.length);
  } else if (s.startsWith('public/uploads/')) {
    s = `/${s.slice('public'.length)}`;
  }

  if (!s.startsWith(UPLOADS_PREFIX)) return s;

  return `${MEDIA_API_PREFIX}${s.slice(UPLOADS_PREFIX.length)}`;
}

/** Rewrite `<img src="/uploads/...">` (and same-origin absolute URLs) for display. */
export function rewriteUploadUrlsInHtml(html: string): string {
  if (!html?.includes('upload')) return html;

  return html.replace(
    /(\s(?:src|href)\s*=\s*["'])([^"']+)(["'])/gi,
    (match, prefix, url, suffix) => {
      const trimmed = url.trim();
      if (!trimmed || /^(data:|blob:)/i.test(trimmed)) return match;

      if (/^https?:\/\//i.test(trimmed)) {
        try {
          const parsed = new URL(trimmed);
          const apiPath = toMediaApiPath(parsed.pathname);
          if (apiPath && apiPath !== parsed.pathname) {
            return `${prefix}${apiPath}${suffix}`;
          }
        } catch {
          // keep original
        }
        return match;
      }

      const apiPath = toMediaApiPath(trimmed);
      return apiPath && apiPath !== trimmed ? `${prefix}${apiPath}${suffix}` : match;
    },
  );
}

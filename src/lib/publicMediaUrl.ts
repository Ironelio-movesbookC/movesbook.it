import { toMediaApiPath } from '@/lib/uploadMediaUrl';

/**
 * Normalize stored upload paths for browser <img> (handles Windows paths, /public prefix, etc.).
 */
export function normalizePublicMediaPath(
  path: string | null | undefined
): string | null {
  if (!path?.trim()) return null;

  let s = path.trim().replace(/\\/g, '/');
  const lower = s.toLowerCase();

  const uploadsMarker = '/uploads/';
  const uIdx = lower.indexOf(uploadsMarker);
  if (uIdx !== -1 && !/^https?:\/\//i.test(s)) {
    s = s.slice(uIdx);
  }

  if (s.startsWith('/public/')) {
    s = s.slice('/public'.length);
  } else if (s.startsWith('public/')) {
    s = `/${s.slice('public'.length)}`;
  }

  if (/^(https?:|blob:|data:)/i.test(s)) return s;

  const mediaApiPath = toMediaApiPath(s.startsWith('/') ? s : `/${s}`);
  if (mediaApiPath) return mediaApiPath;

  return s.startsWith('/') ? s : `/${s}`;
}

/** Absolute browser URL for a public upload, blob preview, or external image. */
export function resolvePublicMediaUrl(
  path: string | null | undefined
): string {
  const normalized = normalizePublicMediaPath(path);
  if (!normalized) return '';
  if (/^(https?:|blob:|data:)/i.test(normalized)) return normalized;

  if (typeof window !== 'undefined') {
    try {
      return new URL(normalized, window.location.origin).href;
    } catch {
      return normalized;
    }
  }

  return normalized;
}

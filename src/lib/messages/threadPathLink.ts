/** Resolve staff/user-entered path fields into an openable URL. */

function decodeLegacySegmentPath(raw: string): string {
  // Legacy CakePHP encoded paths like `__/admin__dashboard` → `/admin/dashboard`
  if (!raw.includes('__')) return raw;
  return raw.replace(/__/g, '/').replace(/\/+/g, '/');
}

export function pickThreadPath(
  pathStaff?: string | null,
  realPath?: string | null,
): string | null {
  const staff = typeof pathStaff === 'string' ? pathStaff.trim() : '';
  if (staff) return staff;
  const real = typeof realPath === 'string' ? realPath.trim() : '';
  return real || null;
}

/** Returns absolute or same-origin URL suitable for window.open / <a target="_blank">. */
export function resolveThreadOpenUrl(
  pathStaff?: string | null,
  realPath?: string | null,
): string | null {
  const raw = pickThreadPath(pathStaff, realPath);
  if (!raw) return null;

  const decoded = decodeLegacySegmentPath(raw).trim();
  if (!decoded) return null;

  if (/^https?:\/\//i.test(decoded)) return decoded;
  if (/^\/\//.test(decoded)) {
    if (typeof window !== 'undefined') {
      return `${window.location.protocol}${decoded}`;
    }
    return `https:${decoded}`;
  }

  // Relative app path
  if (decoded.startsWith('/')) {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}${decoded}`;
    }
    return decoded;
  }

  // Bare domain / host path without scheme
  if (/^[a-z0-9.-]+\.[a-z]{2,}([/:?#]|$)/i.test(decoded)) {
    return `https://${decoded}`;
  }

  // Treat as site-relative path
  const withSlash = `/${decoded.replace(/^\/+/, '')}`;
  if (typeof window !== 'undefined') {
    return `${window.location.origin}${withSlash}`;
  }
  return withSlash;
}

export function openThreadPathInNewTab(
  pathStaff?: string | null,
  realPath?: string | null,
): boolean {
  const url = resolveThreadOpenUrl(pathStaff, realPath);
  if (!url) return false;
  window.open(url, '_blank', 'noopener,noreferrer');
  return true;
}

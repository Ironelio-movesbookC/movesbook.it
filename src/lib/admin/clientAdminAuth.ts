/** Read admin JWT from browser storage (client-only). */
export function getAdminBearerToken(): string | null {
  if (typeof window === 'undefined') return null;

  const direct = localStorage.getItem('adminToken')?.trim();
  if (direct) return direct;

  try {
    const raw = localStorage.getItem('adminUser');
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { token?: string; accessToken?: string };
    const token = parsed?.token ?? parsed?.accessToken;
    return typeof token === 'string' && token.trim() ? token.trim() : null;
  } catch {
    return null;
  }
}

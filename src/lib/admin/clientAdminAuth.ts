/** Read admin JWT from browser storage (client-only). */
export function getAdminBearerToken(): string | null {
  if (typeof window === 'undefined') return null;

  const direct = localStorage.getItem('adminToken')?.trim();
  if (direct) return direct;

  try {
    const raw = localStorage.getItem('adminUser');
    if (raw) {
      const parsed = JSON.parse(raw) as { token?: string; accessToken?: string };
      const token = parsed?.token ?? parsed?.accessToken;
      if (typeof token === 'string' && token.trim()) return token.trim();
    }
  } catch {
    /* ignore */
  }

  // Panel admin may be signed in via the main navbar (`token` + `user`, not `adminToken`).
  try {
    const token = localStorage.getItem('token')?.trim();
    const userRaw = localStorage.getItem('user');
    if (token && userRaw) {
      const user = JSON.parse(userRaw) as { userType?: string };
      if (user?.userType === 'ADMIN') return token;
    }
  } catch {
    /* ignore */
  }

  return null;
}

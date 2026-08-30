import { createHash, randomBytes } from 'crypto';

/** Same algorithm as PHP PromocodesController::changeCode / add.ctp initial value. */
export function generatePromocode(): string {
  const seed = `${randomBytes(8).toString('hex')}${Math.floor(Math.random() * 0xffff).toString(16)}`;
  const sha1Hex = createHash('sha1').update(seed).digest('hex');
  return BigInt(`0x${sha1Hex}`).toString(36).slice(0, 9);
}

/** Fetch a new promocode from the API (public endpoint; send token when available). */
export async function fetchGeneratedPromocode(): Promise<string> {
  const headers: HeadersInit = {};
  if (typeof window !== 'undefined') {
    try {
      const { getAdminBearerToken } = await import('@/lib/admin/clientAdminAuth');
      const token = getAdminBearerToken() || localStorage.getItem('token')?.trim();
      if (token) headers.Authorization = `Bearer ${token}`;
    } catch {
      /* ignore — endpoint is also public */
    }
  }

  const res = await fetch('/api/admin/promocodes/change-code', {
    method: 'POST',
    headers,
  });
  const raw = (await res.text()).trim();
  if (!res.ok) {
    throw new Error(raw || `Failed to generate promocode (${res.status})`);
  }
  if (!raw) {
    throw new Error('Failed to generate promocode: empty response');
  }

  try {
    const data = JSON.parse(raw) as { code?: string };
    if (data.code) return data.code;
  } catch {
    return raw;
  }

  throw new Error('Failed to generate promocode: invalid response');
}

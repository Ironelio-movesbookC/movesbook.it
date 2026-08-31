import crypto from 'crypto';

export function verifyDirectAccessPassword(
  entered: string,
  stored: string | undefined,
): boolean {
  const a = entered.trim();
  const b = (stored ?? '').trim();
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}

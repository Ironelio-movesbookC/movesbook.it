/** Canonical site origin for share links and Open Graph metadata. */
export function isLocalOrigin(origin: string): boolean {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin.replace(/\/$/, ''));
}

function normalizeOrigin(raw: string): string {
  const trimmed = raw.trim().replace(/\/$/, '');
  return trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
}

export function getSiteOrigin(): string {
  const candidates = [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.APP_URL,
    process.env.SITE_URL,
    process.env.VERCEL_URL,
  ];

  for (const raw of candidates) {
    if (!raw?.trim()) continue;
    const origin = normalizeOrigin(raw);
    if (isLocalOrigin(origin) && process.env.NODE_ENV === 'production') continue;
    return origin;
  }

  return 'https://movesbook.com';
}

/** Never use localhost in public links (emails, invites, confirmations). */
export function coercePublicOrigin(origin?: string | null): string {
  const trimmed = origin?.trim().replace(/\/$/, '');
  if (trimmed && !isLocalOrigin(trimmed)) {
    return trimmed;
  }
  return getSiteOrigin();
}

type PublicOriginRequest = {
  nextUrl: { origin: string };
  headers: { get(name: string): string | null };
};

/**
 * Public URL for links in emails and invite flows.
 * Behind a reverse proxy, `nextUrl.origin` may be localhost — prefer forwarded host / env.
 */
export function resolvePublicOrigin(request: PublicOriginRequest): string {
  const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
  const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim();

  if (forwardedHost && !/^localhost(:\d+)?$/i.test(forwardedHost) && !/^127\.0\.0\.1(:\d+)?$/i.test(forwardedHost)) {
    const proto = forwardedProto || 'https';
    return coercePublicOrigin(`${proto}://${forwardedHost}`);
  }

  const host = request.headers.get('host')?.trim();
  if (host && !/^localhost(:\d+)?$/i.test(host) && !/^127\.0\.0\.1(:\d+)?$/i.test(host)) {
    const proto =
      forwardedProto ||
      (host.includes('movesbook.com') || host.includes('movesbook.net') ? 'https' : 'http');
    return coercePublicOrigin(`${proto}://${host}`);
  }

  return coercePublicOrigin(request.nextUrl.origin);
}

export function sharedDayPublicUrl(dayId: string): string {
  return `${getSiteOrigin()}/shared/day/${dayId}`;
}

export function sharedWorkoutPublicUrl(workoutId: string): string {
  return `${getSiteOrigin()}/shared/workout/${workoutId}`;
}

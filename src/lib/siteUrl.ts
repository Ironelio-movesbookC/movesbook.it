/** Canonical site origin for share links and Open Graph metadata. */
export function getSiteOrigin(): string {
  const fromEnv =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.VERCEL_URL;

  if (fromEnv) {
    const trimmed = fromEnv.replace(/\/$/, '');
    return trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
  }

  return 'https://movesbook.com';
}

export function sharedDayPublicUrl(dayId: string): string {
  return `${getSiteOrigin()}/shared/day/${dayId}`;
}

export function sharedWorkoutPublicUrl(workoutId: string): string {
  return `${getSiteOrigin()}/shared/workout/${workoutId}`;
}

export const INFO_REPS_DEFAULT_EN =
  'Reps and % of one-rep max are linked: higher reps usually mean a lower %1RM for the same effort. ' +
  'Use the table in your Tools / language settings for the full article when available.';

/** DB / Language settings translation key (see prisma seed-translations, PlanGymWeek manual modal). */
export const INFO_REPS_TRANSLATION_KEY = 'InfoReps' as const;

export function resolveInfoRepsText(language: string, _key: string): string {
  void language;
  return INFO_REPS_DEFAULT_EN;
}

/** Fallback when Language → Long texts has no `InfoReps` entry for the user locale. */
export const INFO_REPS_DEFAULT_EN =
  "It's helpful to give an example and explain the factors used to calculate the percentage of load relative to the number of repetitions and vice versa.\n\n" +
  'Example:\n' +
  'For a number of 15 repetitions in bodybuilding, the percentage of load relative to the maximum (1RM) is generally between 60% and 65%. This estimate may vary slightly depending on the formula used and the individual characteristics of the athlete (such as the prevalence of muscle fibers or training experience).\n\n' +
  'Application in Bodybuilding\n' +
  'Hypertrophy, and Resistance: A 15-rep range is often used for metabolic hypertrophy or local muscular endurance work.\n' +
  'Failure and Buffer: These percentages indicate the load that takes you to exact failure on the 15th repetition. If your goal is a "buffer" workout (e.g., 15 reps but with 2-3 left over), you\'ll need to further scale this percentage by about 5%.\n\n' +
  'For high repetitions, standard bodybuilding formulas cease to be accurate, as they are designed for strength and hypertrophy ranges (usually up to 15-20 repetitions).\n\n' +
  'Why is it difficult to define an exact %?\n\n' +
  'Formula Limitation:\n' +
  'If we were to rigidly apply the "classic" formula, we would obtain a negative or absurd result, since the formula is linear and does not account for the transition to pure endurance.\n\n' +
  'Metabolic Factor:\n' +
  "With very high repetitions, the limit is no longer the muscle's contractile strength (mechanical tension), but the body's ability to manage lactic acid and supply the muscles with oxygen (cardiovascular and metabolic efficiency).\n\n" +
  'Type of Exercise:\n' +
  'There is a huge difference between doing 50 reps of squats (extremely taxing on the nervous and respiratory systems) and 50 reps of bicep curls or calf raises.\n\n' +
  'Approximate estimates for high repetitions.\n' +
  'Generally, in athletic training, these are the benchmarks for endurance:\n\n' +
  '20-30 repetitions: approximately 50-60% of 1RM.\n\n' +
  '50+ repetitions: These are generally referred to as "endurance" loads, falling below 40%.\n\n' +
  'Very high repetitions: This involves a regimen similar to basic calisthenics or extreme endurance tests, where the load is often just body weight or a minimal load (e.g., 20-30% of 1RM).\n' +
  'In this case, you should use a weight that feels "very light" at first, as fatigue will build exponentially after the first 40-50 repetitions.\n\n' +
  'Note: The in-app estimate % ≈ 100 − (reps × 2.5) is meaningful only for about 1–40 repetitions; above 40 reps it can show 0% or negative values.';

/** DB / Language settings → Long texts key (Settings → Language → Long texts). */
export const INFO_REPS_TRANSLATION_KEY = 'InfoReps' as const;

type TranslationRow = {
  key: string;
  values?: Record<string, string>;
  isDeleted?: boolean;
};

/** Load long text from `/api/admin/translations` for the given key and language. */
export async function fetchLongTextTranslation(
  key: string,
  language: string,
  fallbackEn: string,
): Promise<string> {
  try {
    const res = await fetch('/api/admin/translations');
    if (!res.ok) return fallbackEn;
    const data = (await res.json()) as { success?: boolean; translations?: TranslationRow[] };
    if (!data.success || !Array.isArray(data.translations)) return fallbackEn;
    const item = data.translations.find((t) => t.key === key && !t.isDeleted);
    if (!item?.values) return fallbackEn;
    const lang = (language || 'en').trim() || 'en';
    const localized = item.values[lang]?.trim();
    if (localized) return localized;
    const en = item.values.en?.trim();
    if (en) return en;
    const first = Object.values(item.values).find((v) => v?.trim());
    return first?.trim() || fallbackEn;
  } catch {
    return fallbackEn;
  }
}

export async function fetchInfoRepsText(language: string): Promise<string> {
  return fetchLongTextTranslation(INFO_REPS_TRANSLATION_KEY, language, INFO_REPS_DEFAULT_EN);
}

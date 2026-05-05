/**
 * Long text key for Language → Long texts (superadmin). Per-locale copy is loaded from the DB via /api/admin/translations.
 */
export const INFO_REPS_TRANSLATION_KEY = 'InfoReps';

/** Default English if the key is missing or empty in the database. */
export const INFO_REPS_DEFAULT_EN = `It's helpful to give an example and explain the factors used to calculate the percentage of load relative to the number of repetitions and vice versa.

Example:
For a number of 15 repetitions in bodybuilding, the percentage of load relative to the maximum (1RM) is generally between 60% and 65%. This estimate may vary slightly depending on the formula used and the individual characteristics of the athlete (such as the prevalence of muscle fibers or training experience).

Application in Bodybuilding
Hypertrophy, and Resistance: A 15-rep range is often used for metabolic hypertrophy or local muscular endurance work.
Failure and Buffer: These percentages indicate the load that takes you to exact failure on the 15th repetition. If your goal is a "buffer" workout (e.g., 15 reps but with 2-3 left over), you'll need to further scale this percentage by about 5%.

For high repetitions, standard bodybuilding formulas cease to be accurate, as they are designed for strength and hypertrophy ranges (usually up to 15-20 repetitions).

Why is it difficult to define an exact %?

Formula Limitation:
If we were to rigidly apply the "classic" formula, we would obtain a negative or absurd result, since the formula is linear and does not account for the transition to pure endurance.

Metabolic Factor:
With very high repetitions, the limit is no longer the muscle's contractile strength (mechanical tension), but the body's ability to manage lactic acid and supply the muscles with oxygen (cardiovascular and metabolic efficiency).

Type of Exercise:
There is a huge difference between doing 50 reps of squats (extremely taxing on the nervous and respiratory systems) and 50 reps of bicep curls or calf raises.


Approximate estimates for high repetitions.
Generally, in athletic training, these are the benchmarks for endurance:

20-30 repetitions: approximately 50-60% of 1RM.

50+ repetitions: These are generally referred to as "endurance" loads, falling below 40%.

Very high repetitions: This involves a regimen similar to basic calisthenics or extreme endurance tests, where the load is often just body weight or a minimal load (e.g., 20-30% of 1RM).
In this case, you should use a weight that feels "very light" at first, as fatigue will build exponentially after the first 40-50 repetitions.`;

export type TranslationRow = { key: string; values?: Record<string, string> };

export function resolveInfoRepsText(
  translations: TranslationRow[] | null | undefined,
  langCode: string
): string {
  const row = translations?.find((t) => t.key === INFO_REPS_TRANSLATION_KEY);
  const v = row?.values?.[langCode] ?? row?.values?.en;
  const s = String(v ?? '').trim();
  return s || INFO_REPS_DEFAULT_EN;
}

export function stripInternalWorkoutTags(value: string): string {
  return value
    .replace(/\[CIRCUIT_DATA\][\s\S]*?\[\/CIRCUIT_DATA\]/g, '')
    .replace(/\[CIRCUIT_META\][\s\S]*?\[\/CIRCUIT_META\]/g, '')
    .replace(/\[FAST_PLANNER_DATA\][\s\S]*?\[\/FAST_PLANNER_DATA\]/g, '')
    .replace(/\[FP_MODE\][\s\S]*?\[\/FP_MODE\]/g, '')
    .replace(/\[CIRCUIT_DATA\][\s\S]*/g, '')
    .replace(/\[CIRCUIT_META\][\s\S]*/g, '')
    .replace(/\[FAST_PLANNER_DATA\][\s\S]*/g, '')
    .replace(/\[FP_MODE\][\s\S]*/g, '');
}

/**
 * Circuit nutritionFood descriptions sometimes append a compact nutritionComponent line
 * (e.g. "12\\Normal+12\\Normal+…") after user text — strip that trailing segment for display.
 */
export function stripCircuitCompactExerciseTrail(value: string): string {
  if (typeof value !== 'string') return '';
  return value.replace(/\s+(\d+\\\S+)(?:\+\d+\\\S+)*$/i, '').trim();
}

function looksLikeJson(value: string): boolean {
  const s = value.trim();
  if (!s) return false;
  const starts = s[0];
  const ends = s[s.length - 1];
  if (!((starts === '{' && ends === '}') || (starts === '[' && ends === ']'))) return false;
  try {
    JSON.parse(s);
    return true;
  } catch {
    return false;
  }
}

export function sanitizeNutritionHtml(value: unknown): string {
  if (typeof value !== 'string') return '';
  const stripped = stripInternalWorkoutTags(value).trim();
  if (!stripped) return '';
  if (looksLikeJson(stripped)) return '';
  return stripped;
}

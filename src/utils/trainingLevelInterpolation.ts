/**
 * Training levels: Beginner, Intermediate, Advanced, Elite, Professional (5 steps).
 * Values between Beginner and Professional are interpolated linearly using
 * (professional - beginner) / (levelCount - 1) per step — do not count an extra
 * "step before Beginner"; index 0 is Beginner, index 4 is Professional.
 *
 * Example (reps "to"): Beginner = 22, Professional = 30 → range = 8, four gaps → step = 2.
 * Index 1 (Intermediate) = 22 + 2 = 24.
 */
export const TRAINING_LEVEL_COUNT = 5;

export const TRAINING_LEVEL_INTERPOLATION_DIVISOR = Math.max(1, TRAINING_LEVEL_COUNT - 1);

export function interpolateBetweenAnchoredLevels(
  beginnerVal: number,
  professionalVal: number,
  levelIndex: number
): number {
  const idx = Math.min(TRAINING_LEVEL_COUNT - 1, Math.max(0, levelIndex));
  const step = (professionalVal - beginnerVal) / TRAINING_LEVEL_INTERPOLATION_DIVISOR;
  return beginnerVal + step * idx;
}

/** Indices 0–4 = Beginner…Professional; index 5 mirrors Professional (legacy readers). */
export const ANCHORED_LEVEL_SLOT_COUNT = 6;

/** Fill indices 1–3 by linear interpolation between index 0 (Beginner) and index 4 (Professional). */
export function fillAnchoredLevelArray(
  values: number[],
  round?: (n: number) => number,
): number[] {
  const arr = Array.from({ length: ANCHORED_LEVEL_SLOT_COUNT }, (_, i) =>
    Number(values[i] ?? values[0] ?? 0),
  );
  const beginner = arr[0];
  const professional = arr[4] ?? beginner;
  for (let i = 1; i <= 3; i++) {
    let v = interpolateBetweenAnchoredLevels(beginner, professional, i);
    if (round) v = round(v);
    arr[i] = v;
  }
  arr[4] = professional;
  arr[5] = professional;
  return arr;
}

export function fillAnchoredLevelPair(
  fromValues: number[],
  toValues: number[],
  round?: (n: number) => number,
): { from: number[]; to: number[] } {
  return {
    from: fillAnchoredLevelArray(fromValues, round),
    to: fillAnchoredLevelArray(toValues, round),
  };
}

/** Pause spinners use 5-second steps — round interpolated middle levels accordingly. */
export function roundPauseSeconds(n: number): number {
  return Math.round(n / 5) * 5;
}

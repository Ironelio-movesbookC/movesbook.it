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

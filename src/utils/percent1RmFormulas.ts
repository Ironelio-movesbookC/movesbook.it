/**
 * % of 1RM from reps — minimal table used by Plan Gym Week manual (% mode).
 * Extend `PCT_1RM_FORMULA_COUNT` when adding more curves from Tools Settings.
 */

export const PCT_1RM_FORMULA_COUNT = 3;

function pctLinearFromReps(reps: number): number {
  const r = Math.max(1, Math.min(99, Math.round(reps)));
  return Math.max(0, Math.min(100, parseFloat((100 - r * 2.5).toFixed(1))));
}

function repsLinearFromPct(pct: number): number {
  const p = Math.max(0, Math.min(100, pct));
  return Math.max(1, Math.min(99, Math.round((100 - p) / 2.5)));
}

export function percentOf1RmFromReps(reps: number, formulaIndex: number): number {
  const idx = Math.max(0, Math.min(PCT_1RM_FORMULA_COUNT - 1, Math.floor(formulaIndex)));
  void idx; // reserved for alternate curves
  return pctLinearFromReps(reps);
}

export function repsFromPercentOf1Rm(pct: number, formulaIndex: number): number {
  const idx = Math.max(0, Math.min(PCT_1RM_FORMULA_COUNT - 1, Math.floor(formulaIndex)));
  void idx;
  return repsLinearFromPct(pct);
}

export function formatPercentLoad1MRFromReps(reps: number, formulaIndex: number): string {
  return `${percentOf1RmFromReps(reps, formulaIndex)}%`;
}

export type PyramidalMode = 'flat' | 'ascending' | 'descending' | 'mix';

export function getPyramidalStep(startReps: number): number {
  const r = Math.min(99, Math.max(1, Math.round(startReps)));
  if (r <= 6) return 1;
  if (r <= 13) return 2;
  if (r <= 25) return 3;
  if (r <= 40) return 4;
  if (r <= 50) return 5;
  return 7;
}

function clampRepsForPyramid(n: number): number {
  if (!Number.isFinite(n) || n <= 0) return 1;
  return Math.min(99, Math.round(n));
}

function buildAscendingSeries(start: number, count: number, step: number): number[] {
  const out: number[] = [];
  let cur = clampRepsForPyramid(start);
  for (let i = 0; i < count; i++) {
    out.push(cur);
    if (i < count - 1) {
      const next = cur - step;
      cur = next < 1 ? 1 : next;
    }
  }
  return out;
}

function buildDescendingSeries(start: number, count: number, step: number): number[] {
  const out: number[] = [];
  let cur = clampRepsForPyramid(start);
  for (let i = 0; i < count; i++) {
    out.push(cur);
    if (i < count - 1) {
      cur = Math.min(99, cur + step);
    }
  }
  return out;
}

function fisherYatesShuffle(arr: number[]): number[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = a[i];
    a[i] = a[j];
    a[j] = t;
  }
  return a;
}

export function computePyramidalRepsSeries(
  base: number,
  nSeries: number,
  mode: PyramidalMode
): number[] {
  const n = Math.max(0, Math.floor(nSeries));
  if (n === 0) return [];
  if (mode === 'flat') {
    const v = Number.isFinite(base) ? Math.round(base) : 12;
    const clamped = Math.min(99, Math.max(0, v));
    return Array.from({ length: n }, () => clamped);
  }
  const start = clampRepsForPyramid(base);
  const step = getPyramidalStep(start);
  if (mode === 'ascending') {
    return buildAscendingSeries(start, n, step);
  }
  if (mode === 'descending') {
    return buildDescendingSeries(start, n, step);
  }
  if (mode === 'mix') {
    return fisherYatesShuffle(buildAscendingSeries(start, n, step));
  }
  return Array.from({ length: n }, () => start);
}

export function formatPercentLoad1MR(repsValue: string | undefined): string {
  if (repsValue == null || String(repsValue).trim() === '') return '—';
  const r = parseInt(repsValue, 10);
  if (Number.isNaN(r)) return '—';
  const pct = 100 - r * 2.5;
  const rounded = Math.round(pct * 10) / 10;
  return `≈ ${rounded}%`;
}

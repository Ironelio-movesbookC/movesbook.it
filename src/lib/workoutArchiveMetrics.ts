/** Compute totals from workout moveframes / movelaps for share metadata. */
export function computeWorkoutArchiveMetrics(workout: {
  moveframes?: Array<{
    movelaps?: Array<{
      distance?: number | null;
      time?: string | null;
      reps?: number | null;
    }>;
  }>;
}): { totalMeters: number; totalTimeSeconds: number; totalSeries: number } {
  let totalMeters = 0;
  let totalTimeSeconds = 0;
  let totalSeries = 0;

  for (const mf of workout.moveframes ?? []) {
    for (const ml of mf.movelaps ?? []) {
      if (typeof ml.distance === 'number') totalMeters += ml.distance;
      if (typeof ml.reps === 'number') totalSeries += ml.reps;
      else totalSeries += 1;
      if (ml.time) {
        const parsed = parseTimeToSeconds(String(ml.time));
        if (parsed != null) totalTimeSeconds += parsed;
      }
    }
  }

  return { totalMeters, totalTimeSeconds, totalSeries };
}

export function computeWeeklyPlanMetrics(planData: {
  weeks?: Array<{
    days?: Array<{
      workouts?: Array<{
        moveframes?: Array<{
          movelaps?: Array<{
            distance?: number | null;
            time?: string | null;
            reps?: number | null;
          }>;
        }>;
      }>;
    }>;
  }>;
}): { workoutCount: number; totalMeters: number; totalTimeSeconds: number; totalSeries: number } {
  let workoutCount = 0;
  let totalMeters = 0;
  let totalTimeSeconds = 0;
  let totalSeries = 0;

  for (const week of planData.weeks ?? []) {
    for (const day of week.days ?? []) {
      for (const workout of day.workouts ?? []) {
        workoutCount += 1;
        const m = computeWorkoutArchiveMetrics(workout);
        totalMeters += m.totalMeters;
        totalTimeSeconds += m.totalTimeSeconds;
        totalSeries += m.totalSeries;
      }
    }
  }

  return { workoutCount, totalMeters, totalTimeSeconds, totalSeries };
}

function parseTimeToSeconds(time: string): number | null {
  const trimmed = time.trim();
  if (!trimmed) return null;
  if (/^\d+(\.\d+)?$/.test(trimmed)) return Math.round(parseFloat(trimmed));
  const parts = trimmed.split(':').map(Number);
  if (parts.some((p) => Number.isNaN(p))) return null;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return null;
}

export function formatArchiveDuration(seconds: number): string {
  if (seconds <= 0) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function flagEmojiFromCountryCode(code: string): string {
  const c = code.trim().toUpperCase();
  if (c.length !== 2) return '';
  const A = 0x1f1e6;
  const points = Array.from(c).map((ch) => A + ch.charCodeAt(0) - 65);
  return String.fromCodePoint(...points);
}

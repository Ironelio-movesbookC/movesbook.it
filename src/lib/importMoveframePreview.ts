import { isSeriesBasedSport } from '@/constants/moveframe.constants';

export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

export function moveframeDescription(mf: any): string {
  const raw = mf.manualMode ? mf.notes || mf.description || '' : mf.description || '';
  return stripHtml(raw) || '—';
}

export function moveframeDuration(mf: any): string {
  const isSeries = isSeriesBasedSport(mf.sport);
  if (isSeries) {
    if (mf.manualMode) return mf.repetitions ? `${mf.repetitions} series` : '—';
    const count = mf.movelaps?.length ?? 0;
    return count ? `${count} series` : '—';
  }
  let dist = 0;
  for (const lap of mf.movelaps ?? []) {
    dist += parseInt(lap.distance, 10) || 0;
  }
  return dist ? `${dist}m` : '—';
}

export function moveframeRipSets(mf: any): string {
  const isSeries = isSeriesBasedSport(mf.sport);
  if (isSeries) {
    if (mf.manualMode) return mf.repetitions != null ? String(mf.repetitions) : '—';
    let reps = 0;
    for (const lap of mf.movelaps ?? []) {
      reps += parseInt(lap.reps, 10) || 0;
    }
    if (reps) return String(reps);
    const laps = mf.movelaps?.length ?? 0;
    return laps ? String(laps) : '—';
  }
  const laps = mf.movelaps?.length ?? 0;
  return laps ? String(laps) : '—';
}

export function getMoveframesFromArchiveRecord(record: {
  archiveSource?: string;
  _raw?: unknown;
} | null): any[] {
  if (!record) return [];
  if (record.archiveSource === 'global') {
    const entry = record._raw as { payloadData?: string } | undefined;
    if (entry?.payloadData) {
      try {
        const p = JSON.parse(entry.payloadData) as { moveframes?: unknown[] };
        return Array.isArray(p.moveframes) ? p.moveframes : [];
      } catch {
        return [];
      }
    }
    return [];
  }
  const raw = record._raw as { workout?: { moveframes?: unknown[] }; moveframes?: unknown[] } | undefined;
  if (raw?.workout?.moveframes) return raw.workout.moveframes as any[];
  if (Array.isArray(raw?.moveframes)) return raw.moveframes as any[];
  return [];
}

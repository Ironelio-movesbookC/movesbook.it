import { REST_TYPES } from '@/constants/moveframe.constants';

/** Pause / macro strings like 1'30", 2', 45 — matches fast-planner parsing. */
export function parseFastPlannerPauseToSeconds(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.max(0, Math.floor(value));
  if (typeof value !== 'string') return 0;
  const s = String(value).trim();
  if (!s) return 0;
  if (/^\d+$/.test(s)) {
    const n = parseInt(s, 10);
    // Bare 1–9 with no unit: break dropdown uses "2'" not "2"; treat as minutes.
    if (n >= 1 && n <= 9) return n * 60;
    return Math.max(0, n);
  }
  if (s.includes("'")) {
    const parts = s.split("'");
    const mStr = (parts[0] ?? '').replace(/\D/g, '');
    const secStr = parts.slice(1).join("'").replace(/\D/g, '');
    const m = mStr ? parseInt(mStr, 10) : 0;
    const sec = secStr ? parseInt(secStr.slice(0, 2), 10) : 0;
    return Math.max(0, m * 60 + sec);
  }
  const secOnly = s.match(/^(\d+)\s*"?$/);
  if (secOnly) return Math.max(0, parseInt(secOnly[1], 10));
  return 0;
}

export function parseFastPlannerRipVolume(rip: unknown, ripTimeMode: string): number {
  if (ripTimeMode === 'reps') {
    return parseInt(String(rip ?? '0').replace(/[^\d]/g, '') || '0', 10) || 0;
  }
  const str = String(rip ?? '').trim();
  if (!str) return 0;
  if (str.includes(':')) {
    const segs = str.split(':').map((x) => parseInt(x.replace(/\D/g, ''), 10) || 0);
    if (segs.length >= 2) return segs[0] * 60 + segs[1];
  }
  return parseFastPlannerPauseToSeconds(str) || parseInt(str.replace(/\D/g, ''), 10) || 0;
}

type AerobicRestChoiceLite = 'rest_time' | 'restart_to' | 'reset_pulse';

export function mapMovelapRestTypeToChoice(restType: unknown): AerobicRestChoiceLite {
  const s = restType == null ? '' : String(restType).trim();
  const u = s.toUpperCase().replace(/\s+/g, '_');
  if (u === 'RESTART_TIME' || s === REST_TYPES.RESTART_TIME) return 'restart_to';
  if (u === 'RESTART_PULSE' || s === REST_TYPES.RESTART_PULSE) return 'reset_pulse';
  return 'rest_time';
}

function formatAerobicPauseInputLite(value: unknown): string {
  const raw = typeof value === 'string' ? value : value == null ? '' : String(value);
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 1) return `0'${digits}`;
  if (digits.length === 2) return `0'${digits}"`;
  if (digits.length === 3) return `${digits[0]}'${digits.slice(1, 3)}"`;
  const mins = digits.slice(0, -2);
  const secs = digits.slice(-2);
  return `${mins}'${secs}"`;
}

/** Rest Time cell (digits / formatted) → seconds; aligns with aerobic planner summary. */
function parseAerobicRestTimePauseToSecondsLite(raw: string): number {
  const f = formatAerobicPauseInputLite(raw).trim();
  if (!f) return 0;
  const withDeci = f.match(/^(\d{1,2})'(\d{2})"(\d)$/);
  if (withDeci) {
    return parseInt(withDeci[1], 10) * 60 + parseInt(withDeci[2], 10) + parseInt(withDeci[3], 10) / 10;
  }
  const noDeci = f.match(/^(\d{1,2})'(\d{2})"$/);
  if (noDeci) return parseInt(noDeci[1], 10) * 60 + parseInt(noDeci[2], 10);
  const secOnly = f.match(/^(\d+)\s*"$/);
  if (secOnly) return parseInt(secOnly[1], 10);
  return parseFastPlannerPauseToSeconds(f);
}

function formatAerobicPlannerTimeLite(value: unknown): string {
  const raw = typeof value === 'string' ? value : value == null ? '' : String(value);
  if (!raw) return '';
  if (/^\d+h\d{2}'\d{2}"\d$/.test(raw)) return raw;
  if (/^\d{1,2}'\d{2}"\d$/.test(raw)) return raw;
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  const len = digits.length;
  if (len === 1) return `0'00"${digits}`;
  if (len === 2) return `0'0${digits[0]}"${digits[1]}`;
  if (len === 3) return `0'${digits.slice(0, 2)}"${digits[2]}`;
  if (len === 4) return `${digits[0]}'${digits.slice(1, 3)}"${digits[3]}`;
  if (len === 5) return `${digits.slice(0, 2)}'${digits.slice(2, 4)}"${digits[4]}`;
  if (len === 6) return `${digits[0]}h${digits.slice(1, 3)}'${digits.slice(3, 5)}"${digits[5]}`;
  return `${digits.slice(0, -5)}h${digits.slice(-5, -3)}'${digits.slice(-3, -1)}"${digits.slice(-1)}`;
}

function parseTimeToDecisecondsLite(value: string): number | null {
  if (!value) return null;
  const formatted = formatAerobicPlannerTimeLite(value);
  const fullMatch = formatted.match(/^(\d+)h(\d{2})'(\d{2})"(\d)$/);
  if (fullMatch) {
    const hours = parseInt(fullMatch[1], 10);
    const minutes = parseInt(fullMatch[2], 10);
    const seconds = parseInt(fullMatch[3], 10);
    const deci = parseInt(fullMatch[4], 10);
    return (hours * 3600 + minutes * 60 + seconds) * 10 + deci;
  }
  const shortMatch = formatted.match(/^(\d{1,2})'(\d{2})"(\d)$/);
  if (shortMatch) {
    const minutes = parseInt(shortMatch[1], 10);
    const seconds = parseInt(shortMatch[2], 10);
    const deci = parseInt(shortMatch[3], 10);
    return (minutes * 60 + seconds) * 10 + deci;
  }
  return null;
}

function parseMovelapClockToSeconds(value: unknown): number {
  const s = typeof value === 'string' ? value.trim() : value == null ? '' : String(value).trim();
  if (!s) return 0;
  if (s.includes(':') && !s.includes("'")) {
    const parts = s.split(':').map((p) => parseInt(p.replace(/\D/g, ''), 10) || 0);
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  const deci = parseTimeToDecisecondsLite(s);
  if (deci != null) return deci / 10;
  return parseFastPlannerPauseToSeconds(value);
}

export function isAerobicMovelapFilled(lap: any): boolean {
  return (
    String(lap?.distance ?? '').trim() !== '' ||
    String(lap?.speed ?? '').trim() !== '' ||
    String(lap?.rowPerMin ?? '').trim() !== '' ||
    String(lap?.pace ?? '').trim() !== '' ||
    String(lap?.time ?? '').trim() !== '' ||
    String(lap?.pause ?? '').trim() !== '' ||
    (String(lap?.tools ?? '').trim() !== '' && String(lap.tools).trim().toLowerCase() !== 'stopped') ||
    String(lap?.notes ?? '').trim() !== ''
  );
}

export function aerobicMovelapPauseSecondsForTotal(lap: any): number {
  const choice = mapMovelapRestTypeToChoice(lap?.restType);
  if (choice === 'reset_pulse') return 0;
  const pauseStr = lap?.pause != null ? String(lap.pause) : '';
  if (choice === 'restart_to') {
    const timeDeci = parseTimeToDecisecondsLite(String(lap?.time ?? ''));
    const restDeci = parseTimeToDecisecondsLite(pauseStr);
    if (timeDeci != null && restDeci != null) {
      return Math.max(0, (restDeci - timeDeci) / 10);
    }
    return parseAerobicRestTimePauseToSecondsLite(pauseStr);
  }
  return parseAerobicRestTimePauseToSecondsLite(pauseStr);
}

export function standardMovelapPauseSecondsForTotal(lap: any): number {
  const choice = mapMovelapRestTypeToChoice(lap?.restType);
  if (choice === 'reset_pulse') return 0;
  const pauseRaw = lap?.pause ?? lap?._fastPlannerBreak ?? lap?.macroFinal;
  const pauseStr = pauseRaw != null ? String(pauseRaw) : '';
  if (choice === 'restart_to') {
    const t = parseMovelapClockToSeconds(lap?.time);
    const p = parseMovelapClockToSeconds(pauseRaw);
    return Math.max(0, p - t);
  }
  return parseFastPlannerPauseToSeconds(pauseRaw) || parseAerobicRestTimePauseToSecondsLite(pauseStr);
}

function normalizeFastPlannerExerciseKey(exercise: unknown): string {
  const value = typeof exercise === 'string' ? exercise : '';
  if (!value) return '';
  return value.replace(/\u00A0/g, ' ').trim().replace(/\s+/g, ' ').toLowerCase();
}

function lapsForExercise(laps: any[], exercise: unknown): any[] {
  const key = normalizeFastPlannerExerciseKey(exercise);
  if (!key) return [];
  return laps.filter((lap) => normalizeFastPlannerExerciseKey(lap?.exercise) === key);
}

/** Between-set break for one fast-planner row — never use macroFinal (workout-end rest). */
function resolveAnaerobicRowBreakSeconds(row: any, laps: any[]): number {
  const rowBreak = row?.break != null ? String(row.break).trim() : '';
  if (rowBreak) return parseFastPlannerPauseToSeconds(rowBreak);

  const exerciseLaps = lapsForExercise(laps, row?.exercise);
  for (const lap of exerciseLaps) {
    const candidates = [lap?._fastPlannerBreak, lap?.pause].filter(
      (v) => v != null && String(v).trim() !== ''
    );
    for (const raw of candidates) {
      const sec = parseFastPlannerPauseToSeconds(raw);
      if (sec > 0) return sec;
    }
  }

  return 0;
}

function seriesCountForExerciseLaps(exerciseLaps: any[]): number {
  if (exerciseLaps.length === 0) return 0;
  const fromMeta = parseInt(String(exerciseLaps[0]?._fastPlannerSeries ?? ''), 10);
  if (Number.isFinite(fromMeta) && fromMeta > 0) return fromMeta;
  return exerciseLaps.length;
}

function accumulateAnaerobicExerciseGroup(
  exerciseLaps: any[],
  ripTimeMode: string,
  sectorSeries: Map<string, number>,
  breakSecondsPerRow: number[],
  totals: { totalSeries: number; totalRepVolume: number; totalPauseSec: number }
) {
  if (exerciseLaps.length === 0) return;
  const lap = exerciseLaps[0];
  const sector = (lap?.muscularSector || lap?.sector || '').trim() || 'Other';
  const series = seriesCountForExerciseLaps(exerciseLaps);
  totals.totalSeries += series;
  sectorSeries.set(sector, (sectorSeries.get(sector) || 0) + series);

  const reps =
    typeof lap?.reps === 'number' && !Number.isNaN(lap.reps)
      ? lap.reps
      : parseFastPlannerRipVolume(lap?._fastPlannerRipTime ?? lap?.reps, ripTimeMode);
  totals.totalRepVolume += series * reps;

  const breakRaw =
    (typeof lap?._fastPlannerBreak === 'string' && lap._fastPlannerBreak.trim()) ||
    (typeof lap?.pause === 'string' && lap.pause.trim()) ||
    '';
  const sec = parseFastPlannerPauseToSeconds(breakRaw);
  totals.totalPauseSec += series * sec;
  if (sec > 0) breakSecondsPerRow.push(sec);
}

/**
 * Anaerobic Fast Planner moveframe row: sector→series totals, sum of series, sum of series×rip,
 * total pause seconds (per row break/macro/pause), legacy avgMacroSec for any older callers.
 */
export function computeAnaerobicFastPlannerRowStats(payload: any, movelaps: any[] | undefined) {
  const rows: any[] = Array.isArray(payload?.rows) ? payload.rows : [];
  const laps = Array.isArray(movelaps) ? movelaps : [];
  const ripTimeMode = payload?.ripTimeMode === 'time' ? 'time' : 'reps';

  const effectiveRows = rows.filter((r) => (r.exercise || '').trim() !== '');

  let totalSeries = 0;
  let totalRepVolume = 0;
  let totalPauseSec = 0;
  const sectorSeries = new Map<string, number>();
  const breakSecondsPerRow: number[] = [];
  let lastMacroRaw: string | null = null;
  let lastMacroSec = 0;

  const setEndMacroFromRaw = (raw: unknown) => {
    if (raw == null) return;
    const s = String(raw).trim();
    if (!s) return;
    lastMacroRaw = s;
    lastMacroSec = parseFastPlannerPauseToSeconds(raw);
  };

  effectiveRows.forEach((r) => {
    const sector =
      (String(r?.sector ?? '').trim() ||
        (lapsForExercise(laps, r?.exercise)[0]?.muscularSector || '').trim() ||
        (lapsForExercise(laps, r?.exercise)[0]?.sector || '').trim() ||
        'Other');
    const series = parseInt(String(r.series || '0'), 10) || 0;
    totalSeries += series;
    sectorSeries.set(sector, (sectorSeries.get(sector) || 0) + series);
    const repsPerSet = parseFastPlannerRipVolume(r.ripTime, ripTimeMode);
    totalRepVolume += series * repsPerSet;
    const sec = resolveAnaerobicRowBreakSeconds(r, laps);
    totalPauseSec += series * sec;
    if (sec > 0) breakSecondsPerRow.push(sec);
  });

  if (effectiveRows.length > 0) {
    const r = effectiveRows[effectiveRows.length - 1];
    const exerciseLaps = lapsForExercise(laps, r?.exercise);
    const lastLap = exerciseLaps[exerciseLaps.length - 1] ?? laps[laps.length - 1];
    setEndMacroFromRaw(lastLap?.macroFinal ?? lastLap?.pause ?? lastLap?._fastPlannerBreak);
  }

  if (effectiveRows.length === 0 && laps.length > 0) {
    const seenExercises = new Set<string>();
    const grouped = { totalSeries: 0, totalRepVolume: 0, totalPauseSec: 0 };
    for (const lap of laps) {
      const exKey = normalizeFastPlannerExerciseKey(lap?.exercise);
      if (!exKey || seenExercises.has(exKey)) continue;
      seenExercises.add(exKey);
      accumulateAnaerobicExerciseGroup(
        lapsForExercise(laps, lap?.exercise),
        ripTimeMode,
        sectorSeries,
        breakSecondsPerRow,
        grouped
      );
    }
    totalSeries = grouped.totalSeries;
    totalRepVolume = grouped.totalRepVolume;
    totalPauseSec = grouped.totalPauseSec;
    const lastLap = laps[laps.length - 1];
    setEndMacroFromRaw(lastLap?.macroFinal ?? lastLap?.pause ?? lastLap?._fastPlannerBreak);
  }

  const sectorPairs = Array.from(sectorSeries.entries())
    .map(([name, series]) => ({ name, series }))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

  const sectorSummaryLine = sectorPairs.map(({ name, series }) => `${name}: ${series}`).join(' · ');

  const avgBreakSec =
    breakSecondsPerRow.length > 0
      ? breakSecondsPerRow.reduce((a, b) => a + b, 0) / breakSecondsPerRow.length
      : 0;

  const ripPerSet = totalSeries > 0 ? totalRepVolume / totalSeries : null;
  const ripPerSetDisplay =
    ripPerSet != null
      ? Number.isInteger(ripPerSet)
        ? String(ripPerSet)
        : ripPerSet.toFixed(1)
      : '—';

  return {
    totalSeries,
    totalRepVolume,
    totalPauseSec,
    sectorSummaryLine,
    sectorPairs,
    /** Simple average of Break values per exercise row (not weighted by series). */
    avgBreakSec,
    /** @deprecated use avgBreakSec */
    avgMacroSec: avgBreakSec,
    ripPerSet,
    ripPerSetDisplay,
    lastMacroRaw,
    lastMacroSec,
  };
}

/**
 * Average pause (seconds): anaerobic fast planner = simple mean of Break per exercise row.
 * Aerobic fast planner: sum movelap rest contributions ÷ filled movelap count.
 * Otherwise: sum per-lap pause ÷ movelap count (circuit: total reps).
 */
export function computeMoveframeAvePauseSeconds(
  moveframe: any,
  anaerobicFastPlannerStats: { avgBreakSec?: number; avgMacroSec?: number } | null,
  fastPlannerPayload: any | null,
  isFastPlanMoveframe: boolean
): number | null {
  const laps = Array.isArray(moveframe?.movelaps) ? moveframe.movelaps : [];
  const isAerobicFp = !!(isFastPlanMoveframe && fastPlannerPayload?.plannerType === 'aerobic');
  const isAnaerobicFp = !!(isFastPlanMoveframe && fastPlannerPayload && fastPlannerPayload.plannerType !== 'aerobic');

  if (moveframe?.type === 'ANNOTATION' || moveframe?.manualMode) return null;

  if (isAnaerobicFp && anaerobicFastPlannerStats) {
    const avg =
      anaerobicFastPlannerStats.avgBreakSec ?? anaerobicFastPlannerStats.avgMacroSec ?? 0;
    if (avg <= 0) return null;
    return avg;
  }

  if (isAerobicFp && laps.length > 0) {
    let total = 0;
    let filled = 0;
    for (const lap of laps) {
      if (isAerobicMovelapFilled(lap)) filled += 1;
      total += aerobicMovelapPauseSecondsForTotal(lap);
    }
    if (filled <= 0) return null;
    return total / filled;
  }

  if (laps.length === 0) return null;

  let total = 0;
  for (const lap of laps) total += standardMovelapPauseSecondsForTotal(lap);

  let denom = 0;
  if (moveframe.isCircuitBased) {
    const totalFromField = Number(moveframe.totalReps);
    const totalR =
      Number.isFinite(totalFromField) && totalFromField > 0
        ? Math.round(totalFromField)
        : laps.reduce((s: number, lap: any) => {
            const n = parseInt(String(lap?.reps ?? '').replace(/[^\d]/g, ''), 10);
            return s + (Number.isFinite(n) ? n : 0);
          }, 0);
    denom = totalR > 0 ? totalR : laps.length;
  } else {
    denom = laps.length;
  }
  if (denom <= 0) return null;
  return total / denom;
}

export function formatAvePauseFromSeconds(seconds: number): string {
  const totalSeconds = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${minutes}'${secs.toString().padStart(2, '0')}"`;
}

/** Average Break column values from anaerobic fast-planner display rows (matches movelap table). */
export function avgBreakSecondsFromFastPlannerDisplayRows(displayMovelaps: any[]): number {
  const secs = displayMovelaps
    .map((m) => parseFastPlannerPauseToSeconds(m?._fastPlannerBreak ?? m?.pause ?? ''))
    .filter((s) => s > 0);
  if (secs.length === 0) return 0;
  return secs.reduce((a, b) => a + b, 0) / secs.length;
}

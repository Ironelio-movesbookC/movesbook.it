import { formatMoveframeType } from '@/constants/moveframe.constants';
import { formatCircuitMovelapLabel } from '@/utils/circuitMovelapLabel';
import { formatDurationSeconds } from '@/utils/formatWorkoutDuration';
import { stripInternalWorkoutTags, sanitizeWorkoutHtml } from '@/utils/sanitizeWorkoutHtml';

export type MoveframePrintLayout =
  | 'anaerobic_fast_planner'
  | 'aerobic_fast_planner'
  | 'circuit_body_building'
  | 'body_building'
  | 'distance'
  | 'tools'
  | 'generic';

const DISTANCE_SPORTS = [
  'SWIM',
  'BIKE',
  'MTB',
  'RUN',
  'ROWING',
  'CANOEING',
  'SKATE',
  'SKI',
  'SNOWBOARD',
  'HIKING',
  'WALKING',
];

export function extractFastPlannerDataFromNotes(notes: unknown): Record<string, unknown> | null {
  if (typeof notes !== 'string') return null;
  const match = notes.match(/\[FAST_PLANNER_DATA\]([\s\S]*?)\[\/FAST_PLANNER_DATA\]/);
  if (!match?.[1]) return null;
  try {
    return JSON.parse(match[1]) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function getMoveframePrintLayout(moveframe: any): MoveframePrintLayout {
  const sport = moveframe?.sport || 'SWIM';
  const fpPayload =
    moveframe?.fastPlannerData ?? extractFastPlannerDataFromNotes(moveframe?.notes);
  const hasFpDesc =
    typeof moveframe?.description === 'string' &&
    moveframe.description.toLowerCase().startsWith('fast planner');
  const isFastPlanner =
    (!!fpPayload || hasFpDesc) &&
    moveframe?.type === 'BATTERY' &&
    !moveframe?.isCircuitBased;

  if (isFastPlanner && fpPayload?.plannerType === 'aerobic') {
    return 'aerobic_fast_planner';
  }
  if (isFastPlanner) return 'anaerobic_fast_planner';
  if (sport === 'BODY_BUILDING' && moveframe?.isCircuitBased) return 'circuit_body_building';
  if (sport === 'BODY_BUILDING') return 'body_building';
  if (DISTANCE_SPORTS.includes(sport)) return 'distance';
  if (sport !== 'BODY_BUILDING' && !DISTANCE_SPORTS.includes(sport)) return 'tools';
  return 'generic';
}

export function displaySport(sport: string | undefined): string {
  return (sport || '—').replace(/_/g, ' ');
}

export function movelapUserNotes(notes: unknown): string {
  if (typeof notes !== 'string') return '';
  return stripInternalWorkoutTags(notes).trim();
}

export function cell(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  const s = String(value).trim();
  return s || '—';
}

export function formatPause(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'number' && value === 0) return '0';
  const formatted = formatDurationSeconds(value);
  return formatted === '—' ? cell(value) : formatted;
}

export function formatDistance(value: unknown, sport?: string): string {
  const raw = cell(value);
  if (raw === '—') return raw;
  if (/^[0-9]+$/.test(raw)) {
    const unit = sport === 'SWIM' ? 'm' : sport === 'RUN' || sport === 'HIKING' ? 'm' : 'm';
    return `${raw}${unit}`;
  }
  return raw;
}

export function movelapSequenceLabel(movelap: any, index: number, _moveframeLetter: string): string {
  const circuitLabel = formatCircuitMovelapLabel(movelap);
  if (circuitLabel) return circuitLabel;
  return String(movelap?.repetitionNumber ?? index + 1);
}

export function moveframeHeaderTitle(moveframe: any, index: number): string {
  const letter = moveframe?.letter || String.fromCharCode(65 + index);
  const sport = displaySport(moveframe?.sport);
  const section = moveframe?.section?.name || formatMoveframeType(moveframe?.type || 'STANDARD');
  const typeLabel = moveframe?.isCircuitBased ? 'Circuit' : formatMoveframeType(moveframe?.type || '');
  return `${letter} · ${sport} · ${section}${typeLabel ? ` · ${typeLabel}` : ''}`;
}

export function moveframeDescriptionHtml(moveframe: any): string {
  const raw = moveframe?.description;
  if (!raw) return '';
  return sanitizeWorkoutHtml(String(raw));
}

export function moveframeNotesHtml(moveframe: any): string {
  const raw = moveframe?.notes;
  if (!raw) return '';
  const cleaned = stripInternalWorkoutTags(String(raw)).trim();
  if (!cleaned || cleaned.toLowerCase().startsWith('fast planner')) return '';
  return sanitizeWorkoutHtml(cleaned);
}

export type PrintColumn = { key: string; label: string; align?: 'left' | 'center' };

export function columnsForLayout(layout: MoveframePrintLayout, sport: string): PrintColumn[] {
  switch (layout) {
    case 'anaerobic_fast_planner':
      return [
        { key: 'seq', label: '#', align: 'center' },
        { key: 'section', label: 'Section', align: 'left' },
        { key: 'exercise', label: 'Exercise / description', align: 'left' },
        { key: 'speed', label: 'Speed', align: 'center' },
        { key: 'series', label: 'Series', align: 'center' },
        { key: 'rip', label: 'Reps / time', align: 'center' },
        { key: 'weight', label: 'Weight', align: 'center' },
        { key: 'break', label: 'Break', align: 'center' },
        { key: 'mode', label: 'Mode', align: 'center' },
        { key: 'macro', label: 'Macro rest', align: 'center' },
        { key: 'notes', label: 'Notes', align: 'left' },
      ];
    case 'aerobic_fast_planner':
      return [
        { key: 'seq', label: '#', align: 'center' },
        { key: 'section', label: 'Section', align: 'left' },
        { key: 'distance', label: 'Distance', align: 'center' },
        { key: 'style', label: 'Style', align: 'center' },
        { key: 'speed', label: 'Speed', align: 'center' },
        { key: 'time', label: 'Time', align: 'center' },
        { key: 'rest', label: 'Rest', align: 'center' },
        { key: 'notes', label: 'Notes', align: 'left' },
      ];
    case 'circuit_body_building':
      return [
        { key: 'seq', label: '#', align: 'center' },
        { key: 'section', label: 'Section', align: 'left' },
        { key: 'muscular', label: 'Muscular', align: 'left' },
        { key: 'exercise', label: 'Exercise', align: 'left' },
        { key: 'reps', label: 'Reps', align: 'center' },
        { key: 'pause', label: 'Pause / rest', align: 'center' },
        { key: 'notes', label: 'Notes', align: 'left' },
      ];
    case 'body_building':
      return [
        { key: 'seq', label: '#', align: 'center' },
        { key: 'section', label: 'Section', align: 'left' },
        { key: 'exercise', label: 'Exercise', align: 'left' },
        { key: 'reps', label: 'Reps', align: 'center' },
        { key: 'weight', label: 'Weight', align: 'center' },
        { key: 'tempo', label: 'Tempo', align: 'center' },
        { key: 'pause', label: 'Pause', align: 'center' },
        { key: 'notes', label: 'Notes', align: 'left' },
      ];
    case 'distance': {
      const cols: PrintColumn[] = [
        { key: 'seq', label: '#', align: 'center' },
        { key: 'section', label: 'Section', align: 'left' },
        { key: 'distance', label: 'Distance', align: 'center' },
      ];
      if (sport === 'SWIM' || sport === 'RUN' || sport === 'HIKING' || sport === 'WALKING') {
        cols.push({ key: 'style', label: 'Style', align: 'center' });
      }
      if (sport === 'BIKE' || sport === 'MTB') {
        cols.push({ key: 'speed', label: 'Speed', align: 'center' });
        cols.push({ key: 'watts', label: 'Watts', align: 'center' });
      } else {
        cols.push({ key: 'speed', label: 'Speed', align: 'center' });
      }
      cols.push(
        { key: 'pace', label: 'Pace', align: 'center' },
        { key: 'time', label: 'Time', align: 'center' },
        { key: 'pause', label: 'Rest', align: 'center' },
        { key: 'notes', label: 'Notes', align: 'left' }
      );
      return cols;
    }
    case 'tools':
      return [
        { key: 'seq', label: '#', align: 'center' },
        { key: 'section', label: 'Section', align: 'left' },
        { key: 'tool', label: 'Tool / move', align: 'left' },
        { key: 'reps', label: 'Reps', align: 'center' },
        { key: 'pause', label: 'Rest', align: 'center' },
        { key: 'notes', label: 'Notes', align: 'left' },
      ];
    default:
      return [
        { key: 'seq', label: '#', align: 'center' },
        { key: 'section', label: 'Section', align: 'left' },
        { key: 'detail', label: 'Details', align: 'left' },
        { key: 'notes', label: 'Notes', align: 'left' },
      ];
  }
}

export function movelapRowCells(
  layout: MoveframePrintLayout,
  movelap: any,
  moveframe: any,
  index: number
): Record<string, string> {
  const sport = moveframe?.sport || '';
  const letter = moveframe?.letter || 'A';
  const sectionName = moveframe?.section?.name || '—';
  const notes = movelapUserNotes(movelap?.notes);

  const base: Record<string, string> = {
    seq: movelapSequenceLabel(movelap, index, letter),
    section: sectionName,
    notes: notes || '—',
  };

  switch (layout) {
    case 'anaerobic_fast_planner': {
      const ex = (movelap?.exercise || '').trim();
      const sector = (movelap?.muscularSector || movelap?.style || '').trim();
      const speedRaw =
        typeof movelap?.speed === 'string' ? movelap.speed.trim() : String(movelap?.speed ?? '').trim();
      const speed =
        speedRaw && !/^\d+$/.test(speedRaw) && speedRaw !== String(movelap?.reps) ? speedRaw : '—';
      return {
        ...base,
        exercise: ex || sector || '—',
        speed,
        series: cell(movelap?._fastPlannerSeries),
        rip: cell(movelap?._fastPlannerRipTime ?? movelap?.reps ?? movelap?.time),
        weight: cell(movelap?.weight),
        break: cell(movelap?._fastPlannerBreak ?? movelap?.pause),
        mode: cell(movelap?._fastPlannerMode),
        macro: cell(movelap?.macroFinal),
      };
    }
    case 'aerobic_fast_planner':
      return {
        ...base,
        distance: formatDistance(movelap?.distance, sport),
        style: cell(movelap?.style),
        speed: cell(movelap?.speed),
        time: formatPause(movelap?.time) !== '—' ? formatPause(movelap?.time) : cell(movelap?.time),
        rest: formatPause(movelap?.pause ?? movelap?._fastPlannerBreak),
      };
    case 'circuit_body_building':
      return {
        ...base,
        muscular: cell(movelap?.muscularSector ?? movelap?.style),
        exercise: cell(movelap?.exercise),
        reps: cell(movelap?.reps),
        pause: formatPause(movelap?.pause ?? movelap?.macroFinal),
      };
    case 'body_building':
      return {
        ...base,
        exercise: cell(movelap?.exercise ?? movelap?.style),
        reps: cell(movelap?.reps),
        weight: cell(movelap?.weight),
        tempo: cell(movelap?.tempo),
        pause: formatPause(movelap?.pause),
      };
    case 'distance':
      return {
        ...base,
        distance: formatDistance(movelap?.distance, sport),
        style: cell(movelap?.style),
        speed: cell(movelap?.speed),
        watts: cell(movelap?.watts),
        pace: cell(movelap?.pace),
        time: formatPause(movelap?.time) !== '—' ? formatPause(movelap?.time) : cell(movelap?.time),
        pause: formatPause(movelap?.pause),
      };
    case 'tools':
      return {
        ...base,
        tool: cell(movelap?.exercise ?? movelap?.style),
        reps: cell(movelap?.reps),
        pause: formatPause(movelap?.pause),
      };
    default:
      return {
        ...base,
        detail: [
          movelap?.distance && `Dist: ${movelap.distance}`,
          movelap?.time && `Time: ${formatPause(movelap.time)}`,
          movelap?.reps && `Reps: ${movelap.reps}`,
          movelap?.exercise && `${movelap.exercise}`,
          movelap?.style && `Style: ${movelap.style}`,
        ]
          .filter(Boolean)
          .join(' · ') || '—',
      };
  }
}

export const WORKOUT_PRINT_CSS = `
  @page { size: A4; margin: 12mm 14mm; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body {
    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
    font-size: 11pt;
    line-height: 1.45;
    color: #111;
    margin: 0;
    padding: 0;
    background: #fff;
  }
  .wps-header {
    border-bottom: 3px solid #2563eb;
    padding-bottom: 10pt;
    margin-bottom: 14pt;
  }
  .wps-title { font-size: 18pt; font-weight: 700; color: #1e3a8a; margin: 0 0 4pt; }
  .wps-meta { font-size: 10pt; color: #374151; }
  .wps-code { font-size: 11pt; font-weight: 600; color: #1d4ed8; margin-top: 6pt; }
  .wps-note {
    margin: 10pt 0;
    padding: 8pt 10pt;
    background: #fffbeb;
    border-left: 4px solid #f59e0b;
    font-size: 10pt;
  }
  .wps-mf-block {
    margin-bottom: 16pt;
    page-break-inside: avoid;
    border: 1px solid #cbd5e1;
    border-radius: 6pt;
    overflow: hidden;
  }
  .wps-mf-head {
    padding: 8pt 10pt;
    color: #fff;
    font-weight: 700;
    font-size: 11pt;
  }
  .wps-mf-desc {
    padding: 8pt 10pt;
    background: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
    font-size: 10pt;
    text-align: left;
  }
  .wps-mf-desc p { margin: 0 0 4pt; }
  .wps-exec-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 9.5pt;
  }
  .wps-exec-table th {
    background: #e2e8f0;
    border: 1px solid #94a3b8;
    padding: 5pt 6pt;
    font-weight: 700;
    text-align: center;
    font-size: 8.5pt;
    text-transform: uppercase;
    letter-spacing: 0.02em;
  }
  .wps-exec-table td {
    border: 1px solid #cbd5e1;
    padding: 5pt 6pt;
    vertical-align: top;
  }
  .wps-exec-table td.left { text-align: left; }
  .wps-exec-table td.center { text-align: center; }
  .wps-exec-table tbody tr:nth-child(even) { background: #f8fafc; }
  .wps-exec-table tbody tr.step-row td:first-child { font-weight: 700; background: #eff6ff; }
  .wps-empty { padding: 12pt; text-align: center; color: #64748b; font-style: italic; }
  .wps-footer {
    margin-top: 18pt;
    padding-top: 8pt;
    border-top: 1px solid #e2e8f0;
    text-align: center;
    font-size: 8pt;
    color: #94a3b8;
  }
  .text-left { text-align: left !important; }
`;

export function openWorkoutPrintWindow(contentHtml: string, title: string): void {
  const printWindow = window.open('', '_blank', 'width=900,height=700');
  if (!printWindow) return;
  printWindow.document.write(`<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>${title}</title>
<style>${WORKOUT_PRINT_CSS}</style></head>
<body>${contentHtml}</body></html>`);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 350);
}

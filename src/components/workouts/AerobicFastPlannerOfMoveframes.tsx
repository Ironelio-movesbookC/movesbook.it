'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { closestCenter, DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { getPauseOptions, getSportConfig, REST_TYPES } from '@/constants/moveframe.constants';

type RestChoice = 'rest_time' | 'restart_to' | 'reset_pulse';
type BreakChoice = 'stopped' | 'speed' | 'watts';
type ActiveField = 'distance' | 'style' | 'speed' | 'strokes' | 'watts' | 'time' | 'rest' | 'break';

type AerobicPlannerRow = {
  id: number;
  distance: string;
  style: string;
  speed: string;
  strokes: string;
  watts: string;
  time: string;
  restChoice: RestChoice;
  rest: string;
  breakChoice: BreakChoice;
  break: string;
  note: string;
};

const dndInteractiveSelector = 'input,textarea,select,option,[contenteditable="true"]';
class SafePointerSensor extends PointerSensor {
  static activators: typeof PointerSensor['activators'] = [
    {
      eventName: 'onPointerDown',
      handler: (event) => {
        const target = event?.nativeEvent?.target as HTMLElement | null;
        if (!target) return true;
        const handle = target.closest('[data-dnd-handle="true"]');
        if (handle) return true;
        if (target.closest(dndInteractiveSelector)) return false;
        return true;
      }
    }
  ];
}

interface AerobicFastPlannerProps {
  sport: string;
  sectionId: string;
  workout: any;
  day: any;
  mode: 'add' | 'edit';
  existingMoveframe?: any;
  onSave: (moveframeData: any) => void;
  onCancel: () => void;
  fullView?: boolean;
}

export type FastPlannerHandle = {
  saveMoveframe: () => void;
  saveMoveframeAndMovelaps: () => void;
  openPreferences: () => void;
};

const parseFastPlannerDataFromNotes = (notes: unknown): any | null => {
  if (typeof notes !== 'string') return null;
  const match = notes.match(/\[FAST_PLANNER_DATA\]([\s\S]*?)\[\/FAST_PLANNER_DATA\]/);
  if (!match?.[1]) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
};

const upsertFastPlannerDataInNotes = (notes: unknown, data: any): string => {
  const base = typeof notes === 'string' ? notes : '';
  const stripped = base.replace(/\[FAST_PLANNER_DATA\][\s\S]*?\[\/FAST_PLANNER_DATA\]/g, '').trim();
  const tag = `[FAST_PLANNER_DATA]${JSON.stringify(data)}[/FAST_PLANNER_DATA]`;
  return stripped ? `${stripped}\n\n${tag}` : tag;
};

const defaultRow = (id: number): AerobicPlannerRow => ({
  id,
  distance: '',
  style: '',
  speed: '',
  strokes: '',
  watts: '',
  time: '',
  restChoice: 'rest_time',
  rest: '',
  breakChoice: 'stopped',
  break: 'Stopped',
  note: ''
});

const normalizeRows = (rows: any[]): AerobicPlannerRow[] => {
  if (!Array.isArray(rows)) return [defaultRow(1)];
  const mapped = rows
    .map((r, idx) => ({
      ...defaultRow(typeof r?.id === 'number' ? r.id : idx + 1),
      ...r
    }))
    .filter((r) => typeof r.id === 'number');
  return mapped.length ? mapped : [defaultRow(1)];
};

const chipTimes = (): string[] => {
  const times: string[] = [];
  const add = (m: number, s: number) =>
    times.push(`0h${String(m).padStart(2, '0')}'${String(s).padStart(2, '0')}"0`);
  add(0, 15);
  add(0, 20);
  add(0, 25);
  add(0, 30);
  add(0, 40);
  add(0, 45);
  add(1, 0);
  add(1, 15);
  add(1, 30);
  add(2, 0);
  add(3, 0);
  add(5, 0);
  add(10, 0);
  return times;
};

const strokeOptions = (): string[] => {
  const out: string[] = [];
  for (let v = 10; v <= 90; v += 5) out.push(String(v));
  out.push('95');
  out.push('99');
  return out;
};

const wattsOptions = (): string[] => {
  const out: string[] = [];
  for (let v = 50; v <= 500; v += 25) out.push(String(v));
  return out;
};

const distanceOptions = (): string[] => [
  '25',
  '33',
  '50',
  '66',
  '75',
  '100',
  '125',
  '150',
  '200',
  '250',
  '300',
  '400',
  '500',
  '800',
  '1000',
  '1200',
  '1500'
];

const restTypeFromChoice = (choice: RestChoice): string => {
  if (choice === 'restart_to') return REST_TYPES.RESTART_TIME;
  if (choice === 'reset_pulse') return REST_TYPES.RESTART_PULSE;
  return REST_TYPES.SET_TIME;
};

/** Parse distance string to number (e.g. "100", "100m" -> 100) */
const parseDistanceToNumber = (s: string): number => {
  if (!s || typeof s !== 'string') return 0;
  const num = parseInt(s.replace(/\D/g, ''), 10);
  return Number.isNaN(num) ? 0 : num;
};

/** Parse time string (e.g. "1'30\"", "0h01'00\"0") to total seconds */
const parseTimeToSeconds = (s: string): number => {
  if (!s || typeof s !== 'string') return 0;
  const trimmed = s.trim();
  let seconds = 0;
  const hMatch = trimmed.match(/(\d+)\s*h/);
  if (hMatch) seconds += parseInt(hMatch[1], 10) * 3600;
  const minMatch = trimmed.match(/(\d+)\s*'/);
  if (minMatch) seconds += parseInt(minMatch[1], 10) * 60;
  const secMatch = trimmed.match(/(\d+)\s*"?\s*"?/);
  if (secMatch) seconds += parseInt(secMatch[1], 10);
  return seconds;
};

/** Format seconds to M'SS" */
const formatTimeFromSeconds = (totalSeconds: number): string => {
  if (totalSeconds <= 0) return "0'00\"";
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}'${String(s).padStart(2, '0')}"`;
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const AerobicFastPlannerOfMoveframes = React.forwardRef<FastPlannerHandle, AerobicFastPlannerProps>(
  function AerobicFastPlannerOfMoveframes({ sport, sectionId, workout: _workout, day: _day, mode, existingMoveframe, onSave, onCancel, fullView }, ref) {
    const sportConfig = useMemo(() => getSportConfig(sport as any), [sport]);
    const [rows, setRows] = useState<AerobicPlannerRow[]>([defaultRow(1), defaultRow(2), defaultRow(3), defaultRow(4)]);
    const [selectedCell, setSelectedCell] = useState<{ rowId: number; field: keyof AerobicPlannerRow } | null>(null);
    const lastSelectedRowIdRef = useRef<number | null>(null);
    const [activeField, setActiveField] = useState<ActiveField>('distance');
    const activeFieldRef = useRef<ActiveField>('distance');
    const setActiveFieldAndRef = useCallback((field: ActiveField) => {
      activeFieldRef.current = field;
      setActiveField(field);
    }, []);
    const [restChoice, setRestChoice] = useState<RestChoice>('rest_time');
    const [breakChoice, setBreakChoice] = useState<BreakChoice>('stopped');
    const [descriptionInstructions, setDescriptionInstructions] = useState('');
    const [showPreferences, setShowPreferences] = useState(false);
    const [isNoteEditing, setIsNoteEditing] = useState(false);
    const [restartTimeValidationError, setRestartTimeValidationError] = useState(false);

    const loadedMoveframeIdRef = useRef<string | null>(null);

    useEffect(() => {
      if (mode !== 'edit' || !existingMoveframe?.id) {
        loadedMoveframeIdRef.current = null;
        return;
      }
      if (loadedMoveframeIdRef.current === existingMoveframe.id) return;
      loadedMoveframeIdRef.current = existingMoveframe.id;
      const parsed = parseFastPlannerDataFromNotes(existingMoveframe?.notes);
      if (!parsed || parsed?.plannerType !== 'aerobic') return;
      setRows(normalizeRows(parsed.rows));
      if (parsed.activeField) setActiveFieldAndRef(parsed.activeField);
      if (parsed.restChoice) setRestChoice(parsed.restChoice);
      if (parsed.breakChoice) setBreakChoice(parsed.breakChoice);
      if (typeof parsed.descriptionInstructions === 'string') setDescriptionInstructions(parsed.descriptionInstructions);
    }, [mode, existingMoveframe]);

    const setRowField = (rowId: number, field: keyof AerobicPlannerRow, value: string) => {
      if (field === 'rest' || field === 'time') setRestartTimeValidationError(false);
      setRows((prev) =>
        prev.map((r) => {
          if (r.id !== rowId) return r;
          if (field === 'break') {
            if (breakChoice === 'stopped') return { ...r, breakChoice: 'stopped', break: 'Stopped' };
            return { ...r, breakChoice, break: value };
          }
          if (field === 'rest') {
            return { ...r, restChoice, rest: value };
          }
          if (field === 'time') {
            const timeDeci = parseTimeToDeciseconds(value);
            const newRow = { ...r, time: value } as AerobicPlannerRow;
            if (timeDeci != null && r.restChoice === 'restart_to' && (r.rest || '').trim()) {
              const restDeci = parseTimeToDeciseconds(r.rest);
              if (restDeci != null && restDeci < timeDeci + 30) {
                newRow.rest = formatDeciseconds(timeDeci + 30);
              }
            }
            return newRow;
          }
          return { ...r, [field]: value } as AerobicPlannerRow;
        })
      );
    };

    const selectedRow = selectedCell ? rows.find((r) => r.id === selectedCell.rowId) : null;

    const distanceChoices = useMemo(() => {
      const meters = Array.isArray((sportConfig as any)?.meters) ? (sportConfig as any).meters : [];
      const filtered = meters.filter((m: string) => m !== 'input').map(String);
      return filtered.length ? filtered : distanceOptions();
    }, [sportConfig]);

    const styleChoices = useMemo(() => {
      const styles = Array.isArray((sportConfig as any)?.styles) ? ((sportConfig as any).styles as any[]) : [];
      return styles.map(String);
    }, [sportConfig]);

    const speedChoices = useMemo(() => {
      const speeds = Array.isArray((sportConfig as any)?.speeds) ? ((sportConfig as any).speeds as any[]) : [];
      return speeds.map(String);
    }, [sportConfig]);

    const restChoices = useMemo(() => {
      const restTypes = Array.isArray((sportConfig as any)?.restTypes) ? ((sportConfig as any).restTypes as any[]) : [];
      const out: { choice: RestChoice; label: string; type: string }[] = [];
      if (restTypes.includes(REST_TYPES.SET_TIME)) out.push({ choice: 'rest_time', label: 'Rest Time', type: REST_TYPES.SET_TIME });
      if (restTypes.includes(REST_TYPES.RESTART_TIME)) out.push({ choice: 'restart_to', label: 'Restart to', type: REST_TYPES.RESTART_TIME });
      if (restTypes.includes(REST_TYPES.RESTART_PULSE)) out.push({ choice: 'reset_pulse', label: 'Rest pulse', type: REST_TYPES.RESTART_PULSE });
      return out;
    }, [sportConfig]);

    useEffect(() => {
      if (restChoices.length === 0) return;
      const firstChoice = restChoices[0].choice;
      setRestChoice(firstChoice);
      setRows((prev) =>
        prev.map((r) => {
          if (restChoices.some((c) => c.choice === r.restChoice)) return r;
          return { ...r, restChoice: firstChoice, rest: '' };
        })
      );
    }, [restChoices]);

    useEffect(() => {
      if (styleChoices.length === 0) return;
      const first = styleChoices[0];
      setRows((prev) => prev.map((r) => (r.style ? r : { ...r, style: first })));
    }, [styleChoices]);

    const fieldHelp = useMemo(() => {
      if (selectedCell?.field === 'restChoice') {
        return {
          title: 'Rest Type',
          basic: 'Choose the rest type allowed by the selected sport.',
          advanced: 'Rest type sets how the Rest value is interpreted: Rest Time, Restart to, or Rest pulse.'
        };
      }
      if (activeField === 'strokes') {
        return {
          title: 'Strokes',
          basic: 'Enter strokes per minute using arrows or typing (0–999).',
          advanced: 'Values outside the range are automatically clamped.'
        };
      }
      if (activeField === 'watts') {
        return {
          title: 'Watts',
          basic: 'Enter watts using arrows or typing (0–999).',
          advanced: 'Values outside the range are automatically clamped.'
        };
      }
      if (activeField === 'time') {
        return {
          title: 'Time',
          basic: 'Type digits and blur to format, e.g. 12345 → 12\'34"5 (min\'sec"tenths).',
          advanced: 'Format is applied on blur; 5 digits = MM\'SS"T.'
        };
      }
      if (activeField === 'rest' && restChoice === 'restart_to') {
        return {
          title: 'Restart to',
          basic: 'Enter time using the same format; it must be at least 3" longer than Time.',
          advanced: 'If the value is below Time + 3", it auto-adjusts to the minimum valid value.'
        };
      }
      if (activeField === 'rest' && restChoice === 'reset_pulse') {
        return {
          title: 'Rest pulse',
          basic: 'Enter pulse using arrows or typing (60–220).',
          advanced: 'Values outside the range are automatically clamped.'
        };
      }
      return null;
    }, [activeField, restChoice, selectedCell?.field]);

    const valueChips = useMemo(() => {
      if (activeField === 'distance') return distanceChoices;
      if (activeField === 'style') return styleChoices;
      if (activeField === 'speed') return speedChoices;
      if (activeField === 'strokes') return strokeOptions();
      if (activeField === 'watts') return wattsOptions();
      if (activeField === 'rest') {
        if (restChoice !== 'rest_time') return [];
        const type = restTypeFromChoice(restChoice);
        const options = getPauseOptions(sport as any, type);
        if (Array.isArray(options)) return options.map(String);
        return [];
      }
      if (activeField === 'break') {
        if (breakChoice === 'stopped') return ['Stopped'];
        if (breakChoice === 'speed') return speedChoices;
        if (breakChoice === 'watts') return []; // Input + arrows only, no chips
        return [];
      }
      return [];
    }, [activeField, breakChoice, restChoice, distanceChoices, styleChoices, speedChoices, sport]);

    // Apply value to the CELL OF THE TOOLBAR PARAMETER (e.g. Watts column), NOT the currently focused cell
    const applyChipToSelection = (value: string) => {
      const fallbackRowId = selectedCell?.rowId ?? rows[0]?.id;
      if (!fallbackRowId) return;
      const param = activeFieldRef.current; // Always use toolbar parameter, never selectedCell.field
      const targetField = param === 'rest' ? 'rest' : param === 'break' ? 'break' : param;
      setRowField(fallbackRowId, targetField as keyof AerobicPlannerRow, value);
      setSelectedCell({ rowId: fallbackRowId, field: targetField as keyof AerobicPlannerRow });
    };

    // Format: 12345 → 12'34"5 (mm'ss"d); 123456 → 1h23'45"6
    const formatTime = (value: string): string => {
      if (!value) return '';
      if (/^\d+h\d{2}'\d{2}"\d$/.test(value)) return value;
      if (/^\d{1,2}'\d{2}"\d$/.test(value)) return value;
      const digits = value.replace(/\D/g, '');
      if (!digits) return '';
      const len = digits.length;
      if (len === 1) return `0'00"${digits}`;
      if (len === 2) return `0'0${digits[0]}"${digits[1]}`;
      if (len === 3) return `0'${digits.slice(0, 2)}"${digits[2]}`;
      if (len === 4) return `${digits[0]}'${digits.slice(1, 3)}"${digits[3]}`;
      if (len === 5) return `${digits.slice(0, 2)}'${digits.slice(2, 4)}"${digits[4]}`;
      if (len === 6) return `${digits[0]}h${digits.slice(1, 3)}'${digits.slice(3, 5)}"${digits[5]}`;
      return `${digits.slice(0, -5)}h${digits.slice(-5, -3)}'${digits.slice(-3, -1)}"${digits.slice(-1)}`;
    };
    const formatPauseInput = (value: string): string => {
      const digits = value.replace(/\D/g, '');
      if (!digits) return '';
      if (digits.length === 1) return `0'${digits}`;
      if (digits.length === 2) return `0'${digits}"`;
      if (digits.length === 3) return `${digits[0]}'${digits.slice(1, 3)}"`;
      const mins = digits.slice(0, -2);
      const secs = digits.slice(-2);
      return `${mins}'${secs}"`;
    };

    const parseTimeToDeciseconds = (value: string): number | null => {
      if (!value) return null;
      const formatted = formatTime(value);
      const fullMatch = formatted.match(/^(\d+)h(\d{2})'(\d{2})"(\d)$/);
      if (fullMatch) {
        const hours = parseInt(fullMatch[1]);
        const minutes = parseInt(fullMatch[2]);
        const seconds = parseInt(fullMatch[3]);
        const deci = parseInt(fullMatch[4]);
        return ((hours * 3600 + minutes * 60 + seconds) * 10) + deci;
      }
      const shortMatch = formatted.match(/^(\d{1,2})'(\d{2})"(\d)$/);
      if (shortMatch) {
        const minutes = parseInt(shortMatch[1]);
        const seconds = parseInt(shortMatch[2]);
        const deci = parseInt(shortMatch[3]);
        return ((minutes * 60 + seconds) * 10) + deci;
      }
      return null;
    };

    const formatDeciseconds = (value: number): string => {
      const totalSeconds = Math.max(0, Math.floor(value / 10));
      const deci = Math.max(0, value % 10);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      if (hours > 0) {
        return `${hours}h${String(minutes).padStart(2, '0')}'${String(seconds).padStart(2, '0')}"${deci}`;
      }
      return `${minutes}'${String(seconds).padStart(2, '0')}"${deci}`;
    };

    // Apply value to the CELL OF THE TOOLBAR PARAMETER, NOT the currently focused cell
    const applyInputToSelection = (value: string) => {
      const fallbackRowId = selectedCell?.rowId ?? rows[0]?.id;
      if (!fallbackRowId) return;
      const param = activeFieldRef.current; // Always use toolbar parameter, never selectedCell.field
      const targetField = param === 'rest' ? 'rest' : param === 'break' ? 'break' : param;
      setRowField(fallbackRowId, targetField as keyof AerobicPlannerRow, value);
      setSelectedCell({ rowId: fallbackRowId, field: targetField as keyof AerobicPlannerRow });
    };

    const normalizeNumberInput = (value: string, min: number, max: number) => {
      const digits = value.replace(/\D/g, '');
      if (!digits) return '';
      const num = Math.min(max, Math.max(min, parseInt(digits)));
      return String(num);
    };

    const NumberInputWithArrows = ({
      value,
      min,
      max,
      onApply
    }: { value: string; min: number; max: number; onApply: (v: string) => void }) => {
      const num = value === '' ? null : parseInt(value, 10);
      return (
        <div className="flex items-center gap-0.5 border border-gray-300 rounded bg-white overflow-hidden">
          <button
            type="button"
            onClick={() => onApply(String(Math.max(min, (num ?? min) - 1)))}
            className="px-2 py-1 text-gray-600 hover:bg-gray-100 border-r border-gray-300"
            aria-label="Decrease"
          >
            ▼
          </button>
          <input
            type="number"
            min={min}
            max={max}
            value={value}
            onChange={(e) => onApply(normalizeNumberInput(e.target.value, min, max))}
            className="w-20 text-center border-0 px-1 py-1 text-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <button
            type="button"
            onClick={() => onApply(String(Math.min(max, (num ?? min) + 1)))}
            className="px-2 py-1 text-gray-600 hover:bg-gray-100 border-l border-gray-300"
            aria-label="Increase"
          >
            ▲
          </button>
        </div>
      );
    };

    const handleRestartToBlur = (rowId: number, value: string) => {
      const formatted = formatTime(value);
      const row = rows.find((r) => r.id === rowId);
      const timeDeci = row?.time ? parseTimeToDeciseconds(row.time) : null;
      const restDeci = parseTimeToDeciseconds(formatted);
      let finalValue = formatted;
      if (timeDeci != null && restDeci != null) {
        const minDeci = timeDeci + 30; // Rest must be > Time by at least 3"
        if (restDeci < minDeci) {
          finalValue = formatDeciseconds(minDeci);
        }
      }
      setRowField(rowId, 'rest', finalValue);
      setSelectedCell({ rowId, field: 'rest' });
    };

    const isRowFilled = (r: AerobicPlannerRow) =>
      (r.distance || '').trim() !== '' ||
      (r.style || '').trim() !== '' ||
      (r.speed || '').trim() !== '' ||
      (r.strokes || '').trim() !== '' ||
      (r.watts || '').trim() !== '' ||
      (r.time || '').trim() !== '' ||
      (r.rest || '').trim() !== '' ||
      (r.break || '').trim() !== '' ||
      (r.note || '').trim() !== '';

    const buildAerobicSummaryFromRows = (allRows: AerobicPlannerRow[]): string => {
      const filled = allRows.filter(isRowFilled);
      const withDistance = filled.filter((r) => (r.distance || '').trim() !== '');
      const withTime = filled.filter((r) => (r.time || '').trim() !== '');
      const withRest = filled.filter((r) => (r.rest || '').trim() !== '' && r.restChoice === 'rest_time');

      const totalDistance = withDistance.reduce((sum, r) => sum + parseDistanceToNumber(r.distance || ''), 0);
      const avgDistance = withDistance.length > 0 ? (totalDistance / withDistance.length).toFixed(1) : '-';
      const totalTimeSeconds = withTime.reduce((sum, r) => sum + parseTimeToSeconds(r.time || ''), 0);
      const avgTimeSeconds = withTime.length > 0 ? totalTimeSeconds / withTime.length : 0;
      const totalTimeBestStr = withTime.length > 0 ? formatTimeFromSeconds(totalTimeSeconds) : null;
      const avgBestStr = withTime.length > 0 ? formatTimeFromSeconds(Math.round(avgTimeSeconds)) : null;
      const totalRestSeconds = withRest.reduce((sum, r) => sum + parseTimeToSeconds(r.rest || ''), 0);
      const avgRestSeconds = withRest.length > 0 ? totalRestSeconds / withRest.length : 0;
      const totalRestStr = withRest.length > 0 ? formatTimeFromSeconds(totalRestSeconds) : null;
      const avgRestStr = withRest.length > 0 ? formatTimeFromSeconds(Math.round(avgRestSeconds)) : null;

      const lines = [
        'Summary (Here in automatic) :',
        filled.length === 0
          ? 'Total Distance - No rows filled | Average Distance -'
          : `Total Distance (X) ${totalDistance} | Average Distance ${avgDistance}`,
        withTime.length === 0
          ? 'Average Best ( Total Time Best - No rows with Real Time )'
          : `Total Time Best ${totalTimeBestStr} | Average Best ${avgBestStr}`,
        withRest.length === 0
          ? 'Average Rest ( Total Time Rest : No rows with Rest Time )'
          : `Total Time Rest ${totalRestStr} | Average Rest ${avgRestStr}`,
        '',
        'User can edit here (but not the Summary).'
      ];
      return lines.join('\n');
    };

    const aerobicSummaryText = useMemo(() => buildAerobicSummaryFromRows(rows), [rows]);

    /** Row 1: distances only (e.g. 100\\A2+50\\A1+200\\B1); Row 2: typed description if exists */
    const buildDescription = (filled: AerobicPlannerRow[]) => {
      const withUnit = (value: string) => {
        const trimmed = value.trim();
        if (!trimmed) return '';
        if (/[a-zA-Z]/.test(trimmed)) return trimmed;
        return `${trimmed}m`;
      };
      const parts = filled
        .map((r) => {
          const distance = typeof r.distance === 'string' ? r.distance.trim() : '';
          const style = typeof r.style === 'string' ? r.style.trim() : '';
          if (!distance) return '';
          const formattedDistance = withUnit(distance);
          return style ? `${formattedDistance}\\${style}` : formattedDistance;
        })
        .filter(Boolean);
      const distancesOnly = parts.join('+');
      const extra = typeof descriptionInstructions === 'string' ? descriptionInstructions.trim() : '';
      if (!extra) return distancesOnly;
      const formatted = escapeHtml(extra).replace(/\r\n/g, '\n').replace(/\n/g, '<br/>');
      return distancesOnly ? `${distancesOnly}<br/>${formatted}` : formatted;
    };

    const buildMovelapsFromRows = (filled: AerobicPlannerRow[]) => {
      return filled.map((r, idx) => {
        const restType = restTypeFromChoice(r.restChoice);
        const restValue =
          r.restChoice === 'restart_to'
            ? formatTime(r.rest || '')
            : r.restChoice === 'rest_time'
            ? formatPauseInput(r.rest || '')
            : r.rest || '';
        const notes = typeof r.note === 'string' ? r.note.trim() : '';
        return {
          repetitionNumber: idx + 1,
          distance: r.distance || null,
          style: r.style || null,
          speed: r.speed || null,
          rowPerMin: r.strokes || null,
          pace: r.watts || null,
          time: r.time || null,
          pause: restValue || null,
          restType,
          tools: r.break || null,
          notes: notes || null
        };
      });
    };

    // Parse rest_time string (e.g. "1'30\"", "0'45\"") to seconds for summary
    const parseRestToSeconds = (s: string): number => {
      if (!s || typeof s !== 'string') return 0;
      const t = s.trim();
      const m = t.match(/^(\d+)\s*'?\s*(\d*)\s*"?\s*$/);
      if (m) {
        const mins = parseInt(m[1], 10) || 0;
        const secs = m[2] ? parseInt(m[2], 10) : 0;
        return mins * 60 + secs;
      }
      const secOnly = t.match(/^(\d+)\s*"?\s*$/);
      if (secOnly) return parseInt(secOnly[1], 10) || 0;
      return 0;
    };
    const formatRestFromSeconds = (sec: number): string => {
      if (sec < 60) return `${sec}"`;
      const m = Math.floor(sec / 60);
      const s = sec % 60;
      return s > 0 ? `${m}'${s}"` : `${m}'`;
    };

    // Summary (automatic): Total Distance, Average Distance, Average Rest
    const aerobicSummary = useMemo(() => {
      const withDistance = rows.filter((r) => (r.distance || '').trim() !== '');
      const totalDistance = withDistance.reduce((sum, r) => {
        const raw = (r.distance || '').trim().replace(/[^\d.]/g, '');
        return sum + (parseFloat(raw) || 0);
      }, 0);
      const filledCount = withDistance.length;
      const withRest = rows.filter((r) => (r.rest || '').trim() !== '');
      const totalRestSeconds = withRest.reduce((sum, r) => sum + parseRestToSeconds(r.rest || ''), 0);
      const restCount = withRest.length;
      return {
        totalDistance: Math.round(totalDistance * 10) / 10,
        filledCount,
        averageDistance: filledCount > 0 ? Math.round((totalDistance / filledCount) * 10) / 10 : null,
        totalRestSeconds,
        restCount,
        averageRestSeconds: restCount > 0 ? Math.round(totalRestSeconds / restCount) : null
      };
    }, [rows]);

    const aerobicSummaryLine = useMemo(() => {
      const s = aerobicSummary;
      const totalDist = `Total Distance (${s.totalDistance})`;
      const avgDist = s.filledCount > 0
        ? `Average Distance (${s.averageDistance})`
        : 'Average Distance (Total Distance : No rows filled)';
      const avgRest = s.restCount > 0
        ? `Average Rest (${formatRestFromSeconds(s.totalRestSeconds)} total, avg ${formatRestFromSeconds(s.averageRestSeconds!)})`
        : 'Average Rest (Total Time Rest : No rows with Rest Time)';
      return `${totalDist} ${avgDist} ${avgRest}`;
    }, [aerobicSummary]);

    const handleSaveMoveframe = (uploadToWorkout: boolean) => {
      setRestartTimeValidationError(false);
      const filledRows = rows
        .map((r) => ({
          ...r,
          distance: (r.distance || '').trim(),
          style: (r.style || '').trim(),
          speed: (r.speed || '').trim(),
          strokes: (r.strokes || '').trim(),
          watts: (r.watts || '').trim(),
          time: (r.time || '').trim(),
          rest: (r.rest || '').trim(),
          break: (r.break || '').trim(),
          note: (r.note || '').trim()
        }))
        .filter((r) =>
          r.distance !== '' ||
          r.style !== '' ||
          r.speed !== '' ||
          r.strokes !== '' ||
          r.watts !== '' ||
          r.time !== '' ||
          r.rest !== '' ||
          r.break !== '' ||
          r.note !== ''
        )
        .map((r) => {
          if (r.restChoice !== 'restart_to' || !r.time || !r.rest) return r;
          const timeDeci = parseTimeToDeciseconds(r.time);
          const restDeci = parseTimeToDeciseconds(r.rest);
          if (timeDeci == null || restDeci == null || restDeci >= timeDeci + 30) return r;
          return { ...r, rest: formatDeciseconds(timeDeci + 30) };
        });

      for (const r of filledRows) {
        if (r.restChoice === 'restart_to' && (r.time || '').trim() && (r.rest || '').trim()) {
          const timeDeci = parseTimeToDeciseconds(r.time);
          const restDeci = parseTimeToDeciseconds(r.rest);
          if (timeDeci != null && restDeci != null) {
            const minRestDeci = timeDeci + 30; // At least 3" longer than Time
            if (restDeci < minRestDeci) {
              setRestartTimeValidationError(true);
              return;
            }
          }
        }
      }

      const payload = {
        plannerType: 'aerobic',
        activeField,
        restChoice,
        breakChoice,
        descriptionInstructions,
        rows: filledRows
      };

      const notes = upsertFastPlannerDataInNotes(existingMoveframe?.notes, payload);
      const movelaps = buildMovelapsFromRows(filledRows);
      const description = buildDescription(filledRows);

      onSave({
        sport,
        sectionId,
        description,
        type: 'BATTERY',
        uploadToWorkout,
        notes,
        fastPlannerData: payload,
        movelaps,
        isFastPlannerBased: true
      });
    };

    React.useImperativeHandle(ref, () => ({
      saveMoveframe: () => handleSaveMoveframe(false),
      saveMoveframeAndMovelaps: () => handleSaveMoveframe(true),
      openPreferences: () => setShowPreferences(true)
    }));

    const ensureRow = () => {
      const nextId = Math.max(0, ...rows.map((r) => r.id)) + 1;
      const defaultStyle = styleChoices.length > 0 ? styleChoices[0] : '';
      setRows((prev) => [...prev, { ...defaultRow(nextId), style: defaultStyle }]);
    };

    const deleteRow = (rowId: number) => {
      setRows((prev) => prev.filter((r) => r.id !== rowId));
      setSelectedCell((prev) => (prev?.rowId === rowId ? null : prev));
      if (lastSelectedRowIdRef.current === rowId) lastSelectedRowIdRef.current = null;
    };

    const rowHasData = (r: AerobicPlannerRow) =>
      (r.distance || '').trim() !== '' ||
      (r.style || '').trim() !== '' ||
      (r.speed || '').trim() !== '' ||
      (r.strokes || '').trim() !== '' ||
      (r.watts || '').trim() !== '' ||
      (r.time || '').trim() !== '' ||
      (r.rest || '').trim() !== '' ||
      (r.break || '').trim() !== '' ||
      (r.note || '').trim() !== '';

    const duplicateCurrentRow = (count: number) => {
      const source = selectedRow;
      if (!source || count < 1) return;
      setRows((prev) => {
        const nextId = Math.max(0, ...prev.map((r) => r.id)) + 1;
        const copies: AerobicPlannerRow[] = [];
        for (let i = 0; i < count; i++) {
          const { id: _id, ...rest } = source;
          copies.push({ ...rest, id: nextId + i } as AerobicPlannerRow);
        }
        return [...prev, ...copies];
      });
    };

    const removeLastRowWithData = () => {
      const lastWithData = [...rows].reverse().find(rowHasData);
      if (!lastWithData) return;
      deleteRow(lastWithData.id);
    };

    const resetAll = () => {
      if (!confirm('Reset all rows? This cannot be undone.')) return;
      setRows([defaultRow(1)]);
      setSelectedCell(null);
      lastSelectedRowIdRef.current = null;
    };

    const duplicateSelectedRow = (copies: number) => {
      if (!selectedRow || copies < 1) return;
      const nextId = Math.max(0, ...rows.map((r) => r.id)) + 1;
      const newRows = Array.from({ length: copies }, (_, i) => ({
        ...selectedRow,
        id: nextId + i
      }));
      setRows((prev) => [...prev, ...newRows]);
    };

    const removeLastFilledRow = () => {
      let idx = -1;
      for (let i = rows.length - 1; i >= 0; i--) {
        if (isRowFilled(rows[i])) {
          idx = i;
          break;
        }
      }
      if (idx < 0) return;
      deleteRow(rows[idx].id);
    };

    const resetAllRows = () => {
      if (!window.confirm('Reset all rows? This will clear all data in the table.')) return;
      const defaultStyle = styleChoices.length > 0 ? styleChoices[0] : '';
      setRows([
        { ...defaultRow(1), style: defaultStyle },
        { ...defaultRow(2), style: defaultStyle },
        { ...defaultRow(3), style: defaultStyle },
        { ...defaultRow(4), style: defaultStyle }
      ]);
      setSelectedCell(null);
      setRestartTimeValidationError(false);
    };

    const onCellClick = (rowId: number, field: keyof AerobicPlannerRow) => {
      lastSelectedRowIdRef.current = rowId;
      const row = rows.find((r) => r.id === rowId);
      if (field === 'restChoice') {
        if (row) setRestChoice(row.restChoice);
        setSelectedCell({ rowId, field: 'rest' });
        setActiveFieldAndRef('rest');
        return;
      }
      if (field === 'breakChoice') {
        if (row) setBreakChoice(row.breakChoice);
        setSelectedCell({ rowId, field: 'break' });
        setActiveFieldAndRef('break');
        return;
      }

      setSelectedCell({ rowId, field });
      if (field === 'rest') {
        if (row) setRestChoice(row.restChoice);
        setActiveFieldAndRef('rest');
      } else if (field === 'break') {
        if (row) setBreakChoice(row.breakChoice);
        setActiveFieldAndRef('break');
      }
      else if (field === 'distance') setActiveFieldAndRef('distance');
      else if (field === 'style') setActiveFieldAndRef('style');
      else if (field === 'speed') setActiveFieldAndRef('speed');
      else if (field === 'strokes') setActiveFieldAndRef('strokes');
      else if (field === 'watts') setActiveFieldAndRef('watts');
      else if (field === 'time') setActiveFieldAndRef('time');
    };

    const setToolbarRestChoice = (choice: RestChoice) => {
      setRestChoice(choice);
      setActiveFieldAndRef('rest');
      if (!selectedCell) return;
      setRows((prev) => prev.map((r) => (r.id === selectedCell.rowId ? { ...r, restChoice: choice } : r)));
    };

    const setToolbarBreakChoice = (choice: BreakChoice) => {
      setBreakChoice(choice);
      setActiveFieldAndRef('break');
      if (!selectedCell) return;
      setRows((prev) =>
        prev.map((r) => {
          if (r.id !== selectedCell.rowId) return r;
          if (choice === 'stopped') return { ...r, breakChoice: 'stopped', break: 'Stopped' };
          return { ...r, breakChoice: choice };
        })
      );
    };

    const restChoiceLabel = (choice: RestChoice) => {
      if (choice === 'restart_to') return 'Restart to';
      if (choice === 'reset_pulse') return 'Rest. pulse';
      return 'Rest Time';
    };

    const breakChoiceLabel = (choice: BreakChoice) => {
      if (choice === 'speed') return 'Speed';
      if (choice === 'watts') return 'Watts';
      return 'Stopped';
    };

    const durationTheme = {
      box: 'border-yellow-400 bg-yellow-50',
      header: 'bg-yellow-100 text-yellow-900 border-yellow-200',
      active: 'bg-yellow-600 text-white border-yellow-600',
      inactive: 'bg-white text-yellow-900 border-yellow-300 hover:bg-yellow-50'
    };

    const intensityTheme = {
      box: 'border-blue-400 bg-blue-50',
      header: 'bg-blue-100 text-blue-900 border-blue-200',
      active: 'bg-blue-600 text-white border-blue-600',
      inactive: 'bg-white text-blue-900 border-blue-300 hover:bg-blue-50'
    };

    const breakTheme = {
      box: 'border-green-400 bg-green-50',
      header: 'bg-green-100 text-green-900 border-green-200',
      active: 'bg-green-600 text-white border-green-600',
      inactive: 'bg-white text-green-900 border-green-300 hover:bg-green-50'
    };

    const breakTypeTheme = {
      box: 'border-lime-400 bg-lime-50',
      header: 'bg-lime-100 text-lime-900 border-lime-200',
      active: 'bg-lime-600 text-white border-lime-600',
      inactive: 'bg-white text-lime-900 border-lime-300 hover:bg-lime-50'
    };

    const chipButtonClass = 'px-2 py-1 text-xs border border-gray-300 rounded bg-white hover:bg-gray-50 whitespace-nowrap';

    const sensors = useSensors(useSensor(SafePointerSensor, { activationConstraint: { distance: 6 } }));

    const handleDragEnd = (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      setRows((prev) => {
        const oldIndex = prev.findIndex((r) => r.id === active.id);
        const newIndex = prev.findIndex((r) => r.id === over.id);
        if (oldIndex === -1 || newIndex === -1) return prev;
        return arrayMove(prev, oldIndex, newIndex);
      });
    };

    const SortableRow = ({ row, rowIndex }: { row: AerobicPlannerRow; rowIndex: number }) => {
      const { attributes, listeners, setNodeRef, transform, transition, isDragging, setActivatorNodeRef } = useSortable({
        id: row.id,
        disabled: isNoteEditing
      });

      const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : undefined
      };

      return (
        <tr ref={setNodeRef} style={style} className={selectedRow?.id === row.id ? 'bg-blue-50' : ''}>
          <td className="border-t border-gray-200 px-1 py-0.5 text-center font-semibold">
            <div className="flex items-center justify-center gap-1">
              <span className="text-[11px]">{rowIndex + 1}</span>
              <button
                ref={setActivatorNodeRef}
                type="button"
                {...attributes}
                {...listeners}
                data-dnd-handle="true"
                className="w-5 h-5 border border-gray-300 rounded bg-white hover:bg-gray-50 cursor-grab active:cursor-grabbing flex items-center justify-center select-none"
                aria-label="Drag to reorder"
              >
                ⠿
              </button>
            </div>
          </td>
          <td className="border-t border-gray-200 px-1 py-1 text-center">
            <button
              type="button"
              onClick={() => onCellClick(row.id, 'distance')}
              className="w-full border border-gray-300 rounded px-1.5 py-0.5 bg-white text-left truncate"
            >
              {row.distance || ''}
            </button>
          </td>
          <td className="border-t border-gray-200 px-1 py-1 text-center">
            <button
              type="button"
              onClick={() => onCellClick(row.id, 'style')}
              className="w-full border border-gray-300 rounded px-1.5 py-0.5 bg-white text-left truncate"
            >
              {row.style || ''}
            </button>
          </td>
          <td className="border-t border-gray-200 px-1 py-1 text-center">
            <button
              type="button"
              onClick={() => onCellClick(row.id, 'speed')}
              className="w-full border border-gray-300 rounded px-1.5 py-0.5 bg-white text-left truncate"
            >
              {row.speed || ''}
            </button>
          </td>
          <td className="border-t border-gray-200 px-1 py-1 text-center">
            <button
              type="button"
              onClick={() => onCellClick(row.id, 'strokes')}
              className="w-full border border-gray-300 rounded px-1.5 py-0.5 bg-white text-left truncate"
            >
              {row.strokes || ''}
            </button>
          </td>
          <td className="border-t border-gray-200 px-1 py-1 text-center">
            <button
              type="button"
              onClick={() => onCellClick(row.id, 'watts')}
              className="w-full border border-gray-300 rounded px-1.5 py-0.5 bg-white text-left truncate"
            >
              {row.watts || ''}
            </button>
          </td>
          <td className="border-t border-gray-200 px-1 py-1 text-center">
            <button
              type="button"
              onClick={() => onCellClick(row.id, 'time')}
              className="w-full border border-gray-300 rounded px-1.5 py-0.5 bg-white text-left font-mono truncate"
            >
              {row.time || ''}
            </button>
          </td>
          <td className="border-t border-gray-200 px-1 py-1 text-center">
            <button
              type="button"
              onClick={() => onCellClick(row.id, 'restChoice')}
              className="w-full border border-gray-300 rounded px-1.5 py-0.5 bg-white text-left truncate"
            >
              {restChoiceLabel(row.restChoice)}
            </button>
          </td>
          <td className="border-t border-gray-200 px-1 py-1 text-center">
            <button
              type="button"
              onClick={() => onCellClick(row.id, 'rest')}
              className="w-full border border-gray-300 rounded px-1.5 py-0.5 bg-white text-left font-mono truncate"
            >
              {row.restChoice === 'restart_to'
                ? formatTime(row.rest || '')
                : row.restChoice === 'rest_time'
                ? formatPauseInput(row.rest || '')
                : row.rest || ''}
            </button>
          </td>
          <td className="border-t border-gray-200 px-1 py-1 text-center">
            <button
              type="button"
              onClick={() => onCellClick(row.id, 'breakChoice')}
              className="w-full border border-gray-300 rounded px-1.5 py-0.5 bg-white text-left truncate"
            >
              {breakChoiceLabel(row.breakChoice)}
            </button>
          </td>
          <td className="border-t border-gray-200 px-1 py-1 text-center">
            <button
              type="button"
              onClick={() => onCellClick(row.id, 'break')}
              className="w-full border border-gray-300 rounded px-1.5 py-0.5 bg-white text-left truncate"
            >
              {row.break || ''}
            </button>
          </td>
          <td className="border-t border-gray-200 px-2 py-1.5 bg-amber-50/80 align-top">
            <label className="block text-xs font-semibold text-amber-900 mb-1">Note</label>
            <input
              type="text"
              defaultValue={row.note}
              onFocus={() => {
                setIsNoteEditing(true);
              }}
              onBlur={(e) => {
                setIsNoteEditing(false);
                const nextValue = e.currentTarget.value;
                setRows((prev) => prev.map((x) => (x.id === row.id ? { ...x, note: nextValue } : x)));
              }}
              onPaste={(e) => {
                const html = e.clipboardData?.getData('text/html');
                if (!html) return;
                e.preventDefault();
                const target = e.currentTarget;
                const start = target.selectionStart ?? 0;
                const end = target.selectionEnd ?? 0;
                const currentValue = target.value ?? '';
                const nextValue = `${currentValue.slice(0, start)}${html}${currentValue.slice(end)}`;
                target.value = nextValue;
                requestAnimationFrame(() => {
                  target.selectionStart = start + html.length;
                  target.selectionEnd = start + html.length;
                });
              }}
              className="w-full border-2 border-amber-500 bg-amber-50 rounded px-2 py-1.5 text-sm font-medium placeholder:text-amber-700/70 focus:ring-2 focus:ring-amber-400 focus:border-amber-600 min-h-[36px]"
              placeholder="Note"
            />
          </td>
        </tr>
      );
    };

    const rowActionButtons = (
      <div className="flex items-center justify-end gap-2 flex-wrap">
        <button type="button" onClick={() => selectedRow && duplicateSelectedRow(1)} disabled={!selectedRow} className="px-3 py-1.5 text-xs border border-gray-300 rounded bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed" title="Duplicate selected row to the end">Duplicate +1</button>
        <button type="button" onClick={() => selectedRow && duplicateSelectedRow(2)} disabled={!selectedRow} className="px-3 py-1.5 text-xs border border-gray-300 rounded bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed" title="Add 2 copies of selected row to the end">Triplicate +2</button>
        <button type="button" onClick={() => selectedRow && duplicateSelectedRow(3)} disabled={!selectedRow} className="px-3 py-1.5 text-xs border border-gray-300 rounded bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed" title="Add 3 copies of selected row to the end">Quadruplicate +3</button>
        <button type="button" onClick={removeLastFilledRow} disabled={!rows.some(isRowFilled)} className="px-3 py-1.5 text-xs border border-gray-300 rounded bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed" title="Remove the last row that has data">Remove last</button>
        <button type="button" onClick={resetAllRows} className="px-3 py-1.5 text-xs border border-red-300 rounded bg-red-50 text-red-800 hover:bg-red-100" title="Clear all rows (with confirmation)">Reset all</button>
        <button type="button" onClick={ensureRow} className="px-3 py-1.5 text-xs border border-gray-300 rounded bg-white hover:bg-gray-50">Add row</button>
        <button type="button" onClick={() => (selectedRow ? deleteRow(selectedRow.id) : null)} disabled={!selectedRow} className="px-3 py-1.5 text-xs border border-gray-300 rounded bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">Delete selected</button>
      </div>
    );

    return (
      <>
      <div className={`p-4 bg-gray-50 border border-gray-200 rounded-lg flex flex-col flex-1 min-h-0`}>
        {fullView && <div className="sticky top-0 z-10 flex-shrink-0 mb-2 px-2 py-2 bg-gray-50 border border-gray-200 rounded shadow-sm">{rowActionButtons}</div>}
        {!fullView && <p className="text-[10px] text-amber-700 mb-1 font-medium">Section below stays on screen during scroll – only the table rows move.</p>}
        <div className={`flex-1 min-h-0 overflow-x-auto border border-gray-200 rounded bg-white ${fullView ? 'overflow-y-visible' : 'overflow-y-auto'}`}>
          {!fullView && (
          <div className="sticky top-0 z-10 bg-gray-50 pt-1 pb-2 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
        <div className="mb-3">
          <div className="grid grid-cols-1 lg:grid-cols-7 gap-2">
            <div className={`border rounded ${durationTheme.box} lg:col-span-1`}>
              <div className={`text-[11px] font-semibold px-2 py-1 border-b ${durationTheme.header}`}>Duration &amp; Mode</div>
              <div className="grid grid-cols-2 gap-1 p-1.5">
                <button type="button" onClick={() => setActiveFieldAndRef('distance')} className={`w-full px-2 py-1 text-xs border rounded ${activeField === 'distance' ? durationTheme.active : durationTheme.inactive}`}>Distance</button>
                <button type="button" onClick={() => setActiveFieldAndRef('style')} className={`w-full px-2 py-1 text-xs border rounded ${activeField === 'style' ? durationTheme.active : durationTheme.inactive}`}>Style</button>
              </div>
            </div>

            <div className={`border rounded ${intensityTheme.box} lg:col-span-2`}>
              <div className={`text-[11px] font-semibold px-2 py-1 border-b ${intensityTheme.header}`}>Intensity of work</div>
              <div className="grid grid-cols-4 gap-1 p-1.5">
                <button type="button" onClick={() => setActiveFieldAndRef('speed')} className={`w-full px-2 py-1 text-xs border rounded ${activeField === 'speed' ? intensityTheme.active : intensityTheme.inactive}`}>Speed</button>
                <button type="button" onClick={() => setActiveFieldAndRef('strokes')} className={`w-full px-2 py-1 text-xs border rounded ${activeField === 'strokes' ? intensityTheme.active : intensityTheme.inactive}`}>Strokes</button>
                <button type="button" onClick={() => setActiveFieldAndRef('watts')} className={`w-full px-2 py-1 text-xs border rounded ${activeField === 'watts' ? intensityTheme.active : intensityTheme.inactive}`}>Watts</button>
                <button type="button" onClick={() => setActiveFieldAndRef('time')} className={`w-full px-2 py-1 text-xs border rounded ${activeField === 'time' ? intensityTheme.active : intensityTheme.inactive}`}>Time</button>
              </div>
            </div>

            <div className={`border rounded ${breakTheme.box} lg:col-span-2`}>
              <div className={`text-[11px] font-semibold px-2 py-1 border-b ${breakTheme.header}`}>Break between rehearsals</div>
              <div className={`grid gap-1 p-1.5 ${restChoices.length === 1 ? 'grid-cols-1' : restChoices.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                {restChoices.map((choice) => (
                  <button
                    key={choice.choice}
                    type="button"
                    onClick={() => setToolbarRestChoice(choice.choice)}
                    className={`w-full px-2 py-1 text-xs border rounded ${activeField === 'rest' && restChoice === choice.choice ? breakTheme.active : breakTheme.inactive}`}
                  >
                    {choice.label}
                  </button>
                ))}
              </div>
            </div>

            <div className={`border rounded ${breakTypeTheme.box} lg:col-span-2`}>
              <div className={`text-[11px] font-semibold px-2 py-1 border-b ${breakTypeTheme.header}`}>Break type between rehearsals</div>
              <div className="grid grid-cols-3 gap-1 p-1.5">
                <button type="button" onClick={() => setToolbarBreakChoice('stopped')} className={`w-full px-2 py-1 text-xs border rounded ${activeField === 'break' && breakChoice === 'stopped' ? breakTypeTheme.active : breakTypeTheme.inactive}`}>Stopped</button>
                <button type="button" onClick={() => setToolbarBreakChoice('speed')} className={`w-full px-2 py-1 text-xs border rounded ${activeField === 'break' && breakChoice === 'speed' ? breakTypeTheme.active : breakTypeTheme.inactive}`}>Speed</button>
                <button type="button" onClick={() => setToolbarBreakChoice('watts')} className={`w-full px-2 py-1 text-xs border rounded ${activeField === 'break' && breakChoice === 'watts' ? breakTypeTheme.active : breakTypeTheme.inactive}`}>Watts</button>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-3 border border-gray-300 bg-white rounded p-2 overflow-x-auto">
          <div className="flex items-start gap-3">
            <div className="min-w-[140px]">
              {activeField === 'strokes' && (
                <div className="flex flex-wrap items-center gap-2">
                  <NumberInputWithArrows
                    value={selectedRow?.strokes || ''}
                    min={0}
                    max={999}
                    onApply={(v) => applyInputToSelection(v)}
                  />
                  <div className="flex gap-1 flex-wrap">
                    {valueChips.map((chip: string) => (
                      <button key={chip} type="button" onClick={() => applyChipToSelection(chip)} className={chipButtonClass}>
                        {chip}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {activeField === 'watts' && (
                <div className="flex flex-wrap items-center gap-2">
                  <NumberInputWithArrows
                    value={selectedRow?.watts || ''}
                    min={0}
                    max={999}
                    onApply={(v) => applyInputToSelection(v)}
                  />
                  <div className="flex gap-1 flex-wrap">
                    {valueChips.map((chip: string) => (
                      <button key={chip} type="button" onClick={() => applyChipToSelection(chip)} className={chipButtonClass}>
                        {chip}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {activeField === 'time' ? (
                <input
                  type="text"
                  value={selectedRow?.time || ''}
                  onChange={(e) => applyInputToSelection(e.target.value)}
                  onBlur={(e) => applyInputToSelection(formatTime(e.target.value))}
                  className="w-40 border border-gray-300 rounded px-2 py-1 text-xs font-mono"
                  placeholder="e.g. 12345 → 12'34&quot;5"
                />
              ) : null}
              {activeField === 'rest' && restChoice === 'restart_to' && (
                <input
                  type="text"
                  value={selectedRow?.rest || ''}
                  onChange={(e) => applyInputToSelection(e.target.value)}
                  onBlur={(e) => {
                    const targetRowId = selectedRow?.id ?? rows[0]?.id;
                    return targetRowId ? handleRestartToBlur(targetRowId, e.target.value) : null;
                  }}
                  className="w-40 border border-gray-300 rounded px-2 py-1 text-xs font-mono"
                  placeholder={"e.g. 12345 → 12'34\"5 (must be > Time by 3\")"}
                  title={"Restart to: same format as Time; must be at least 3\" longer than Time"}
                />
              )}
              {activeField === 'rest' && restChoice === 'reset_pulse' && (
                <NumberInputWithArrows
                  value={selectedRow?.rest || ''}
                  min={60}
                  max={220}
                  onApply={(v) => applyInputToSelection(v)}
                />
              )}
              {activeField === 'break' && breakChoice === 'watts' && (
                <NumberInputWithArrows
                  value={selectedRow?.break || ''}
                  min={0}
                  max={999}
                  onApply={(v) => applyInputToSelection(v)}
                />
              )}
              {activeField !== 'strokes' &&
                activeField !== 'watts' &&
                activeField !== 'time' &&
                !(activeField === 'rest' && restChoice === 'restart_to') &&
                !(activeField === 'rest' && restChoice === 'reset_pulse') &&
                !(activeField === 'break' && breakChoice === 'watts') && (
                  <div className="flex gap-2 items-center min-w-max">
                    {valueChips.map((chip: string) => (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => applyChipToSelection(chip)}
                        className={chipButtonClass}
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                )}
            </div>
            {fieldHelp && (
              <div className="flex-1 border border-gray-200 bg-gray-50 rounded px-2 py-1">
                <div className="text-[11px] font-semibold text-gray-700">{fieldHelp.title}</div>
                <div className="text-[11px] text-gray-700">Description: {fieldHelp.basic}</div>
                <div className="text-[11px] text-gray-500">Advanced: {fieldHelp.advanced}</div>
              </div>
            )}
          </div>
        </div>

        <div className="mb-2">{rowActionButtons}</div>
          </div>
        )}

        <div className="border border-gray-300 bg-white rounded overflow-hidden border-t-0 rounded-t-none">
          <div className="overflow-x-auto">
            <table className="w-full text-[11px] table-fixed min-w-[1200px]">
              <colgroup>
                <col className="w-[56px]" />
                <col className="w-[70px]" />
                <col className="w-[110px]" />
                <col className="w-[100px]" />
                <col className="w-[80px]" />
                <col className="w-[80px]" />
                <col className="w-[110px]" />
                <col className="w-[110px]" />
                <col className="w-[110px]" />
                <col className="w-[110px]" />
                <col className="w-[110px]" />
                <col className="w-[280px]" />
              </colgroup>
              <thead className="sticky z-[9] bg-gray-100 shadow-[0_1px_0_0_rgba(0,0,0,0.1)]" style={{ top: '14rem' }}>
                <tr>
                  <th rowSpan={2} className="border-b border-r border-gray-300 px-1.5 py-1.5 text-center bg-gray-100">#</th>
                  <th colSpan={2} className={`border-b border-r border-gray-300 px-1.5 py-1.5 text-center ${durationTheme.header}`}>Duration &amp; Mode</th>
                  <th colSpan={4} className={`border-b border-r border-gray-300 px-1.5 py-1.5 text-center ${intensityTheme.header}`}>Intensity of work</th>
                  <th colSpan={2} className={`border-b border-r border-gray-300 px-1.5 py-1.5 text-center ${breakTheme.header}`}>Break between rehearsals</th>
                  <th colSpan={2} className={`border-b border-r border-gray-300 px-1.5 py-1.5 text-center ${breakTypeTheme.header}`}>Break type between rehearsals</th>
                  <th rowSpan={2} className="border-b border-gray-300 px-2 py-2 text-center bg-amber-200 border-2 border-amber-400 text-amber-900 font-bold text-[13px]">Note</th>
                </tr>
                <tr>
                  <th className={`border-b border-r border-gray-300 px-1 py-1 text-center ${durationTheme.header}`}>Distance</th>
                  <th className={`border-b border-r border-gray-300 px-1 py-1 text-center ${durationTheme.header}`}>Style</th>
                  <th className={`border-b border-r border-gray-300 px-1 py-1 text-center ${intensityTheme.header}`}>Speed</th>
                  <th className={`border-b border-r border-gray-300 px-1 py-1 text-center ${intensityTheme.header}`}>Strokes</th>
                  <th className={`border-b border-r border-gray-300 px-1 py-1 text-center ${intensityTheme.header}`}>Watts</th>
                  <th className={`border-b border-r border-gray-300 px-1 py-1 text-center ${intensityTheme.header}`}>Time</th>
                  <th className={`border-b border-r border-gray-300 px-1 py-1 text-center ${breakTheme.header}`}>Rest Type</th>
                  <th className={`border-b border-r border-gray-300 px-1 py-1 text-center ${breakTheme.header}`}>Rest</th>
                  <th className={`border-b border-r border-gray-300 px-1 py-1 text-center ${breakTypeTheme.header}`}>Break type</th>
                  <th className={`border-b border-r border-gray-300 px-1 py-1 text-center ${breakTypeTheme.header}`}>Break</th>
                </tr>
              </thead>
            </table>
          </div>
        </div>
        </div>

        <div className="border border-gray-300 bg-white rounded overflow-hidden border-t-0 rounded-t-none -mt-px">
          <div className="overflow-x-auto">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <table className="w-full text-[11px] table-fixed min-w-[1200px]">
                <colgroup>
                  <col className="w-[56px]" />
                  <col className="w-[70px]" />
                  <col className="w-[110px]" />
                  <col className="w-[100px]" />
                  <col className="w-[80px]" />
                  <col className="w-[80px]" />
                  <col className="w-[110px]" />
                  <col className="w-[110px]" />
                  <col className="w-[110px]" />
                  <col className="w-[110px]" />
                  <col className="w-[110px]" />
                  <col className="w-[280px]" />
                </colgroup>
                <thead className="sticky z-[9] bg-gray-100 shadow-[0_1px_0_0_rgba(0,0,0,0.1)]" style={{ top: '14rem' }}>
                  <tr>
                    <th rowSpan={2} className="border-b border-r border-gray-300 px-1.5 py-1.5 text-center bg-gray-100">#</th>
                    <th colSpan={2} className={`border-b border-r border-gray-300 px-1.5 py-1.5 text-center ${durationTheme.header}`}>Duration &amp; Mode</th>
                    <th colSpan={4} className={`border-b border-r border-gray-300 px-1.5 py-1.5 text-center ${intensityTheme.header}`}>Intensity of work</th>
                    <th colSpan={2} className={`border-b border-r border-gray-300 px-1.5 py-1.5 text-center ${breakTheme.header}`}>Break between rehearsals</th>
                    <th colSpan={2} className={`border-b border-r border-gray-300 px-1.5 py-1.5 text-center ${breakTypeTheme.header}`}>Break type between rehearsals</th>
                    <th rowSpan={2} className="border-b border-gray-300 px-2 py-2 text-center bg-amber-200 border-2 border-amber-400 text-amber-900 font-bold text-[13px]">Note</th>
                  </tr>
                  <tr>
                    <th className={`border-b border-r border-gray-300 px-1 py-1 text-center ${durationTheme.header}`}>Distance</th>
                    <th className={`border-b border-r border-gray-300 px-1 py-1 text-center ${durationTheme.header}`}>Style</th>
                    <th className={`border-b border-r border-gray-300 px-1 py-1 text-center ${intensityTheme.header}`}>Speed</th>
                    <th className={`border-b border-r border-gray-300 px-1 py-1 text-center ${intensityTheme.header}`}>Strokes</th>
                    <th className={`border-b border-r border-gray-300 px-1 py-1 text-center ${intensityTheme.header}`}>Watts</th>
                    <th className={`border-b border-r border-gray-300 px-1 py-1 text-center ${intensityTheme.header}`}>Time</th>
                    <th className={`border-b border-r border-gray-300 px-1 py-1 text-center ${breakTheme.header}`}>Rest Type</th>
                    <th className={`border-b border-r border-gray-300 px-1 py-1 text-center ${breakTheme.header}`}>Rest</th>
                    <th className={`border-b border-r border-gray-300 px-1 py-1 text-center ${breakTypeTheme.header}`}>Break type</th>
                    <th className={`border-b border-r border-gray-300 px-1 py-1 text-center ${breakTypeTheme.header}`}>Break</th>
                  </tr>
                </thead>
                <tbody>
                  <SortableContext items={rows.map((r) => r.id)} strategy={verticalListSortingStrategy}>
                    {rows.map((r, rowIndex) => (
                      <SortableRow key={r.id} row={r} rowIndex={rowIndex} />
                    ))}
                  </SortableContext>
                </tbody>
              </table>
            </DndContext>
          </div>
        </div>

        {!fullView && restartTimeValidationError && (
          <div className="mt-2 px-3 py-2 rounded bg-gray-900 text-white text-sm">
            This cannot be possible - Restart to MUST BE ALWAYS &gt; OF Time ( at least 3&quot; )
          </div>
        )}

        {!fullView && (
        <p className="mt-2 text-[10px] text-blue-600">
          Scroll to view all repetitions. Each can have unique speed, time, and pause values.
        </p>
        )}

        {!fullView && (
        <div className="mt-4 p-4 rounded-lg border-2 border-amber-400 bg-amber-50/90 shadow-sm space-y-2">
          <label className="block text-base font-bold text-amber-900 mb-2">Description &amp; Analysis/Notes</label>
          <pre
            className="w-full px-3 py-2 text-sm bg-amber-100/80 border border-amber-200 rounded text-amber-900 whitespace-pre-wrap font-sans resize-none"
            aria-readonly
          >
            {aerobicSummaryText}
          </pre>
          <textarea
            value={descriptionInstructions}
            onChange={(e) => setDescriptionInstructions(e.target.value)}
            className="w-full min-h-[90px] px-3 py-2 text-sm border-2 border-amber-200 rounded bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-400"
            placeholder="Write descriptions and instructions..."
          />
        </div>
        )}

        </div>

        {showPreferences && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="w-full max-w-lg bg-white rounded-lg border border-gray-200 shadow-xl">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                <div className="text-sm font-semibold text-gray-800">Preferences</div>
                <button
                  type="button"
                  onClick={() => setShowPreferences(false)}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded bg-white hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
              <div className="px-4 py-4 text-sm text-gray-700">
                Preferences for aerobic fast planning will be added here.
              </div>
            </div>
          </div>
        )}
      </>
    );
  }
);

export default AerobicFastPlannerOfMoveframes;

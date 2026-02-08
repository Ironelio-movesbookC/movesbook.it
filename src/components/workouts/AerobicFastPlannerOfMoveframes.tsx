'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
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

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const AerobicFastPlannerOfMoveframes = React.forwardRef<FastPlannerHandle, AerobicFastPlannerProps>(
  function AerobicFastPlannerOfMoveframes({ sport, sectionId, workout: _workout, day: _day, mode, existingMoveframe, onSave, onCancel }, ref) {
    const sportConfig = useMemo(() => getSportConfig(sport as any), [sport]);
    const [rows, setRows] = useState<AerobicPlannerRow[]>([defaultRow(1), defaultRow(2), defaultRow(3), defaultRow(4)]);
    const [selectedCell, setSelectedCell] = useState<{ rowId: number; field: keyof AerobicPlannerRow } | null>(null);
    const [activeField, setActiveField] = useState<ActiveField>('distance');
    const [restChoice, setRestChoice] = useState<RestChoice>('rest_time');
    const [breakChoice, setBreakChoice] = useState<BreakChoice>('stopped');
    const [descriptionInstructions, setDescriptionInstructions] = useState('');
    const [showPreferences, setShowPreferences] = useState(false);
    const [isNoteEditing, setIsNoteEditing] = useState(false);

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
      if (parsed.activeField) setActiveField(parsed.activeField);
      if (parsed.restChoice) setRestChoice(parsed.restChoice);
      if (parsed.breakChoice) setBreakChoice(parsed.breakChoice);
      if (typeof parsed.descriptionInstructions === 'string') setDescriptionInstructions(parsed.descriptionInstructions);
    }, [mode, existingMoveframe]);

    const setRowField = (rowId: number, field: keyof AerobicPlannerRow, value: string) => {
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
          basic: 'Type digits and blur to format, e.g. 123456 → 1h23\'45"6.',
          advanced: 'Format is h:mm\'ss"d and is applied on blur.'
        };
      }
      if (activeField === 'rest' && restChoice === 'restart_to') {
        return {
          title: 'Restart to',
          basic: 'Enter time using the same format; it must be at least 5" longer than Time.',
          advanced: 'If the value is below Time + 5", it auto-adjusts to the minimum valid value.'
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
        return [];
      }
      return [];
    }, [activeField, breakChoice, restChoice, distanceChoices, styleChoices, speedChoices, sport]);

    const applyChipToSelection = (value: string) => {
      const fallbackRowId = selectedCell?.rowId ?? rows[0]?.id;
      if (!fallbackRowId) return;
      const targetField = activeField === 'rest' ? 'rest' : activeField === 'break' ? 'break' : activeField;
      setRowField(fallbackRowId, targetField as keyof AerobicPlannerRow, value);
      setSelectedCell({ rowId: fallbackRowId, field: targetField as keyof AerobicPlannerRow });
    };

    const formatTime = (value: string): string => {
      if (!value) return '';
      if (/^\d+h\d{2}'\d{2}"\d$/.test(value)) return value;
      const digits = value.replace(/\D/g, '');
      if (!digits) return '';
      const len = digits.length;
      if (len === 1) return `0h00'00"${digits}`;
      if (len === 2) return `0h00'0${digits[0]}"${digits[1]}`;
      if (len === 3) return `0h00'${digits.slice(0, 2)}"${digits[2]}`;
      if (len === 4) return `0h0${digits[0]}'${digits.slice(1, 3)}"${digits[3]}`;
      if (len === 5) return `0h${digits.slice(0, 2)}'${digits.slice(2, 4)}"${digits[4]}`;
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
      const match = formatted.match(/^(\d+)h(\d{2})'(\d{2})"(\d)$/);
      if (!match) return null;
      const hours = parseInt(match[1]);
      const minutes = parseInt(match[2]);
      const seconds = parseInt(match[3]);
      const deci = parseInt(match[4]);
      return ((hours * 3600 + minutes * 60 + seconds) * 10) + deci;
    };

    const formatDeciseconds = (value: number): string => {
      const totalSeconds = Math.max(0, Math.floor(value / 10));
      const deci = Math.max(0, value % 10);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      return `${hours}h${String(minutes).padStart(2, '0')}'${String(seconds).padStart(2, '0')}"${deci}`;
    };

    const applyInputToSelection = (value: string) => {
      const fallbackRowId = selectedCell?.rowId ?? rows[0]?.id;
      if (!fallbackRowId) return;
      const targetField = activeField === 'rest' ? 'rest' : activeField === 'break' ? 'break' : activeField;
      setRowField(fallbackRowId, targetField as keyof AerobicPlannerRow, value);
      setSelectedCell({ rowId: fallbackRowId, field: targetField as keyof AerobicPlannerRow });
    };

    const normalizeNumberInput = (value: string, min: number, max: number) => {
      const digits = value.replace(/\D/g, '');
      if (!digits) return '';
      const num = Math.min(max, Math.max(min, parseInt(digits)));
      return String(num);
    };

    const handleRestartToBlur = (rowId: number, value: string) => {
      const formatted = formatTime(value);
      const row = rows.find((r) => r.id === rowId);
      const timeDeci = row?.time ? parseTimeToDeciseconds(row.time) : null;
      const restDeci = parseTimeToDeciseconds(formatted);
      if (timeDeci != null && restDeci != null) {
        const minDeci = timeDeci + 50;
        if (restDeci < minDeci) {
          const corrected = formatDeciseconds(minDeci);
          applyInputToSelection(corrected);
          return;
        }
      }
      applyInputToSelection(formatted);
    };

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
      const base = parts.join('+');
      const extra = typeof descriptionInstructions === 'string' ? descriptionInstructions.trim() : '';
      if (!extra) return base;
      const formatted = escapeHtml(extra).replace(/\r\n/g, '\n').replace(/\n/g, '<br/>');
      return base ? `${base}<br/>${formatted}` : formatted;
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

    const handleSaveMoveframe = (uploadToWorkout: boolean) => {
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
        );

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
      setRows((prev) => [...prev, defaultRow(nextId)]);
    };

    const deleteRow = (rowId: number) => {
      setRows((prev) => prev.filter((r) => r.id !== rowId));
      setSelectedCell((prev) => (prev?.rowId === rowId ? null : prev));
    };

    const onCellClick = (rowId: number, field: keyof AerobicPlannerRow) => {
      const row = rows.find((r) => r.id === rowId);
      if (field === 'restChoice') {
        if (row) setRestChoice(row.restChoice);
        setSelectedCell({ rowId, field: 'rest' });
        setActiveField('rest');
        return;
      }
      if (field === 'breakChoice') {
        if (row) setBreakChoice(row.breakChoice);
        setSelectedCell({ rowId, field: 'break' });
        setActiveField('break');
        return;
      }

      setSelectedCell({ rowId, field });
      if (field === 'rest') {
        if (row) setRestChoice(row.restChoice);
        setActiveField('rest');
      } else if (field === 'break') {
        if (row) setBreakChoice(row.breakChoice);
        setActiveField('break');
      }
      else if (field === 'distance') setActiveField('distance');
      else if (field === 'style') setActiveField('style');
      else if (field === 'speed') setActiveField('speed');
      else if (field === 'strokes') setActiveField('strokes');
      else if (field === 'watts') setActiveField('watts');
      else if (field === 'time') setActiveField('time');
    };

    const setToolbarRestChoice = (choice: RestChoice) => {
      setRestChoice(choice);
      setActiveField('rest');
      if (!selectedCell) return;
      setRows((prev) => prev.map((r) => (r.id === selectedCell.rowId ? { ...r, restChoice: choice } : r)));
    };

    const setToolbarBreakChoice = (choice: BreakChoice) => {
      setBreakChoice(choice);
      setActiveField('break');
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
          <td className="border-t border-gray-200 px-1 py-1">
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
              className="w-full border-2 border-yellow-300 bg-yellow-50 rounded px-1.5 py-0.5 text-[11px]"
            />
          </td>
        </tr>
      );
    };

    return (
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <div className="mb-3">
          <div className="grid grid-cols-1 lg:grid-cols-7 gap-2">
            <div className={`border rounded ${durationTheme.box} lg:col-span-1`}>
              <div className={`text-[11px] font-semibold px-2 py-1 border-b ${durationTheme.header}`}>Duration &amp; Mode</div>
              <div className="grid grid-cols-2 gap-1 p-1.5">
                <button type="button" onClick={() => setActiveField('distance')} className={`w-full px-2 py-1 text-xs border rounded ${activeField === 'distance' ? durationTheme.active : durationTheme.inactive}`}>Distance</button>
                <button type="button" onClick={() => setActiveField('style')} className={`w-full px-2 py-1 text-xs border rounded ${activeField === 'style' ? durationTheme.active : durationTheme.inactive}`}>Style</button>
              </div>
            </div>

            <div className={`border rounded ${intensityTheme.box} lg:col-span-2`}>
              <div className={`text-[11px] font-semibold px-2 py-1 border-b ${intensityTheme.header}`}>Intensity of work</div>
              <div className="grid grid-cols-4 gap-1 p-1.5">
                <button type="button" onClick={() => setActiveField('speed')} className={`w-full px-2 py-1 text-xs border rounded ${activeField === 'speed' ? intensityTheme.active : intensityTheme.inactive}`}>Speed</button>
                <button type="button" onClick={() => setActiveField('strokes')} className={`w-full px-2 py-1 text-xs border rounded ${activeField === 'strokes' ? intensityTheme.active : intensityTheme.inactive}`}>Strokes</button>
                <button type="button" onClick={() => setActiveField('watts')} className={`w-full px-2 py-1 text-xs border rounded ${activeField === 'watts' ? intensityTheme.active : intensityTheme.inactive}`}>Watts</button>
                <button type="button" onClick={() => setActiveField('time')} className={`w-full px-2 py-1 text-xs border rounded ${activeField === 'time' ? intensityTheme.active : intensityTheme.inactive}`}>Time</button>
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
                <input
                  type="number"
                  min={0}
                  max={999}
                  value={selectedRow?.strokes || ''}
                  onChange={(e) => applyInputToSelection(normalizeNumberInput(e.target.value, 0, 999))}
                  className="w-32 border border-gray-300 rounded px-2 py-1 text-xs"
                />
              )}
              {activeField === 'watts' && (
                <input
                  type="number"
                  min={0}
                  max={999}
                  value={selectedRow?.watts || ''}
                  onChange={(e) => applyInputToSelection(normalizeNumberInput(e.target.value, 0, 999))}
                  className="w-32 border border-gray-300 rounded px-2 py-1 text-xs"
                />
              )}
              {activeField === 'time' && (
                <input
                  type="text"
                  value={selectedRow?.time || ''}
                  onChange={(e) => applyInputToSelection(e.target.value)}
                  onBlur={(e) => applyInputToSelection(formatTime(e.target.value))}
                  className="w-40 border border-gray-300 rounded px-2 py-1 text-xs font-mono"
                  placeholder="12345"
                />
              )}
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
                  placeholder="12345"
                />
              )}
              {activeField === 'rest' && restChoice === 'reset_pulse' && (
                <input
                  type="number"
                  min={60}
                  max={220}
                  value={selectedRow?.rest || ''}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '').slice(0, 3);
                    applyInputToSelection(digits);
                  }}
                  onBlur={(e) => applyInputToSelection(normalizeNumberInput(e.target.value, 60, 220))}
                  className="w-32 border border-gray-300 rounded px-2 py-1 text-xs"
                />
              )}
              {activeField === 'break' && breakChoice === 'watts' && (
                <input
                  type="number"
                  min={0}
                  max={999}
                  value={selectedRow?.break || ''}
                  onChange={(e) => applyInputToSelection(normalizeNumberInput(e.target.value, 0, 999))}
                  className="w-32 border border-gray-300 rounded px-2 py-1 text-xs"
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

        <div className="mb-2 flex items-center justify-end gap-2">
          <button type="button" onClick={ensureRow} className="px-3 py-1.5 text-xs border border-gray-300 rounded bg-white hover:bg-gray-50">Add row</button>
          <button
            type="button"
            onClick={() => (selectedRow ? deleteRow(selectedRow.id) : null)}
            disabled={!selectedRow}
            className="px-3 py-1.5 text-xs border border-gray-300 rounded bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Delete selected
          </button>
        </div>

        <div className="border border-gray-300 bg-white rounded overflow-hidden">
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
                  <col className="w-[200px]" />
                </colgroup>
                <thead>
                  <tr>
                    <th rowSpan={2} className="border-b border-r border-gray-300 px-1.5 py-1.5 text-center bg-gray-100">#</th>
                    <th colSpan={2} className={`border-b border-r border-gray-300 px-1.5 py-1.5 text-center ${durationTheme.header}`}>Duration &amp; Mode</th>
                    <th colSpan={4} className={`border-b border-r border-gray-300 px-1.5 py-1.5 text-center ${intensityTheme.header}`}>Intensity of work</th>
                    <th colSpan={2} className={`border-b border-r border-gray-300 px-1.5 py-1.5 text-center ${breakTheme.header}`}>Break between rehearsals</th>
                    <th colSpan={2} className={`border-b border-r border-gray-300 px-1.5 py-1.5 text-center ${breakTypeTheme.header}`}>Break type between rehearsals</th>
                    <th rowSpan={2} className="border-b border-gray-300 px-1.5 py-1.5 text-center bg-gray-100">Note</th>
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

        <p className="mt-2 text-[10px] text-blue-600">
          Scroll to view all repetitions. Each can have unique speed, time, and pause values.
        </p>

        <div className="mt-3">
          <label className="block text-xs font-semibold text-gray-700 mb-1">Description &amp; Instructions</label>
          <textarea
            value={descriptionInstructions}
            onChange={(e) => setDescriptionInstructions(e.target.value)}
            className="w-full min-h-[90px] px-3 py-2 text-sm border border-gray-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Write descriptions and instructions..."
          />
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
      </div>
    );
  }
);

export default AerobicFastPlannerOfMoveframes;

'use client';

import React, { useEffect, useMemo, useState } from 'react';
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

    useEffect(() => {
      if (mode !== 'edit' || !existingMoveframe) return;
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

    const valueChips = useMemo(() => {
      if (activeField === 'distance') {
        return distanceOptions();
      }
      if (activeField === 'style') {
        const styles = Array.isArray((sportConfig as any)?.styles) ? ((sportConfig as any).styles as any[]) : [];
        return styles.map(String);
      }
      if (activeField === 'speed') {
        const speeds = Array.isArray((sportConfig as any)?.speeds) ? ((sportConfig as any).speeds as any[]) : [];
        return speeds.map(String);
      }
      if (activeField === 'strokes') return strokeOptions();
      if (activeField === 'watts') return wattsOptions();
      if (activeField === 'time') return chipTimes();
      if (activeField === 'rest') {
        const type = restTypeFromChoice(restChoice);
        const options = getPauseOptions(sport as any, type);
        if (Array.isArray(options)) return options.map(String);
        if (restChoice === 'restart_to') return chipTimes();
        if (restChoice === 'reset_pulse') {
          const out: string[] = [];
          for (let v = 60; v <= 200; v += 10) out.push(String(v));
          return out;
        }
        return [];
      }
      if (activeField === 'break') {
        if (breakChoice === 'stopped') return ['Stopped'];
        if (breakChoice === 'speed') {
          const speeds = Array.isArray((sportConfig as any)?.speeds) ? ((sportConfig as any).speeds as any[]) : [];
          return speeds.map(String);
        }
        return wattsOptions();
      }
      return [];
    }, [activeField, breakChoice, restChoice, sport, sportConfig]);

    const applyChipToSelection = (value: string) => {
      if (!selectedCell) return;
      const field = selectedCell.field;
      if (field === 'rest') setRowField(selectedCell.rowId, 'rest', value);
      else if (field === 'break') setRowField(selectedCell.rowId, 'break', value);
      else setRowField(selectedCell.rowId, field, value);
    };

    const buildDescription = (filled: AerobicPlannerRow[]) => {
      const lines = filled.map((r) => {
        const parts = [
          r.distance ? `${r.distance}m` : '',
          r.style || '',
          r.speed ? `Speed ${r.speed}` : '',
          r.strokes ? `Strokes ${r.strokes}` : '',
          r.watts ? `Watts ${r.watts}` : '',
          r.time ? `Time ${r.time}` : '',
          r.rest ? `Rest ${r.rest}` : '',
          r.break ? `Break ${r.break}` : ''
        ].filter(Boolean);
        return parts.join(' | ');
      });
      const base = lines.join('<br/>');
      const extra = typeof descriptionInstructions === 'string' ? descriptionInstructions.trim() : '';
      if (!extra) return base;
      const formatted = escapeHtml(extra).replace(/\r\n/g, '\n').replace(/\n/g, '<br/>');
      return base ? `${base}<br/><br/>${formatted}` : formatted;
    };

    const buildMovelapsFromRows = (filled: AerobicPlannerRow[]) => {
      return filled.map((r, idx) => {
        const restType = restTypeFromChoice(r.restChoice);
        const notes = typeof r.note === 'string' ? r.note.trim() : '';
        return {
          repetitionNumber: idx + 1,
          distance: r.distance || null,
          style: r.style || null,
          speed: r.speed || null,
          rowPerMin: r.strokes || null,
          pace: r.watts || null,
          time: r.time || null,
          pause: r.rest || null,
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
          speed: (r.speed || '').trim()
        }))
        .filter((r) => r.distance !== '' || r.style !== '' || r.speed !== '' || r.time !== '');

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

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

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
        id: row.id
      });

      const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : undefined
      };

      return (
        <tr ref={setNodeRef} style={style} className={selectedRow?.id === row.id ? 'bg-blue-50' : ''}>
          <td className="border-t border-gray-200 px-1 py-1 text-center font-semibold">
            <div className="flex items-center justify-center gap-1">
              <span className="text-[11px]">{rowIndex + 1}</span>
              <button
                ref={setActivatorNodeRef}
                type="button"
                {...attributes}
                {...listeners}
                className="w-6 h-6 border border-gray-300 rounded bg-white hover:bg-gray-50 cursor-grab active:cursor-grabbing flex items-center justify-center select-none"
                aria-label="Drag to reorder"
              >
                ⠿
              </button>
            </div>
          </td>
          <td className="border-t border-gray-200 px-2 py-1.5 text-center">
            <button
              type="button"
              onClick={() => onCellClick(row.id, 'distance')}
              className="w-full border border-gray-300 rounded px-2 py-1 bg-white text-left truncate"
            >
              {row.distance || ''}
            </button>
          </td>
          <td className="border-t border-gray-200 px-2 py-1.5 text-center">
            <button
              type="button"
              onClick={() => onCellClick(row.id, 'style')}
              className="w-full border border-gray-300 rounded px-2 py-1 bg-white text-left truncate"
            >
              {row.style || ''}
            </button>
          </td>
          <td className="border-t border-gray-200 px-2 py-1.5 text-center">
            <button
              type="button"
              onClick={() => onCellClick(row.id, 'speed')}
              className="w-full border border-gray-300 rounded px-2 py-1 bg-white text-left truncate"
            >
              {row.speed || ''}
            </button>
          </td>
          <td className="border-t border-gray-200 px-2 py-1.5 text-center">
            <button
              type="button"
              onClick={() => onCellClick(row.id, 'strokes')}
              className="w-full border border-gray-300 rounded px-2 py-1 bg-white text-left truncate"
            >
              {row.strokes || ''}
            </button>
          </td>
          <td className="border-t border-gray-200 px-2 py-1.5 text-center">
            <button
              type="button"
              onClick={() => onCellClick(row.id, 'watts')}
              className="w-full border border-gray-300 rounded px-2 py-1 bg-white text-left truncate"
            >
              {row.watts || ''}
            </button>
          </td>
          <td className="border-t border-gray-200 px-2 py-1.5 text-center">
            <button
              type="button"
              onClick={() => onCellClick(row.id, 'time')}
              className="w-full border border-gray-300 rounded px-2 py-1 bg-white text-left font-mono truncate"
            >
              {row.time || ''}
            </button>
          </td>
          <td className="border-t border-gray-200 px-2 py-1.5 text-center">
            <button
              type="button"
              onClick={() => onCellClick(row.id, 'restChoice')}
              className="w-full border border-gray-300 rounded px-2 py-1 bg-white text-left truncate"
            >
              {restChoiceLabel(row.restChoice)}
            </button>
          </td>
          <td className="border-t border-gray-200 px-2 py-1.5 text-center">
            <button
              type="button"
              onClick={() => onCellClick(row.id, 'rest')}
              className="w-full border border-gray-300 rounded px-2 py-1 bg-white text-left font-mono truncate"
            >
              {row.rest || ''}
            </button>
          </td>
          <td className="border-t border-gray-200 px-2 py-1.5 text-center">
            <button
              type="button"
              onClick={() => onCellClick(row.id, 'breakChoice')}
              className="w-full border border-gray-300 rounded px-2 py-1 bg-white text-left truncate"
            >
              {breakChoiceLabel(row.breakChoice)}
            </button>
          </td>
          <td className="border-t border-gray-200 px-2 py-1.5 text-center">
            <button
              type="button"
              onClick={() => onCellClick(row.id, 'break')}
              className="w-full border border-gray-300 rounded px-2 py-1 bg-white text-left truncate"
            >
              {row.break || ''}
            </button>
          </td>
          <td className="border-t border-gray-200 px-2 py-1.5">
            <input
              type="text"
              value={row.note}
              onChange={(e) => setRows((prev) => prev.map((x) => (x.id === row.id ? { ...x, note: e.target.value } : x)))}
              className="w-full border border-gray-300 rounded px-2 py-1"
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
              <div className="grid grid-cols-3 gap-1 p-1.5">
                <button type="button" onClick={() => setToolbarRestChoice('rest_time')} className={`w-full px-2 py-1 text-xs border rounded ${activeField === 'rest' && restChoice === 'rest_time' ? breakTheme.active : breakTheme.inactive}`}>Rest Time</button>
                <button type="button" onClick={() => setToolbarRestChoice('restart_to')} className={`w-full px-2 py-1 text-xs border rounded ${activeField === 'rest' && restChoice === 'restart_to' ? breakTheme.active : breakTheme.inactive}`}>Restart to</button>
                <button type="button" onClick={() => setToolbarRestChoice('reset_pulse')} className={`w-full px-2 py-1 text-xs border rounded ${activeField === 'rest' && restChoice === 'reset_pulse' ? breakTheme.active : breakTheme.inactive}`}>Rest. pulse</button>
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
          <div className="flex gap-2 items-center min-w-max">
            {valueChips.map((chip) => (
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
            <table className="w-full text-xs table-fixed min-w-[1400px]">
              <colgroup>
                <col className="w-[72px]" />
                <col className="w-[90px]" />
                <col className="w-[140px]" />
                <col className="w-[120px]" />
                <col className="w-[100px]" />
                <col className="w-[100px]" />
                <col className="w-[140px]" />
                <col className="w-[140px]" />
                <col className="w-[140px]" />
                <col className="w-[140px]" />
                <col className="w-[140px]" />
                <col className="w-[260px]" />
              </colgroup>
              <thead>
                <tr>
                  <th rowSpan={2} className="border-b border-r border-gray-300 px-2 py-2 text-center bg-gray-100">#</th>
                  <th colSpan={2} className={`border-b border-r border-gray-300 px-2 py-2 text-center ${durationTheme.header}`}>Duration &amp; Mode</th>
                  <th colSpan={4} className={`border-b border-r border-gray-300 px-2 py-2 text-center ${intensityTheme.header}`}>Intensity of work</th>
                  <th colSpan={2} className={`border-b border-r border-gray-300 px-2 py-2 text-center ${breakTheme.header}`}>Break between rehearsals</th>
                  <th colSpan={2} className={`border-b border-r border-gray-300 px-2 py-2 text-center ${breakTypeTheme.header}`}>Break type between rehearsals</th>
                  <th rowSpan={2} className="border-b border-gray-300 px-2 py-2 text-center bg-gray-100">Note</th>
                </tr>
                <tr>
                  <th className={`border-b border-r border-gray-300 px-2 py-1.5 text-center ${durationTheme.header}`}>Distance</th>
                  <th className={`border-b border-r border-gray-300 px-2 py-1.5 text-center ${durationTheme.header}`}>Style</th>
                  <th className={`border-b border-r border-gray-300 px-2 py-1.5 text-center ${intensityTheme.header}`}>Speed</th>
                  <th className={`border-b border-r border-gray-300 px-2 py-1.5 text-center ${intensityTheme.header}`}>Strokes</th>
                  <th className={`border-b border-r border-gray-300 px-2 py-1.5 text-center ${intensityTheme.header}`}>Watts</th>
                  <th className={`border-b border-r border-gray-300 px-2 py-1.5 text-center ${intensityTheme.header}`}>Time</th>
                  <th className={`border-b border-r border-gray-300 px-2 py-1.5 text-center ${breakTheme.header}`}>Rest Type</th>
                  <th className={`border-b border-r border-gray-300 px-2 py-1.5 text-center ${breakTheme.header}`}>Rest</th>
                  <th className={`border-b border-r border-gray-300 px-2 py-1.5 text-center ${breakTypeTheme.header}`}>Break type</th>
                  <th className={`border-b border-r border-gray-300 px-2 py-1.5 text-center ${breakTypeTheme.header}`}>Break</th>
                </tr>
              </thead>
              <tbody>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={rows.map((r) => r.id)} strategy={verticalListSortingStrategy}>
                    {rows.map((r, rowIndex) => (
                      <SortableRow key={r.id} row={r} rowIndex={rowIndex} />
                    ))}
                  </SortableContext>
                </DndContext>
              </tbody>
            </table>
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

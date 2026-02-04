'use client';

import React, { useEffect, useMemo, useState } from 'react';
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

const restTypeFromChoice = (choice: RestChoice): string => {
  if (choice === 'restart_to') return REST_TYPES.RESTART_TIME;
  if (choice === 'reset_pulse') return REST_TYPES.RESTART_PULSE;
  return REST_TYPES.SET_TIME;
};

const AerobicFastPlannerOfMoveframes = React.forwardRef<FastPlannerHandle, AerobicFastPlannerProps>(
  function AerobicFastPlannerOfMoveframes({ sport, sectionId, workout: _workout, day: _day, mode, existingMoveframe, onSave, onCancel }, ref) {
    const sportConfig = useMemo(() => getSportConfig(sport as any), [sport]);
    const [rows, setRows] = useState<AerobicPlannerRow[]>([defaultRow(1), defaultRow(2), defaultRow(3), defaultRow(4)]);
    const [selectedCell, setSelectedCell] = useState<{ rowId: number; field: keyof AerobicPlannerRow } | null>(null);
    const [activeField, setActiveField] = useState<ActiveField>('distance');
    const [restChoice, setRestChoice] = useState<RestChoice>('rest_time');
    const [breakChoice, setBreakChoice] = useState<BreakChoice>('stopped');

    useEffect(() => {
      if (mode !== 'edit' || !existingMoveframe) return;
      const parsed = parseFastPlannerDataFromNotes(existingMoveframe?.notes);
      if (!parsed || parsed?.plannerType !== 'aerobic') return;
      setRows(normalizeRows(parsed.rows));
      if (parsed.activeField) setActiveField(parsed.activeField);
      if (parsed.restChoice) setRestChoice(parsed.restChoice);
      if (parsed.breakChoice) setBreakChoice(parsed.breakChoice);
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
        const meters = Array.isArray((sportConfig as any)?.meters) ? ((sportConfig as any).meters as any[]) : [];
        return meters.filter((v) => v !== 'input').map(String);
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
      return lines.join('<br/>');
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
      openPreferences: () => {}
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
    };

    const setToolbarBreakChoice = (choice: BreakChoice) => {
      setBreakChoice(choice);
      setActiveField('break');
    };

    return (
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <div className="mb-3">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-2">
            <div className="border border-gray-300 bg-white rounded">
              <div className="text-[11px] font-semibold text-gray-700 px-2 py-1 border-b border-gray-200 bg-gray-50">Duration &amp; Mode</div>
              <div className="flex gap-1 p-2">
                <button type="button" onClick={() => setActiveField('distance')} className={`px-2 py-1 text-xs border rounded ${activeField === 'distance' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-gray-300'}`}>Distance</button>
                <button type="button" onClick={() => setActiveField('style')} className={`px-2 py-1 text-xs border rounded ${activeField === 'style' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-gray-300'}`}>Style</button>
              </div>
            </div>

            <div className="border border-gray-300 bg-white rounded">
              <div className="text-[11px] font-semibold text-gray-700 px-2 py-1 border-b border-gray-200 bg-gray-50">Intensity of work</div>
              <div className="flex gap-1 p-2 flex-wrap">
                <button type="button" onClick={() => setActiveField('speed')} className={`px-2 py-1 text-xs border rounded ${activeField === 'speed' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-gray-300'}`}>Speed</button>
                <button type="button" onClick={() => setActiveField('strokes')} className={`px-2 py-1 text-xs border rounded ${activeField === 'strokes' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-gray-300'}`}>Strokes</button>
                <button type="button" onClick={() => setActiveField('watts')} className={`px-2 py-1 text-xs border rounded ${activeField === 'watts' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-gray-300'}`}>Watts</button>
                <button type="button" onClick={() => setActiveField('time')} className={`px-2 py-1 text-xs border rounded ${activeField === 'time' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-gray-300'}`}>Time</button>
              </div>
            </div>

            <div className="border border-gray-300 bg-white rounded">
              <div className="text-[11px] font-semibold text-gray-700 px-2 py-1 border-b border-gray-200 bg-gray-50">Break between rehearsals</div>
              <div className="flex gap-1 p-2 flex-wrap">
                <button type="button" onClick={() => setToolbarRestChoice('rest_time')} className={`px-2 py-1 text-xs border rounded ${activeField === 'rest' && restChoice === 'rest_time' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-gray-300'}`}>Rest Time</button>
                <button type="button" onClick={() => setToolbarRestChoice('restart_to')} className={`px-2 py-1 text-xs border rounded ${activeField === 'rest' && restChoice === 'restart_to' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-gray-300'}`}>Restart to</button>
                <button type="button" onClick={() => setToolbarRestChoice('reset_pulse')} className={`px-2 py-1 text-xs border rounded ${activeField === 'rest' && restChoice === 'reset_pulse' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-gray-300'}`}>Reset pulse</button>
              </div>
            </div>

            <div className="border border-gray-300 bg-white rounded">
              <div className="text-[11px] font-semibold text-gray-700 px-2 py-1 border-b border-gray-200 bg-gray-50">Break type between rehearsals</div>
              <div className="flex gap-1 p-2 flex-wrap">
                <button type="button" onClick={() => setToolbarBreakChoice('stopped')} className={`px-2 py-1 text-xs border rounded ${activeField === 'break' && breakChoice === 'stopped' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-gray-300'}`}>Stopped</button>
                <button type="button" onClick={() => setToolbarBreakChoice('speed')} className={`px-2 py-1 text-xs border rounded ${activeField === 'break' && breakChoice === 'speed' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-gray-300'}`}>Speed</button>
                <button type="button" onClick={() => setToolbarBreakChoice('watts')} className={`px-2 py-1 text-xs border rounded ${activeField === 'break' && breakChoice === 'watts' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-gray-300'}`}>Watts</button>
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
                className="px-2 py-1 text-xs border border-gray-300 rounded bg-white hover:bg-gray-50"
              >
                {chip}
              </button>
            ))}
          </div>
        </div>

        <div className="border border-gray-300 bg-white rounded overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border-b border-gray-300 px-2 py-2 text-center w-10">#</th>
                  <th className="border-b border-gray-300 px-2 py-2 text-center">Distance</th>
                  <th className="border-b border-gray-300 px-2 py-2 text-center">Style</th>
                  <th className="border-b border-gray-300 px-2 py-2 text-center">Speed</th>
                  <th className="border-b border-gray-300 px-2 py-2 text-center">Strokes</th>
                  <th className="border-b border-gray-300 px-2 py-2 text-center">Watts</th>
                  <th className="border-b border-gray-300 px-2 py-2 text-center">Time</th>
                  <th className="border-b border-gray-300 px-2 py-2 text-center">Rest</th>
                  <th className="border-b border-gray-300 px-2 py-2 text-center">Break</th>
                  <th className="border-b border-gray-300 px-2 py-2 text-center">Note</th>
                  <th className="border-b border-gray-300 px-2 py-2 text-center w-20"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className={selectedRow?.id === r.id ? 'bg-blue-50' : ''}>
                    <td className="border-t border-gray-200 px-2 py-2 text-center font-semibold">{r.id}</td>
                    <td className="border-t border-gray-200 px-2 py-1.5 text-center">
                      <button type="button" onClick={() => onCellClick(r.id, 'distance')} className="w-full border border-gray-300 rounded px-2 py-1 bg-white text-left">
                        {r.distance || ''}
                      </button>
                    </td>
                    <td className="border-t border-gray-200 px-2 py-1.5 text-center">
                      <button type="button" onClick={() => onCellClick(r.id, 'style')} className="w-full border border-gray-300 rounded px-2 py-1 bg-white text-left">
                        {r.style || ''}
                      </button>
                    </td>
                    <td className="border-t border-gray-200 px-2 py-1.5 text-center">
                      <button type="button" onClick={() => onCellClick(r.id, 'speed')} className="w-full border border-gray-300 rounded px-2 py-1 bg-white text-left">
                        {r.speed || ''}
                      </button>
                    </td>
                    <td className="border-t border-gray-200 px-2 py-1.5 text-center">
                      <button type="button" onClick={() => onCellClick(r.id, 'strokes')} className="w-full border border-gray-300 rounded px-2 py-1 bg-white text-left">
                        {r.strokes || ''}
                      </button>
                    </td>
                    <td className="border-t border-gray-200 px-2 py-1.5 text-center">
                      <button type="button" onClick={() => onCellClick(r.id, 'watts')} className="w-full border border-gray-300 rounded px-2 py-1 bg-white text-left">
                        {r.watts || ''}
                      </button>
                    </td>
                    <td className="border-t border-gray-200 px-2 py-1.5 text-center">
                      <button type="button" onClick={() => onCellClick(r.id, 'time')} className="w-full border border-gray-300 rounded px-2 py-1 bg-white text-left font-mono">
                        {r.time || ''}
                      </button>
                    </td>
                    <td className="border-t border-gray-200 px-2 py-1.5 text-center">
                      <button type="button" onClick={() => onCellClick(r.id, 'rest')} className="w-full border border-gray-300 rounded px-2 py-1 bg-white text-left font-mono">
                        {r.rest || ''}
                      </button>
                    </td>
                    <td className="border-t border-gray-200 px-2 py-1.5 text-center">
                      <button type="button" onClick={() => onCellClick(r.id, 'break')} className="w-full border border-gray-300 rounded px-2 py-1 bg-white text-left">
                        {r.break || ''}
                      </button>
                    </td>
                    <td className="border-t border-gray-200 px-2 py-1.5">
                      <input
                        type="text"
                        value={r.note}
                        onChange={(e) => setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, note: e.target.value } : x)))}
                        className="w-full border border-gray-300 rounded px-2 py-1"
                      />
                    </td>
                    <td className="border-t border-gray-200 px-2 py-1.5 text-center">
                      <div className="flex gap-1 justify-center">
                        <button type="button" onClick={ensureRow} className="px-2 py-1 text-xs border border-gray-300 rounded bg-white hover:bg-gray-50">+</button>
                        <button type="button" onClick={() => deleteRow(r.id)} className="px-2 py-1 text-xs border border-gray-300 rounded bg-white hover:bg-gray-50">×</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    );
  }
);

export default AerobicFastPlannerOfMoveframes;

'use client';

import Image from 'next/image';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { buildDefaultVolumeDeltas } from '@/utils/planGymWeekGoalScalars';

// ─── types ──────────────────────────────────────────────────────────────────

type WorkoutParametersTab = 'changesVolumesSeries' | 'parametersByObjective' | 'formulaParameters';

interface WorkoutsParametersSettingsProps {
  initialTab?: WorkoutParametersTab;
}

// ── tab 1 ──
const TRAINING_LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'Elite', 'Professional'] as const;
const SESSIONS = [1, 2, 3, 4, 5, 6] as const;
type TrainingLevel = (typeof TRAINING_LEVELS)[number];
type SessionDeltas = Record<number, number>;
type VolumeChangesByLevel = Record<TrainingLevel, SessionDeltas>;
interface LevelMeta { workoutsSuggested: number; picture: string; }
type LevelsMeta = Record<TrainingLevel, LevelMeta>;

// ── tab 2 ──
const GOALS = [
  'General Fitness',
  'Hypertrophy',
  'Strength',
  'Power',
  'Endurance',
  'Fat Loss',
  'Sport Performance',
] as const;
type Goal = (typeof GOALS)[number];
const LEVEL_BANDS = ['Beginner', 'Intermediate', 'Advanced', 'Elite', 'Professional'] as const;

interface GoalLoadParams {
  volumeFrom: number[];
  volumeTo: number[];
  repsFrom: number[];
  repsTo: number[];
  pctFrom: number[];
  pctTo: number[];
  displayInPercent: boolean;
  pauseSeriesFrom: number[];
  pauseSeriesTo: number[];
  pauseExercisesFrom: number[];
  pauseExercisesTo: number[];
  pauseAreasFrom: number[];
  pauseAreasTo: number[];
}

type LevelPairField =
  | 'repsFrom'
  | 'repsTo'
  | 'pctFrom'
  | 'pctTo'
  | 'pauseSeriesFrom'
  | 'pauseSeriesTo'
  | 'pauseExercisesFrom'
  | 'pauseExercisesTo'
  | 'pauseAreasFrom'
  | 'pauseAreasTo';

type AllGoalParams = Partial<Record<Goal, GoalLoadParams>>;

// ─── defaults ────────────────────────────────────────────────────────────────

function buildInitialDeltas(): VolumeChangesByLevel {
  return buildDefaultVolumeDeltas() as VolumeChangesByLevel;
}
function buildInitialMeta(): LevelsMeta {
  const defs: Record<TrainingLevel, number> = {
    Beginner: 2, Intermediate: 3, Advanced: 4, Elite: 5, Professional: 6,
  };
  return TRAINING_LEVELS.reduce((a, l) => {
    a[l] = { workoutsSuggested: defs[l], picture: '' };
    return a;
  }, {} as LevelsMeta);
}

function repsToPercent(reps: number): number {
  return Math.max(0, parseFloat((100 - reps * 2.5).toFixed(1)));
}
function percentToReps(pct: number): number {
  return Math.max(1, Math.round((100 - pct) / 2.5));
}

function buildDefaultGoalParams(): GoalLoadParams {
  /** Indices 0–4 = Beginner … Professional; index 5 mirrors Professional for legacy 6-slot readers. */
  const repsFrom = [12, 12, 12, 12, 12, 12];
  const repsTo = [20, 20, 20, 20, 20, 20];
  const pauseSeriesFrom = [60, 60, 60, 60, 60, 60];
  const pauseSeriesTo = [55, 55, 55, 55, 55, 55];
  const pauseExercisesFrom = [90, 90, 90, 90, 90, 90];
  const pauseExercisesTo = [120, 120, 120, 120, 120, 120];
  const pauseAreasFrom = [120, 120, 120, 120, 120, 120];
  const pauseAreasTo = [180, 180, 180, 180, 180, 180];
  return {
    volumeFrom: [10, 4, 5, 6, 10, 10],
    volumeTo: [50, 5, 6, 8, 50, 50],
    repsFrom,
    repsTo,
    pctFrom: repsFrom.map((r) => repsToPercent(r)),
    pctTo: repsTo.map((r) => repsToPercent(r)),
    displayInPercent: false,
    pauseSeriesFrom,
    pauseSeriesTo,
    pauseExercisesFrom,
    pauseExercisesTo,
    pauseAreasFrom,
    pauseAreasTo,
  };
}

function normalizeLevelArray(raw: unknown, defaults: number[]): number[] {
  if (Array.isArray(raw)) {
    const arr = Array.from({ length: 6 }, (_, i) => Number(raw[i] ?? defaults[i] ?? defaults[0]));
    arr[5] = Number(raw[5] ?? raw[4] ?? arr[4]);
    return arr;
  }
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return [raw, raw, raw, raw, raw, raw];
  }
  return [...defaults];
}

function normalizeGoalParams(raw: Partial<GoalLoadParams> | GoalLoadParams | undefined): GoalLoadParams {
  const d = buildDefaultGoalParams();
  const num = (v: unknown, fallback: number) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  };
  const legacy = raw as Record<string, unknown> | undefined;

  const legacyRepsFrom = num(raw?.repsFrom, d.repsFrom[0]);
  const legacyRepsTo = num(raw?.repsTo, d.repsTo[0]);
  const legacyProfRepsFrom = num(legacy?.repsFromProfessional, legacyRepsFrom);
  const legacyProfRepsTo = num(legacy?.repsToProfessional, legacyRepsTo);

  const repsFrom = Array.isArray(raw?.repsFrom)
    ? normalizeLevelArray(raw.repsFrom, d.repsFrom)
    : [legacyRepsFrom, legacyRepsFrom, legacyRepsFrom, legacyRepsFrom, legacyProfRepsFrom, legacyProfRepsFrom];
  const repsTo = Array.isArray(raw?.repsTo)
    ? normalizeLevelArray(raw.repsTo, d.repsTo)
    : [legacyRepsTo, legacyRepsTo, legacyRepsTo, legacyRepsTo, legacyProfRepsTo, legacyProfRepsTo];

  const migratePause = (
    fromKey: keyof GoalLoadParams,
    toKey: keyof GoalLoadParams,
    profFromKey: string,
    profToKey: string,
    defFrom: number[],
    defTo: number[],
  ) => {
    const rawFrom = raw?.[fromKey];
    const rawTo = raw?.[toKey];
    if (Array.isArray(rawFrom) && Array.isArray(rawTo)) {
      return {
        from: normalizeLevelArray(rawFrom, defFrom),
        to: normalizeLevelArray(rawTo, defTo),
      };
    }
    const singleFrom = num(rawFrom, defFrom[0]);
    const singleTo = num(rawTo, defTo[0]);
    const profFrom = num(legacy?.[profFromKey], singleFrom);
    const profTo = num(legacy?.[profToKey], singleTo);
    return {
      from: [singleFrom, singleFrom, singleFrom, singleFrom, profFrom, profFrom],
      to: [singleTo, singleTo, singleTo, singleTo, profTo, profTo],
    };
  };

  const pauseSeries = migratePause(
    'pauseSeriesFrom',
    'pauseSeriesTo',
    'pauseSeriesFromProfessional',
    'pauseSeriesToProfessional',
    d.pauseSeriesFrom,
    d.pauseSeriesTo,
  );
  const pauseExercises = migratePause(
    'pauseExercisesFrom',
    'pauseExercisesTo',
    'pauseExercisesFromProfessional',
    'pauseExercisesToProfessional',
    d.pauseExercisesFrom,
    d.pauseExercisesTo,
  );
  const pauseAreas = migratePause(
    'pauseAreasFrom',
    'pauseAreasTo',
    'pauseAreasFromProfessional',
    'pauseAreasToProfessional',
    d.pauseAreasFrom,
    d.pauseAreasTo,
  );

  const pctFrom = Array.isArray(raw?.pctFrom)
    ? normalizeLevelArray(raw.pctFrom, d.pctFrom)
    : repsFrom.map((r) => repsToPercent(r));
  const pctTo = Array.isArray(raw?.pctTo)
    ? normalizeLevelArray(raw.pctTo, d.pctTo)
    : repsTo.map((r) => repsToPercent(r));

  const next = { ...d, ...(raw || {}) } as GoalLoadParams;
  next.volumeFrom = normalizeLevelArray(raw?.volumeFrom, d.volumeFrom);
  next.volumeTo = normalizeLevelArray(raw?.volumeTo, d.volumeTo);
  next.repsFrom = repsFrom;
  next.repsTo = repsTo;
  next.pctFrom = pctFrom;
  next.pctTo = pctTo;
  next.pauseSeriesFrom = pauseSeries.from;
  next.pauseSeriesTo = pauseSeries.to;
  next.pauseExercisesFrom = pauseExercises.from;
  next.pauseExercisesTo = pauseExercises.to;
  next.pauseAreasFrom = pauseAreas.from;
  next.pauseAreasTo = pauseAreas.to;
  next.displayInPercent = Boolean(raw?.displayInPercent ?? d.displayInPercent);
  return next;
}

// ─── storage helpers ─────────────────────────────────────────────────────────

function loadLS<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : fallback; }
  catch { return fallback; }
}

const SK_DELTAS = 'wp_volumeDeltas';
const SK_META   = 'wp_levelsMeta';
const SK_GOALS  = 'wp_goalParams';

// ─── format helpers ──────────────────────────────────────────────────────────

function fmtSec(s: number): string {
  if (s < 60) return `${s}"`;
  const m = Math.floor(s / 60), sec = s % 60;
  return sec === 0 ? `${m}'` : `${m}'${String(sec).padStart(2, '0')}"`;
}
function fmtPct(v: number): string {
  return `${v >= 0 ? '+' : ''}${v}%`;
}

// ─── Spinner ─────────────────────────────────────────────────────────────────

interface SpinnerProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  display?: string;          // optional override for display text
  width?: string;
  yellow?: boolean;
  disabled?: boolean;
}
function Spinner({ value, min, max, step = 1, onChange, display, width = 'w-16', yellow = false, disabled = false }: SpinnerProps) {
  const inc = () => !disabled && onChange(Math.min(max, value + step));
  const dec = () => !disabled && onChange(Math.max(min, value - step));
  const boxCls = yellow
    ? 'bg-yellow-300 border-yellow-400 text-gray-900 font-bold'
    : 'bg-white border-gray-300 text-gray-800';
  return (
    <div className={`inline-flex items-center border rounded ${boxCls} ${width} select-none ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      <span className="flex-1 text-center text-xs px-1 py-1 leading-tight whitespace-nowrap overflow-hidden">
        {display ?? value}
      </span>
      <div className="flex flex-col border-l border-gray-300 divide-y divide-gray-300 flex-shrink-0">
        <button type="button" onClick={inc} disabled={disabled || value >= max}
          className="px-1 py-0.5 text-[9px] leading-none hover:bg-gray-100 disabled:opacity-30">▲</button>
        <button type="button" onClick={dec} disabled={disabled || value <= min}
          className="px-1 py-0.5 text-[9px] leading-none hover:bg-gray-100 disabled:opacity-30">▼</button>
      </div>
    </div>
  );
}

// ─── Level × period from/to table (Volume, Load, Pauses) ─────────────────────

interface LevelPeriodTableProps {
  label: string;
  description?: string;
  levelColors: Record<(typeof LEVEL_BANDS)[number], string>;
  valuesFrom: number[];
  valuesTo: number[];
  onFromChange: (idx: number, v: number) => void;
  onToChange: (idx: number, v: number) => void;
  fromMin: number;
  fromMax: number;
  toMin: number;
  toMax: number;
  step?: number;
  formatValue?: (v: number) => string;
  hintFrom?: (v: number) => string;
  hintTo?: (v: number) => string;
  headerExtra?: React.ReactNode;
}

function LevelPeriodTable({
  label,
  description,
  levelColors,
  valuesFrom,
  valuesTo,
  onFromChange,
  onToChange,
  fromMin,
  fromMax,
  toMin,
  toMax,
  step = 1,
  formatValue,
  hintFrom,
  hintTo,
  headerExtra,
}: LevelPeriodTableProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-3">
      <div className="flex items-start gap-6">
        <div className="w-44 flex-shrink-0 pt-1 space-y-2">
          <span className="inline-block text-sm font-semibold border border-yellow-400 bg-yellow-50 text-gray-900 px-3 py-1 rounded">
            {label}
          </span>
          {description ? (
            <p className="text-[11px] text-gray-500 leading-snug">{description}</p>
          ) : null}
          {headerExtra}
        </div>
        <div className="flex flex-col gap-2 pt-1 flex-1 min-w-0">
          {LEVEL_BANDS.map((lv, idx) => (
            <div key={lv} className="flex items-center gap-2 flex-wrap">
              <span className={`w-28 text-[11px] font-bold px-2 py-0.5 rounded shrink-0 ${levelColors[lv]}`}>
                {lv}
              </span>
              <span className="text-xs text-gray-500 w-8 text-right shrink-0">from</span>
              <Spinner
                value={valuesFrom[idx] ?? fromMin}
                min={fromMin}
                max={fromMax}
                step={step}
                onChange={(v) => onFromChange(idx, v)}
                display={formatValue ? formatValue(valuesFrom[idx] ?? fromMin) : undefined}
                width="w-[88px]"
              />
              {hintFrom ? (
                <span className="text-[10px] text-gray-400 shrink-0">{hintFrom(valuesFrom[idx] ?? fromMin)}</span>
              ) : null}
              <span className="text-xs text-gray-500 w-8 text-right shrink-0">to</span>
              <Spinner
                value={valuesTo[idx] ?? toMin}
                min={toMin}
                max={toMax}
                step={step}
                onChange={(v) => onToChange(idx, v)}
                display={formatValue ? formatValue(valuesTo[idx] ?? toMin) : undefined}
                width="w-[88px]"
              />
              {hintTo ? (
                <span className="text-[10px] text-gray-400 shrink-0">{hintTo(valuesTo[idx] ?? toMin)}</span>
              ) : null}
            </div>
          ))}
          <div className="flex items-center gap-2 flex-wrap border-t border-gray-100 pt-2 mt-1">
            <span className="w-28 shrink-0" aria-hidden />
            <span className="text-xs text-gray-500 w-8 shrink-0" aria-hidden />
            <span className="w-[88px] text-center text-[11px] font-semibold text-gray-800">First period</span>
            <span className="w-[88px] shrink-0" aria-hidden />
            <span className="text-xs text-gray-500 w-8 shrink-0" aria-hidden />
            <span className="w-[88px] text-center text-[11px] font-semibold text-gray-800">Last period</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Copy-goal dialog ────────────────────────────────────────────────────────

interface CopyGoalDialogProps {
  currentGoal: Goal;
  onCopy: (target: Goal) => void;
  onClose: () => void;
}
function CopyGoalDialog({ currentGoal, onCopy, onClose }: CopyGoalDialogProps) {
  const [target, setTarget] = useState<Goal>(GOALS.find(g => g !== currentGoal) ?? GOALS[0]);
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-80 shadow-xl">
        <h3 className="font-bold text-gray-900 mb-4">Copy settings to another goal</h3>
        <p className="text-sm text-gray-600 mb-3">
          Copy all parameters from <strong>{currentGoal}</strong> to:
        </p>
        <select
          value={target}
          onChange={e => setTarget(e.target.value as Goal)}
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm mb-4"
        >
          {GOALS.filter(g => g !== currentGoal).map(g => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
        <div className="flex gap-2">
          <button onClick={() => onCopy(target)}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded font-semibold text-sm hover:bg-blue-700 transition">
            Copy
          </button>
          <button onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded font-semibold text-sm hover:bg-gray-300 transition">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}


export default function WorkoutsParametersSettings({ initialTab = 'changesVolumesSeries' }: WorkoutsParametersSettingsProps) {
  const [activeTab, setActiveTab] = useState<WorkoutParametersTab>(initialTab);

  // ── tab 1 state ──
  const [deltas, setDeltas] = useState<VolumeChangesByLevel>(() => loadLS(SK_DELTAS, buildInitialDeltas()));
  const [levelMeta, setLevelMeta] = useState<LevelsMeta>(() => loadLS(SK_META, buildInitialMeta()));

  // ── tab 2 state ──
  const [selectedGoal, setSelectedGoal] = useState<Goal>('General Fitness');
  const [allGoalParams, setAllGoalParams] = useState<AllGoalParams>(() => loadLS(SK_GOALS, {}));
  const [showCopyDialog, setShowCopyDialog] = useState(false);

  const [saveMsg1, setSaveMsg1] = useState('');
  const [saveMsg2, setSaveMsg2] = useState('');
  const timer1 = useRef<ReturnType<typeof setTimeout>|null>(null);
  const timer2 = useRef<ReturnType<typeof setTimeout>|null>(null);

  useEffect(() => { setActiveTab(initialTab); }, [initialTab]);

  // current goal params (with default fallback)
  const goalParams: GoalLoadParams = normalizeGoalParams(allGoalParams[selectedGoal]);

  const updateGoalParams = useCallback(<K extends keyof GoalLoadParams>(key: K, value: GoalLoadParams[K]) => {
    setAllGoalParams(prev => ({
      ...prev,
      [selectedGoal]: { ...(normalizeGoalParams(prev[selectedGoal])), [key]: value }
    }));
  }, [selectedGoal]);

  const updateVolume = useCallback((idx: number, field: 'volumeFrom' | 'volumeTo', value: number) => {
    setAllGoalParams(prev => {
      const cur = normalizeGoalParams(prev[selectedGoal]);
      const arr = [...cur[field]];
      arr[idx] = value;
      if (idx === 4) arr[5] = value;
      return { ...prev, [selectedGoal]: { ...cur, [field]: arr } };
    });
  }, [selectedGoal]);

  const updateLevelPair = useCallback(
    (fromField: LevelPairField, toField: LevelPairField, idx: number, side: 'from' | 'to', value: number) => {
      setAllGoalParams(prev => {
        const cur = normalizeGoalParams(prev[selectedGoal]);
        const field = side === 'from' ? fromField : toField;
        const arr = [...cur[field]];
        arr[idx] = value;
        if (idx === 4) arr[5] = value;
        return { ...prev, [selectedGoal]: { ...cur, [field]: arr } };
      });
    },
    [selectedGoal],
  );

  // toggle display mode - auto-convert current values
  const toggleDisplayInPercent = () => {
    const cur = goalParams;
    if (!cur.displayInPercent) {
      setAllGoalParams(prev => ({
        ...prev,
        [selectedGoal]: {
          ...cur,
          pctFrom: cur.repsFrom.map((r) => repsToPercent(r)),
          pctTo: cur.repsTo.map((r) => repsToPercent(r)),
          displayInPercent: true,
        }
      }));
    } else {
      setAllGoalParams(prev => ({
        ...prev,
        [selectedGoal]: {
          ...cur,
          repsFrom: cur.pctFrom.map((p) => percentToReps(p)),
          repsTo: cur.pctTo.map((p) => percentToReps(p)),
          displayInPercent: false,
        }
      }));
    }
  };

  // ── tab 1 helpers ──
  const updateDelta = useCallback((level: TrainingLevel, session: number, value: number) => {
    setDeltas(prev => ({
      ...prev,
      [level]: { ...prev[level], [session]: Math.max(-50, Math.min(50, Math.round(value / 5) * 5)) }
    }));
  }, []);

  const updateMeta = useCallback(<K extends keyof LevelMeta>(level: TrainingLevel, field: K, value: LevelMeta[K]) => {
    setLevelMeta(prev => ({ ...prev, [level]: { ...prev[level], [field]: value } }));
  }, []);

  const handlePictureUpload = (level: TrainingLevel, file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => updateMeta(level, 'picture', (reader.result as string) || '');
    reader.readAsDataURL(file);
  };

  // ── save helpers ──
  const handleSave1 = () => {
    localStorage.setItem(SK_DELTAS, JSON.stringify(deltas));
    localStorage.setItem(SK_META,   JSON.stringify(levelMeta));
    if (timer1.current) clearTimeout(timer1.current);
    setSaveMsg1('✅ Saved!');
    timer1.current = setTimeout(() => setSaveMsg1(''), 2500);
  };

  const handleSave2 = () => {
    localStorage.setItem(SK_GOALS, JSON.stringify(allGoalParams));
    if (timer2.current) clearTimeout(timer2.current);
    setSaveMsg2('✅ Saved!');
    timer2.current = setTimeout(() => setSaveMsg2(''), 2500);
  };

  const handleCopyGoal = (target: Goal) => {
    const cur = goalParams;
    setAllGoalParams(prev => ({ ...prev, [target]: { ...cur } }));
    setShowCopyDialog(false);
  };

  const levelColors: Record<TrainingLevel, string> = {
    Beginner: 'bg-green-100 text-green-800',
    Intermediate: 'bg-blue-100 text-blue-800',
    Advanced: 'bg-orange-100 text-orange-800',
    Elite: 'bg-red-100 text-red-800',
    Professional: 'bg-purple-100 text-purple-800',
  };

  // ─── render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Workouts parameters settings</h2>
        <p className="text-gray-600 mt-1">
          Manage volume series, repetitions and pauses in according to goals and training levels
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 overflow-x-auto">
        {([
          ['changesVolumesSeries',  'Changes volumes series'],
          ['parametersByObjective', 'Parameters for each objective'],
        ] as [WorkoutParametersTab, string][]).map(([id, label]) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={`px-6 py-3 font-semibold transition whitespace-nowrap ${
              activeTab === id ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════
          TAB 1 – Changes volumes series
      ══════════════════════════════════════════════════════ */}
      {activeTab === 'changesVolumesSeries' && (
        <div className="space-y-5">
          <div className="rounded-lg bg-blue-800 px-5 py-3">
            <p className="font-semibold text-white text-sm">
              Changes in the volume of the reference series in relation to the chosen sessions
            </p>
          </div>

          <div className="space-y-4">
            {TRAINING_LEVELS.map((level) => (
              <div key={level} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                <div className="flex items-stretch">
                  {/* Picture */}
                  <label className="relative flex-shrink-0 w-28 h-28 bg-gray-100 border-r border-gray-200 cursor-pointer overflow-hidden group">
                    {levelMeta[level].picture ? (
                      <Image src={levelMeta[level].picture} alt={level} fill className="object-cover" unoptimized />
                    ) : (
                      <div className="flex flex-col items-center justify-center w-full h-full text-gray-400 group-hover:text-gray-600 transition">
                        <svg className="w-8 h-8 mb-1" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3 21h18M3.75 3h16.5A.75.75 0 0121 3.75v16.5a.75.75 0 01-.75.75H3.75A.75.75 0 013 20.25V3.75A.75.75 0 013.75 3z" />
                        </svg>
                        <span className="text-[10px] leading-tight text-center px-1">Upload image</span>
                      </div>
                    )}
                    <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePictureUpload(level, f); }} />
                  </label>
                  {/* Level info */}
                  <div className="flex flex-col justify-center px-4 gap-2 min-w-[160px] border-r border-gray-200">
                    <span className={`text-sm font-bold px-2 py-0.5 rounded self-start ${levelColors[level]}`}>{level}</span>
                    <div className="flex flex-col items-start gap-1">
                      <span className="text-[11px] text-gray-500 leading-tight">Workouts<br/>suggested</span>
                      <Spinner value={levelMeta[level].workoutsSuggested} min={1} max={7}
                        onChange={(v) => updateMeta(level, 'workoutsSuggested', v)} width="w-16" yellow />
                    </div>
                  </div>
                  {/* 6 session spinners */}
                  <div className="flex-1 grid grid-cols-6 divide-x divide-gray-200">
                    {SESSIONS.map((s) => (
                      <div key={s} className="flex flex-col items-center justify-center gap-1.5 py-3 px-1">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-yellow-300 border border-yellow-400 font-bold text-gray-900 text-sm">
                          {s}
                        </span>
                        <Spinner
                          value={deltas[level][s]} min={-50} max={50} step={5}
                          onChange={(v) => updateDelta(level, s, v)}
                          display={fmtPct(deltas[level][s])}
                          width="w-[72px]"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button onClick={handleSave1} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition text-sm">💾 Save</button>
            <button onClick={() => { setDeltas(buildInitialDeltas()); setLevelMeta(buildInitialMeta()); }}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition text-sm">↺ Reset</button>
            {saveMsg1 && <span className="text-sm text-green-700 font-medium">{saveMsg1}</span>}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          TAB 2 – Parameters for each objective
      ══════════════════════════════════════════════════════ */}
      {activeTab === 'parametersByObjective' && (
        <div className="space-y-5">
          {/* Blue title banner */}
          <div className="rounded-lg bg-blue-800 px-5 py-3">
            <p className="font-semibold text-white text-sm">
              Setting load parameters in relation to the objective
            </p>
          </div>

          {/* Goal selector row */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-700 font-medium whitespace-nowrap">Select your goal</label>
              <select
                value={selectedGoal}
                onChange={e => setSelectedGoal(e.target.value as Goal)}
                className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {GOALS.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <button
              onClick={() => setShowCopyDialog(true)}
              className="px-4 py-1.5 bg-gray-800 text-white rounded text-sm font-semibold hover:bg-gray-700 transition"
            >
              Copy on another goal
            </button>
          </div>

          {/* ── Volume serie ── */}
          <LevelPeriodTable
            label="Volume serie"
            description={'Reference total series range by athlete level. "from" / "to" align with First period through Last period across the yearly plan (same idea as Load Repeated / Pauses).'}
            levelColors={levelColors}
            valuesFrom={goalParams.volumeFrom}
            valuesTo={goalParams.volumeTo}
            onFromChange={(idx, v) => updateVolume(idx, 'volumeFrom', v)}
            onToChange={(idx, v) => updateVolume(idx, 'volumeTo', v)}
            fromMin={1}
            fromMax={99}
            toMin={1}
            toMax={99}
          />

          {/* ── Load Repeated (per level) ── */}
          {goalParams.displayInPercent ? (
            <LevelPeriodTable
              label="Load Repeated"
              levelColors={levelColors}
              valuesFrom={goalParams.pctFrom}
              valuesTo={goalParams.pctTo}
              onFromChange={(idx, v) => updateLevelPair('pctFrom', 'pctTo', idx, 'from', v)}
              onToChange={(idx, v) => updateLevelPair('pctFrom', 'pctTo', idx, 'to', v)}
              fromMin={0}
              fromMax={100}
              toMin={0}
              toMax={100}
              step={2.5}
              formatValue={(v) => `${v}%`}
              hintFrom={(v) => `≈ ${percentToReps(v)} reps`}
              hintTo={(v) => `≈ ${percentToReps(v)} reps`}
              headerExtra={
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" checked={goalParams.displayInPercent} onChange={toggleDisplayInPercent}
                    className="w-4 h-4 rounded border-gray-400 text-blue-600 focus:ring-blue-500" />
                  <span className="text-xs text-gray-700">Display in %</span>
                </label>
              }
            />
          ) : (
            <LevelPeriodTable
              label="Load Repeated"
              levelColors={levelColors}
              valuesFrom={goalParams.repsFrom}
              valuesTo={goalParams.repsTo}
              onFromChange={(idx, v) => updateLevelPair('repsFrom', 'repsTo', idx, 'from', v)}
              onToChange={(idx, v) => updateLevelPair('repsFrom', 'repsTo', idx, 'to', v)}
              fromMin={1}
              fromMax={99}
              toMin={1}
              toMax={99}
              hintFrom={(v) => `≈ ${repsToPercent(v)}% of max`}
              hintTo={(v) => `≈ ${repsToPercent(v)}% of max`}
              headerExtra={
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" checked={goalParams.displayInPercent} onChange={toggleDisplayInPercent}
                    className="w-4 h-4 rounded border-gray-400 text-blue-600 focus:ring-blue-500" />
                  <span className="text-xs text-gray-700">Display in %</span>
                </label>
              }
            />
          )}

          {/* ── Pauses (per level) ── */}
          <LevelPeriodTable
            label="Pause among the series"
            levelColors={levelColors}
            valuesFrom={goalParams.pauseSeriesFrom}
            valuesTo={goalParams.pauseSeriesTo}
            onFromChange={(idx, v) => updateLevelPair('pauseSeriesFrom', 'pauseSeriesTo', idx, 'from', v)}
            onToChange={(idx, v) => updateLevelPair('pauseSeriesFrom', 'pauseSeriesTo', idx, 'to', v)}
            fromMin={5}
            fromMax={300}
            toMin={5}
            toMax={300}
            step={5}
            formatValue={fmtSec}
            hintFrom={fmtSec}
            hintTo={fmtSec}
          />

          <LevelPeriodTable
            label="Pause among exercises"
            levelColors={levelColors}
            valuesFrom={goalParams.pauseExercisesFrom}
            valuesTo={goalParams.pauseExercisesTo}
            onFromChange={(idx, v) => updateLevelPair('pauseExercisesFrom', 'pauseExercisesTo', idx, 'from', v)}
            onToChange={(idx, v) => updateLevelPair('pauseExercisesFrom', 'pauseExercisesTo', idx, 'to', v)}
            fromMin={5}
            fromMax={300}
            toMin={5}
            toMax={300}
            step={5}
            formatValue={fmtSec}
            hintFrom={fmtSec}
            hintTo={fmtSec}
          />

          <LevelPeriodTable
            label="Pause among areas"
            levelColors={levelColors}
            valuesFrom={goalParams.pauseAreasFrom}
            valuesTo={goalParams.pauseAreasTo}
            onFromChange={(idx, v) => updateLevelPair('pauseAreasFrom', 'pauseAreasTo', idx, 'from', v)}
            onToChange={(idx, v) => updateLevelPair('pauseAreasFrom', 'pauseAreasTo', idx, 'to', v)}
            fromMin={5}
            fromMax={300}
            toMin={5}
            toMax={300}
            step={5}
            formatValue={fmtSec}
            hintFrom={fmtSec}
            hintTo={fmtSec}
          />

          {/* Save / Cancel */}
          <div className="flex items-center gap-3 pt-1">
            <button onClick={handleSave2}
              className="px-8 py-2 bg-red-700 text-white rounded-lg font-semibold hover:bg-red-800 transition text-sm">
              Save
            </button>
            <button onClick={() => {
              setAllGoalParams(prev => {
                const updated = { ...prev };
                delete updated[selectedGoal];
                return updated;
              });
            }}
              className="px-8 py-2 bg-gray-700 text-white rounded-lg font-semibold hover:bg-gray-600 transition text-sm">
              Cancel
            </button>
            {saveMsg2 && <span className="text-sm text-green-700 font-medium">{saveMsg2}</span>}
          </div>
        </div>
      )}

      {/* Copy dialog */}
      {showCopyDialog && (
        <CopyGoalDialog
          currentGoal={selectedGoal}
          onCopy={handleCopyGoal}
          onClose={() => setShowCopyDialog(false)}
        />
      )}
    </div>
  );
}

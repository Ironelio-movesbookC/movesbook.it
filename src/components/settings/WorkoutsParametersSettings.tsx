'use client';

import Image from 'next/image';
import React, { useCallback, useEffect, useRef, useState } from 'react';

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
  volumeTo:   number[];
  repsFrom:   number;          
  repsTo:     number;
  repsFromProfessional: number;
  repsToProfessional: number;
  pctFrom:    number;          
  pctTo:      number;
  displayInPercent: boolean;
  pauseSeriesFrom:     number; 
  pauseSeriesTo:       number;
  pauseSeriesFromProfessional: number;
  pauseSeriesToProfessional: number;
  pauseExercisesFrom:  number;
  pauseExercisesTo:    number;
  pauseExercisesFromProfessional: number;
  pauseExercisesToProfessional: number;
  pauseAreasFrom:      number;
  pauseAreasTo:        number;
  pauseAreasFromProfessional: number;
  pauseAreasToProfessional: number;
}

type AllGoalParams = Partial<Record<Goal, GoalLoadParams>>;

// ─── defaults ────────────────────────────────────────────────────────────────

function buildInitialDeltas(): VolumeChangesByLevel {
  return TRAINING_LEVELS.reduce((a, l) => {
    a[l] = SESSIONS.reduce((s, n) => { s[n] = 0; return s; }, {} as SessionDeltas);
    return a;
  }, {} as VolumeChangesByLevel);
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
  return {
    volumeFrom: [20, 25, 30, 35, 40, 40],
    volumeTo: [40, 43, 46, 49, 52, 52],
    repsFrom:   10, repsTo: 22,
    repsFromProfessional: 15, repsToProfessional: 30,
    pctFrom:    repsToPercent(10), pctTo: repsToPercent(22),
    displayInPercent: false,
    pauseSeriesFrom: 60,    pauseSeriesTo: 90,
    pauseSeriesFromProfessional: 60, pauseSeriesToProfessional: 90,
    pauseExercisesFrom: 90, pauseExercisesTo: 120,
    pauseExercisesFromProfessional: 90, pauseExercisesToProfessional: 120,
    pauseAreasFrom: 120,    pauseAreasTo: 180,
    pauseAreasFromProfessional: 120, pauseAreasToProfessional: 180,
  };
}

function normalizeGoalParams(raw: Partial<GoalLoadParams> | undefined): GoalLoadParams {
  const d = buildDefaultGoalParams();
  const next = { ...d, ...(raw || {}) } as GoalLoadParams;
  const num = (v: unknown, fallback: number) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  };
  next.volumeFrom = Array.from({ length: 6 }, (_, i) => Number(next.volumeFrom?.[i] ?? d.volumeFrom[i]));
  next.volumeTo = Array.from({ length: 6 }, (_, i) => Number(next.volumeTo?.[i] ?? d.volumeTo[i]));
  next.volumeFrom[5] = Number(next.volumeFrom[5] ?? next.volumeFrom[4]);
  next.volumeTo[5] = Number(next.volumeTo[5] ?? next.volumeTo[4]);
  next.repsFrom = num(next.repsFrom, d.repsFrom);
  next.repsTo = num(next.repsTo, d.repsTo);
  next.repsFromProfessional = num(next.repsFromProfessional, d.repsFromProfessional);
  next.repsToProfessional = num(next.repsToProfessional, d.repsToProfessional);
  next.pctFrom = num(next.pctFrom, d.pctFrom);
  next.pctTo = num(next.pctTo, d.pctTo);
  next.pauseSeriesFrom = num(next.pauseSeriesFrom, d.pauseSeriesFrom);
  next.pauseSeriesTo = num(next.pauseSeriesTo, d.pauseSeriesTo);
  next.pauseSeriesFromProfessional = num(next.pauseSeriesFromProfessional, d.pauseSeriesFromProfessional);
  next.pauseSeriesToProfessional = num(next.pauseSeriesToProfessional, d.pauseSeriesToProfessional);
  next.pauseExercisesFrom = num(next.pauseExercisesFrom, d.pauseExercisesFrom);
  next.pauseExercisesTo = num(next.pauseExercisesTo, d.pauseExercisesTo);
  next.pauseExercisesFromProfessional = num(next.pauseExercisesFromProfessional, d.pauseExercisesFromProfessional);
  next.pauseExercisesToProfessional = num(next.pauseExercisesToProfessional, d.pauseExercisesToProfessional);
  next.pauseAreasFrom = num(next.pauseAreasFrom, d.pauseAreasFrom);
  next.pauseAreasTo = num(next.pauseAreasTo, d.pauseAreasTo);
  next.pauseAreasFromProfessional = num(next.pauseAreasFromProfessional, d.pauseAreasFromProfessional);
  next.pauseAreasToProfessional = num(next.pauseAreasToProfessional, d.pauseAreasToProfessional);
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

// ─── Pause row ───────────────────────────────────────────────────────────────

interface PauseRowProps {
  label: string;
  fromVal: number;
  toVal: number;
  onFromChange: (v: number) => void;
  onToChange: (v: number) => void;
}
function PauseRow({ label, fromVal, toVal, onFromChange, onToChange }: PauseRowProps) {
  return (
    <div className="flex items-start gap-6">
      {/* label */}
      <div className="w-44 flex-shrink-0 flex items-start pt-1">
        <span className="text-xs font-semibold border border-yellow-400 bg-yellow-50 text-gray-800 px-3 py-1 rounded">
          {label}
        </span>
      </div>
      {/* from / to */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 w-8 text-right">from</span>
          <Spinner
            value={fromVal} min={5} max={300} step={5}
            onChange={onFromChange}
            display={fmtSec(fromVal)}
            width="w-[72px]"
          />
          <span className="text-[10px] text-gray-400">{fmtSec(fromVal)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 w-8 text-right">to</span>
          <Spinner
            value={toVal} min={5} max={300} step={5}
            onChange={onToChange}
            display={fmtSec(toVal)}
            width="w-[72px]"
          />
          <span className="text-[10px] text-gray-400">{fmtSec(toVal)}</span>
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
  const goalParams: GoalLoadParams = allGoalParams[selectedGoal] ?? buildDefaultGoalParams();

  const updateGoalParams = useCallback(<K extends keyof GoalLoadParams>(key: K, value: GoalLoadParams[K]) => {
    setAllGoalParams(prev => ({
      ...prev,
      [selectedGoal]: { ...(prev[selectedGoal] ?? buildDefaultGoalParams()), [key]: value }
    }));
  }, [selectedGoal]);

  const updateVolume = useCallback((idx: number, field: 'volumeFrom' | 'volumeTo', value: number) => {
    setAllGoalParams(prev => {
      const cur = prev[selectedGoal] ?? buildDefaultGoalParams();
      const arr = [...cur[field]];
      arr[idx] = value;
      if (idx === 4) arr[5] = value;
      return { ...prev, [selectedGoal]: { ...cur, [field]: arr } };
    });
  }, [selectedGoal]);

  // toggle display mode - auto-convert current values
  const toggleDisplayInPercent = () => {
    const cur = goalParams;
    if (!cur.displayInPercent) {
      // switching to %: auto-calculate from reps
      setAllGoalParams(prev => ({
        ...prev,
        [selectedGoal]: {
          ...cur,
          pctFrom: repsToPercent(cur.repsFrom),
          pctTo: repsToPercent(cur.repsTo),
          displayInPercent: true,
        }
      }));
    } else {
      // switching back to reps: auto-calculate from %
      setAllGoalParams(prev => ({
        ...prev,
        [selectedGoal]: {
          ...cur,
          repsFrom: percentToReps(cur.pctFrom),
          repsTo: percentToReps(cur.pctTo),
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

          {/* ── Volume serie (per training level; First/Last period = yearly window endpoints) ── */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-3">
            <div className="flex items-start gap-6">
              <div className="w-44 flex-shrink-0 pt-1 space-y-2">
                <span className="inline-block text-sm font-semibold border border-yellow-400 bg-yellow-50 text-gray-900 px-3 py-1 rounded">
                  Volume serie
                </span>
                <p className="text-[11px] text-gray-500 leading-snug">
                  Reference total series range by athlete level. &quot;from&quot; / &quot;to&quot; align with First period through Last period across the yearly plan (same idea as Load Repeated / Pauses).
                </p>
              </div>
              <div className="flex flex-col gap-2 pt-1 flex-1 min-w-0">
                {LEVEL_BANDS.map((lv, idx) => (
                  <div key={lv} className="flex items-center gap-2 flex-wrap">
                    <span className={`w-28 text-[11px] font-bold px-2 py-0.5 rounded shrink-0 ${levelColors[lv]}`}>{lv}</span>
                    <span className="text-xs text-gray-500 w-8 text-right shrink-0">from</span>
                    <Spinner
                      value={goalParams.volumeFrom[idx] ?? 20}
                      min={1}
                      max={99}
                      onChange={(v) => updateVolume(idx, 'volumeFrom', v)}
                      width="w-[88px]"
                    />
                    <span className="text-xs text-gray-500 w-8 text-right shrink-0">to</span>
                    <Spinner
                      value={goalParams.volumeTo[idx] ?? 40}
                      min={1}
                      max={99}
                      onChange={(v) => updateVolume(idx, 'volumeTo', v)}
                      width="w-[88px]"
                    />
                  </div>
                ))}
                <div className="flex items-center gap-2 flex-wrap border-t border-gray-100 pt-2 mt-1">
                  <span className="w-28 shrink-0" aria-hidden />
                  <span className="text-xs text-gray-500 w-8 shrink-0" aria-hidden />
                  <span className="w-[88px] text-center text-[11px] font-semibold text-gray-800">First period</span>
                  <span className="text-xs text-gray-500 w-8 shrink-0" aria-hidden />
                  <span className="w-[88px] text-center text-[11px] font-semibold text-gray-800">Last period</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Load Repeated ── */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-3">
            <div className="flex items-start gap-6">
              <div className="w-44 flex-shrink-0 pt-1 space-y-2">
                <span className="block text-sm font-semibold border border-yellow-400 bg-yellow-50 text-gray-900 px-3 py-1 rounded text-center">
                  Load Repeated
                </span>
                {/* Display in % toggle */}
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" checked={goalParams.displayInPercent} onChange={toggleDisplayInPercent}
                    className="w-4 h-4 rounded border-gray-400 text-blue-600 focus:ring-blue-500" />
                  <span className="text-xs text-gray-700">Display in %</span>
                </label>
              </div>

              <div className="flex flex-col gap-2 pt-1">
                {goalParams.displayInPercent ? (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 w-8 text-right">from</span>
                      <Spinner value={goalParams.pctFrom} min={0} max={100} step={2.5}
                        onChange={v => updateGoalParams('pctFrom', v)}
                        display={`${goalParams.pctFrom}%`}
                        width="w-[80px]" />
                      <span className="text-[10px] text-gray-400">≈ {percentToReps(goalParams.pctFrom)} reps</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 w-8 text-right">to</span>
                      <Spinner value={goalParams.pctTo} min={0} max={100} step={2.5}
                        onChange={v => updateGoalParams('pctTo', v)}
                        display={`${goalParams.pctTo}%`}
                        width="w-[80px]" />
                      <span className="text-[10px] text-gray-400">≈ {percentToReps(goalParams.pctTo)} reps</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 w-8 text-right">from</span>
                      <Spinner value={goalParams.repsFrom} min={1} max={99}
                        onChange={v => updateGoalParams('repsFrom', v)}
                        width="w-[80px]" />
                      <span className="text-[10px] text-gray-400">≈ {repsToPercent(goalParams.repsFrom)}% of max</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 w-8 text-right">to</span>
                      <Spinner value={goalParams.repsTo} min={1} max={99}
                        onChange={v => updateGoalParams('repsTo', v)}
                        width="w-[80px]" />
                      <span className="text-[10px] text-gray-400">≈ {repsToPercent(goalParams.repsTo)}% of max</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* ── Pauses ── */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-5">
            <PauseRow label="Pause among the series"
              fromVal={goalParams.pauseSeriesFrom}   onFromChange={v => updateGoalParams('pauseSeriesFrom', v)}
              toVal={goalParams.pauseSeriesTo}        onToChange={v => updateGoalParams('pauseSeriesTo', v)} />
            <div className="border-t border-gray-100" />
            <PauseRow label="Pause among exercises"
              fromVal={goalParams.pauseExercisesFrom} onFromChange={v => updateGoalParams('pauseExercisesFrom', v)}
              toVal={goalParams.pauseExercisesTo}     onToChange={v => updateGoalParams('pauseExercisesTo', v)} />
            <div className="border-t border-gray-100" />
            <PauseRow label="Pause among areas"
              fromVal={goalParams.pauseAreasFrom}     onFromChange={v => updateGoalParams('pauseAreasFrom', v)}
              toVal={goalParams.pauseAreasTo}         onToChange={v => updateGoalParams('pauseAreasTo', v)} />
          </div>

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

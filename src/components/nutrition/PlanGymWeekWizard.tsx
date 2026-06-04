'use client';

/**
 * Plan Gym Week Wizard
 * Flow: Q1 (how many days 1-6) + helped vs manual → if helped: Q2, Q3, Q4 → if manual: day-by-day sector form → then open Fast Plan.
 * Space left for AI-generated images beside each question.
 */

import React, { useState } from 'react';
import Image from 'next/image';
import { X, ChevronUp, ChevronDown, Trash2, Calendar } from 'lucide-react';
import {
  FAST_PLANNER_REST_PAUSE_OPTIONS,
  PLAN_GYM_WEEK_MACRO_MINUTE_LABELS,
} from '@/constants/nutrition-food.constants';

function isMacroMinuteLabel(s: string): boolean {
  return PLAN_GYM_WEEK_MACRO_MINUTE_LABELS.includes(String(s ?? '').trim());
}

const PLAN_DAYS_MIN = 1;
const PLAN_DAYS_MAX = 6;
const TOTAL_AREAS = 12; // MUSCLE_GROUPS.length

// Muscle groups for manual selection (match Fast Plan grid)
const MUSCLE_GROUPS = [
  { id: 'shoulders', label: 'Shoulders', sector: 'Shoulders', image: '/muscular/shoulders.png' },
  { id: 'biceps', label: 'Biceps', sector: 'Anterior arms', image: '/muscular/Biceps.png' },
  { id: 'triceps', label: 'Triceps', sector: 'Rear arms', image: '/muscular/Triceps.png' },
  { id: 'forearms', label: 'Forearms', sector: 'Forearms', image: '/muscular/Forearms.png' },
  { id: 'chest', label: 'Chest', sector: 'Chest', image: '/muscular/chest.png' },
  { id: 'lats', label: 'Lats', sector: 'Lats', image: '/muscular/Lats.png' },
  { id: 'trapezius', label: 'Trapezius', sector: 'Trapezius', image: '/muscular/trapezius.png' },
  { id: 'abs', label: 'Abdominals', sector: 'Abdominals', image: '/muscular/abs.png' },
  { id: 'quadriceps', label: 'Quadriceps', sector: 'Front thighs', image: '/muscular/quadriceps.png' },
  { id: 'glutes', label: 'Glutes', sector: 'Glutes', image: '/muscular/glutes.png' },
  { id: 'hams', label: 'Hamstrings', sector: 'Hind thighs', image: '/muscular/hams.png' },
  { id: 'calves', label: 'Calves', sector: 'Calves', image: '/muscular/calves.png' }
];

// Ordered list 01–12 for distribution (Shoulder, Biceps, Triceps, Forearms, Chest, Abdominals, Trapezius, Lats, Quadriceps, Gluteus, Hamstrings, Calves)
const ORDERED_SECTOR_IDS = ['shoulders', 'biceps', 'triceps', 'forearms', 'chest', 'abs', 'trapezius', 'lats', 'quadriceps', 'glutes', 'hams', 'calves'] as const;

// Distribution type A/B/C: two groups of sector ids (used after removing 1–2 constant areas). Routine A gets group1, Routine B gets group2.
const DISTRIBUTION_GROUPS: Record<'A' | 'B' | 'C', { label1: string; ids1: readonly string[]; label2: string; ids2: readonly string[] }> = {
  A: {
    label1: 'A1 – Large',
    ids1: ['chest', 'abs', 'lats', 'quadriceps', 'glutes', 'hams'],
    label2: 'A2 – Small',
    ids2: ['shoulders', 'biceps', 'triceps', 'forearms', 'trapezius', 'calves']
  },
  B: {
    label1: 'B1 – Agonist',
    ids1: ['shoulders', 'biceps', 'forearms', 'chest', 'abs', 'quadriceps'],
    label2: 'B2 – Antagonist',
    ids2: ['triceps', 'trapezius', 'lats', 'glutes', 'hams', 'calves']
  },
  C: {
    label1: 'C1 – Pushing muscles',
    ids1: ['shoulders', 'triceps', 'chest', 'quadriceps', 'glutes', 'calves'],
    label2: 'C2 – Pulling muscles',
    ids2: ['biceps', 'forearms', 'abs', 'trapezius', 'lats', 'hams']
  }
};

type DistributionType = 'A' | 'B' | 'C' | 'D' | null;

export interface DayPlanManual {
  routineName: string;
  sectors: {
    sectorId: string;
    sectorLabel: string;
    sectorKey: string;
    exercises: number;
    series: number;
    reps: number;
    pause: string;
    macroExercise: string;   // pause after last serie of an exercise
    macroEndOfSector: string; // pause after last serie of last exercise of sector (priority)
  }[];
}

export interface PlanGymWeekResult {
  numDays: number;
  helped: boolean;
  /** Reference training level (for automatic planning). */
  referenceLevel?: string;
  /** Goal per workout day 1..numDays (for automatic planning). */
  goals?: string[];
  // If helped:
  timesPerSector?: 'once' | '2' | '3' | 'all';
  distribution?: DistributionType;
  constantSectors?: string[]; // 1 sector for 1-2-3 days, 2 for 4-5-6
  // If manual:
  days?: DayPlanManual[];
}

const REFERENCE_LEVEL_OPTIONS = [
  { value: '', label: 'Select level…' },
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
  { value: 'elite', label: 'Elite' },
  { value: 'professional', label: 'Professional' }
];

/** Workouts suggested range by training level (displayed in mask). */
const WORKOUTS_SUGGESTED_BY_LEVEL: Record<string, string> = {
  beginner: '1-2',
  intermediate: '2-3',
  advanced: '2-4',
  elite: '3-4',
  professional: '4-6'
};

/** Training level images in public/images. */
const REFERENCE_LEVEL_IMAGES: Record<string, string> = {
  beginner: '/images/beginner.jpg',
  intermediate: '/images/intermediate.jpg',
  advanced: '/images/advanced.jpg',
  elite: '/images/elite.jpg',
  professional: '/images/professional.jpg'
};

const GOAL_OPTIONS = [
  { value: '', label: 'Select goal…' },
  { value: 'maximum_strength', label: 'Maximum strength (e.g., powerlifting, weightlifting)' },
  { value: 'muscle_hypertrophy', label: 'Muscle hypertrophy (increase in muscle mass)' },
  { value: 'muscle_endurance', label: 'Muscle endurance (e.g., endurance, toning)' },
  { value: 'explosive_power', label: 'Explosive power (e.g., for sports like soccer, basketball)' },
  { value: 'mobility_flexibility', label: 'Mobility and flexibility (with accessory exercises)' },
  { value: 'injury_prevention', label: 'Injury prevention (e.g., strengthening the core and stabilizers)' },
  { value: 'fat_loss', label: 'Fat loss (combined with diet and cardio)' }
];

/** Last planned workout stats for a sector (from the last previous nutritionFood with that sector). */
export interface LastWorkoutBySector {
  date: string;           // e.g. "12 Jan 2026"
  series: number;
  aveRepPerSet: number;
  totalReps: number;
  pause: string;          // e.g. "1'30\""
}

interface PlanGymWeekWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (result: PlanGymWeekResult) => void;
  /** Keyed by sector name (e.g. "Shoulders", "Anterior arms"). Displayed in each sector card in manual path. */
  lastWorkoutBySector?: Record<string, LastWorkoutBySector>;
}

export default function PlanGymWeekWizard({ isOpen, onClose, onComplete, lastWorkoutBySector = {} }: PlanGymWeekWizardProps) {
  const [step, setStep] = useState<'mask' | 'q1' | 'helped' | 'manual'>('mask');
  const [numDays, setNumDays] = useState(3);
  const [helped, setHelped] = useState<boolean>(true);

  // Mask: level and goals (for automatic planning)
  const [referenceLevel, setReferenceLevel] = useState('');
  const [goals, setGoals] = useState<string[]>(() => Array(6).fill(''));
  const [putGoalForAll, setPutGoalForAll] = useState(false);

  // Helped path
  const [timesPerSector, setTimesPerSector] = useState<'once' | '2' | '3' | 'all'>('once');
  const [distribution, setDistribution] = useState<DistributionType>(null);
  const [constantSectors, setConstantSectors] = useState<string[]>([]);
  const [lastScannedAt, setLastScannedAt] = useState<number | null>(null);

  // Manual path: per-day plans
  const [manualDays, setManualDays] = useState<DayPlanManual[]>(() =>
    Array.from({ length: 3 }, (_, i) => ({
      routineName: '',
      sectors: []
    }))
  );
  const [activeDayIndex, setActiveDayIndex] = useState(0);

  const constantSectorsKey = constantSectors.join(',');
  // When criteria change, clear "last scanned" so user knows to press Scan areas again
  React.useEffect(() => {
    setLastScannedAt(null);
  }, [numDays, timesPerSector, distribution, constantSectorsKey]);

  if (!isOpen) return null;

  const clampDays = (n: number) => Math.max(PLAN_DAYS_MIN, Math.min(PLAN_DAYS_MAX, n));

  const handleMaskContinue = () => {
    const n = clampDays(numDays);
    setNumDays(n);
    setGoals(prev => {
      const next = [...prev];
      while (next.length < 6) next.push('');
      return next.slice(0, 6);
    });
    setStep('q1');
  };

  const setGoalForDay = (dayIndex: number, value: string) => {
    setGoals(prev => {
      const next = [...prev];
      while (next.length < 6) next.push('');
      next[dayIndex] = value;
      if (putGoalForAll && dayIndex === 0) for (let i = 1; i < next.length; i++) next[i] = value;
      return next;
    });
  };

  const handleQ1Next = () => {
    const n = clampDays(numDays);
    setNumDays(n);
    if (helped) {
      setStep('helped');
    } else {
      setStep('manual');
      setManualDays(Array.from({ length: n }, (_, i) => manualDays[i] ?? { routineName: '', sectors: [] }));
      setActiveDayIndex(0);
    }
  };

  const handleHelpedConfirm = () => {
    onComplete({
      numDays,
      helped: true,
      referenceLevel: referenceLevel || undefined,
      goals: goals.slice(0, numDays).some(g => g) ? goals.slice(0, numDays) : undefined,
      timesPerSector,
      distribution: distribution ?? undefined,
      constantSectors: constantSectors.length > 0 ? constantSectors : undefined
    });
    onClose();
  };

  const addSectorToDay = (dayIdx: number, group: (typeof MUSCLE_GROUPS)[0]) => {
    if (manualDays[dayIdx].sectors.some(s => s.sectorId === group.id)) return;
    setManualDays(prev => {
      const next = [...prev];
      next[dayIdx] = {
        ...next[dayIdx],
        sectors: [
          ...next[dayIdx].sectors,
          {
            sectorId: group.id,
            sectorLabel: group.label,
            sectorKey: group.sector,
            exercises: 2,
            series: 3,
            reps: 12,
            pause: "1'30\"",
            macroExercise: "1'",
            macroEndOfSector: "2'"
          }
        ]
      };
      return next;
    });
  };

  const removeSectorFromDay = (dayIdx: number, sectorIdx: number) => {
    setManualDays(prev => {
      const next = [...prev];
      next[dayIdx] = { ...next[dayIdx], sectors: next[dayIdx].sectors.filter((_, i) => i !== sectorIdx) };
      return next;
    });
  };

  const moveSector = (dayIdx: number, fromIdx: number, dir: 'up' | 'down') => {
    setManualDays(prev => {
      const next = [...prev];
      const arr = [...next[dayIdx].sectors];
      const toIdx = dir === 'up' ? fromIdx - 1 : fromIdx + 1;
      if (toIdx < 0 || toIdx >= arr.length) return prev;
      [arr[fromIdx], arr[toIdx]] = [arr[toIdx], arr[fromIdx]];
      next[dayIdx] = { ...next[dayIdx], sectors: arr };
      return next;
    });
  };

  const updateSectorField = (dayIdx: number, sectorIdx: number, field: keyof DayPlanManual['sectors'][0], value: number | string) => {
    setManualDays(prev => {
      const next = [...prev];
      const sectors = [...next[dayIdx].sectors];
      const cur = sectors[sectorIdx];
      if (!cur) return prev;

      if (field === 'exercises') {
        const v = typeof value === 'number' ? value : parseInt(String(value), 10);
        if (!Number.isFinite(v)) return prev;
        let ex = Math.max(1, Math.min(20, Math.floor(v)));
        let series = Math.max(cur.series, ex);
        series = Math.min(20, series);
        ex = Math.min(ex, series);
        sectors[sectorIdx] = { ...cur, exercises: ex, series };
      } else if (field === 'series') {
        const v = typeof value === 'number' ? value : parseInt(String(value), 10);
        if (!Number.isFinite(v)) return prev;
        let series = Math.max(1, Math.min(20, Math.floor(v)));
        series = Math.max(series, cur.exercises);
        const exercises = Math.min(cur.exercises, series);
        sectors[sectorIdx] = { ...cur, series, exercises };
      } else {
        sectors[sectorIdx] = { ...cur, [field]: value };
      }

      next[dayIdx] = { ...next[dayIdx], sectors };
      return next;
    });
  };

  const setRoutineName = (dayIdx: number, name: string) => {
    setManualDays(prev => {
      const next = [...prev];
      next[dayIdx] = { ...next[dayIdx], routineName: name };
      return next;
    });
  };

  const handleManualCreate = () => {
    onComplete({
      numDays,
      helped: false,
      referenceLevel: referenceLevel || undefined,
      goals: goals.slice(0, numDays).some(g => g) ? goals.slice(0, numDays) : undefined,
      days: manualDays
    });
    onClose();
  };

  const handleResetAll = () => {
    setStep('mask');
    setNumDays(3);
    setHelped(true);
    setReferenceLevel('');
    setGoals(Array(6).fill(''));
    setPutGoalForAll(false);
    setManualDays(Array.from({ length: 3 }, () => ({ routineName: '', sectors: [] })));
    setDistribution(null);
    setConstantSectors([]);
  };

  const showQ4 = distribution !== null && distribution !== 'D';
  const constantSectorsRequired = numDays <= 3 ? 1 : 2;

  // Distribution preview: areas to distribute and per-workout split (helped path only)
  const constantCount = showQ4 ? constantSectorsRequired : 0;
  const areasToDistribute = TOTAL_AREAS - constantCount;
  const divisorForTimes = timesPerSector === 'once' ? numDays : timesPerSector === '2' || timesPerSector === '3' ? 2 : 1;
  const divisionExample = timesPerSector === 'once'
    ? `${areasToDistribute} : ${numDays} = ${numDays === 1 ? areasToDistribute : (areasToDistribute / numDays).toFixed(1)}`
    : timesPerSector === 'all'
      ? null
      : `${areasToDistribute} : ${divisorForTimes} = ${Math.floor(areasToDistribute / divisorForTimes)}`;

  type DistRow =
    | { workoutIndex: number; routineLabel: string; areasCount: number; constantLabel: string; weekLabel?: undefined }
    | { weekLabel: string; routineLabel: string; areasCount: number; constantLabel: string; workoutIndex?: undefined };
  const distributionRows: DistRow[] = (() => {
    if (timesPerSector === 'all') {
      return Array.from({ length: 6 }, (_, i) => ({
        weekLabel: i === 0 ? '1 workout' : `${i + 1} workouts`,
        routineLabel: 'A',
        areasCount: TOTAL_AREAS,
        constantLabel: '0 constant areas'
      }));
    }
    const const1 = constantCount >= 1 ? '1st constant area' : '0 constant areas';
    const const2 = constantCount >= 2 ? '2nd constant area' : const1;
    const bothConst = constantCount >= 2 ? '2 constant areas' : const1;
    if (timesPerSector === 'once') {
      if (numDays === 1) {
        return [{ workoutIndex: 1, routineLabel: 'A', areasCount: 12, constantLabel: '0 constant areas' }];
      }
      const per = Math.floor(areasToDistribute / numDays);
      const remainder = areasToDistribute - per * numDays;
      // Distribute remainder: 2 workouts → [5,6]; 3 → [4,3,4]; 4 → [2,3,2,3]; 5 → [2,2,2,2,2]; 6 → [2,2,2,2,2,2]
      const getsExtra = (i: number) =>
        numDays === 2 ? (i === 1 && remainder > 0) :
        numDays === 4 ? (i % 2 === 1 && Math.floor(i / 2) < remainder) :
        (i % 2 === 0 && i / 2 < remainder);
      const counts = Array.from({ length: numDays }, (_, i) => per + (getsExtra(i) ? 1 : 0));
      return counts.map((areasCount, i) => ({
        workoutIndex: i + 1,
        routineLabel: String.fromCharCode(65 + i),
        areasCount,
        constantLabel: numDays === 6 && i === 5 ? bothConst : i % 2 === 0 ? const1 : const2
      }));
    }
    if (timesPerSector === '2' || timesPerSector === '3') {
      const routineCount = 2;
      const areasPerRoutine = Math.floor(areasToDistribute / 2);
      if (numDays === 2) {
        return [
          { workoutIndex: 1, routineLabel: 'A', areasCount: TOTAL_AREAS, constantLabel: '0 constant areas' },
          { workoutIndex: 2, routineLabel: 'A', areasCount: TOTAL_AREAS, constantLabel: '0 constant areas' }
        ];
      }
      const labels = ['A', 'B'] as const;
      return Array.from({ length: numDays }, (_, i) => ({
        workoutIndex: i + 1,
        routineLabel: labels[i % 2],
        areasCount: areasPerRoutine,
        constantLabel: i % 2 === 0 ? const1 : const2
      }));
    }
    return [];
  })();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className={`sticky top-0 px-4 py-3 flex items-center justify-between ${step === 'mask' ? 'bg-blue-600 text-white' : 'bg-white border-b border-gray-200'}`}>
          <h2 className="text-lg font-bold">{step === 'mask' ? 'Weekly gym workout planning' : 'Plan gym week'}</h2>
          <button type="button" onClick={onClose} className="p-1 rounded hover:bg-black/10" aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-6">
          {/* ========== STEP: Mask – Level, number of days, goals ========== */}
          {step === 'mask' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-[1fr,1fr,auto] gap-4 items-start">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reference level</label>
                  <select
                    value={referenceLevel}
                    onChange={(e) => setReferenceLevel(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
                  >
                    {REFERENCE_LEVEL_OPTIONS.map((opt) => (
                      <option key={opt.value || 'empty'} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Workouts suggested</label>
                  <div className="h-10 px-3 py-2 border border-amber-300 rounded-md bg-amber-50 text-gray-800 font-medium flex items-center">
                    {referenceLevel ? (WORKOUTS_SUGGESTED_BY_LEVEL[referenceLevel] ?? '—') : '—'}
                  </div>
                </div>
                {referenceLevel && REFERENCE_LEVEL_IMAGES[referenceLevel] && (
                  <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-lg overflow-hidden border border-gray-200 flex-shrink-0">
                    <Image src={REFERENCE_LEVEL_IMAGES[referenceLevel]} alt={REFERENCE_LEVEL_OPTIONS.find(o => o.value === referenceLevel)?.label ?? referenceLevel} fill className="object-cover" />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select the number of days of workout in gym</label>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center border border-gray-300 rounded-md overflow-hidden">
                    <input
                      type="number"
                      min={PLAN_DAYS_MIN}
                      max={PLAN_DAYS_MAX}
                      value={numDays}
                      onChange={(e) => setNumDays(clampDays(parseInt(e.target.value, 10) || 1))}
                      className="w-14 px-2 py-1.5 text-center border-0 focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                    <div className="flex flex-col border-l border-gray-300">
                      <button type="button" onClick={() => setNumDays(prev => clampDays(prev + 1))} className="p-0.5 hover:bg-gray-100 text-xs">▲</button>
                      <button type="button" onClick={() => setNumDays(prev => clampDays(prev - 1))} className="p-0.5 hover:bg-gray-100 text-xs">▼</button>
                    </div>
                    <button type="button" onClick={() => setNumDays(PLAN_DAYS_MIN)} className="px-1.5 py-0.5 border-l border-gray-300 hover:bg-gray-100 text-gray-500 text-xs" title="Clear">×</button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[1, 2, 3, 4, 5, 6].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setNumDays(n)}
                        className={`w-12 h-12 rounded-lg text-base font-bold ${n <= numDays ? 'bg-amber-400 text-amber-900' : 'bg-gray-200 text-gray-500'}`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select your goal (one per day — only the number of days selected above)</label>
                <div className="space-y-2">
                  {Array.from({ length: numDays }, (_, i) => (
                    <React.Fragment key={i}>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex min-w-[1.75rem] items-center justify-center rounded border border-amber-200 bg-amber-50 px-1.5 py-1 text-sm font-semibold text-amber-900">
                          {i + 1}
                        </span>
                        <select
                          value={putGoalForAll ? goals[0] : goals[i]}
                          onChange={(e) => setGoalForDay(putGoalForAll ? 0 : i, e.target.value)}
                          className="min-w-0 flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                        >
                          {GOAL_OPTIONS.map((opt) => (
                            <option key={opt.value || 'empty'} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      {i === 0 ? (
                        <label
                          className="ml-[2.35rem] inline-flex cursor-pointer items-center gap-2 rounded-md border border-transparent px-0.5 py-0.5 hover:bg-gray-50"
                          title="Put this goal for all the workouts"
                        >
                          <input
                            type="checkbox"
                            checked={putGoalForAll}
                            onChange={(e) => {
                              setPutGoalForAll(e.target.checked);
                              if (e.target.checked) setGoals((prev) => Array(6).fill(prev[0] ?? ''));
                            }}
                            className="h-4 w-4 shrink-0 rounded border-gray-300"
                            aria-label="Put this goal for all the workouts"
                          />
                          <span className="text-xs leading-tight text-gray-700 sm:text-sm">
                            Put this goal for all the workouts
                          </span>
                        </label>
                      ) : null}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700">
                  Cancel
                </button>
                <button type="button" onClick={handleMaskContinue} className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 font-medium">
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* ========== STEP: Q1 + Helped vs Manual ========== */}
          {step === 'q1' && (
            <>
              <button type="button" onClick={() => setStep('mask')} className="text-sm text-blue-600 hover:underline">← Back</button>
              <div className="grid grid-cols-1 md:grid-cols-[1fr,auto] gap-4 items-start">
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">QUESTION #1</h3>
                  <p className="text-sm text-gray-800 mb-3">How many days do you want to plan?</p>
                  <p className="text-xs text-gray-500 mb-3">1 – 2 – 3 – 4 – 5 – 6</p>
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-700">Number of days</label>
                    <div className="flex items-center border border-gray-300 rounded-md overflow-hidden">
                      <input
                        type="number"
                        min={PLAN_DAYS_MIN}
                        max={PLAN_DAYS_MAX}
                        value={numDays}
                        onChange={(e) => setNumDays(clampDays(parseInt(e.target.value, 10) || 1))}
                        className="w-16 px-2 py-1.5 text-center border-0 focus:ring-2 focus:ring-blue-500"
                      />
                      <div className="flex flex-col border-l border-gray-300">
                        <button type="button" onClick={() => setNumDays(prev => clampDays(prev + 1))} className="p-0.5 hover:bg-gray-100">▲</button>
                        <button type="button" onClick={() => setNumDays(prev => clampDays(prev - 1))} className="p-0.5 hover:bg-gray-100">▼</button>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="min-h-[120px] w-32 rounded-lg border border-gray-200 bg-gray-50 flex flex-col items-center justify-center gap-2 p-3">
                  <Calendar className="w-12 h-12 text-blue-600" strokeWidth={1.5} />
                  <div className="flex flex-wrap justify-center gap-1">
                    {[1, 2, 3, 4, 5, 6].map((n) => (
                      <span
                        key={n}
                        className={`inline-flex h-7 w-7 items-center justify-center rounded text-xs font-semibold ${n <= numDays ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}
                      >
                        {n}
                      </span>
                    ))}
                  </div>
                  <span className="text-[10px] text-gray-500">days</span>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <p className="text-sm font-semibold text-gray-700 mb-2">Do you want to proceed to select the muscular sectors manually or you want to be helped in the selection?</p>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="helped" checked={helped} onChange={() => setHelped(true)} className="rounded-full" />
                    <span className="text-sm">I want to be helped</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="helped" checked={!helped} onChange={() => setHelped(false)} className="rounded-full" />
                    <span className="text-sm">I select manually</span>
                  </label>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Only if you select &quot;I want to be helped&quot; will the other questions (Q2, Q3, Q4) be shown. If you select &quot;I select manually&quot; you go directly to the day-by-day routine form.
                </p>
              </div>

              <div className="flex justify-end">
                <button type="button" onClick={handleQ1Next} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
                  Next
                </button>
              </div>
            </>
          )}

          {/* ========== STEP: Helped – Q2, Q3, Q4 ========== */}
          {step === 'helped' && (
            <>
              <button type="button" onClick={() => setStep('q1')} className="text-sm text-blue-600 hover:underline">← Back</button>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-[1fr,auto] gap-4 items-start">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">QUESTION #2</h3>
                    <p className="text-sm text-gray-800 mb-2">How many times do you want to train each muscular group?</p>
                    <p className="text-xs text-gray-600 mb-2">You must refer to the section below for your case (e.g. 2 times a week on a total of 4 workouts).</p>
                    <div className="space-y-1">
                      {[
                        { value: 'once' as const, label: 'Once'},
                        { value: '2' as const, label: '2'},
                        { value: '3' as const, label: '3'},
                        { value: 'all' as const, label: 'All the times'}
                      ].map(({ value, label }) => (
                        <label key={value} className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" name="times" checked={timesPerSector === value} onChange={() => setTimesPerSector(value)} className="rounded-full" />
                          <span className="text-sm">{label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="relative w-32 h-32 md:w-40 md:h-40 rounded-lg overflow-hidden border-y border-gray-200 border-x-0 flex-shrink-0">
                    <Image src="/plan-gym-week/q2.jpg" alt="Question 2" fill className="border-0 object-cover outline-none ring-0" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-[1fr,auto] gap-4 items-start">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">QUESTION #3</h3>
                    <p className="text-sm text-gray-800 mb-2">Which type of distribution of muscular areas to train do you prefer?</p>
                    <div className="space-y-1">
                      {[
                        { value: 'A' as const, label: 'A – Large muscles with small muscles' },
                        { value: 'B' as const, label: 'B – Agonist muscles with antagonist muscles' },
                        { value: 'C' as const, label: 'C – Pushing muscles with pulling muscles' },
                        { value: 'D' as const, label: 'D – My favorite distribution, if any exists' }
                      ].map(({ value, label }) => (
                        <label key={value} className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" name="dist" checked={distribution === value} onChange={() => setDistribution(value)} className="rounded-full" />
                          <span className="text-sm">{label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="relative w-32 h-32 md:w-40 md:h-40 rounded-lg overflow-hidden border-y border-gray-200 border-x-0 flex-shrink-0">
                    <Image src="/plan-gym-week/q3.jpg" alt="Question 3" fill className="border-0 object-cover outline-none ring-0" />
                  </div>
                </div>

                {showQ4 && (
                  <div className="grid grid-cols-1 md:grid-cols-[1fr,auto] gap-4 items-start">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 mb-2">QUESTION #4</h3>
                      <p className="text-sm text-gray-800 mb-2">Do you want to keep constant the training of a sector? Select what sector…</p>
                      <p className="text-xs text-gray-500 mb-2">
                        {numDays <= 3 ? 'Put 1 sector mandatorily for number of workouts = 1–2–3.' : 'Put 2 sectors mandatorily for number of workouts = 4–5–6.'}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {MUSCLE_GROUPS.map(g => (
                          <button
                            key={g.id}
                            type="button"
                            onClick={() => {
                              setConstantSectors(prev => {
                                const has = prev.includes(g.sector);
                                if (has) return prev.filter(s => s !== g.sector);
                                if (prev.length >= constantSectorsRequired) {
                                  // Keep the newest picks when max count reached (lets user switch away from current selection).
                                  return [...prev.slice(1), g.sector];
                                }
                                return [...prev, g.sector];
                              });
                            }}
                            className={`px-3 py-1.5 text-xs rounded border ${
                              constantSectors.includes(g.sector) ? 'bg-blue-100 border-blue-500 text-blue-800' : 'bg-gray-50 border-gray-300'
                            }`}
                          >
                            {g.label}
                          </button>
                        ))}
                      </div>
                      {constantSectors.length > 0 && (
                        <p className="text-xs text-gray-600 mt-2">Selected: {constantSectors.join(', ')}</p>
                      )}
                    </div>
                    <div className="relative w-32 h-32 md:w-40 md:h-40 rounded-lg overflow-hidden border-y border-gray-200 border-x-0 flex-shrink-0">
                      <Image src="/plan-gym-week/q4.jpg" alt="Question 4" fill className="border-0 object-cover outline-none ring-0" />
                    </div>
                  </div>
                )}

                <div className="flex gap-2 justify-end">
                  <button type="button" onClick={() => setStep('q1')} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Back</button>
                  <button type="button" onClick={handleHelpedConfirm} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium">
                    Confirm and create routines
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ========== STEP: Manual – Day tabs + sectors ========== */}
          {step === 'manual' && (
            <>
              <button type="button" onClick={() => setStep('q1')} className="text-sm text-blue-600 hover:underline">← Back</button>
              <p className="text-xs text-gray-500">You chose &quot;I select manually&quot; — go directly to the day-by-day routine form below.</p>

              <div className="border border-gray-300 rounded-lg overflow-hidden">
                <div className="flex border-b border-gray-300 bg-gray-100">
                  {manualDays.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setActiveDayIndex(i)}
                      className={`px-4 py-2 text-sm font-medium ${activeDayIndex === i ? 'bg-white border-b-2 border-blue-500 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                      Day {i + 1}
                    </button>
                  ))}
                </div>

                <div className="p-4 space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="text-sm font-semibold text-gray-700">Routine name</label>
                    <input
                      type="text"
                      value={manualDays[activeDayIndex].routineName}
                      onChange={(e) => setRoutineName(activeDayIndex, e.target.value)}
                      placeholder="Name for this day's routine"
                      className="flex-1 min-w-[200px] px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div className="text-sm text-gray-600">
                    <span className="font-medium text-gray-700">Goal for this day:</span>{' '}
                    {GOAL_OPTIONS.find(o => o.value === (putGoalForAll ? goals[0] : goals[activeDayIndex]))?.label || '—'}
                  </div>

                  <p className="text-sm text-gray-700">
                    Select the muscular area you want to train this day
                  </p>

                  {/* Selected sectors with reorder / remove and fields */}
                  <div className="space-y-3">
                    {manualDays[activeDayIndex].sectors.map((sec, secIdx) => {
                        const lastWorkout = lastWorkoutBySector[sec.sectorKey] ?? lastWorkoutBySector[sec.sectorLabel];
                        return (
                      <div key={sec.sectorId} className="border border-gray-200 rounded-lg p-3 bg-gray-50 flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-1">
                          <button type="button" onClick={() => moveSector(activeDayIndex, secIdx, 'up')} disabled={secIdx === 0} className="p-1 rounded hover:bg-gray-200 disabled:opacity-40">
                            <ChevronUp size={16} />
                          </button>
                          <button type="button" onClick={() => moveSector(activeDayIndex, secIdx, 'down')} disabled={secIdx === manualDays[activeDayIndex].sectors.length - 1} className="p-1 rounded hover:bg-gray-200 disabled:opacity-40">
                            <ChevronDown size={16} />
                          </button>
                        </div>
                        <div className="w-10 h-10 relative rounded overflow-hidden bg-white border border-gray-200 flex-shrink-0">
                          <Image src={MUSCLE_GROUPS.find(m => m.id === sec.sectorId)?.image ?? '/muscular/shoulders.png'} alt={sec.sectorLabel} fill className="object-contain" />
                        </div>
                        <span className="font-medium text-gray-800">{sec.sectorLabel}</span>
                        {lastWorkout && (
                          <div className="text-xs text-gray-600 bg-blue-50 border border-blue-200 rounded px-2 py-1.5 flex flex-wrap gap-x-3 gap-y-0.5">
                            <span className="font-semibold text-blue-800">Last workout {lastWorkout.date}</span>
                            <span>{lastWorkout.series} series</span>
                            <span>AveRep/set {lastWorkout.aveRepPerSet}</span>
                            <span>Total Reps {lastWorkout.totalReps}</span>
                            <span>Pause {lastWorkout.pause}</span>
                          </div>
                        )}
                        <div className="flex flex-wrap gap-2 items-center">
                          <select
                            value={sec.exercises}
                            onChange={(e) => updateSectorField(activeDayIndex, secIdx, 'exercises', parseInt(e.target.value, 10))}
                            className="text-xs border border-gray-300 rounded px-2 py-1"
                            title="Cannot exceed Series"
                          >
                            {Array.from({ length: Math.max(1, sec.series) }, (_, i) => i + 1).map((n) => (
                              <option key={n} value={n}>
                                Exercises {n}
                              </option>
                            ))}
                          </select>
                          <select
                            value={sec.series}
                            onChange={(e) => updateSectorField(activeDayIndex, secIdx, 'series', parseInt(e.target.value, 10))}
                            className="text-xs border border-gray-300 rounded px-2 py-1"
                            title="Cannot go below Exercises"
                          >
                            {Array.from({ length: 20 - Math.max(0, sec.exercises) + 1 }, (_, i) => sec.exercises + i).map((n) => (
                              <option key={n} value={n}>
                                Series {n}
                              </option>
                            ))}
                          </select>
                          <select
                            value={Math.min(50, Math.max(1, Number(sec.reps) || 12))}
                            onChange={(e) =>
                              updateSectorField(activeDayIndex, secIdx, 'reps', parseInt(e.target.value, 10))
                            }
                            className="text-xs border border-gray-300 rounded px-2 py-1 min-w-[5.5rem]"
                            title="Reps 1–50"
                          >
                            {Array.from({ length: 50 }, (_, i) => i + 1).map((n) => (
                              <option key={n} value={n}>
                                Reps {n}
                              </option>
                            ))}
                          </select>
                          <label className="flex items-center gap-1 text-xs text-gray-600">
                            Pause
                            <select
                              value={
                                FAST_PLANNER_REST_PAUSE_OPTIONS.includes(sec.pause)
                                  ? sec.pause
                                  : "1'30\""
                              }
                              onChange={(e) =>
                                updateSectorField(activeDayIndex, secIdx, 'pause', e.target.value)
                              }
                              className="border border-gray-300 rounded px-2 py-1 text-xs min-w-[4.75rem]"
                              title="Rest between sets — same options as Fast Not Aerobic Plan"
                            >
                              <option value="">—</option>
                              {FAST_PLANNER_REST_PAUSE_OPTIONS.map((p) => (
                                <option key={p} value={p}>
                                  {p}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label
                            className="flex items-center gap-1 text-xs text-gray-600"
                            title="Pause after the last serie of an exercise"
                          >
                            Macro exercises
                            <select
                              value={
                                sec.macroExercise.trim() === ''
                                  ? ''
                                  : isMacroMinuteLabel(sec.macroExercise)
                                    ? sec.macroExercise.trim()
                                    : "1'"
                              }
                              onChange={(e) =>
                                updateSectorField(activeDayIndex, secIdx, 'macroExercise', e.target.value)
                              }
                              className="border border-gray-300 rounded px-2 py-1 text-xs min-w-[3.25rem]"
                            >
                              <option value="">—</option>
                              {PLAN_GYM_WEEK_MACRO_MINUTE_LABELS.map((m) => (
                                <option key={m} value={m}>
                                  {m}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label
                            className="flex items-center gap-1 text-xs text-gray-600"
                            title="Pause after the last serie of the last exercise of this sector"
                          >
                            Macro sector
                            <select
                              value={
                                sec.macroEndOfSector.trim() === ''
                                  ? ''
                                  : isMacroMinuteLabel(sec.macroEndOfSector)
                                    ? sec.macroEndOfSector.trim()
                                    : "2'"
                              }
                              onChange={(e) =>
                                updateSectorField(activeDayIndex, secIdx, 'macroEndOfSector', e.target.value)
                              }
                              className="border border-gray-300 rounded px-2 py-1 text-xs min-w-[3.25rem]"
                            >
                              <option value="">—</option>
                              {PLAN_GYM_WEEK_MACRO_MINUTE_LABELS.map((m) => (
                                <option key={m} value={m}>
                                  {m}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const label = (sec.sectorLabel || 'this sector').trim() || 'this sector';
                            if (
                              typeof window !== 'undefined' &&
                              !window.confirm(`Remove "${label}" from this day? This cannot be undone.`)
                            ) {
                              return;
                            }
                            removeSectorFromDay(activeDayIndex, secIdx);
                          }}
                          className="ml-auto p-1 text-red-600 hover:bg-red-50 rounded"
                          title="Remove sector"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    );
                    })}
                  </div>

                  {/* Grid to add sectors */}
                  <p className="text-xs font-semibold text-gray-600">Add muscular area</p>
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                    {MUSCLE_GROUPS.map(g => {
                      const added = manualDays[activeDayIndex].sectors.some(s => s.sectorId === g.id);
                      return (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => addSectorToDay(activeDayIndex, g)}
                          disabled={added}
                          className={`flex flex-col items-center p-2 rounded-lg border-2 transition-colors ${
                            added ? 'border-gray-200 bg-gray-100 opacity-60 cursor-not-allowed' : 'border-gray-300 hover:border-blue-500 hover:bg-blue-50'
                          }`}
                        >
                          <div className="w-10 h-10 relative mb-1">
                            <Image src={g.image} alt={g.label} fill className="object-contain" />
                          </div>
                          <span className="text-[10px] font-medium text-gray-700 text-center leading-tight">{g.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <p className="text-xs text-gray-600 mt-4 p-2 bg-gray-100 border border-gray-200 rounded">
                <strong>Remember:</strong> When you save the plan, it can be saved to <strong>ARCHIVES</strong> and/or to some days of the <strong>YEARLY PLAN</strong> (tag the week and the days in which you apply the plan).
              </p>

              <div className="flex gap-2 justify-end pt-4">
                <button type="button" onClick={handleResetAll} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                  Reset all & close
                </button>
                <button type="button" onClick={handleManualCreate} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium">
                  Create routines and nutrition_components
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

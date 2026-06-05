'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { X, ChevronUp, ChevronDown } from 'lucide-react';

/** Training level and suggested workout range for weekly planning */
const TRAINING_LEVELS = [
  { value: 'beginner', label: 'Beginner', workoutsSuggested: '1-2' },
  { value: 'intermediate', label: 'Intermediate', workoutsSuggested: '2-3' },
  { value: 'advanced', label: 'Advanced', workoutsSuggested: '2-4' },
  { value: 'elite', label: 'Elite', workoutsSuggested: '3-4' },
  { value: 'professional', label: 'Professional', workoutsSuggested: '4-6' }
] as const;

/** Training level images – public/images/{level}.jpg */
const TRAINING_LEVEL_IMAGE_PATHS: Record<TrainingLevel, string> = {
  beginner: '/images/beginner.jpg',
  intermediate: '/images/intermediate.jpg',
  advanced: '/images/advanced.jpg',
  elite: '/images/elite.jpg',
  professional: '/images/professional.jpg'
};

const MASK_IMAGE = '/images/mask.jpg';

const TRAINING_LEVEL_FALLBACK_IMAGE = MASK_IMAGE;

export type TrainingLevel = (typeof TRAINING_LEVELS)[number]['value'];

export function getPlanGymWeekTrainingLevelLabel(level: TrainingLevel): string {
  const row = TRAINING_LEVELS.find((l) => l.value === level);
  return row?.label ?? level;
}

export function getPlanGymWeekTrainingLevelImageSrc(
  level: TrainingLevel,
  overrides?: Partial<Record<TrainingLevel, string>>
): string {
  return overrides?.[level] ?? TRAINING_LEVEL_IMAGE_PATHS[level] ?? TRAINING_LEVEL_FALLBACK_IMAGE;
}

export const GOAL_OPTIONS = [
  { value: 'max_strength', label: 'Maximum strength (e.g., powerlifting, weightlifting)' },
  { value: 'hypertrophy', label: 'Muscle hypertrophy (increase in muscle mass)' },
  { value: 'endurance', label: 'Muscle endurance (e.g., endurance, toning)' },
  { value: 'explosive_power', label: 'Explosive power (e.g., for sports like soccer, basketball)' },
  { value: 'mobility_flexibility', label: 'Mobility and flexibility (with accessory exercises)' },
  { value: 'injury_prevention', label: 'Injury prevention (e.g., strengthening the core and stabilizers)' },
  { value: 'fat_loss', label: 'Fat loss (combined with diet and cardio)' }
] as const;

export type GoalId = (typeof GOAL_OPTIONS)[number]['value'];

/** Gym week step-1 day count: always 1–6, never NaN (safe for array lengths and slices). */
export function clampWeeklyPlanDayCount(n: unknown): number {
  const x = typeof n === 'number' ? n : parseInt(String(n ?? ''), 10);
  if (!Number.isFinite(x)) return 1;
  return Math.min(6, Math.max(1, Math.floor(x)));
}

export function getGoalLabel(goalId: GoalId): string {
  const opt = GOAL_OPTIONS.find((o) => o.value === goalId);
  return opt?.label ?? goalId;
}

const SECTOR_OPTIONS = [
  { id: 'shoulders', label: 'Shoulders' },
  { id: 'biceps', label: 'Biceps' },
  { id: 'triceps', label: 'Triceps' },
  { id: 'forearms', label: 'Forearms' },
  { id: 'chest', label: 'Chest' },
  { id: 'abs', label: 'Abdominals' },
  { id: 'trapezius', label: 'Trapezius' },
  { id: 'lats', label: 'Lats' },
  { id: 'quadriceps', label: 'Quadriceps' },
  { id: 'hams', label: 'Hamstrings' },
  { id: 'calves', label: 'Calves' },
  { id: 'glutes', label: 'Glutes' }
];

export type PlanGymWeekAnswers = {
  trainingLevel: TrainingLevel;
  goals: GoalId[];
  daysCount: number;
  sectorSelectionMode: 'helped' | 'manual';
  timesPerSector: 'once' | '2' | '3' | 'all';
  distributionType: 'A' | 'B' | 'C' | 'D';
  constantSectors: string[];
};

interface PlanGymWeekModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProceed: (answers: PlanGymWeekAnswers) => void;
  questionImages?: Partial<Record<'q1' | 'q2' | 'q3' | 'q4', string>>;
  trainingLevelImages?: Partial<Record<TrainingLevel, string>>;
  /** When the modal opens, land on this step (e.g. 2 after “Back” from manual sector screen). Default 1. */
  initialStepOnOpen?: 1 | 2;
}

export default function PlanGymWeekModal({
  isOpen,
  onClose,
  onProceed,
  questionImages = {},
  trainingLevelImages = {},
  initialStepOnOpen = 1
}: PlanGymWeekModalProps) {
  const [trainingLevel, setTrainingLevel] = useState<TrainingLevel>('intermediate');
  const [daysCount, setDaysCount] = useState<number>(3);
  const [goals, setGoals] = useState<GoalId[]>(() => ['hypertrophy', 'hypertrophy', 'hypertrophy']);
  const [applyGoalToAll, setApplyGoalToAll] = useState(false);
  const [sectorSelectionMode, setSectorSelectionMode] = useState<'helped' | 'manual'>('helped');
  const [timesPerSector, setTimesPerSector] = useState<'once' | '2' | '3' | 'all'>('once');
  const [distributionType, setDistributionType] = useState<'A' | 'B' | 'C' | 'D'>('A');
  const [constantSectors, setConstantSectors] = useState<string[]>([]);
  const [maskImageError, setMaskImageError] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const wasOpenRef = React.useRef(false);
  React.useEffect(() => setMaskImageError(false), [trainingLevel]);
  React.useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      setStep(initialStepOnOpen);
    }
    wasOpenRef.current = isOpen;
  }, [isOpen, initialStepOnOpen]);

  const timesPerSectorOptions = React.useMemo(() => {
    const opts: { value: 'once' | '2' | '3' | 'all'; label: string }[] = [
      { value: 'once', label: 'Once' }
    ];
    if (daysCount >= 2) opts.push({ value: '2', label: '2' });
    if (daysCount >= 3) opts.push({ value: '3', label: '3' });
    if (daysCount >= 2) opts.push({ value: 'all', label: 'All the times' });
    return opts;
  }, [daysCount]);

  React.useEffect(() => {
    const validValues = timesPerSectorOptions.map((o) => o.value);
    if (!validValues.includes(timesPerSector)) {
      setTimesPerSector('once');
    }
  }, [daysCount, timesPerSectorOptions, timesPerSector]);

  const workoutsSuggested = TRAINING_LEVELS.find((l) => l.value === trainingLevel)?.workoutsSuggested ?? '2-3';

  React.useEffect(() => {
    setGoals((prev) => {
      if (prev.length === daysCount) return prev;
      if (daysCount > prev.length) {
        const fill = applyGoalToAll ? (prev[0] ?? 'hypertrophy') : 'hypertrophy';
        return [...prev, ...Array(daysCount - prev.length).fill(fill)];
      }
      return prev.slice(0, daysCount);
    });
  }, [daysCount, applyGoalToAll]);

  const setGoalForDay = (dayIndex: number, value: GoalId) => {
    setGoals((prev) => {
      const next = [...prev];
      next[dayIndex] = value;
      if (applyGoalToAll) return next.map(() => value);
      return next;
    });
  };

  if (!isOpen) return null;

  const showQ2Q3Q4 = sectorSelectionMode === 'helped';
  const showQ4 = showQ2Q3Q4 && distributionType !== 'D';
  const requiredConstantSectors = daysCount <= 3 ? 1 : 2;
  const canProceed = !showQ4 || constantSectors.length >= requiredConstantSectors;

  const toggleConstantSector = (id: string) => {
    setConstantSectors((prev) =>
      prev.includes(id)
        ? prev.filter((s) => s !== id)
        : prev.length >= requiredConstantSectors
          ? [...prev.slice(1), id]
          : [...prev, id]
    );
  };

  const handleProceed = () => {
    if (showQ4 && !canProceed) return;
    onProceed({
      trainingLevel,
      goals: goals.slice(0, daysCount),
      daysCount,
      sectorSelectionMode,
      timesPerSector,
      distributionType,
      constantSectors
    });
    onClose();
  };

  /** Each question has space for an AI-generated image (left box). Q2/Q4 use a tall column so images fill the row height. */
  const questionBlock = (
    qKey: 'q1' | 'q2' | 'q3' | 'q4',
    title: string,
    children: React.ReactNode,
    stretchImage = false
  ) => (
    <div
      className={`flex gap-4 border border-amber-200 rounded-lg p-4 bg-amber-50/50 ${
        stretchImage ? 'items-stretch' : 'items-start'
      }`}
    >
      <div
        className={`flex-shrink-0 w-32 bg-amber-100 border-y border-amber-200 border-x-0 rounded overflow-hidden relative ${
          stretchImage ? 'self-stretch min-h-24' : 'h-24 flex items-center justify-center text-amber-700 text-xs text-center'
        }`}
      >
        {questionImages[qKey] ? (
          stretchImage ? (
            <Image
              src={questionImages[qKey]}
              alt=""
              fill
              unoptimized
              className="border-0 object-cover object-center outline-none ring-0"
              sizes="128px"
              onError={(e) => {
                const el = e.currentTarget as HTMLImageElement;
                el.style.display = 'none';
                const fallback = el.nextElementSibling as HTMLElement;
                if (fallback) fallback.classList.remove('hidden');
              }}
            />
          ) : (
            <Image
              src={questionImages[qKey]}
              alt=""
              width={128}
              height={96}
              unoptimized
              className="max-w-full max-h-full border-0 object-contain outline-none ring-0 rounded"
              onError={(e) => {
                const el = e.currentTarget as HTMLImageElement;
                el.style.display = 'none';
                const fallback = el.nextElementSibling as HTMLElement;
                if (fallback) fallback.classList.remove('hidden');
              }}
            />
          )
        ) : null}
        <span
          className={`${!questionImages[qKey] ? '' : 'hidden'} ${
            stretchImage
              ? 'absolute inset-0 flex items-center justify-center text-amber-700 text-xs text-center p-2'
              : ''
          }`}
        >
          Space for AI image
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-gray-900 mb-2">{title}</div>
        {children}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Blue title bar – mask design */}
        <div className="sticky top-0 bg-blue-600 border-b border-blue-700 px-4 py-3 flex items-center justify-between rounded-t-xl">
          <h2 className="text-lg font-bold text-white">Weekly gym workout planning</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-blue-500 text-white"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-6">
          {step === 1 ? (
            /* STEP 1 – Reference level (Level), number of days, Goals per day – parameters for automatic planning */
            <>
              {/* Reference level – Training level + mask image + Workouts suggested */}
              <div className="border border-blue-200 rounded-lg p-4 bg-blue-50/50">
                <div className="font-semibold text-gray-900 mb-3">Reference level</div>
                <div className="flex flex-wrap items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="relative w-32 h-40 rounded-lg overflow-hidden border border-gray-200 bg-gray-100">
                      {maskImageError ? (
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-400 text-xs text-center p-2">
                          No image
                        </div>
                      ) : (
                        <Image
                          src={trainingLevelImages[trainingLevel] ?? TRAINING_LEVEL_IMAGE_PATHS[trainingLevel] ?? MASK_IMAGE}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="128px"
                          unoptimized
                          onError={() => setMaskImageError(true)}
                        />
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-3 min-w-0 flex-1">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Training level</label>
                      <select
                        value={trainingLevel}
                        onChange={(e) => setTrainingLevel(e.target.value as TrainingLevel)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-900 min-w-[180px]"
                        aria-label="Training level"
                      >
                        {TRAINING_LEVELS.map((level) => (
                          <option key={level.value} value={level.value}>
                            {level.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-700">Workouts suggested:</span>
                      <span className="inline-flex items-center justify-center min-w-[4rem] px-3 py-1.5 rounded bg-amber-100 border border-amber-300 text-amber-900 font-semibold text-sm">
                        {workoutsSuggested}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Select the number of days of workout in gym – 1–6 selectable, 7 disabled per mask */}
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50/50">
                <div className="font-semibold text-gray-900 mb-3">Select the number of days of workout in gym</div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={6}
                      step={1}
                      value={daysCount}
                      onChange={(e) => {
                        const v = parseInt(e.target.value, 10);
                        setDaysCount((prev) =>
                          Number.isNaN(v) ? prev : clampWeeklyPlanDayCount(v)
                        );
                      }}
                      className="w-14 px-2 py-2 border border-gray-300 rounded-lg text-center font-semibold text-gray-900"
                      aria-label="Number of days"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setDaysCount((c) => Math.min(6, clampWeeklyPlanDayCount(c) + 1))
                      }
                      className="p-1.5 rounded border border-gray-300 hover:bg-gray-100 text-gray-600"
                      aria-label="Increase days"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setDaysCount((c) => Math.max(1, clampWeeklyPlanDayCount(c) - 1))
                      }
                      className="p-1.5 rounded border border-gray-300 hover:bg-gray-100 text-gray-600"
                      aria-label="Decrease days"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDaysCount(1)}
                      className="p-1.5 rounded border border-gray-300 hover:bg-gray-100 text-gray-500"
                      title="Reset to 1 day"
                      aria-label="Reset to one day"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[1, 2, 3, 4, 5, 6, 7].map((n) => {
                      const selectable = n <= 6;
                      return (
                        <button
                          key={n}
                          type="button"
                          disabled={!selectable}
                          onClick={() => selectable && setDaysCount(n)}
                          className={`min-w-[3.5rem] min-h-[3.5rem] px-4 py-3 rounded-xl font-bold text-lg border-2 transition-colors ${
                            !selectable
                              ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                              : daysCount === n
                                ? 'border-amber-500 bg-amber-100 text-amber-900 shadow-sm'
                                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400'
                          }`}
                          aria-label={selectable ? `Plan ${n} day${n > 1 ? 's' : ''}` : undefined}
                          aria-pressed={selectable && daysCount === n}
                        >
                          {n}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Select your goal – one per planned day (Level and Goals are parameters for automatic planning) */}
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50/50">
                <div className="font-semibold text-gray-900 mb-2">Select your goal</div>
                <p className="text-xs text-gray-600 mb-3">For each day you have planned you can select a goal. Level and Goals will be used for automatic planning of the routine.</p>
                <div className="space-y-2">
                  {Array.from({ length: daysCount }, (_, i) => (
                    <React.Fragment key={i}>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center justify-center min-w-[2rem] h-8 px-2 rounded bg-amber-100 border border-amber-300 text-amber-900 font-semibold text-sm">
                          {i + 1}
                        </span>
                        <select
                          value={goals[i] ?? 'hypertrophy'}
                          onChange={(e) => setGoalForDay(i, e.target.value as GoalId)}
                          className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                          aria-label={`Goal for workout ${i + 1}`}
                        >
                          {GOAL_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      {i === 0 ? (
                        <label
                          className="ml-[2.6rem] inline-flex cursor-pointer items-center gap-2 rounded-md border border-transparent px-0.5 py-0.5 hover:bg-amber-50/80"
                          title="Put this goal for all the workouts"
                        >
                          <input
                            type="checkbox"
                            checked={applyGoalToAll}
                            onChange={(e) => {
                              setApplyGoalToAll(e.target.checked);
                              if (e.target.checked && goals.length > 0) {
                                setGoals(Array(daysCount).fill(goals[0]));
                              }
                            }}
                            className="h-4 w-4 shrink-0 rounded text-amber-600"
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

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 font-medium"
                >
                  Continue
                </button>
              </div>
            </>
          ) : (
            /* STEP 2 – Manual vs helped question, then Q2–Q4 if helped – then Proceed */
            <>
              <p className="text-sm text-gray-700 font-medium">
                Do you want proceed to select the muscular sectors manually or you want to be helped in the selection ?
              </p>
              <div className="space-y-3">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="sectorMode"
                    checked={sectorSelectionMode === 'helped'}
                    onChange={() => setSectorSelectionMode('helped')}
                    className="w-4 h-4 mt-0.5 text-amber-600 border-gray-300 focus:ring-amber-500 flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-gray-900 block">I want to be helped</span>
                  </div>
                </label>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="sectorMode"
                    checked={sectorSelectionMode === 'manual'}
                    onChange={() => setSectorSelectionMode('manual')}
                    className="w-4 h-4 mt-0.5 text-amber-600 border-gray-300 focus:ring-amber-500 flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-gray-900 block">I select manually</span>
                  </div>
                </label>
              </div>

              {showQ2Q3Q4 && (
                <>
              {/* QUESTION #2 – Image: anatomy model + calendar icons (e.g. MON, TUE, THU, FRI) with arrows to muscle sectors */}
              {questionBlock(
                'q2',
                'QUESTION #2 – How many times do you want to train each sector?',
                <>
                  <div className="space-y-2">
                    {timesPerSectorOptions.map(({ value, label }) => (
                      <label key={value} className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="radio"
                          name="timesPerSector"
                          checked={timesPerSector === value}
                          onChange={() => setTimesPerSector(value)}
                          className="w-4 h-4 mt-0.5 text-amber-600 border-gray-300 focus:ring-amber-500 flex-shrink-0"
                        />
                        <span className="text-sm">
                          <span className="font-medium text-gray-900">{label}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </>,
                true
              )}

              {/* QUESTION #3 – Image: anterior + posterior anatomy with muscles highlighted (e.g. pushing/pulling or large/small) */}
              {questionBlock(
                'q3',
                'QUESTION #3 – Type of distributions of muscular areas to be used to calc the sequences of muscles for each routine of workout',
                <div className="space-y-2">
                  {[
                    { value: 'A' as const, label: 'A – Large muscles with small muscles (A1–A2)' },
                    { value: 'B' as const, label: 'B – Agonist muscles with antagonist muscles (B1–B2)' },
                    { value: 'C' as const, label: 'C – Pushing muscles with pulling muscles (C1–C2)' },
                    { value: 'D' as const, label: 'D – My favorite distribution, if any exists' }
                  ].map(({ value, label }) => (
                    <label key={value} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="distribution"
                        checked={distributionType === value}
                        onChange={() => setDistributionType(value)}
                        className="w-4 h-4 text-amber-600"
                      />
                      <span className="text-sm font-medium">{label}</span>
                    </label>
                  ))}
                </div>
              )}

              {/* QUESTION #4 – Image: anatomy (e.g. core) with lines to calendar days; only if A/B/C (not D) */}
              {showQ4 &&
                questionBlock(
                  'q4',
                  'QUESTION #4 – Do you want to keep constant the training of a sector? Select what sector…',
                  <>
                    <div className="flex flex-wrap gap-2">
                      {SECTOR_OPTIONS.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => toggleConstantSector(s.id)}
                          className={`px-3 py-1.5 rounded-lg border-2 text-sm font-medium ${
                            constantSectors.includes(s.id)
                              ? 'border-amber-500 bg-amber-100 text-amber-900'
                              : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                    {constantSectors.length < requiredConstantSectors && (
                      <p className="text-amber-700 text-xs mt-2">
                        Please select at least {requiredConstantSectors} sector(s).
                      </p>
                    )}
                  </>,
                  true
                )}
                </>
              )}

              <div className="flex justify-between gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Back
                </button>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleProceed}
                    disabled={!canProceed}
                    className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    Proceed
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

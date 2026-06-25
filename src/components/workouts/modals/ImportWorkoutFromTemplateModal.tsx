'use client';

import React, { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { X, Download, Info, Play, ChevronDown, ChevronRight } from 'lucide-react';
import { isSeriesBasedSport } from '@/constants/moveframe.constants';
import { templateDaySlotLabel } from '@/lib/workoutDayCopy';
import {
  calculateSportSummaries,
  calculateWorkoutSportSummaries,
  formatSportSummaryTotal,
} from '@/utils/workoutHelpers';
import WorkoutOverviewModal from '@/components/workouts/WorkoutOverviewModal';
import type { ImportWorkoutPayload } from './ImportWorkoutModal';

type TemplateSection = 'A' | 'B' | 'C';

interface ImportWorkoutFromTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBack: () => void;
  targetDay: { id: string };
  targetWorkout: { id: string; sessionNumber: number; moveframes?: unknown[] };
  onConfirm: (payload: ImportWorkoutPayload) => Promise<void>;
}

const DAY_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const WORKOUT_HEADER_BG = ['bg-emerald-100', 'bg-sky-100', 'bg-violet-100'];
const SLOT_SYMBOLS = ['○', '□', '△'];

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function dayForWeek(week: any, dayOfWeek: number) {
  if (!week?.days?.length) return null;
  return week.days.find((d: any) => d.dayOfWeek === dayOfWeek) ?? week.days[dayOfWeek - 1] ?? null;
}

function sortedWorkouts(day: any) {
  const workouts = day?.workouts ?? [];
  return [...workouts].sort(
    (a, b) => (a.sessionNumber ?? 0) - (b.sessionNumber ?? 0)
  );
}

function workoutsWithContent(day: any) {
  return sortedWorkouts(day).filter((w: any) => (w.moveframes?.length ?? 0) > 0);
}

function daySport1Summary(day: any) {
  if (!day) return null;
  const daySummaries = calculateSportSummaries(day, 'emoji');
  if (daySummaries[0]) return daySummaries[0];
  const firstWorkout = workoutsWithContent(day)[0];
  if (!firstWorkout) return null;
  const workoutSummaries = calculateWorkoutSportSummaries(firstWorkout, 'emoji');
  return workoutSummaries[0] ?? null;
}

function moveframeDescription(mf: any): string {
  const raw = mf.manualMode ? mf.notes || mf.description || '' : mf.description || '';
  return stripHtml(raw) || '—';
}

function moveframeDuration(mf: any): string {
  const isSeries = isSeriesBasedSport(mf.sport);
  if (isSeries) {
    if (mf.manualMode) {
      return mf.repetitions ? `${mf.repetitions} series` : '—';
    }
    const count = mf.movelaps?.length ?? 0;
    return count ? `${count} series` : '—';
  }
  let dist = 0;
  for (const lap of mf.movelaps ?? []) {
    dist += parseInt(lap.distance, 10) || 0;
  }
  return dist ? `${dist}m` : '—';
}

function moveframeRipSets(mf: any): string {
  const isSeries = isSeriesBasedSport(mf.sport);
  if (isSeries) {
    if (mf.manualMode) return mf.repetitions != null ? String(mf.repetitions) : '—';
    let reps = 0;
    for (const lap of mf.movelaps ?? []) {
      reps += parseInt(lap.reps, 10) || 0;
    }
    if (reps) return String(reps);
    const laps = mf.movelaps?.length ?? 0;
    return laps ? String(laps) : '—';
  }
  const laps = mf.movelaps?.length ?? 0;
  return laps ? String(laps) : '—';
}

function matchLabel(workout: any): string {
  if (workout.completionRate != null) {
    return `${Math.round(workout.completionRate)}% + ${Math.round(workout.bonusRate || 0)}%`;
  }
  return '85% + 20%';
}

async function fetchTemplatePlan(token: string, section: TemplateSection) {
  const response = await fetch(
    '/api/workouts/plan?type=TEMPLATE_WEEKS&section=' + section,
    { headers: { Authorization: 'Bearer ' + token } }
  );
  if (!response.ok) return { name: '', weeks: [] as any[] };
  const data = await response.json();
  return {
    name: (data.plan?.name as string) || 'Weekly Plan ' + section,
    weeks: (data.plan?.weeks ?? []) as any[],
  };
}

export default function ImportWorkoutFromTemplateModal({
  isOpen,
  onClose,
  onBack,
  targetDay,
  targetWorkout,
  onConfirm,
}: ImportWorkoutFromTemplateModalProps) {
  const [templateSection, setTemplateSection] = useState<TemplateSection>('A');
  const [planName, setPlanName] = useState('');
  const [templateWeeks, setTemplateWeeks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [previewWeekNum, setPreviewWeekNum] = useState(1);
  const [expandedDayNum, setExpandedDayNum] = useState<number | null>(null);
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | null>(null);
  const [expandedWorkoutIds, setExpandedWorkoutIds] = useState<Set<string>>(new Set());
  const [confirmOverwrite, setConfirmOverwrite] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [infoWorkout, setInfoWorkout] = useState<any | null>(null);

  const hasContent = (targetWorkout.moveframes?.length ?? 0) > 0;

  const resetSelection = useCallback(() => {
    setExpandedDayNum(null);
    setSelectedWorkoutId(null);
    setExpandedWorkoutIds(new Set());
    setConfirmOverwrite(false);
    setInfoWorkout(null);
  }, []);

  const loadPlan = useCallback(
    async (section: TemplateSection) => {
      setLoading(true);
      resetSelection();
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setTemplateWeeks([]);
          setPlanName('');
          return;
        }
        const plan = await fetchTemplatePlan(token, section);
        setPlanName(plan.name);
        const weeks = [...plan.weeks].sort(
          (a, b) => (a.weekNumber ?? 0) - (b.weekNumber ?? 0)
        );
        setTemplateWeeks(weeks);
        setPreviewWeekNum(weeks[0]?.weekNumber ?? 1);
      } finally {
        setLoading(false);
      }
    },
    [resetSelection]
  );

  useEffect(() => {
    if (!isOpen) return;
    setTemplateSection('A');
    void loadPlan('A');
  }, [isOpen, loadPlan]);

  const handleSectionChange = (section: TemplateSection) => {
    setTemplateSection(section);
    void loadPlan(section);
  };

  const handlePreviewWeekChange = (weekNum: number) => {
    setPreviewWeekNum(weekNum);
    resetSelection();
  };

  const previewWeek = useMemo(
    () => templateWeeks.find((w) => (w.weekNumber ?? 0) === previewWeekNum) ?? templateWeeks[0],
    [templateWeeks, previewWeekNum]
  );

  const previewPeriod = previewWeek?.period ?? previewWeek?.days?.[0]?.period;

  const weekOptions = useMemo(() => {
    if (templateWeeks.length > 0) {
      return templateWeeks.map((w, idx) => w.weekNumber ?? idx + 1);
    }
    return [1, 2, 3];
  }, [templateWeeks]);

  const weekHasImportableWorkouts = useMemo(() => {
    if (!previewWeek) return false;
    return Array.from({ length: 7 }, (_, idx) =>
      workoutsWithContent(dayForWeek(previewWeek, idx + 1)).length > 0
    ).some(Boolean);
  }, [previewWeek]);

  const expandedDay = expandedDayNum ? dayForWeek(previewWeek, expandedDayNum) : null;

  const selectedWorkout = useMemo(() => {
    if (!selectedWorkoutId || !expandedDay) return null;
    return sortedWorkouts(expandedDay).find((w: any) => w.id === selectedWorkoutId) ?? null;
  }, [selectedWorkoutId, expandedDay]);

  const selectedWorkoutLabel = useMemo(() => {
    if (!selectedWorkout || expandedDayNum == null) return null;
    const slot = selectedWorkout.sessionNumber ?? '?';
    const dayName = DAY_FULL[(expandedDayNum - 1) % 7];
    return `Workout #${slot} — ${dayName} (Plan ${templateSection}, Week ${previewWeekNum})`;
  }, [selectedWorkout, expandedDayNum, templateSection, previewWeekNum]);

  const toggleDayExpand = (dayNum: number) => {
    setExpandedDayNum((prev) => (prev === dayNum ? null : dayNum));
    setSelectedWorkoutId(null);
    setConfirmOverwrite(false);
  };

  const handleSlotClick = (dayNum: number, slot: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const day = dayForWeek(previewWeek, dayNum);
    const workout = sortedWorkouts(day)[slot - 1];
    if (!workout?.moveframes?.length) return;

    setExpandedDayNum(dayNum);
    setSelectedWorkoutId(workout.id);
    setExpandedWorkoutIds((prev) => new Set(prev).add(workout.id));
    setConfirmOverwrite(false);
  };

  const selectWorkout = (workoutId: string) => {
    setSelectedWorkoutId(workoutId);
    setConfirmOverwrite(false);
  };

  const toggleWorkoutExpand = (workoutId: string) => {
    setExpandedWorkoutIds((prev) => {
      const next = new Set(prev);
      if (next.has(workoutId)) next.delete(workoutId);
      else next.add(workoutId);
      return next;
    });
  };

  const handleImport = async (workoutId?: string) => {
    const id = workoutId ?? selectedWorkoutId;
    if (!id) return;
    if (hasContent && !confirmOverwrite) {
      setSelectedWorkoutId(id);
      return;
    }

    setIsImporting(true);
    try {
      await onConfirm({
        targetDayId: targetDay.id,
        sessionNumber: targetWorkout.sessionNumber,
        overwrite: hasContent,
        source: { type: 'session', sourceWorkoutId: id },
      });
      onClose();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Import failed');
    } finally {
      setIsImporting(false);
    }
  };

  const renderExpandedDayPanel = (dayNum: number, day: any) => {
    const dayWorkouts = workoutsWithContent(day);
    return (
      <div className="space-y-3 p-3 bg-gray-50/80">
        <p className="text-sm font-semibold text-gray-800">
          {templateDaySlotLabel({ dayOfWeek: dayNum })} — {DAY_FULL[(dayNum - 1) % 7]}
        </p>

        {dayWorkouts.length === 0 ? (
          <p className="text-sm text-gray-500 py-4 text-center">
            No workouts with moveframes on this day.
          </p>
        ) : (
          dayWorkouts.map((workout: any, wIdx: number) => {
            const isSelected = selectedWorkoutId === workout.id;
            const isWorkoutExpanded = expandedWorkoutIds.has(workout.id) || isSelected;
            const sportSummaries = calculateWorkoutSportSummaries(workout, 'emoji');
            const periodName = day.period?.name ?? previewPeriod?.name ?? '—';
            const headerBg = WORKOUT_HEADER_BG[wIdx % WORKOUT_HEADER_BG.length];
            const moveframes = [...(workout.moveframes ?? [])].sort(
              (a: any, b: any) => (a.sequence ?? 0) - (b.sequence ?? 0)
            );

            return (
              <div
                key={workout.id}
                className={
                  'rounded-lg border overflow-hidden ' +
                  (isSelected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-300')
                }
              >
                <div className={`${headerBg} px-3 py-2 flex flex-wrap items-center gap-2`}>
                  <button
                    type="button"
                    onClick={() => toggleWorkoutExpand(workout.id)}
                    className="p-0.5 text-gray-600 hover:text-gray-900"
                    aria-label={isWorkoutExpanded ? 'Collapse' : 'Expand'}
                  >
                    {isWorkoutExpanded ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>
                  <Play className="w-4 h-4 text-gray-600 shrink-0" />
                  <button
                    type="button"
                    onClick={() => selectWorkout(workout.id)}
                    className="text-sm font-bold text-gray-900 hover:underline"
                  >
                    Workout #{workout.sessionNumber ?? wIdx + 1}
                  </button>
                  <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                  <span className="text-xs font-medium text-gray-700 uppercase">{periodName}</span>
                  <span className="text-xs text-gray-600">{DAY_FULL[(dayNum - 1) % 7]}</span>
                  <div className="ml-auto flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setInfoWorkout(workout)}
                      className="px-3 py-1 text-sm font-semibold border border-gray-400 bg-white text-gray-800 rounded hover:bg-gray-50"
                    >
                      Workout Info
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        selectWorkout(workout.id);
                        void handleImport(workout.id);
                      }}
                      disabled={isImporting}
                      className="px-4 py-1 text-sm font-bold bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Import
                    </button>
                  </div>
                </div>

                {isWorkoutExpanded && (
                  <>
                    <div className={`${headerBg} px-3 pb-2`}>
                      <table className="w-full border-collapse text-xs">
                        <thead>
                          <tr>
                            <th className="border border-gray-400 px-2 py-1 font-bold bg-white/60 text-left w-24">
                              Match
                            </th>
                            <th className="border border-gray-400 px-2 py-1 font-bold bg-white/60 text-left">
                              Sport
                            </th>
                            <th className="border border-gray-400 px-2 py-1 font-bold bg-white/60 text-center">
                              Duration &amp; time
                            </th>
                            <th className="border border-gray-400 px-2 py-1 font-bold bg-white/60 text-left w-12">
                              K
                            </th>
                            <th className="border border-gray-400 px-2 py-1 font-bold bg-white/60 text-left">
                              Main work
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {sportSummaries.length === 0 ? (
                            <tr>
                              <td className="border border-gray-300 px-2 py-1 bg-white/40">
                                {matchLabel(workout)}
                              </td>
                              <td className="border border-gray-300 px-2 py-1 bg-white/40" colSpan={4}>
                                —
                              </td>
                            </tr>
                          ) : (
                            sportSummaries.map((s, sIdx) => (
                              <tr key={sIdx}>
                                {sIdx === 0 && (
                                  <td
                                    className="border border-gray-300 px-2 py-1 bg-white/40 font-medium"
                                    rowSpan={sportSummaries.length}
                                  >
                                    {matchLabel(workout)}
                                  </td>
                                )}
                                <td className="border border-gray-300 px-2 py-1 bg-white/40">{s.sport}</td>
                                <td className="border border-gray-300 px-2 py-1 text-center bg-white/40">
                                  {s.duration || formatSportSummaryTotal(s)}
                                </td>
                                <td className="border border-gray-300 px-2 py-1 bg-white/40">—</td>
                                <td className="border border-gray-300 px-2 py-1 bg-white/40 max-w-[180px] truncate">
                                  {s.mainWork ? stripHtml(s.mainWork) : '—'}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                    <div className="bg-violet-50 px-3 py-2">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-bold text-violet-900">Moveframes</span>
                        <span className="text-xs bg-violet-200 text-violet-900 px-2 py-0.5 rounded-full font-semibold">
                          {moveframes.length} total
                        </span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-xs min-w-[520px]">
                          <thead>
                            <tr>
                              <th className="border border-gray-400 px-1 py-1 font-bold bg-violet-100 w-6">
                                #
                              </th>
                              <th className="border border-gray-400 px-2 py-1 font-bold bg-violet-100 w-10">
                                MF
                              </th>
                              <th className="border border-gray-400 px-2 py-1 font-bold bg-violet-100 text-left">
                                Section
                              </th>
                              <th className="border border-gray-400 px-2 py-1 font-bold bg-violet-100 text-left">
                                Sport
                              </th>
                              <th className="border border-gray-400 px-2 py-1 font-bold bg-violet-100 text-left">
                                Description
                              </th>
                              <th className="border border-gray-400 px-2 py-1 font-bold bg-violet-100 text-center">
                                Dur
                              </th>
                              <th className="border border-gray-400 px-2 py-1 font-bold bg-violet-100 text-center">
                                Rip\sets
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {moveframes.map((mf: any, mfIdx: number) => (
                              <tr key={mf.id ?? mfIdx} className="bg-white/70">
                                <td className="border border-gray-300 px-1 py-1 text-center text-gray-500">
                                  {mfIdx + 1}
                                </td>
                                <td className="border border-gray-300 px-2 py-1 text-center font-bold">
                                  {mf.letter || mf.code || '—'}
                                </td>
                                <td className="border border-gray-300 px-2 py-1">
                                  {mf.section?.name ?? '—'}
                                </td>
                                <td className="border border-gray-300 px-2 py-1">{mf.sport ?? '—'}</td>
                                <td className="border border-gray-300 px-2 py-1 max-w-[160px] truncate">
                                  {moveframeDescription(mf)}
                                </td>
                                <td className="border border-gray-300 px-2 py-1 text-center">
                                  {moveframeDuration(mf)}
                                </td>
                                <td className="border border-gray-300 px-2 py-1 text-center">
                                  {moveframeRipSets(mf)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })
        )}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[999998]" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-[999999] p-4">
        <div
          className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-blue-600 text-white px-5 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <Download className="w-6 h-6 shrink-0" />
              <h2 className="text-lg font-bold">Import a Workout</h2>
            </div>
            <button type="button" onClick={onClose} className="p-1 hover:bg-white/20 rounded-full">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
            <button
              type="button"
              onClick={onBack}
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              ← Import mode
            </button>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-gray-800">Weekly Plans:</span>
              {(['A', 'B', 'C'] as const).map((plan) => (
                <button
                  key={plan}
                  type="button"
                  onClick={() => handleSectionChange(plan)}
                  className={
                    'rounded-lg border-2 px-4 py-1.5 text-sm font-semibold transition-colors ' +
                    (templateSection === plan
                      ? 'border-purple-500 bg-purple-50 text-purple-800'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400')
                  }
                >
                  Plan {plan}
                </button>
              ))}
              <span
                className="inline-flex items-center text-gray-400"
                title="Template plans A, B and C each hold up to 3 weeks of workouts"
              >
                <Info className="w-4 h-4" />
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-sm font-semibold text-gray-800">
                  Weekly Plan {templateSection}
                </span>
                <div
                  className="w-5 h-5 rounded-full border-2 border-white shadow-sm shrink-0"
                  style={{
                    backgroundColor: previewPeriod?.color || '#ef4444',
                    borderColor: previewPeriod?.color ? '#fff' : '#d1d5db',
                  }}
                  title={previewPeriod?.name || 'Period'}
                />
              </div>
              <input
                type="text"
                readOnly
                value={planName}
                className="flex-1 min-w-[200px] rounded border border-gray-300 bg-gray-50 px-3 py-1.5 text-sm text-gray-800"
                aria-label="Template plan name"
              />
              <div className="flex gap-2 ml-auto">
                {weekOptions.map((weekNum) => {
                  const isPreview = previewWeekNum === weekNum;
                  return (
                    <button
                      key={weekNum}
                      type="button"
                      onClick={() => handlePreviewWeekChange(weekNum)}
                      className={
                        'rounded-lg border-2 px-4 py-1.5 text-sm font-semibold transition-colors ' +
                        (isPreview
                          ? 'border-blue-500 bg-blue-50 text-blue-800'
                          : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400')
                      }
                      title="Preview this week's days"
                    >
                      Week {weekNum}
                    </button>
                  );
                })}
              </div>
            </div>

            {loading ? (
              <p className="text-center py-8 text-gray-500 text-sm">Loading template…</p>
            ) : (
              <>
                {!weekHasImportableWorkouts && (
                  <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    Plan {templateSection}, Week {previewWeekNum} has no workouts with moveframes
                    yet. Grey slots (○ □ △) are empty — add workouts under{' '}
                    <strong>My Workouts → Template Plan {templateSection}</strong>, or try another
                    week (Week 2 / Week 3) or plan (B / C).
                  </p>
                )}

                <div className="overflow-x-auto border border-gray-300 rounded-lg">
                  <table className="w-full border-collapse text-xs min-w-[640px]">
                    <thead>
                      <tr>
                        <th className="border border-gray-400 px-2 py-1.5 font-bold bg-gray-100 text-left">
                          Period
                        </th>
                        <th className="border border-gray-400 px-2 py-1.5 font-bold bg-gray-100 text-center w-12">
                          Week
                        </th>
                        <th className="border border-gray-400 px-2 py-1.5 font-bold bg-gray-100 text-center w-10">
                          Day
                        </th>
                        <th className="border border-gray-400 px-2 py-1.5 font-bold bg-gray-100 text-center w-28">
                          Workouts
                        </th>
                        <th
                          className="border border-gray-400 px-2 py-1.5 font-bold bg-blue-200 text-black text-center"
                          colSpan={3}
                        >
                          Sport 1
                        </th>
                      </tr>
                      <tr>
                        <th className="border border-gray-400 bg-gray-50" colSpan={4} />
                        <th className="border border-gray-400 px-2 py-1 font-bold bg-blue-100 text-left">
                          Sport
                        </th>
                        <th className="border border-gray-400 px-2 py-1 font-bold bg-blue-100 text-center">
                          Duration &amp; Time
                        </th>
                        <th className="border border-gray-400 px-2 py-1 font-bold bg-blue-100 text-left">
                          Main work
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: 7 }, (_, idx) => {
                        const dayNum = idx + 1;
                        const day = previewWeek ? dayForWeek(previewWeek, dayNum) : null;
                        const period = day?.period ?? previewPeriod;
                        const sport1 = daySport1Summary(day);
                        const mainWorkText = sport1?.mainWork ? stripHtml(sport1.mainWork) : '—';
                        const isExpanded = expandedDayNum === dayNum;
                        const dayHasWorkouts = workoutsWithContent(day).length > 0;

                        return (
                          <Fragment key={dayNum}>
                            <tr
                              onClick={() => toggleDayExpand(dayNum)}
                              className={
                                'cursor-pointer ' +
                                (isExpanded
                                  ? 'bg-blue-50 ring-1 ring-inset ring-blue-300'
                                  : dayHasWorkouts
                                    ? 'hover:bg-blue-50/60'
                                    : 'hover:bg-gray-100')
                              }
                              title={
                                dayHasWorkouts
                                  ? 'Click to open day workouts'
                                  : 'Empty day — click to see details'
                              }
                            >
                              <td className="border border-gray-300 px-2 py-1.5 text-gray-700">
                                {period?.name ?? '—'}
                              </td>
                              <td className="border border-gray-300 px-2 py-1.5 text-center font-semibold">
                                {previewWeek?.weekNumber ?? previewWeekNum}
                              </td>
                              <td className="border border-gray-300 px-2 py-1.5 text-center font-semibold">
                                {dayNum}
                              </td>
                              <td className="border border-gray-300 px-2 py-1.5 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  {[1, 2, 3].map((slot) => {
                                    const workout = sortedWorkouts(day)[slot - 1];
                                    const hasData = Boolean(workout?.moveframes?.length);
                                    const isSelected =
                                      selectedWorkoutId === workout?.id && expandedDayNum === dayNum;
                                    return (
                                      <button
                                        key={slot}
                                        type="button"
                                        disabled={!hasData}
                                        onClick={(e) => handleSlotClick(dayNum, slot, e)}
                                        className={
                                          'text-sm font-bold inline-flex items-center gap-0.5 rounded px-1 py-0.5 transition-colors ' +
                                          (hasData
                                            ? isSelected
                                              ? 'bg-blue-600 text-white'
                                              : 'text-gray-900 hover:bg-blue-100'
                                            : 'text-gray-400 cursor-default')
                                        }
                                        title={
                                          hasData
                                            ? `Select Workout #${slot}`
                                            : `Workout #${slot} is empty`
                                        }
                                      >
                                        {slot}
                                        <span className="text-xs">{SLOT_SYMBOLS[slot - 1]}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </td>
                              <td className="border border-gray-300 px-2 py-1.5 bg-blue-50/50">
                                {sport1?.sport ?? '—'}
                              </td>
                              <td className="border border-gray-300 px-2 py-1.5 text-center bg-blue-50/50">
                                {sport1?.duration ?? '—'}
                              </td>
                              <td className="border border-gray-300 px-2 py-1.5 bg-blue-50/50 max-w-[200px] truncate">
                                {mainWorkText || '—'}
                              </td>
                            </tr>
                            {isExpanded && (
                              <tr>
                                <td colSpan={7} className="border border-gray-300 p-0 align-top">
                                  {day
                                    ? renderExpandedDayPanel(dayNum, day)
                                    : (
                                        <p className="p-4 text-sm text-gray-500 text-center">
                                          No day data for this slot in the template week.
                                        </p>
                                      )}
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            <p className="text-xs text-gray-500">
              Phase I: browse days 1–7 for the selected template week. Phase II: click a day or
              workout slot (○ □ △), review moveframes, then Import or Use Workout.
            </p>

            {selectedWorkoutId && hasContent && (
              <label className="flex items-start gap-3 p-3 border border-amber-300 bg-amber-50 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmOverwrite}
                  onChange={(e) => setConfirmOverwrite(e.target.checked)}
                  className="mt-1"
                />
                <span className="text-sm text-amber-900">
                  Replace existing moveframes and movelaps in Workout #{targetWorkout.sessionNumber}.
                </span>
              </label>
            )}
          </div>

          <div className="px-5 py-3 border-t bg-gray-50 flex items-center justify-between shrink-0 gap-3">
            <p className="text-sm text-gray-600 truncate">
              {selectedWorkoutLabel ?? 'No workout selected'}
            </p>
            <div className="flex gap-2 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={
                  !selectedWorkoutId ||
                  isImporting ||
                  (hasContent && !confirmOverwrite)
                }
                onClick={() => void handleImport()}
                className="px-5 py-2 text-sm font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isImporting ? 'Importing…' : 'Use Workout'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {infoWorkout && (
        <WorkoutOverviewModal workout={infoWorkout} onClose={() => setInfoWorkout(null)} />
      )}
    </>
  );
}

'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { X, Download, Info } from 'lucide-react';
import { isWeekEmpty } from '@/lib/workoutPlanLoad';
import { calculateSportSummaries } from '@/utils/workoutHelpers';
import type { ImportWeeklyPlansPayload } from './ImportWeeklyPlansModal';

type TemplateSection = 'A' | 'B' | 'C';

interface ImportTemplateWeeklyPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBack: () => void;
  anchorWeek: { id: string; weekNumber: number };
  yearlyWeeks: any[];
  onConfirm: (payload: ImportWeeklyPlansPayload) => Promise<void>;
}

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

function workoutSlotLabel(day: any, slot: number) {
  const symbols = ['○', '□', '△'];
  const workout = sortedWorkouts(day)[slot - 1];
  const hasData = Boolean(workout?.moveframes?.length);
  return (
    <span
      key={slot}
      className={`text-sm font-bold inline-flex items-center gap-0.5 ${hasData ? 'text-gray-900' : 'text-gray-400'}`}
    >
      {slot}
      <span className="text-xs">{symbols[slot - 1]}</span>
    </span>
  );
}

async function fetchTemplatePlan(token: string, section: TemplateSection) {
  const response = await fetch(
    `/api/workouts/plan?type=TEMPLATE_WEEKS&section=${section}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!response.ok) return { name: '', weeks: [] as any[] };
  const data = await response.json();
  return {
    name: (data.plan?.name as string) || `Weekly Plan ${section}`,
    weeks: (data.plan?.weeks ?? []) as any[],
  };
}

export default function ImportTemplateWeeklyPlanModal({
  isOpen,
  onClose,
  onBack,
  anchorWeek,
  yearlyWeeks,
  onConfirm,
}: ImportTemplateWeeklyPlanModalProps) {
  const [templateSection, setTemplateSection] = useState<TemplateSection>('A');
  const [planName, setPlanName] = useState('');
  const [templateWeeks, setTemplateWeeks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [previewWeekNum, setPreviewWeekNum] = useState(1);
  const [selectedWeekNumbers, setSelectedWeekNumbers] = useState<number[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [confirmOverwrite, setConfirmOverwrite] = useState(false);

  const loadPlan = useCallback(async (section: TemplateSection) => {
    setLoading(true);
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
      setSelectedWeekNumbers([]);
      setConfirmOverwrite(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setTemplateSection('A');
    void loadPlan('A');
  }, [isOpen, loadPlan]);

  const handleSectionChange = (section: TemplateSection) => {
    setTemplateSection(section);
    void loadPlan(section);
  };

  const previewWeek = useMemo(
    () => templateWeeks.find((w) => (w.weekNumber ?? 0) === previewWeekNum) ?? templateWeeks[0],
    [templateWeeks, previewWeekNum]
  );

  const previewPeriod = previewWeek?.period ?? previewWeek?.days?.[0]?.period;

  const targetWeeks = useMemo(() => {
    const sorted = [...yearlyWeeks].sort((a, b) => a.weekNumber - b.weekNumber);
    const startIdx = sorted.findIndex((w) => w.weekNumber === anchorWeek.weekNumber);
    if (startIdx === -1) return [];
    return sorted.slice(startIdx, startIdx + Math.max(1, selectedWeekNumbers.length));
  }, [yearlyWeeks, anchorWeek.weekNumber, selectedWeekNumbers.length]);

  const anyTargetHasContent = useMemo(
    () => targetWeeks.some((w) => !isWeekEmpty(w)),
    [targetWeeks]
  );

  const toggleWeekSelection = (weekNum: number) => {
    setSelectedWeekNumbers((prev) => {
      const next = prev.includes(weekNum)
        ? prev.filter((w) => w !== weekNum)
        : [...prev, weekNum].sort((a, b) => a - b);
      return next;
    });
    setPreviewWeekNum(weekNum);
    setConfirmOverwrite(false);
  };

  const handleCopy = async () => {
    if (selectedWeekNumbers.length === 0) return;
    if (anyTargetHasContent && !confirmOverwrite) return;

    setIsImporting(true);
    try {
      await onConfirm({
        anchorWeekNumber: anchorWeek.weekNumber,
        overwrite: anyTargetHasContent,
        source: {
          type: 'template',
          section: templateSection,
          weekNumbers: selectedWeekNumbers,
        },
      });
      onClose();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Import failed');
    } finally {
      setIsImporting(false);
    }
  };

  const weekOptions = useMemo(() => {
    if (templateWeeks.length > 0) {
      return templateWeeks.map((w, idx) => w.weekNumber ?? idx + 1);
    }
    return [1, 2, 3];
  }, [templateWeeks]);

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
              <h2 className="text-lg font-bold">Import a weekly plan</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1 hover:bg-white/20 rounded-full"
              disabled={isImporting}
            >
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
                  className={`rounded-lg border-2 px-4 py-1.5 text-sm font-semibold transition-colors ${
                    templateSection === plan
                      ? 'border-purple-500 bg-purple-50 text-purple-800'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                  }`}
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
                  const selected = selectedWeekNumbers.includes(weekNum);
                  const isPreview = previewWeekNum === weekNum;
                  return (
                    <button
                      key={weekNum}
                      type="button"
                      onClick={() => toggleWeekSelection(weekNum)}
                      className={`rounded-lg border-2 px-4 py-1.5 text-sm font-semibold transition-colors ${
                        selected || isPreview
                          ? 'border-blue-500 bg-blue-50 text-blue-800'
                          : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                      }`}
                      title={
                        selected
                          ? 'Selected for import — click to deselect'
                          : 'Click to select for import and preview'
                      }
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
                      const summaries = day ? calculateSportSummaries(day, 'emoji') : [];
                      const sport1 = summaries[0];
                      const mainWorkText = sport1?.mainWork
                        ? stripHtml(sport1.mainWork)
                        : '—';

                      return (
                        <tr key={dayNum} className="hover:bg-gray-50/80">
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
                              {[1, 2, 3].map((slot) => workoutSlotLabel(day, slot))}
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
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {selectedWeekNumbers.length > 0 && anyTargetHasContent && (
              <label className="flex items-start gap-3 p-3 border border-amber-300 bg-amber-50 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmOverwrite}
                  onChange={(e) => setConfirmOverwrite(e.target.checked)}
                  className="mt-1"
                />
                <span className="text-sm text-amber-900">
                  Target week(s) in your Yearly Plan already contain workouts. Confirm to replace
                  them.
                </span>
              </label>
            )}

            {selectedWeekNumbers.length > 0 && (
              <p className="text-xs text-gray-600">
                Importing into Yearly Plan Week {anchorWeek.weekNumber}
                {selectedWeekNumbers.length > 1
                  ? ` – ${anchorWeek.weekNumber + selectedWeekNumbers.length - 1}`
                  : ''}
                .
              </p>
            )}
          </div>

          <div className="px-5 py-3 border-t bg-gray-50 flex items-center justify-between shrink-0">
            <p className="text-sm text-gray-600">
              {selectedWeekNumbers.length === 0
                ? 'No weeks selected'
                : `${selectedWeekNumbers.length} week${selectedWeekNumbers.length === 1 ? '' : 's'} selected`}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-lg"
                disabled={isImporting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleCopy()}
                disabled={
                  isImporting ||
                  selectedWeekNumbers.length === 0 ||
                  loading ||
                  (anyTargetHasContent && !confirmOverwrite)
                }
                className="px-5 py-2 text-sm font-bold bg-blue-400 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isImporting
                  ? 'Copying…'
                  : `Copy to ${selectedWeekNumbers.length} Week(s)`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { X, FileOutput, ArrowRight } from 'lucide-react';
import { templateDaySlotLabel } from '@/lib/workoutDayCopy';

export type ExportDayToTemplatePayload = {
  templateSection: 'A' | 'B' | 'C';
  targetWeekId: string;
  targetDayId: string;
};

interface ExportDayToTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceDay: any;
  onConfirm: (payload: ExportDayToTemplatePayload) => Promise<void>;
}

function getWeekWorkoutCount(week: any) {
  if (!week?.days) return 0;
  return week.days.reduce(
    (sum: number, day: any) => sum + (day.workouts?.length || 0),
    0
  );
}

export default function ExportDayToTemplateModal({
  isOpen,
  onClose,
  sourceDay,
  onConfirm,
}: ExportDayToTemplateModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedTemplate, setSelectedTemplate] = useState<'A' | 'B' | 'C' | null>(null);
  const [selectedWeekId, setSelectedWeekId] = useState<string>('');
  const [selectedTargetDayId, setSelectedTargetDayId] = useState('');
  const [templateWeeks, setTemplateWeeks] = useState<any[]>([]);
  const [isLoadingWeeks, setIsLoadingWeeks] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const resetState = () => {
    setStep(1);
    setSelectedTemplate(null);
    setSelectedWeekId('');
    setSelectedTargetDayId('');
    setTemplateWeeks([]);
  };

  useEffect(() => {
    if (!isOpen) return;
    resetState();
  }, [isOpen, sourceDay?.id]);

  const loadTemplateWeeks = async (template: 'A' | 'B' | 'C') => {
    setIsLoadingWeeks(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setTemplateWeeks([]);
        return;
      }
      const response = await fetch(
        `/api/workouts/plan?type=TEMPLATE_WEEKS&section=${template}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!response.ok) {
        setTemplateWeeks([]);
        return;
      }
      const data = await response.json();
      setTemplateWeeks(data.plan?.weeks ?? []);
    } catch {
      setTemplateWeeks([]);
    } finally {
      setIsLoadingWeeks(false);
    }
  };

  const handleTemplateSelect = async (template: 'A' | 'B' | 'C') => {
    setSelectedTemplate(template);
    setSelectedWeekId('');
    setSelectedTargetDayId('');
    setStep(2);
    await loadTemplateWeeks(template);
  };

  const selectedWeekData = useMemo(
    () => templateWeeks.find((w) => w.id === selectedWeekId),
    [templateWeeks, selectedWeekId]
  );

  const templateDaysInWeek = useMemo(() => {
    if (!selectedWeekData?.days?.length) return [];
    return [...selectedWeekData.days].sort(
      (a: any, b: any) => (a.dayOfWeek ?? 0) - (b.dayOfWeek ?? 0)
    );
  }, [selectedWeekData]);

  useEffect(() => {
    if (step !== 3 || !sourceDay?.dayOfWeek) return;
    const match = templateDaysInWeek.find(
      (d: any) => d.dayOfWeek === sourceDay.dayOfWeek
    );
    if (match) setSelectedTargetDayId(match.id);
  }, [step, templateDaysInWeek, sourceDay?.dayOfWeek]);

  const handleExport = async () => {
    if (!selectedTemplate || !selectedWeekId || !selectedTargetDayId) return;
    setIsExporting(true);
    try {
      await onConfirm({
        templateSection: selectedTemplate,
        targetWeekId: selectedWeekId,
        targetDayId: selectedTargetDayId,
      });
      onClose();
      resetState();
    } finally {
      setIsExporting(false);
    }
  };

  const handleClose = () => {
    onClose();
    resetState();
  };

  if (!isOpen || !sourceDay) return null;

  const workoutCount = sourceDay.workouts?.length ?? 0;
  const sourceDateLabel = sourceDay.date
    ? new Date(sourceDay.date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Selected day';

  const selectedWeekIndex = templateWeeks.findIndex((w) => w.id === selectedWeekId);
  const selectedWeekNum = selectedWeekIndex >= 0 ? selectedWeekIndex + 1 : null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-[999998]" onClick={handleClose} />
      <div className="fixed inset-0 flex items-center justify-center z-[999999] p-4">
        <div
          className="bg-white rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-gradient-to-r from-teal-600 to-cyan-600 text-white px-6 py-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <FileOutput className="w-6 h-6" />
              <h2 className="text-xl font-bold">
                Export to Template Plans
                {step > 1 && ` — Step ${step} of 3`}
              </h2>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="p-1 hover:bg-white/20 rounded-full transition-colors"
              disabled={isExporting}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto flex-1">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-gray-800">
                <strong>Exporting from:</strong> {sourceDateLabel}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                {workoutCount} workout{workoutCount === 1 ? '' : 's'} will be copied (existing
                workouts on the target template day will be replaced).
              </p>
            </div>

            {step === 1 && (
              <div className="space-y-4">
                <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
                  <p className="text-sm text-teal-900 font-semibold mb-2">
                    📝 Select which template plan to export to:
                  </p>
                  <p className="text-xs text-teal-800">
                    Each template plan contains 3 weeks. Choose plan A, B, or C, then pick the week
                    and day slot.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {(['A', 'B', 'C'] as const).map((template) => (
                    <button
                      key={template}
                      type="button"
                      onClick={() => handleTemplateSelect(template)}
                      className="p-6 border-2 border-gray-300 rounded-lg hover:border-teal-500 hover:bg-teal-50 transition-all group"
                    >
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center text-white text-2xl font-bold group-hover:scale-110 transition-transform">
                          {template}
                        </div>
                        <div className="text-center">
                          <h3 className="font-bold text-lg text-gray-900">
                            Weekly Plan {template}
                          </h3>
                          <p className="text-xs text-gray-600 mt-1">3 weeks template</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 2 && selectedTemplate && (
              <div className="space-y-4">
                <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
                  <p className="text-sm text-teal-900 font-semibold mb-1">
                    📅 Selected: Weekly Plan {selectedTemplate}
                  </p>
                  <p className="text-xs text-teal-800">
                    Select which week to export this day into.
                  </p>
                </div>

                <div className="flex items-center justify-between mb-3">
                  <button
                    type="button"
                    onClick={() => {
                      setStep(1);
                      setSelectedTemplate(null);
                      setSelectedWeekId('');
                      setTemplateWeeks([]);
                    }}
                    className="text-sm text-teal-600 hover:text-teal-700 underline"
                  >
                    ← Change Template
                  </button>
                </div>

                <div className="space-y-3">
                  {isLoadingWeeks ? (
                    <div className="flex items-center justify-center py-8 text-gray-600">
                      Loading weeks…
                    </div>
                  ) : templateWeeks.length === 0 ? (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <p className="text-sm text-yellow-900 font-semibold mb-2">
                        Weekly Plan {selectedTemplate} has no weeks yet
                      </p>
                      <p className="text-xs text-yellow-800">
                        Open <strong>Create Template Plans</strong> → Weekly Plan{' '}
                        {selectedTemplate} and set up your template weeks first.
                      </p>
                    </div>
                  ) : (
                    templateWeeks.map((week, idx) => {
                      const weekNum = week.weekNumber ?? idx + 1;
                      const isSelected = selectedWeekId === week.id;
                      const count = getWeekWorkoutCount(week);
                      return (
                        <button
                          key={week.id}
                          type="button"
                          onClick={() => setSelectedWeekId(week.id)}
                          className={`w-full p-4 border-2 rounded-lg transition-all text-left ${
                            isSelected
                              ? 'border-teal-500 bg-teal-50'
                              : 'border-gray-300 hover:border-teal-300 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                                isSelected
                                  ? 'bg-teal-500 border-teal-500'
                                  : 'border-gray-400'
                              }`}
                            >
                              {isSelected && <span className="text-white text-sm">✓</span>}
                            </div>
                            <div>
                              <h4 className="font-semibold text-gray-900">Week {weekNum}</h4>
                              <p className="text-xs text-gray-600">
                                {week.periodName || 'No period'} • {count} workout
                                {count !== 1 ? 's' : ''}
                              </p>
                            </div>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>

                {selectedWeekId && selectedWeekNum && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-sm text-green-900">
                      <strong>Selected:</strong> Week {selectedWeekNum}
                    </p>
                  </div>
                )}
              </div>
            )}

            {step === 3 && selectedTemplate && selectedWeekData && (
              <div className="space-y-4">
                <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
                  <p className="text-sm text-teal-900 font-semibold mb-1">
                    🎯 Choose the day slot in Weekly Plan {selectedTemplate}
                  </p>
                  <p className="text-xs text-teal-800">
                    Week {selectedWeekNum ?? '?'} — pick which day (Mon–Sun) receives your workouts.
                  </p>
                </div>

                {templateDaysInWeek.length === 0 ? (
                  <p className="text-sm text-amber-700">
                    This week has no day slots. Add days in Create Template Plans first.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {templateDaysInWeek.map((day: any) => {
                      const count = day.workouts?.length ?? 0;
                      return (
                        <button
                          key={day.id}
                          type="button"
                          onClick={() => setSelectedTargetDayId(day.id)}
                          className={`px-3 py-2 text-sm rounded border transition-colors text-left ${
                            selectedTargetDayId === day.id
                              ? 'bg-teal-600 text-white border-teal-700'
                              : 'bg-white text-gray-700 border-gray-300 hover:bg-teal-50'
                          }`}
                        >
                          {templateDaySlotLabel(day)}
                          <span className="block text-xs opacity-80">
                            {count} workout{count === 1 ? '' : 's'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setStep(2);
                    setSelectedTargetDayId('');
                  }}
                  className="text-sm text-teal-600 hover:text-teal-700 underline"
                >
                  ← Change Week
                </button>
              </div>
            )}
          </div>

          <div className="bg-gray-50 px-6 py-4 flex justify-between items-center border-t shrink-0">
            <button
              type="button"
              onClick={() => {
                if (step === 1) {
                  handleClose();
                } else if (step === 2) {
                  setStep(1);
                  setSelectedTemplate(null);
                  setSelectedWeekId('');
                  setTemplateWeeks([]);
                } else {
                  setStep(2);
                  setSelectedTargetDayId('');
                }
              }}
              className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg font-medium transition-colors"
              disabled={isExporting}
            >
              {step === 1 ? 'Cancel' : 'Back'}
            </button>

            <button
              type="button"
              onClick={() => {
                if (step === 1) return;
                if (step === 2 && selectedWeekId) {
                  setStep(3);
                } else if (step === 3) {
                  handleExport();
                }
              }}
              disabled={
                isExporting ||
                step === 1 ||
                (step === 2 && !selectedWeekId) ||
                (step === 3 && !selectedTargetDayId)
              }
              className={`px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                isExporting ||
                step === 1 ||
                (step === 2 && !selectedWeekId) ||
                (step === 3 && !selectedTargetDayId)
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : step === 3
                    ? 'bg-teal-600 hover:bg-teal-700 text-white'
                    : 'bg-teal-600 hover:bg-teal-700 text-white'
              }`}
            >
              {isExporting ? (
                'Exporting…'
              ) : step === 3 ? (
                <>
                  <FileOutput className="w-4 h-4" />
                  Export to Template
                </>
              ) : (
                <>
                  Next Step
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

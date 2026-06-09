'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { X, Copy } from 'lucide-react';
import { fetchPlanWeeks, getWeekWorkoutCount, isWeekEmpty } from '@/lib/workoutPlanLoad';

export type CopyStructureToTemplatePayload = {
  targetTemplate: 'A' | 'B' | 'C';
  targetWeekId: string;
  overwrite: boolean;
};

interface CopyStructureToTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourcePlanKey: string;
  sourcePlanName: string;
  sourceAssignmentCount: number;
  onConfirm: (payload: CopyStructureToTemplatePayload) => Promise<void>;
}

export default function CopyStructureToTemplateModal({
  isOpen,
  onClose,
  sourcePlanKey,
  sourcePlanName,
  sourceAssignmentCount,
  onConfirm,
}: CopyStructureToTemplateModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedTemplate, setSelectedTemplate] = useState<'A' | 'B' | 'C' | null>(null);
  const [selectedWeekId, setSelectedWeekId] = useState('');
  const [templateWeeks, setTemplateWeeks] = useState<any[]>([]);
  const [isLoadingWeeks, setIsLoadingWeeks] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [confirmOverwrite, setConfirmOverwrite] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setStep(1);
    setSelectedTemplate(null);
    setSelectedWeekId('');
    setTemplateWeeks([]);
    setConfirmOverwrite(false);
  }, [isOpen, sourcePlanKey]);

  const loadTemplateWeeks = async (template: 'A' | 'B' | 'C') => {
    setIsLoadingWeeks(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setTemplateWeeks([]);
        return;
      }
      setTemplateWeeks(await fetchPlanWeeks(token, 'TEMPLATE_WEEKS', template));
    } catch {
      setTemplateWeeks([]);
    } finally {
      setIsLoadingWeeks(false);
    }
  };

  const handleTemplateSelect = async (template: 'A' | 'B' | 'C') => {
    setSelectedTemplate(template);
    setSelectedWeekId('');
    setConfirmOverwrite(false);
    setStep(2);
    await loadTemplateWeeks(template);
  };

  const selectedWeek = useMemo(
    () => templateWeeks.find((w) => w.id === selectedWeekId),
    [templateWeeks, selectedWeekId]
  );

  const targetHasContent = selectedWeek ? !isWeekEmpty(selectedWeek) : false;

  const handleCopy = async () => {
    if (!selectedTemplate || !selectedWeekId) return;
    if (targetHasContent && !confirmOverwrite) return;
    setIsCopying(true);
    try {
      await onConfirm({
        targetTemplate: selectedTemplate,
        targetWeekId: selectedWeekId,
        overwrite: targetHasContent,
      });
      onClose();
    } finally {
      setIsCopying(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[999998]" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-[999999] p-4">
        <div
          className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <Copy className="w-6 h-6" />
              <h2 className="text-xl font-bold">
                Copy Week on Template{step > 1 ? ` — Step ${step} of 2` : ''}
              </h2>
            </div>
            <button type="button" onClick={onClose} className="p-1 hover:bg-white/20 rounded-full" disabled={isCopying}>
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto flex-1">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-gray-800">
                <strong>Source:</strong> Weekly Structure Plan {sourcePlanKey}
                {sourcePlanName ? ` — ${sourcePlanName}` : ''}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                {sourceAssignmentCount} assignment{sourceAssignmentCount === 1 ? '' : 's'} will be materialized into the template week.
              </p>
            </div>

            {step === 1 && (
              <div className="space-y-4">
                <p className="text-sm font-medium text-gray-700">
                  Select Template Weekly Plan (A, B, or C):
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {(['A', 'B', 'C'] as const).map((template) => (
                    <button
                      key={template}
                      type="button"
                      onClick={() => void handleTemplateSelect(template)}
                      className="p-6 border-2 border-gray-300 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-all"
                    >
                      <div className="w-14 h-14 mx-auto rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-2xl font-bold mb-2">
                        {template}
                      </div>
                      <h3 className="font-bold text-gray-900">Template Plan {template}</h3>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 2 && selectedTemplate && (
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={() => {
                    setStep(1);
                    setSelectedTemplate(null);
                    setSelectedWeekId('');
                    setTemplateWeeks([]);
                    setConfirmOverwrite(false);
                  }}
                  className="text-sm text-indigo-600 hover:text-indigo-700 underline"
                >
                  ← Change template plan
                </button>

                <p className="text-sm text-gray-700">
                  Select target week (1–3) in <strong>Template Plan {selectedTemplate}</strong>:
                </p>

                {isLoadingWeeks ? (
                  <p className="text-center py-6 text-gray-500">Loading weeks…</p>
                ) : templateWeeks.length === 0 ? (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-900">
                    Template Plan {selectedTemplate} has no weeks yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {templateWeeks.slice(0, 3).map((week, idx) => {
                      const weekNum = week.weekNumber ?? idx + 1;
                      const count = getWeekWorkoutCount(week);
                      const isSelected = selectedWeekId === week.id;
                      return (
                        <button
                          key={week.id}
                          type="button"
                          onClick={() => {
                            setSelectedWeekId(week.id);
                            setConfirmOverwrite(false);
                          }}
                          className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
                            isSelected
                              ? 'border-indigo-500 bg-indigo-50'
                              : 'border-gray-300 hover:border-indigo-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold">Week {weekNum}</span>
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full ${
                                count === 0
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {count === 0 ? 'Empty' : `${count} workout${count === 1 ? '' : 's'}`}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {selectedWeek && targetHasContent && (
                  <label className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={confirmOverwrite}
                      onChange={(e) => setConfirmOverwrite(e.target.checked)}
                      className="mt-0.5"
                    />
                    <span className="text-sm text-amber-900">
                      Target week already has workouts. Replace them with the structure export.
                    </span>
                  </label>
                )}
              </div>
            )}
          </div>

          <div className="border-t bg-gray-50 px-6 py-4 flex justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              disabled={isCopying}
            >
              Cancel
            </button>
            {step === 2 && (
              <button
                type="button"
                onClick={() => void handleCopy()}
                disabled={
                  isCopying ||
                  !selectedWeekId ||
                  (targetHasContent && !confirmOverwrite)
                }
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {isCopying ? 'Copying…' : 'Copy Week on Template'}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

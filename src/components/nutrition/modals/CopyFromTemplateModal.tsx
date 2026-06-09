'use client';

import React, { useState, useEffect } from 'react';
import { X, Copy, Calendar, ArrowRight } from 'lucide-react';

interface CopyFromTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (templatePlan: 'A' | 'B' | 'C', selectedWeeks: number[], targetStartWeek: number) => Promise<void>;
  yearlyPlanWeeks: any[];
  onNavigateToTemplate?: (template: 'A' | 'B' | 'C') => void;
}

export default function CopyFromTemplateModal({
  isOpen,
  onClose,
  onConfirm,
  yearlyPlanWeeks,
  onNavigateToTemplate
}: CopyFromTemplateModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedTemplate, setSelectedTemplate] = useState<'A' | 'B' | 'C' | null>(null);
  const [selectedWeeks, setSelectedWeeks] = useState<number[]>([]);
  const [targetStartWeek, setTargetStartWeek] = useState<number>(1);
  const [isCopying, setIsCopying] = useState(false);
  const [isLoadingWeeks, setIsLoadingWeeks] = useState(false);
  const [templateWeeks, setTemplateWeeks] = useState<any[]>([]);

  useEffect(() => {
    if (selectedTemplate && isOpen) {
      // Load template plan data
      loadTemplateData(selectedTemplate);
    }
  }, [selectedTemplate, isOpen]);

  const loadTemplateData = async (template: 'A' | 'B' | 'C') => {
    setIsLoadingWeeks(true);
    try {
      console.log(`📋 Loading template data for plan ${template}`);
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('❌ No token found');
        alert('Please log in to access templates');
        setTemplateWeeks([]);
        return;
      }

      console.log(`📋 Making request to: /api/nutrition/plan?type=TEMPLATE_WEEKS&section=${template}`);
      const response = await fetch(`/api/nutrition/plan?type=TEMPLATE_WEEKS&section=${template}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log(`📋 Response status: ${response.status}`);
      
      if (!response.ok) {
        console.error(`❌ API error: ${response.status} ${response.statusText}`);
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('❌ Error details:', errorData);
        alert(`Error loading template: ${errorData.error || response.statusText}`);
        setTemplateWeeks([]);
        return;
      }

      const data = await response.json();
      console.log(`📋 Template ${template} full response:`, data);
      console.log(`📋 Template ${template} response data:`, {
        hasplan: !!data.plan,
        planId: data.plan?.id,
        weeksCount: data.plan?.weeks?.length,
        weeksIsArray: Array.isArray(data.plan?.weeks),
        firstWeek: data.plan?.weeks?.[0],
        hasWorkouts: data.plan?.weeks?.[0]?.days?.some((d: any) => d.meals?.length > 0)
      });
      
      // The API returns { plan: { weeks: [...] } } (no success field)
      if (data.plan && Array.isArray(data.plan.weeks) && data.plan.weeks.length > 0) {
        console.log(`✅ Setting ${data.plan.weeks.length} weeks for template ${template}`);
        setTemplateWeeks(data.plan.weeks);
      } else if (data.plan && Array.isArray(data.plan.weeks) && data.plan.weeks.length === 0) {
        // Plan exists but has no weeks
        console.warn(`⚠️ Plan exists but has no weeks for template ${template}`);
        setTemplateWeeks([]);
      } else if (data.plan) {
        // Plan exists but weeks is not an array or undefined
        console.warn(`⚠️ Plan exists but weeks data is invalid for template ${template}`, {
          weeks: data.plan.weeks,
          weeksType: typeof data.plan.weeks
        });
        setTemplateWeeks([]);
      } else {
        // No plan exists
        console.warn(`⚠️ No plan found for template ${template}`);
        setTemplateWeeks([]);
      }
    } catch (error: any) {
      console.error('❌ Error loading template data:', error);
      alert(`Failed to load template: ${error.message}`);
      setTemplateWeeks([]);
    } finally {
      setIsLoadingWeeks(false);
    }
  };

  const handleTemplateSelect = (template: 'A' | 'B' | 'C') => {
    setSelectedTemplate(template);
    setSelectedWeeks([]);
    setStep(2);
  };

  const toggleWeekSelection = (weekNum: number) => {
    setSelectedWeeks(prev => 
      prev.includes(weekNum) 
        ? prev.filter(w => w !== weekNum)
        : [...prev, weekNum].sort((a, b) => a - b)
    );
  };

  const selectAllWeeks = () => {
    const allWeeks = templateWeeks.map((_, idx) => idx + 1);
    setSelectedWeeks(allWeeks);
  };

  const handleCopy = async () => {
    if (!selectedTemplate || selectedWeeks.length === 0) return;

    setIsCopying(true);
    try {
      await onConfirm(selectedTemplate, selectedWeeks, targetStartWeek);
      onClose();
      // Reset state
      setStep(1);
      setSelectedTemplate(null);
      setSelectedWeeks([]);
      setTargetStartWeek(1);
    } catch (error) {
      console.error('Error copying:', error);
    } finally {
      setIsCopying(false);
    }
  };

  const getWeekWorkoutCount = (week: any) => {
    if (!week || !week.days) return 0;
    return week.days.reduce((sum: number, day: any) => sum + (day.meals?.length || 0), 0);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-[60]" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-[70] p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Copy className="w-6 h-6" />
              <h2 className="text-xl font-bold">
                Copy from Template Plans
                {step > 1 && ` - Step ${step} of 3`}
              </h2>
            </div>
            <button
              onClick={() => {
                onClose();
                setStep(1);
                setSelectedTemplate(null);
                setSelectedWeeks([]);
              }}
              className="p-1 hover:bg-white/20 rounded-full transition-colors"
              disabled={isCopying}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
            {step === 1 && (
              <div className="space-y-4">
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <p className="text-sm text-purple-900 font-semibold mb-2">
                    📋 Select which template plan to copy from:
                  </p>
                  <p className="text-xs text-purple-800">
                    Each template plan contains 3 weeks of workouts that you can copy to your Yearly Plan.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {(['A', 'B', 'C'] as const).map((template) => (
                    <button
                      key={template}
                      onClick={() => handleTemplateSelect(template)}
                      className="p-6 border-2 border-gray-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-all group"
                    >
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center text-white text-2xl font-bold group-hover:scale-110 transition-transform">
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
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <p className="text-sm text-purple-900 font-semibold mb-1">
                    📅 Selected: Weekly Plan {selectedTemplate}
                  </p>
                  <p className="text-xs text-purple-800">
                    Select which week(s) to copy. You can select one or multiple weeks.
                  </p>
                </div>

                <div className="flex items-center justify-between mb-3">
                  <button
                    onClick={() => setStep(1)}
                    className="text-sm text-purple-600 hover:text-purple-700 underline"
                  >
                    ← Change Template
                  </button>
                  <button
                    onClick={selectAllWeeks}
                    className="text-sm text-blue-600 hover:text-blue-700 underline"
                  >
                    Select All Weeks
                  </button>
                </div>

                <div className="space-y-3">
                  {isLoadingWeeks ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="text-gray-600">Loading weeks...</div>
                    </div>
                  ) : templateWeeks.length === 0 ? (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <p className="text-sm text-yellow-900 font-semibold mb-2">
                        📝 Weekly Plan {selectedTemplate} is Empty
                      </p>
                      <p className="text-xs text-yellow-800 mb-3">
                        This template doesn't have any workouts yet. Here's how to add them:
                      </p>
                      <ol className="text-xs text-yellow-900 space-y-2 ml-4">
                        <li className="flex items-start gap-2">
                          <span className="font-bold">1.</span>
                          <span>Go to <strong>Section A: Create Template Plans</strong></span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="font-bold">2.</span>
                          <span>Click the <strong>Weekly Plan {selectedTemplate}</strong> tab</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="font-bold">3.</span>
                          <span>Click <strong>"Add Day"</strong> to create days (up to 3 weeks)</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="font-bold">4.</span>
                          <span>Add workouts and nutritionFoods to your template</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="font-bold">5.</span>
                          <span>Come back here to copy them to your Yearly Plan!</span>
                        </li>
                      </ol>
                      <div className="mt-3 pt-3 border-t border-yellow-300 flex items-center justify-between">
                        <p className="text-xs text-yellow-800">
                          💡 <strong>Tip:</strong> Create different training phases in A, B, C
                        </p>
                        {onNavigateToTemplate && (
                          <button
                            onClick={() => {
                              onNavigateToTemplate(selectedTemplate);
                              onClose();
                            }}
                            className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-700 text-white text-xs font-medium rounded transition-colors"
                          >
                            Go to Plan {selectedTemplate}
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    templateWeeks.map((week, idx) => {
                      const weekNum = idx + 1;
                      const isSelected = selectedWeeks.includes(weekNum);
                      const workoutCount = getWeekWorkoutCount(week);
                      
                      return (
                        <button
                          key={weekNum}
                          onClick={() => toggleWeekSelection(weekNum)}
                          className={`w-full p-4 border-2 rounded-lg transition-all text-left ${
                            isSelected
                              ? 'border-purple-500 bg-purple-50'
                              : 'border-gray-300 hover:border-purple-300 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`w-6 h-6 rounded border-2 flex items-center justify-center ${
                                isSelected ? 'bg-purple-500 border-purple-500' : 'border-gray-400'
                              }`}>
                                {isSelected && <span className="text-white text-sm">✓</span>}
                              </div>
                              <div>
                                <h4 className="font-semibold text-gray-900">Week {weekNum}</h4>
                                <p className="text-xs text-gray-600">
                                  {week.periodName || 'No period'} • {workoutCount} workout{workoutCount !== 1 ? 's' : ''}
                                </p>
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>

                {selectedWeeks.length > 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-sm text-green-900">
                      <strong>{selectedWeeks.length} week{selectedWeeks.length !== 1 ? 's' : ''} selected:</strong> Week {selectedWeeks.join(', ')}
                    </p>
                  </div>
                )}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <p className="text-sm text-purple-900 font-semibold mb-1">
                    🎯 Choose where to paste in Yearly Plan
                  </p>
                  <p className="text-xs text-purple-800">
                    Selected weeks will be copied starting from the week you choose.
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 mb-2">Copy Summary:</h4>
                  <ul className="text-sm text-blue-900 space-y-1">
                    <li>• <strong>From:</strong> Weekly Plan {selectedTemplate}</li>
                    <li>• <strong>Weeks:</strong> {selectedWeeks.join(', ')} ({selectedWeeks.length} week{selectedWeeks.length !== 1 ? 's' : ''})</li>
                    <li>• <strong>To:</strong> Yearly Plan, starting at week {targetStartWeek}</li>
                  </ul>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Target Week in Yearly Plan:
                  </label>
                  <select
                    value={targetStartWeek}
                    onChange={(e) => setTargetStartWeek(Number(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  >
                    {yearlyPlanWeeks.map((week, idx) => {
                      const weekNum = idx + 1;
                      return (
                        <option key={weekNum} value={weekNum}>
                          Week {weekNum} {week.periodName ? `- ${week.periodName}` : ''}
                        </option>
                      );
                    })}
                  </select>
                  <p className="mt-2 text-xs text-gray-600">
                    💡 The {selectedWeeks.length} week{selectedWeeks.length !== 1 ? 's' : ''} will be copied to weeks {targetStartWeek} - {targetStartWeek + selectedWeeks.length - 1}
                  </p>
                </div>

                <button
                  onClick={() => setStep(2)}
                  className="text-sm text-purple-600 hover:text-purple-700 underline"
                >
                  ← Change Selection
                </button>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 flex justify-between items-center border-t">
            <button
              onClick={() => {
                if (step > 1) {
                  setStep((step - 1) as 1 | 2);
                } else {
                  onClose();
                  setStep(1);
                  setSelectedTemplate(null);
                  setSelectedWeeks([]);
                }
              }}
              className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg font-medium transition-colors"
              disabled={isCopying}
            >
              {step === 1 ? 'Cancel' : 'Back'}
            </button>

            <button
              onClick={() => {
                if (step === 2 && selectedWeeks.length > 0) {
                  setStep(3);
                } else if (step === 3) {
                  handleCopy();
                }
              }}
              disabled={(step === 2 && selectedWeeks.length === 0) || isCopying}
              className={`px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                (step === 2 && selectedWeeks.length === 0) || isCopying
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : step === 3
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-purple-600 hover:bg-purple-700 text-white'
              }`}
            >
              {isCopying ? (
                'Copying...'
              ) : step === 3 ? (
                <>
                  <Copy className="w-4 h-4" />
                  Copy to Yearly Plan
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


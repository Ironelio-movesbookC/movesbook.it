'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { X, Copy } from 'lucide-react';
import {
  WEEKLY_STRUCTURE_PLAN_KEYS,
  type WeeklyStructurePlanKey,
} from '@/lib/weeklyStructureTypes';
import { loadWeeklyStructurePlan } from '@/lib/weeklyStructureStorage';
import { getStructureAssignmentCount, isStructureGridEmpty } from '@/lib/weeklyStructureMaterialize';

export type CloneWeeklyStructurePayload = {
  targetPlanKey: WeeklyStructurePlanKey;
  overwrite: boolean;
};

interface CloneWeeklyStructureModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourcePlanKey: WeeklyStructurePlanKey;
  sourceAssignmentCount: number;
  onConfirm: (payload: CloneWeeklyStructurePayload) => Promise<void>;
}

export default function CloneWeeklyStructureModal({
  isOpen,
  onClose,
  sourcePlanKey,
  sourceAssignmentCount,
  onConfirm,
}: CloneWeeklyStructureModalProps) {
  const [selectedKey, setSelectedKey] = useState<WeeklyStructurePlanKey | null>(null);
  const [confirmOverwrite, setConfirmOverwrite] = useState(false);
  const [isCloning, setIsCloning] = useState(false);
  const [targetRefresh, setTargetRefresh] = useState(0);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedKey(null);
    setConfirmOverwrite(false);
    setTargetRefresh((n) => n + 1);
  }, [isOpen, sourcePlanKey]);

  const targetPlan = useMemo(() => {
    void targetRefresh;
    return selectedKey ? loadWeeklyStructurePlan(selectedKey) : null;
  }, [selectedKey, targetRefresh]);

  const targetIsSource = selectedKey === sourcePlanKey;
  const targetHasContent = targetPlan ? !isStructureGridEmpty(targetPlan) : false;
  const targetCount = targetPlan ? getStructureAssignmentCount(targetPlan) : 0;

  const handleClone = async () => {
    if (!selectedKey || targetIsSource) return;
    if (targetHasContent && !confirmOverwrite) return;
    setIsCloning(true);
    try {
      await onConfirm({ targetPlanKey: selectedKey, overwrite: targetHasContent });
      onClose();
    } finally {
      setIsCloning(false);
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
          <div className="bg-gradient-to-r from-violet-600 to-purple-600 text-white px-6 py-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <Copy className="w-6 h-6" />
              <h2 className="text-xl font-bold">Clone Week — Plan {sourcePlanKey}</h2>
            </div>
            <button type="button" onClick={onClose} className="p-1 hover:bg-white/20 rounded-full" disabled={isCloning}>
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto flex-1 space-y-4">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <p className="text-sm text-gray-800">
                <strong>Source:</strong> Weekly Workouts Structure — Plan {sourcePlanKey}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                {sourceAssignmentCount} grid assignment{sourceAssignmentCount === 1 ? '' : 's'} will be copied.
              </p>
            </div>

            <p className="text-sm font-medium text-gray-700">
              Select destination plan (A–E):
            </p>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {WEEKLY_STRUCTURE_PLAN_KEYS.map((key) => {
                const plan = loadWeeklyStructurePlan(key);
                const count = getStructureAssignmentCount(plan);
                const isSource = key === sourcePlanKey;
                const isSelected = selectedKey === key;
                return (
                  <button
                    key={key}
                    type="button"
                    disabled={isSource}
                    onClick={() => {
                      setSelectedKey(key);
                      setConfirmOverwrite(false);
                    }}
                    className={`p-4 border-2 rounded-lg transition-all ${
                      isSource
                        ? 'border-gray-200 bg-gray-100 opacity-60 cursor-not-allowed'
                        : isSelected
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-300 hover:border-purple-300'
                    }`}
                  >
                    <div className="text-xl font-bold text-purple-700">Plan {key}</div>
                    <div
                      className={`text-xs mt-1 px-2 py-0.5 rounded-full inline-block ${
                        count === 0 ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {count === 0 ? 'Empty' : `${count} assigned`}
                    </div>
                    {plan.meta.name && (
                      <p className="text-xs text-gray-500 mt-1 truncate">{plan.meta.name}</p>
                    )}
                  </button>
                );
              })}
            </div>

            {selectedKey && targetHasContent && !targetIsSource && (
              <label className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmOverwrite}
                  onChange={(e) => setConfirmOverwrite(e.target.checked)}
                  className="mt-0.5"
                />
                <span className="text-sm text-amber-900">
                  Plan {selectedKey} already has {targetCount} assignment
                  {targetCount === 1 ? '' : 's'}. Replace with cloned content.
                </span>
              </label>
            )}
          </div>

          <div className="border-t bg-gray-50 px-6 py-4 flex justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              disabled={isCloning}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleClone()}
              disabled={
                isCloning ||
                !selectedKey ||
                targetIsSource ||
                (targetHasContent && !confirmOverwrite)
              }
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              {isCloning ? 'Cloning…' : 'Clone Week'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { X } from 'lucide-react';
import type { PlanGymWeekManualResult, ManualDaySector } from './PlanGymWeekManualModal';
import { getGoalLabel, type GoalId } from './PlanGymWeekModal';

/**
 * Fast Plan page (images 3 & 4): Day labels at the top, routine names, and sector/exercise list.
 * Displayed after the user confirms sectors in PlanGymWeekManualModal (Create routines and movelaps).
 */
interface PlanGymWeekFastPlanModalProps {
  isOpen: boolean;
  plan: PlanGymWeekManualResult;
  goals?: GoalId[];
  onClose: () => void;
  /** Called when user wants to save the plan to Archive or Yearly Plan */
  onSave?: (plan: PlanGymWeekManualResult) => void;
}

export default function PlanGymWeekFastPlanModal({
  isOpen,
  plan,
  goals = [],
  onClose,
  onSave
}: PlanGymWeekFastPlanModalProps) {
  const [activeDayIndex, setActiveDayIndex] = useState(0);
  const [showFullPage, setShowFullPage] = useState(false);

  if (!isOpen) return null;

  const activeDay = plan.days[activeDayIndex];
  if (!activeDay) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        className={`bg-white rounded-xl shadow-xl flex flex-col ${
          showFullPage ? 'fixed inset-4 z-50' : 'max-w-5xl w-full max-h-[90vh]'
        }`}
      >
        {/* Header – same style as Add Moveframe / Fast Plan */}
        <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-gray-900">
              SAME PAGE OF THE CREATION OF FAST PLAN FOR NOT AEROBIC SPORTS
            </h2>
            <button
              type="button"
              onClick={() => setShowFullPage(!showFullPage)}
              className="text-sm text-red-600 hover:underline font-medium"
            >
              {showFullPage ? 'Back to edit' : 'Show full page'}
            </button>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {/* Day tabs – labels of days at the top with routine names (image 3 & 4) */}
          <div className="flex flex-wrap gap-1 border-b-2 border-gray-200 mb-4">
            {plan.days.map((day, idx) => {
              const goalLabel = getGoalLabel(goals[idx]);
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveDayIndex(idx)}
                  className={`px-4 py-3 rounded-t-lg font-medium text-left transition-colors ${
                    activeDayIndex === idx
                      ? 'bg-amber-100 border-2 border-b-0 border-amber-300 text-amber-900 -mb-[2px]'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-2 border-transparent'
                  }`}
                  title={`Day ${idx + 1}: ${day.routineName}${goalLabel ? ` — ${goalLabel}` : ''}`}
                >
                  <span className="font-bold block">Day {idx + 1}</span>
                  <span className="block text-sm font-normal opacity-90 truncate max-w-[140px]" title={day.routineName}>
                    {day.routineName || 'Unnamed'}
                  </span>
                  {goalLabel ? (
                    <span className="block text-xs text-gray-500 truncate max-w-[140px] mt-0.5" title={goalLabel}>
                      Goal: {goalLabel}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          {/* Routine name for active day */}
          <div className="mb-4 px-2">
            <label className="text-sm font-medium text-gray-700 mr-2">Routine name</label>
            <span className="text-gray-900 font-semibold">{activeDay.routineName || 'Unnamed'}</span>
          </div>

          {/* Sector selector row – muscle group icons (simplified, read-only for now) */}
          <div className="mb-3">
            <div className="text-sm font-medium text-gray-700 mb-2">
              Sector – Muscular areas for this day ({activeDay.sectors.length} selected)
            </div>
            <div className="flex flex-wrap gap-2">
              {activeDay.sectors.map((sec) => (
                <div
                  key={sec.sectorId}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg"
                >
                  <div className="relative w-10 h-10">
                    <Image src={sec.image} alt={sec.sectorLabel} fill className="object-contain" unoptimized />
                  </div>
                  <span className="text-sm font-medium text-gray-900">{sec.sectorLabel}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Exercise table – sectors with params (image 3 & 4 structure) */}
          <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50/50">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-200 border-b border-gray-300">
                    <th className="px-3 py-2 text-left font-semibold text-gray-900 w-8">#</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-900">Exercise</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-900 w-24">Speed</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-900 w-16">Series</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-900 w-20">Rip/Time</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-900 w-20">Weight</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-900 w-20">Break</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-900 w-24">Mode</th>
                  </tr>
                </thead>
                <tbody>
                  {activeDay.sectors.flatMap((sec, secIdx) =>
                    renderSectorRows(sec, secIdx)
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <p className="text-xs text-gray-500 mt-3 px-2">
            Scroll to view all repetitions. Each can have unique speed, time, and pause values. To add specific
            exercises, use Add Moveframe for each day in your workout plan.
          </p>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-3 mt-6 pt-4 border-t border-gray-200">
            {onSave && (
              <button
                type="button"
                onClick={() => onSave(plan)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
              >
                Save moveframe and its movelaps
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Render table rows for a sector: sector header with macro fields + placeholder exercise rows (image 4) */
function renderSectorRows(sec: ManualDaySector, secIdx: number) {
  const rows: React.ReactNode[] = [];

  // Sector header with macro fields (at top of each sector – image 4)
  rows.push(
    <tr key={`sector-${sec.sectorId}`} className="bg-gray-100 border-b-2 border-gray-300">
      <td colSpan={8} className="px-3 py-2">
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 flex-shrink-0">
            <Image src={sec.image} alt={sec.sectorLabel} fill className="object-contain" unoptimized />
          </div>
          <span className="font-bold text-gray-900">{sec.sectorLabel}</span>
          <div className="flex gap-4 text-xs text-amber-800 ml-4">
            <span>
              <span className="font-medium">Macropause at end of all series of each exercise:</span>{' '}
              {sec.macroExercise || "—"}
            </span>
            <span>
              <span className="font-medium">Macropause at end of all exercises of the sector:</span>{' '}
              {sec.macroEndOfSector || '—'}
            </span>
          </div>
        </div>
      </td>
    </tr>
  );

  // Placeholder exercise rows (one per exercise count)
  for (let ex = 0; ex < sec.exercises; ex++) {
    rows.push(
      <tr key={`${sec.sectorId}-ex-${ex}`} className="border-b border-gray-100 hover:bg-gray-50/50">
        <td className="px-3 py-2 text-gray-500 font-medium">{ex + 1}</td>
        <td className="px-3 py-2">
          <span className="text-gray-500 italic">
            {sec.sectorLabel} Exercise {ex + 1}
          </span>
        </td>
        <td className="px-3 py-2 text-gray-600">Normal</td>
        <td className="px-3 py-2 text-gray-700">{sec.series}</td>
        <td className="px-3 py-2 text-gray-700">{sec.reps}</td>
        <td className="px-3 py-2 text-gray-500">—</td>
        <td className="px-3 py-2 text-gray-700">{sec.pause}</td>
        <td className="px-3 py-2 text-gray-600">Stopped</td>
      </tr>
    );
  }

  return rows;
}

'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  MATCH_DONE_STATUSES,
  matchDoneCircleStyle,
  matchDoneStatusLabel,
  resolveMatchDoneStatus,
  yearlyWorkoutStatusStyle,
  type YearlyWorkoutStatus,
} from '@/utils/workoutSessionStatus';

type Props = {
  day: { workouts?: { status?: string; moveframes?: unknown[] }[] | null; originalPlannedDate?: string | Date | null };
  /** Only Section C (Workouts Done) may open the picker. */
  canSelect: boolean;
  onSelect?: (status: YearlyWorkoutStatus) => void;
  originalDateLabel?: string | null;
};

/**
 * Match Done column circle.
 * Color = shared Done status of all planned workouts on the day (greens/blues).
 * Double-click pickable only in Workouts Done; selection affects Yearly Plan too.
 */
export default function MatchDoneCircle({
  day,
  canSelect,
  onSelect,
  originalDateLabel,
}: Props) {
  const status = resolveMatchDoneStatus(day);
  const style = matchDoneCircleStyle(status);
  const [pickerOpen, setPickerOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pickerOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [pickerOpen]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!canSelect || !onSelect) return;
    setPickerOpen(true);
  };

  const handlePick = (next: YearlyWorkoutStatus) => {
    if (!onSelect) return;
    onSelect(next);
    setPickerOpen(false);
  };

  return (
    <div ref={rootRef} className="relative flex flex-col items-center justify-center gap-0.5">
      <button
        type="button"
        disabled={!canSelect}
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={handleDoubleClick}
        className={`w-6 h-6 rounded-full border flex-shrink-0 ${
          canSelect ? 'cursor-pointer hover:brightness-95' : 'cursor-default'
        }`}
        style={{ backgroundColor: style.bg, borderColor: style.border }}
        title={
          canSelect
            ? `${style.label} — double-click to set Match Done color (also updates Yearly Plan)`
            : `${style.label} — set this color in Workouts Done`
        }
        aria-label={style.label}
        aria-expanded={pickerOpen}
      />
      {originalDateLabel && (
        <span
          className="text-[9px] leading-tight text-gray-700 font-medium max-w-[56px] text-center"
          title={`Originally planned: ${originalDateLabel}`}
        >
          {originalDateLabel}
        </span>
      )}

      {pickerOpen && canSelect && (
        <div
          className="absolute left-1/2 top-full z-50 mt-1 min-w-[200px] -translate-x-1/2 rounded border border-gray-200 bg-white p-2 shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-gray-600">
            Match Done colors
          </p>
          <p className="mb-1.5 text-[9px] leading-tight text-gray-500">
            Applies to all workouts of this day and updates Yearly Plan.
          </p>
          <div className="flex flex-col gap-1">
            {MATCH_DONE_STATUSES.map((option) => {
              const optStyle = yearlyWorkoutStatusStyle(option);
              const selected = option === status;
              return (
                <button
                  key={option}
                  type="button"
                  title={matchDoneStatusLabel(option)}
                  onClick={() => handlePick(option)}
                  className={`flex items-center gap-2 rounded px-1 py-0.5 text-left hover:bg-gray-50 ${
                    selected ? 'bg-blue-50 ring-1 ring-blue-400' : ''
                  }`}
                >
                  <span
                    className="h-5 w-5 flex-shrink-0 rounded-full border"
                    style={{
                      backgroundColor: optStyle.bg,
                      borderColor: optStyle.border,
                    }}
                  />
                  <span className="text-[10px] text-gray-800 leading-tight">
                    {matchDoneStatusLabel(option)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

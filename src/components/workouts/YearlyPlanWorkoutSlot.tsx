'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  isWorkoutPlanned,
  resolveYearlyWorkoutStatus,
  workoutSymbolForSlot,
  YEARLY_WORKOUT_MANUAL_STATUSES,
  yearlyWorkoutStatusStyle,
  type YearlyWorkoutStatus,
} from '@/utils/workoutSessionStatus';

type Props = {
  slotNum: 1 | 2 | 3;
  workout: { id?: string; status?: string; moveframes?: unknown[] } | null;
  dayDate?: Date | string;
  onCycleExpansion?: () => void;
  onStatusChange?: (workoutId: string, status: YearlyWorkoutStatus) => void;
};

export default function YearlyPlanWorkoutSlot({
  slotNum,
  workout,
  dayDate,
  onCycleExpansion,
  onStatusChange,
}: Props) {
  const planned = isWorkoutPlanned(workout);
  const status = resolveYearlyWorkoutStatus(workout, dayDate);
  const style = yearlyWorkoutStatusStyle(status);
  const symbol = workoutSymbolForSlot(slotNum);
  const [pickerOpen, setPickerOpen] = useState(false);
  const rootRef = useRef<HTMLSpanElement>(null);

  const shapeClass =
    slotNum === 1 ? 'rounded-full' : slotNum === 2 ? 'rounded-[3px]' : 'rounded-[2px]';

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

  const handleSymbolClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleSymbolDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!planned || !workout?.id || !onStatusChange) return;
    setPickerOpen(true);
  };

  const handlePickStatus = (next: YearlyWorkoutStatus) => {
    if (!workout?.id || !onStatusChange) return;
    onStatusChange(workout.id, next);
    setPickerOpen(false);
  };

  const handleNumberClick = (e: React.MouseEvent) => {
    if (!workout || !onCycleExpansion) return;
    e.stopPropagation();
    onCycleExpansion();
  };

  const notPlannedStyle = yearlyWorkoutStatusStyle('NOT_PLANNED');

  return (
    <span
      ref={rootRef}
      className={`relative inline-flex items-center gap-0.5 ${workout ? 'cursor-default' : ''}`}
      title={
        planned
          ? `${style.label} — double-click symbol for Assignment colors`
          : `Workout ${slotNum} — not planned`
      }
    >
      <span
        className={`text-sm font-bold tabular-nums select-none ${
          planned ? 'text-gray-900' : 'text-gray-400'
        } ${workout && onCycleExpansion ? 'cursor-pointer hover:underline' : ''}`}
        onClick={handleNumberClick}
      >
        {slotNum}
      </span>
      <button
        type="button"
        disabled={!planned}
        onClick={handleSymbolClick}
        onDoubleClick={handleSymbolDoubleClick}
        className={`inline-flex h-5 w-5 flex-shrink-0 items-center justify-center border text-[11px] font-bold leading-none ${shapeClass} ${
          planned ? 'cursor-pointer hover:brightness-95' : 'cursor-default'
        }`}
        style={{
          backgroundColor: planned ? style.bg : notPlannedStyle.bg,
          color: planned ? style.fg : '#E5E7EB',
          borderColor: planned ? style.border : notPlannedStyle.border,
        }}
        aria-label={`Workout ${slotNum} ${planned ? style.label : 'not planned'}`}
        aria-expanded={pickerOpen}
      >
        {symbol}
      </button>

      {pickerOpen && planned && (
        <div
          className="absolute left-0 top-full z-50 mt-1 min-w-[140px] rounded border border-gray-200 bg-white p-2 shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-gray-600">
            Assignment colors (Done)
          </p>
          <p className="mb-1.5 text-[9px] leading-tight text-gray-500">
            White / yellow / orange / red are automatic. Pick a green or blue Done color:
          </p>
          <div className="flex flex-col gap-1">
            {YEARLY_WORKOUT_MANUAL_STATUSES.map((option) => {
              const optStyle = yearlyWorkoutStatusStyle(option);
              const selected = option === status;
              return (
                <button
                  key={option}
                  type="button"
                  title={optStyle.label}
                  onClick={() => handlePickStatus(option)}
                  className={`flex items-center gap-2 rounded px-1 py-0.5 text-left hover:bg-gray-50 ${
                    selected ? 'bg-blue-50 ring-1 ring-blue-400' : ''
                  }`}
                >
                  <span
                    className={`flex h-6 w-6 flex-shrink-0 items-center justify-center border text-[10px] font-bold ${shapeClass}`}
                    style={{
                      backgroundColor: optStyle.bg,
                      color: optStyle.fg,
                      borderColor: optStyle.border,
                    }}
                  >
                    {symbol}
                  </span>
                  <span className="text-[10px] text-gray-800 leading-tight">{optStyle.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </span>
  );
}

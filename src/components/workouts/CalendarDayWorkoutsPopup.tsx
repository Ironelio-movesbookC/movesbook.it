'use client';

import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import {
  resolveCalendarDisplayStatus,
  workoutForSessionSlot,
  workoutSymbolForSlot,
  yearlyWorkoutStatusStyle,
  type CalendarColorTab,
} from '@/utils/workoutSessionStatus';
import type { CalendarDaySource } from '@/utils/calendarDayDisplay';
import { SPORT_OPTIONS } from '@/constants/workout.constants';
import { getSportIcon, isImageIcon } from '@/utils/sportIcons';
import Image from 'next/image';

type Props = {
  date: Date;
  source: CalendarDaySource;
  day: any;
  colorTab: CalendarColorTab;
  iconType: 'emoji' | 'icon';
  onClose: () => void;
  onMoveframeClick?: (moveframe: any, e: React.MouseEvent) => void;
};

function SportIcon({ sport, iconType, size = 16 }: { sport: string; iconType: 'emoji' | 'icon'; size?: number }) {
  const icon = getSportIcon(sport, iconType);
  if (isImageIcon(iconType) && icon.startsWith('/')) {
    return (
      <Image src={icon} alt={sport} width={size} height={size} className="object-cover rounded-sm" unoptimized />
    );
  }
  return <span style={{ fontSize: size }}>{icon}</span>;
}

export default function CalendarDayWorkoutsPopup({
  date,
  source,
  day,
  colorTab,
  iconType,
  onClose,
  onMoveframeClick,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onPointerDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const dateLabel = date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const sourceBadge =
    source === 'planned'
      ? { label: 'Workout planned', className: 'bg-orange-100 text-orange-800 border-orange-300' }
      : { label: 'Workout done', className: 'bg-green-100 text-green-800 border-green-300' };

  const dayDate = day.date ?? date;
  const workouts = day.workouts ?? [];

  return createPortal(
    <div className="fixed inset-0 z-[99998] flex items-center justify-center bg-black/40 p-4">
      <div
        ref={ref}
        className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col border border-gray-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 p-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="min-w-0">
            <p className="text-xs text-gray-500 mb-1">Day workouts</p>
            <h2 className="text-lg font-bold text-gray-900">{dateLabel}</h2>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${sourceBadge.className}`}
              >
                {sourceBadge.label}
              </span>
              <span className="text-xs text-gray-500">
                Display: {colorTab === 'planned' ? 'Planned' : colorTab === 'done' ? 'Done' : 'Both'}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/80 text-gray-600 shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {([1, 2, 3] as const).map((slotNum) => {
            const workout = workoutForSessionSlot(workouts, slotNum);
            const hasPlanned = (workout?.moveframes?.length ?? 0) > 0;
            const status = resolveCalendarDisplayStatus(workout, dayDate, colorTab);
            const style = yearlyWorkoutStatusStyle(status);
            const symbol = workoutSymbolForSlot(slotNum);
            const shapeClass =
              slotNum === 1 ? 'rounded-full' : slotNum === 2 ? 'rounded-[3px]' : 'rounded-[2px]';

            if (!hasPlanned || !workout) {
              return (
                <div
                  key={slotNum}
                  className="flex items-center gap-3 p-3 rounded-lg border border-dashed border-gray-200 bg-gray-50 opacity-60"
                >
                  <span
                    className={`inline-flex h-8 w-8 items-center justify-center border text-sm font-bold ${shapeClass} text-gray-300`}
                  >
                    {symbol}
                  </span>
                  <span className="text-sm text-gray-400 italic">Workout {slotNum} — empty</span>
                </div>
              );
            }

            const workoutName =
              'name' in workout && typeof (workout as { name?: string }).name === 'string'
                ? (workout as { name: string }).name
                : undefined;
            const sports = Array.from(
              new Set((workout.moveframes ?? []).map((mf: any) => mf.sport).filter(Boolean)),
            ) as string[];

            return (
              <div key={slotNum} className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
                <div className="flex items-center gap-3 p-3 bg-gray-50 border-b border-gray-100">
                  <span
                    className={`inline-flex h-8 w-8 flex-shrink-0 items-center justify-center border text-sm font-bold ${shapeClass}`}
                    style={{
                      backgroundColor: style.bg,
                      color: style.fg,
                      borderColor: style.border,
                    }}
                  >
                    {symbol}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900 text-sm">
                      Workout {slotNum}
                      {workoutName ? ` — ${workoutName}` : ''}
                    </p>
                    <p className="text-xs text-gray-500">{style.label}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {sports.slice(0, 3).map((sport) => (
                      <SportIcon key={sport} sport={sport} iconType={iconType} size={18} />
                    ))}
                  </div>
                </div>

                <ul className="divide-y divide-gray-100">
                  {(workout.moveframes ?? []).map((mf: any, idx: number) => {
                    const sportOpt = SPORT_OPTIONS.find((s) => s.value === mf.sport);
                    return (
                      <li key={mf.id ?? idx}>
                        <button
                          type="button"
                          className="w-full text-left px-3 py-2.5 hover:bg-blue-50 transition-colors flex items-start gap-2"
                          onClick={(e) => onMoveframeClick?.(mf, e)}
                        >
                          <span
                            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                            style={{ backgroundColor: mf.section?.color || '#6366f1' }}
                          >
                            {mf.letter || String.fromCharCode(65 + idx)}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900">
                              {sportOpt?.label || mf.sport?.replace(/_/g, ' ')}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                              {mf.section?.name || 'Section'}
                              {(mf.movelaps?.length ?? 0) > 0
                                ? ` · ${mf.movelaps.length} movelap${mf.movelaps.length === 1 ? '' : 's'}`
                                : ''}
                            </p>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>

        <div className="p-4 border-t bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-white"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

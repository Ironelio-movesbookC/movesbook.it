'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Info } from 'lucide-react';
import {
  MATCH_DONE_STATUSES,
  YEARLY_WORKOUT_AUTO_PLANNED_STATUSES,
  YEARLY_WORKOUT_MANUAL_STATUSES,
  matchDoneStatusLabel,
  yearlyWorkoutStatusStyle,
  type YearlyWorkoutStatus,
} from '@/utils/workoutSessionStatus';

interface WorkoutLegendProps {
  showWideMode?: boolean;
  showNarrowMode?: boolean;
  /** Planned / Done / Both tabs (Narrow + Wide calendar) */
  showColorTabs?: boolean;
  className?: string;
}

function FilledSymbolBadge({
  slotNum,
  bg,
  border,
  size = 'md',
}: {
  slotNum: 1 | 2 | 3;
  bg: string;
  border: string;
  size?: 'md' | 'lg';
}) {
  const dim = size === 'lg' ? 'h-5 w-5' : 'h-3.5 w-3.5';
  if (slotNum === 1) {
    return (
      <span
        className={`inline-block ${dim} rounded-full border flex-shrink-0`}
        style={{ backgroundColor: bg, borderColor: border }}
      />
    );
  }
  if (slotNum === 2) {
    return (
      <span
        className={`inline-block ${dim} rounded-[2px] border flex-shrink-0`}
        style={{ backgroundColor: bg, borderColor: border }}
      />
    );
  }
  return (
    <span
      className={`inline-block ${dim} flex-shrink-0`}
      style={{
        clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
        backgroundColor: bg,
      }}
      title="triangle"
    />
  );
}

function StatusSwatch({ status }: { status: YearlyWorkoutStatus }) {
  const style = yearlyWorkoutStatusStyle(status);
  return (
    <span
      className="inline-block h-4 w-4 rounded-full border flex-shrink-0"
      style={{ backgroundColor: style.bg, borderColor: style.border }}
      title={style.label}
    />
  );
}

export default function WorkoutLegend({
  showWideMode = false,
  showNarrowMode = false,
  showColorTabs = false,
  className = '',
}: WorkoutLegendProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className={`mt-4 border border-blue-200 rounded-lg bg-blue-50 ${className}`}>
      <div
        className="flex items-center justify-between p-3 cursor-pointer hover:bg-blue-100 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <Info className="w-5 h-5 text-blue-600" />
          <h3 className="font-bold text-gray-900">Legend: Workout Symbols, Status Colors & Day Status</h3>
        </div>
        <button type="button" className="text-blue-600 hover:text-blue-800 transition-colors">
          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>
      </div>

      {isExpanded && (
        <div className="px-4 pb-4 pt-2 border-t border-blue-200">
          <div className="flex flex-wrap gap-6 text-sm">
            {/* Workout Symbols — 2 sizes larger + filled */}
            <div className="space-y-2">
              <div className="font-semibold text-gray-700 mb-2">Workout Symbols:</div>
              <div className="flex items-center gap-2">
                <FilledSymbolBadge slotNum={1} bg="#3B82F6" border="#2563EB" size="lg" />
                <span className="text-base font-medium">Workout #1</span>
              </div>
              <div className="flex items-center gap-2">
                <FilledSymbolBadge slotNum={2} bg="#3B82F6" border="#2563EB" size="lg" />
                <span className="text-base font-medium">Workout #2</span>
              </div>
              <div className="flex items-center gap-2">
                <FilledSymbolBadge slotNum={3} bg="#3B82F6" border="#2563EB" size="lg" />
                <span className="text-base font-medium">Workout #3</span>
              </div>
            </div>

            {/* Status colors — filled circles */}
            <div className="space-y-1">
              <div className="font-semibold text-gray-700 mb-2">Automatic (Yearly Plan &amp; Done):</div>
              <div className="flex items-center gap-2">
                <StatusSwatch status="NOT_PLANNED" />
                <span className="text-xs">White = not planned</span>
              </div>
              {YEARLY_WORKOUT_AUTO_PLANNED_STATUSES.map((status) => (
                <div key={status} className="flex items-center gap-2">
                  <StatusSwatch status={status} />
                  <span className="text-xs">{yearlyWorkoutStatusStyle(status).label.replace(/^[^=]+=\s*/, '')}</span>
                </div>
              ))}
            </div>

            <div className="space-y-1">
              <div className="font-semibold text-gray-700 mb-2">Done colors (double-click symbol):</div>
              {YEARLY_WORKOUT_MANUAL_STATUSES.map((status) => (
                <div key={status} className="flex items-center gap-2">
                  <StatusSwatch status={status} />
                  <span className="text-xs">
                    {yearlyWorkoutStatusStyle(status).label.replace(/^[^=]+=\s*/, '')}
                  </span>
                </div>
              ))}
            </div>

            <div className="space-y-1">
              <div className="font-semibold text-gray-700 mb-2">Match Done (set in Done only):</div>
              {MATCH_DONE_STATUSES.map((status) => (
                <div key={status} className="flex items-center gap-2">
                  <StatusSwatch status={status} />
                  <span className="text-xs">{matchDoneStatusLabel(status).replace(/^[^=]+=\s*/, '')}</span>
                </div>
              ))}
            </div>

            <div className="space-y-1">
              <div className="font-semibold text-gray-700 mb-2">Day Status:</div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-100 border border-blue-300 rounded" />
                <span>Has Workouts</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-white border border-gray-200 rounded" />
                <span>No Workouts</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 ring-2 ring-green-500 rounded" />
                <span>Today</span>
              </div>
            </div>

            {(showNarrowMode || showColorTabs) && (
              <div className="space-y-1 max-w-xs">
                <div className="font-semibold text-gray-700 mb-2">Color tabs (Planned / Done / Both):</div>
                <div className="text-xs text-gray-600 space-y-1">
                  <p>
                    <strong>Planned.</strong> White · Yellow · Orange · Red
                  </p>
                  <p>
                    <strong>Done</strong> White · Blue · Light green · Green
                  </p>
                  <p>
                    <strong>Both</strong> All planned and done colors
                  </p>
                  {showWideMode && (
                    <p className="pt-1 border-t border-blue-200">
                      Click a day for workout details popup (planned or done). Click ○ □ △ for
                      moveframe card.
                    </p>
                  )}
                  {showNarrowMode && (
                    <p className="pt-1 border-t border-blue-200">
                      Click a day for workout details. Click ○ □ △ for moveframe card.
                    </p>
                  )}
                </div>
              </div>
            )}

            {showWideMode && (
              <div className="space-y-1 max-w-xs">
                <div className="font-semibold text-gray-700 mb-2">Wide Mode:</div>
                <div className="text-xs text-gray-600 space-y-1">
                  <p>• Sport icons beside each ○ □ △ (max 2 per workout)</p>
                  <p>• Hollow ○ □ △ = empty workout slot</p>
                  <p>• Hover a day for day totals popup</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

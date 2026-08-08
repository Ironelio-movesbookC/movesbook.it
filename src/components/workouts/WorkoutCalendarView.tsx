'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Maximize2, Minimize2 } from 'lucide-react';
import WorkoutLegend from './WorkoutLegend';
import {
  resolveCalendarDisplayStatus,
  workoutForSessionSlot,
  workoutSymbolForSlot,
  yearlyWorkoutStatusStyle,
  type YearlyWorkoutStatus,
  type CalendarColorTab,
} from '@/utils/workoutSessionStatus';
import {
  buildDoneDaysByDate,
  calendarDateKey,
  calendarDayHasVisibleWorkouts,
  resolveCalendarDaySource,
  workoutsDayForSymbols,
} from '@/utils/calendarDayDisplay';
import { fetchPlanWeeks } from '@/lib/workoutPlanLoad';
import { mergeWeeksByWeekNumber } from '@/lib/mergeWeeksByWeekNumber';
import {
  calculateSportSummaries,
  calculateWorkoutSportSummaries,
  formatSportSummaryTotal,
} from '@/utils/workoutHelpers';
import { getSportIcon, isImageIcon } from '@/utils/sportIcons';
import { useSportIconType } from '@/hooks/useSportIconType';
import CalendarMoveframePopup from './CalendarMoveframePopup';
import CalendarDayWorkoutsPopup from './CalendarDayWorkoutsPopup';
import type { CalendarDaySource } from '@/utils/calendarDayDisplay';

interface WorkoutCalendarViewProps {
  workoutPlan: any;
  periods: any[];
  excludeStretchingFromTotals: boolean;
  setExcludeStretchingFromTotals: (value: boolean) => void;
}

/** Filled ○ / □ / △ (WORKOUT_SYMBOLS) colored by workout status. */
function CalendarStatusSymbol({
  slotNum,
  status,
  size = 14,
  onClick,
  title,
  hollow = false,
}: {
  slotNum: 1 | 2 | 3;
  status: YearlyWorkoutStatus;
  size?: number;
  onClick?: (e: React.MouseEvent) => void;
  title?: string;
  hollow?: boolean;
}) {
  const style = yearlyWorkoutStatusStyle(status);
  const symbol = workoutSymbolForSlot(slotNum);
  const shapeClass =
    slotNum === 1 ? 'rounded-full' : slotNum === 2 ? 'rounded-[2px]' : 'rounded-[1px]';
  const tip = title ?? style.label;
  const fontSize = Math.max(9, Math.round(size * 0.75));

  return (
    <span
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.stopPropagation();
                onClick(e as unknown as React.MouseEvent);
              }
            }
          : undefined
      }
      className={`inline-flex flex-shrink-0 items-center justify-center border font-bold leading-none select-none ${shapeClass} ${
        onClick ? 'cursor-pointer hover:brightness-95' : ''
      }`}
      style={{
        width: size,
        height: size,
        fontSize,
        backgroundColor: hollow ? 'transparent' : style.bg,
        color: hollow ? '#D1D5DB' : style.fg,
        borderColor: hollow ? '#D1D5DB' : style.border,
        opacity: hollow ? 0.5 : 1,
      }}
      title={tip}
    >
      {symbol}
    </span>
  );
}

function SportIconChip({
  sport,
  iconType,
  size = 14,
}: {
  sport: string;
  iconType: 'emoji' | 'icon';
  size?: number;
}) {
  const icon = getSportIcon(sport, iconType);
  if (isImageIcon(iconType) && icon.startsWith('/')) {
    return (
      <Image
        src={icon}
        alt={sport}
        width={size}
        height={size}
        className="object-cover rounded-sm flex-shrink-0"
        unoptimized
        title={sport.replace(/_/g, ' ')}
      />
    );
  }
  return (
    <span className="leading-none flex-shrink-0" style={{ fontSize: size }} title={sport.replace(/_/g, ' ')}>
      {icon}
    </span>
  );
}

/** Hover totals popup for Wide mode day cells. */
function DayTotalsPopup({
  date,
  workoutDay,
  iconType,
  excludeStretchingFromTotals,
}: {
  date: Date;
  workoutDay: any;
  iconType: 'emoji' | 'icon';
  excludeStretchingFromTotals: boolean;
}) {
  if (!workoutDay) return null;

  const summaries = calculateSportSummaries(workoutDay, iconType).filter((s) => {
    if (!excludeStretchingFromTotals) return true;
    return s.sport.toLowerCase() !== 'stretching';
  });

  const plannedCount = (workoutDay.workouts ?? []).filter(
    (w: any) => w?.moveframes?.length > 0,
  ).length;

  const dateLabel = date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="absolute left-1/2 bottom-full z-50 mb-1 w-52 -translate-x-1/2 rounded-lg border border-gray-300 bg-white p-2 shadow-xl pointer-events-none">
      <p className="text-[11px] font-bold text-gray-900 mb-1">{dateLabel}</p>
      <p className="text-[10px] text-gray-600 mb-1.5">
        Week {workoutDay.weekNumber ?? '—'} · {plannedCount} planned workout
        {plannedCount === 1 ? '' : 's'}
      </p>
      {summaries.length === 0 ? (
        <p className="text-[10px] text-gray-400 italic">No sport totals</p>
      ) : (
        <ul className="space-y-1">
          {summaries.map((s) => (
            <li key={s.sport} className="flex items-center gap-1.5 text-[10px] text-gray-800">
              <SportIconChip sport={s.sport} iconType={iconType} size={14} />
              <span className="font-medium truncate flex-1">{s.sport.replace(/_/g, ' ')}</span>
              <span className="tabular-nums text-gray-700">{formatSportSummaryTotal(s)}</span>
              {s.duration && s.duration !== '0:00' && s.duration !== '0:00:00' && (
                <span className="text-gray-500 tabular-nums">{s.duration}</span>
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-1.5 text-[9px] text-gray-400 border-t pt-1">Day totals</p>
    </div>
  );
}

export default function WorkoutCalendarView({
  workoutPlan,
  periods,
  excludeStretchingFromTotals,
  setExcludeStretchingFromTotals,
}: WorkoutCalendarViewProps) {
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [viewMode, setViewMode] = useState<'narrow' | 'wide'>('narrow');
  const [colorTab, setColorTab] = useState<CalendarColorTab>('planned');
  const [hoveredDayKey, setHoveredDayKey] = useState<string | null>(null);
  const [popupMoveframe, setPopupMoveframe] = useState<any | null>(null);
  const [popupPosition, setPopupPosition] = useState<{ x: number; y: number } | null>(null);
  const [doneDaysByDate, setDoneDaysByDate] = useState<Map<string, any>>(new Map());
  const [dayPopup, setDayPopup] = useState<{
    date: Date;
    source: CalendarDaySource;
    day: any;
  } | null>(null);
  const iconType = useSportIconType();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      const weeks = mergeWeeksByWeekNumber(await fetchPlanWeeks(token, 'WORKOUTS_DONE'));
      if (!cancelled) setDoneDaysByDate(buildDoneDaysByDate(weeks));
    })();
    return () => {
      cancelled = true;
    };
  }, [workoutPlan]);

  if (!workoutPlan || !workoutPlan.weeks || workoutPlan.weeks.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>No workout plan data available for calendar view.</p>
      </div>
    );
  }

  const allDays = workoutPlan.weeks.flatMap((week: any) =>
    week.days.map((day: any) => ({ ...day, weekNumber: week.weekNumber })),
  );

  const daysByMonth: { [key: string]: any[] } = {};
  allDays.forEach((day: any) => {
    const date = new Date(day.date);
    const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
    if (!daysByMonth[monthKey]) {
      daysByMonth[monthKey] = [];
    }
    daysByMonth[monthKey].push(day);
  });

  const generateMonthCalendar = (year: number, month: number) => {
    const monthKey = `${year}-${month}`;
    const monthDays = daysByMonth[monthKey] || [];

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const startDayOfWeek = firstDayOfMonth.getDay();
    const daysInMonth = lastDayOfMonth.getDate();

    const calendarDays: (any | null)[] = [];

    for (let i = 0; i < startDayOfWeek; i++) {
      calendarDays.push(null);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const workoutDay = monthDays.find((d: any) => {
        const dDate = new Date(d.date);
        return dDate.getDate() === day;
      });
      calendarDays.push({ date, workoutDay });
    }

    return calendarDays;
  };

  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  const handleMoveframePopupClick = (e: React.MouseEvent, workout: any) => {
    e.stopPropagation();
    const moveframes = workout?.moveframes ?? [];
    if (moveframes.length === 0) return;

    const first = moveframes[0];
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const pos = { x: rect.left + rect.width / 2, y: rect.bottom };

    setDayPopup(null);

    if (popupMoveframe?.id === first.id) {
      setPopupMoveframe(null);
      setPopupPosition(null);
      return;
    }

    setPopupMoveframe(first);
    setPopupPosition(pos);
  };

  const handleDayClick = (
    e: React.MouseEvent,
    date: Date,
    plannedDay: any | undefined,
    doneDay: any | undefined,
  ) => {
    e.stopPropagation();
    const resolved = resolveCalendarDaySource(colorTab, plannedDay, doneDay);
    if (!resolved.source || !resolved.day) return;

    setPopupMoveframe(null);
    setPopupPosition(null);
    setDayPopup({ date, source: resolved.source, day: resolved.day });
  };

  const dayCellClass = (hasWorkouts: boolean, isToday: boolean, interactive: boolean) =>
    [
      'flex flex-col items-center justify-center text-xs rounded transition-all border',
      hasWorkouts
        ? 'bg-blue-100 border-blue-300'
        : 'bg-white border-gray-200',
      interactive && hasWorkouts ? 'cursor-pointer hover:bg-blue-200' : '',
      interactive && !hasWorkouts ? 'cursor-default hover:bg-gray-50' : '',
      isToday ? 'ring-2 ring-green-500 ring-inset' : '',
    ]
      .filter(Boolean)
      .join(' ');

  const renderWorkoutSymbols = (
    displayDay: any | undefined | null,
    dayDate: Date,
    tab: CalendarColorTab,
    symbolSize = 14,
    hollowEmpty = false,
  ) => {
    return (
      <div
        className="flex gap-0.5 justify-center items-center mt-0.5"
        onClick={(e) => e.stopPropagation()}
      >
        {([1, 2, 3] as const).map((slotNum) => {
          const workout = workoutForSessionSlot(displayDay?.workouts, slotNum);
          const hasMoveframes = (workout?.moveframes?.length ?? 0) > 0;
          const status = resolveCalendarDisplayStatus(workout, dayDate, tab);

          if (!hasMoveframes && hollowEmpty) {
            return (
              <CalendarStatusSymbol
                key={slotNum}
                slotNum={slotNum}
                status="NOT_PLANNED"
                size={symbolSize}
                hollow
              />
            );
          }

          return (
            <CalendarStatusSymbol
              key={slotNum}
              slotNum={slotNum}
              status={status}
              size={symbolSize}
              onClick={
                hasMoveframes
                  ? (ev) => handleMoveframePopupClick(ev, workout)
                  : undefined
              }
              title={
                hasMoveframes
                  ? `Workout ${slotNum} — moveframe details`
                  : yearlyWorkoutStatusStyle(status).label
              }
            />
          );
        })}
      </div>
    );
  };

  const sportsForWorkout = (workout: any): string[] => {
    let sports = Array.from(
      new Set((workout?.moveframes ?? []).map((mf: any) => mf.sport as string).filter(Boolean)),
    ) as string[];
    if (sports.length === 4 && sports.some((s) => s.toLowerCase() === 'stretching')) {
      sports = sports.filter((s) => s.toLowerCase() !== 'stretching');
    }
    if (excludeStretchingFromTotals) {
      sports = sports.filter((s) => s.toLowerCase() !== 'stretching');
    }
    return sports;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <WorkoutLegend
        showWideMode={viewMode === 'wide'}
        showNarrowMode={viewMode === 'narrow'}
        showColorTabs={viewMode === 'narrow' || viewMode === 'wide'}
      />

      <div className="flex items-center justify-between mb-3 px-2 py-2 bg-gray-50 border border-gray-300 rounded">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={excludeStretchingFromTotals}
            onChange={(e) => setExcludeStretchingFromTotals(e.target.checked)}
            className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-sm font-medium text-gray-700">Exclude stretching from the totals</span>
        </label>
        <span className="text-xs text-gray-500 italic">
          Note: Stretching is auto-excluded when 4 sports are selected
        </span>
      </div>

      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={() => setCurrentYear(currentYear - 1)}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          title="Previous Year"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-4">
          <h2 className="text-3xl font-bold text-gray-900">{currentYear}</h2>

          <div className="flex gap-2 border border-gray-300 rounded-lg p-1">
            <button
              type="button"
              onClick={() => setViewMode('narrow')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors flex items-center gap-1 ${
                viewMode === 'narrow' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'
              }`}
              title="Narrow view - 12 months"
            >
              <Minimize2 className="w-4 h-4" />
              Narrow
            </button>
            <button
              type="button"
              onClick={() => setViewMode('wide')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors flex items-center gap-1 ${
                viewMode === 'wide' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'
              }`}
              title="Wide view - 3 months with details"
            >
              <Maximize2 className="w-4 h-4" />
              Wide
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setCurrentYear(currentYear + 1)}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          title="Next Year"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Planned / Done / Both — shared by Narrow and Wide */}
      {(viewMode === 'narrow' || viewMode === 'wide') && (
        <div className="flex flex-wrap items-center gap-2 px-1 mb-4">
          <span className="text-sm font-semibold text-gray-700 mr-1">Display:</span>
          {(
            [
              { id: 'planned' as const, label: 'Planned.' },
              { id: 'done' as const, label: 'Done' },
              { id: 'both' as const, label: 'Both' },
            ] as const
          ).map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setColorTab(id)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
                colorTab === id
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {label}
            </button>
          ))}
          <span className="text-xs text-gray-500 ml-2 hidden lg:inline">
            {colorTab === 'planned' && 'White · Yellow · Orange · Red'}
            {colorTab === 'done' && 'White · Blue · Light green · Green'}
            {colorTab === 'both' && 'All planned and done colors'}
          </span>
        </div>
      )}

      {/* Narrow Mode — filled status symbols per workout slot */}
      {viewMode === 'narrow' && (
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 12 }, (_, monthIndex) => {
            const calendarDays = generateMonthCalendar(currentYear, monthIndex);

            return (
              <div key={monthIndex} className="border border-gray-300 rounded-lg p-2 bg-gray-50">
                <div className="text-center font-bold text-gray-800 text-sm mb-2">
                  {monthNames[monthIndex]}
                </div>

                <div className="grid grid-cols-7 gap-0.5 mb-1">
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
                    <div key={idx} className="text-center text-xs font-semibold text-gray-600">
                      {day}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-0.5">
                  {calendarDays.map((item, dayIndex) => {
                    if (!item) {
                      return <div key={`empty-${dayIndex}`} className="h-14" />;
                    }

                    const { date, workoutDay } = item;
                    const doneDay = doneDaysByDate.get(calendarDateKey(date));
                    const displayDay = workoutsDayForSymbols(colorTab, workoutDay, doneDay);
                    const hasWorkouts = calendarDayHasVisibleWorkouts(
                      colorTab,
                      workoutDay,
                      doneDay,
                    );
                    const isToday = date.toDateString() === new Date().toDateString();
                    const dayDate = displayDay?.date ?? date;

                    return (
                      <div
                        key={dayIndex}
                        onClick={(e) => handleDayClick(e, date, workoutDay, doneDay)}
                        className={`h-14 ${dayCellClass(hasWorkouts, isToday, true)}`}
                        title={
                          hasWorkouts
                            ? 'Click for day workout details'
                            : workoutDay
                              ? `Week ${workoutDay.weekNumber}`
                              : ''
                        }
                      >
                        <span className="font-semibold text-gray-800 leading-none">
                          {date.getDate()}
                        </span>
                        {renderWorkoutSymbols(displayDay, new Date(dayDate), colorTab, 14, false)}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {popupMoveframe && popupPosition && (
        <CalendarMoveframePopup
          moveframe={popupMoveframe}
          position={popupPosition}
          onClose={() => {
            setPopupMoveframe(null);
            setPopupPosition(null);
          }}
        />
      )}

      {dayPopup && (
        <CalendarDayWorkoutsPopup
          date={dayPopup.date}
          source={dayPopup.source}
          day={dayPopup.day}
          colorTab={colorTab}
          iconType={iconType}
          onClose={() => setDayPopup(null)}
          onMoveframeClick={(mf, e) => {
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            setPopupMoveframe(mf);
            setPopupPosition({ x: rect.left + rect.width / 2, y: rect.bottom });
          }}
        />
      )}

      {/* Wide Mode — symbols + sport icons; hover = day totals; click day = workout popup */}
      {viewMode === 'wide' && (
        <div className="space-y-4">
          <p className="text-xs text-gray-600 px-1">
            Wide mode: ○ □ △ workout symbols with sport icons (max 2). Hover for{' '}
            <strong>day totals</strong>. Click a day for <strong>workout details</strong> (planned
            or done per display tab). Click a symbol for moveframe details.
          </p>
          {Array.from({ length: 4 }, (_, rowIndex) => (
            <div key={rowIndex} className="grid grid-cols-3 gap-6">
              {Array.from({ length: 3 }, (_, colIndex) => {
                const monthIndex = rowIndex * 3 + colIndex;
                if (monthIndex >= 12) return null;

                const calendarDays = generateMonthCalendar(currentYear, monthIndex);

                return (
                  <div
                    key={monthIndex}
                    className="border-2 border-gray-300 rounded-lg p-4 bg-gray-50"
                  >
                    <div className="text-center font-bold text-gray-900 text-lg mb-3">
                      {monthNames[monthIndex]}
                    </div>

                    <div className="grid grid-cols-7 gap-1 mb-2">
                      {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
                        <div key={idx} className="text-center text-sm font-semibold text-gray-700">
                          {day}
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-7 gap-1">
                      {calendarDays.map((item, dayIndex) => {
                        if (!item) {
                          return <div key={`empty-${dayIndex}`} className="h-28" />;
                        }

                        const { date, workoutDay } = item;
                        const doneDay = doneDaysByDate.get(calendarDateKey(date));
                        const displayDay = workoutsDayForSymbols(colorTab, workoutDay, doneDay);
                        const hasWorkouts = calendarDayHasVisibleWorkouts(
                          colorTab,
                          workoutDay,
                          doneDay,
                        );
                        const workouts = displayDay?.workouts || [];
                        const dayDate = displayDay?.date ?? date;
                        const isToday = date.toDateString() === new Date().toDateString();
                        const dayKey = `${currentYear}-${monthIndex}-${date.getDate()}`;
                        const showTotals =
                          hoveredDayKey === dayKey && displayDay && hasWorkouts;

                        return (
                          <div
                            key={dayIndex}
                            onClick={(e) => handleDayClick(e, date, workoutDay, doneDay)}
                            onMouseEnter={() => setHoveredDayKey(dayKey)}
                            onMouseLeave={() =>
                              setHoveredDayKey((k) => (k === dayKey ? null : k))
                            }
                            className={`relative h-28 p-1 ${dayCellClass(
                              hasWorkouts,
                              isToday,
                              true,
                            )}`}
                          >
                            {showTotals && displayDay && (
                              <DayTotalsPopup
                                date={date}
                                workoutDay={displayDay}
                                iconType={iconType}
                                excludeStretchingFromTotals={excludeStretchingFromTotals}
                              />
                            )}

                            <div className="text-center font-bold text-sm text-gray-900 mb-0.5 pointer-events-none">
                              {date.getDate()}
                            </div>

                            <div className="space-y-1 overflow-hidden">
                              {([1, 2, 3] as const).map((slotNum) => {
                                const workout = workoutForSessionSlot(workouts, slotNum);
                                const status = resolveCalendarDisplayStatus(
                                  workout,
                                  new Date(dayDate),
                                  colorTab,
                                );
                                const hasMoveframes =
                                  workout && (workout.moveframes?.length ?? 0) > 0;

                                if (!hasMoveframes) {
                                  return (
                                    <div
                                      key={slotNum}
                                      className="flex items-center gap-0.5 min-h-[16px]"
                                    >
                                      <CalendarStatusSymbol
                                        slotNum={slotNum}
                                        status="NOT_PLANNED"
                                        size={12}
                                        hollow
                                      />
                                    </div>
                                  );
                                }

                                const sports = sportsForWorkout(workout).slice(0, 2);
                                const summaries = calculateWorkoutSportSummaries(
                                  workout,
                                  iconType,
                                );

                                return (
                                  <div
                                    key={slotNum}
                                    className="flex items-center gap-0.5 min-h-[16px] overflow-hidden rounded hover:bg-blue-200/60"
                                    onClick={(e) => handleMoveframePopupClick(e, workout)}
                                  >
                                    <CalendarStatusSymbol
                                      slotNum={slotNum}
                                      status={status}
                                      size={12}
                                    />
                                    <div className="flex items-center gap-0.5 flex-1 min-w-0 overflow-hidden pointer-events-none">
                                      {sports.length > 0
                                        ? sports.map((sport) => (
                                            <SportIconChip
                                              key={sport}
                                              sport={sport}
                                              iconType={iconType}
                                              size={13}
                                            />
                                          ))
                                        : summaries.slice(0, 2).map((s) => (
                                            <SportIconChip
                                              key={s.sport}
                                              sport={s.sport}
                                              iconType={iconType}
                                              size={13}
                                            />
                                          ))}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

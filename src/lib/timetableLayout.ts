import { TIMETABLE_MINUTES_MAX } from '@/lib/clubCardTimetable';

/** Shared grid: day label | timeline track | start time | end time | actions */
export const TIMETABLE_ROW_GRID =
  'grid grid-cols-[64px_minmax(0,1fr)_72px_72px_88px] items-center gap-x-3';

export const TIMETABLE_HOURS = Array.from({ length: 25 }, (_, hour) => hour);

export function minutesToPercent(minutes: number): number {
  return (minutes / TIMETABLE_MINUTES_MAX) * 100;
}

export function rangeToPercent(start: number, end: number): { left: number; width: number } {
  return {
    left: minutesToPercent(start),
    width: Math.max(minutesToPercent(end - start), 0.5)
  };
}

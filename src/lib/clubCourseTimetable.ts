import { unserialize } from 'php-serialize';
import { text } from '@/lib/clubCardTimetable';

export type CourseTimetableRow = {
  courseName: string;
  color: string;
  days: Record<number, string[]>;
};

export const COURSE_TIMETABLE_DAY_NAMES = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday'
] as const;

/** Display columns 1–7 (Monday–Sunday), matching CakePHP course_timetable.ctp */
export const COURSE_TIMETABLE_DAY_INDEXES = [1, 2, 3, 4, 5, 6, 7] as const;

type WeeklyEntry = {
  course: string;
  color: string;
};

function unserializePhpDayMap(raw: unknown): Record<number, string> {
  const result: Record<number, string> = {};
  if (!raw || typeof raw !== 'string' || !raw.trim()) {
    return result;
  }

  try {
    const parsed = unserialize(raw) as Record<string | number, string> | string[] | null;
    if (!parsed || typeof parsed !== 'object') {
      return result;
    }

    if (Array.isArray(parsed)) {
      parsed.forEach((value, index) => {
        result[index] = text(value);
      });
      return result;
    }

    Object.entries(parsed).forEach(([index, value]) => {
      const position = Number(index);
      if (Number.isInteger(position)) {
        result[position] = text(value);
      }
    });
  } catch {
    return result;
  }

  return result;
}

/** Stored timetables use PHP keys 0–6 (Mon–Sun). */
function getStoredDayValue(map: Record<number, string>, storageIndex: number): string {
  return text(map[storageIndex]);
}

function splitDayTimes(raw: string): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

function formatTimeRange(start: string, end: string): string {
  const from = text(start);
  const to = text(end);
  if (from && to) return `${from} - ${to}`;
  return from || to;
}

function collectDayTimes(amRaw: string, pmRaw: string): string[] {
  const amTimes = splitDayTimes(amRaw);
  const pmTimes = splitDayTimes(pmRaw);
  const slotCount = Math.max(amTimes.length, pmTimes.length);
  const times: string[] = [];

  for (let index = 0; index < slotCount; index += 1) {
    const range = formatTimeRange(amTimes[index] ?? '', pmTimes[index] ?? '');
    if (range) times.push(range);
  }

  return times;
}

export function parseDisplayTimeMinutes(value: string): number {
  const match = text(value).match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return 0;
  let hours = Number(match[1]) % 12;
  if (match[3].toUpperCase() === 'PM') {
    hours += 12;
  }
  return hours * 60 + Number(match[2]);
}

function parseSlotSortMinutes(value: string): number {
  const rangeMatch = text(value).match(/^(.+?)\s*-\s*.+$/);
  if (rangeMatch) {
    return parseDisplayTimeMinutes(rangeMatch[1]);
  }
  return parseDisplayTimeMinutes(value);
}

export function sortTimeSlots(times: string[]): string[] {
  return Array.from(new Set(times)).sort(
    (a, b) => parseSlotSortMinutes(a) - parseSlotSortMinutes(b)
  );
}

function normalizeCourseColor(color: string): string {
  const value = text(color);
  if (!value || value === '#ffffff' || value === '#fff') {
    return '#ff69b4';
  }
  return value;
}

/**
 * Mirrors ClubSettingsController::course_timetable + course_timetable.ctp:
 * 1) Build weeklyTimetable[time][dayColumn]
 * 2) Pivot to course × weekday grid
 */
export function buildCourseTimetableRows(
  timetables: {
    amTime: unknown;
    pmTime: unknown;
    typologyId: string;
    activityName: string;
    color: string;
  }[]
): CourseTimetableRow[] {
  const weeklyTimetable = new Map<string, Map<number, WeeklyEntry[]>>();

  for (const row of timetables) {
    const courseName = text(row.activityName).toUpperCase() || `TYPOLOGY ${row.typologyId}`;
    const bgColor = normalizeCourseColor(row.color);
    const amTimes = unserializePhpDayMap(row.amTime);
    const pmTimes = unserializePhpDayMap(row.pmTime);

    for (let storageIndex = 0; storageIndex < 7; storageIndex += 1) {
      const displayDay = storageIndex + 1;
      const dayTimes = collectDayTimes(
        getStoredDayValue(amTimes, storageIndex),
        getStoredDayValue(pmTimes, storageIndex)
      );

      for (const timeSlot of dayTimes) {
        if (!weeklyTimetable.has(timeSlot)) {
          weeklyTimetable.set(timeSlot, new Map());
        }
        const dayMap = weeklyTimetable.get(timeSlot)!;
        if (!dayMap.has(displayDay)) {
          dayMap.set(displayDay, []);
        }
        dayMap.get(displayDay)!.push({
          course: courseName,
          color: bgColor
        });
      }
    }
  }

  const courseTable = new Map<string, { color: string; days: Record<number, Set<string>> }>();

  for (const [time, days] of Array.from(weeklyTimetable.entries())) {
    for (const [displayDay, entries] of Array.from(days.entries())) {
      for (const entry of entries) {
        if (!courseTable.has(entry.course)) {
          courseTable.set(entry.course, {
            color: entry.color,
            days: Object.fromEntries(
              COURSE_TIMETABLE_DAY_INDEXES.map((index) => [index, new Set<string>()])
            ) as Record<number, Set<string>>
          });
        }
        const courseRow = courseTable.get(entry.course)!;
        courseRow.color = normalizeCourseColor(entry.color);
        courseRow.days[displayDay]?.add(time);
      }
    }
  }

  return Array.from(courseTable.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([courseName, data]) => ({
      courseName,
      color: data.color,
      days: Object.fromEntries(
        COURSE_TIMETABLE_DAY_INDEXES.map((index) => [
          index,
          sortTimeSlots(Array.from(data.days[index] ?? []))
        ])
      ) as Record<number, string[]>
    }));
}

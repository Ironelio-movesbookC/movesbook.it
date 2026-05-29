import { serialize, unserialize } from 'php-serialize';

export const TIMETABLE_DAY_KEYS = ['mon', 'tues', 'wed', 'thurs', 'fri', 'sat', 'sun'] as const;
export type TimetableDayKey = (typeof TIMETABLE_DAY_KEYS)[number];

export const TIMETABLE_DAY_LABELS: Record<TimetableDayKey, string> = {
  mon: 'Mon',
  tues: 'Tues',
  wed: 'Wed',
  thurs: 'Thurs',
  fri: 'Fri',
  sat: 'Sat',
  sun: 'Sun'
};

export type TimetableDaySchedule = {
  enabled: boolean;
  amTime: string;
  pmTime: string;
  rangeStart: number;
  rangeEnd: number;
};

export type CardTimetableForm = {
  id: string | null;
  typologyId: string;
  reserveMaxNumber: string;
  permitMinuteAccess: string;
  blockingMinuteAccess: string;
  editableSubscriptionTimetable: boolean;
  days: Record<TimetableDayKey, TimetableDaySchedule>;
};

const DAY_INDEX: Record<TimetableDayKey, number> = {
  mon: 0,
  tues: 1,
  wed: 2,
  thurs: 3,
  fri: 4,
  sat: 5,
  sun: 6
};

export const PERMIT_MINUTE_OPTIONS = ['10', '20', '30', '40', '50', '60', '70', '80', '90'];

export function text(value: unknown): string {
  return String(value ?? '').trim();
}

export function minutesToDisplayTime(minutes: number): string {
  const total = Math.max(0, Math.min(1440, Math.round(minutes)));
  const hours24 = Math.floor(total / 60) % 24;
  const mins = total % 60;
  const period = hours24 >= 12 ? 'PM' : 'AM';
  const hour12 = hours24 % 12 || 12;
  return `${hour12}:${mins.toString().padStart(2, '0')} ${period}`;
}

export function parseRangeMinutes(value: string): { start: number; end: number } {
  const [startRaw, endRaw] = text(value).split('#');
  const start = Number(startRaw);
  const end = Number(endRaw);
  return {
    start: Number.isFinite(start) ? start : 0,
    end: Number.isFinite(end) ? end : 0
  };
}

export function formatRangeMinutes(start: number, end: number): string {
  return `${Math.max(0, Math.round(start))}#${Math.max(0, Math.round(end))}`;
}

function defaultDaySchedule(): TimetableDaySchedule {
  return {
    enabled: false,
    amTime: '9:00 AM',
    pmTime: '10:00 PM',
    rangeStart: 540,
    rangeEnd: 1320
  };
}

export function createEmptyTimetableForm(typologyId = ''): CardTimetableForm {
  return {
    id: null,
    typologyId,
    reserveMaxNumber: '5',
    permitMinuteAccess: '',
    blockingMinuteAccess: '',
    editableSubscriptionTimetable: false,
    days: TIMETABLE_DAY_KEYS.reduce((acc, key) => {
      acc[key] = defaultDaySchedule();
      return acc;
    }, {} as Record<TimetableDayKey, TimetableDaySchedule>)
  };
}

function unserializePhpArray(raw: unknown): string[] {
  const result = Array.from({ length: 7 }, () => '');
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
        if (index < 7) result[index] = text(value);
      });
      return result;
    }

    Object.entries(parsed).forEach(([index, value]) => {
      const position = Number(index);
      if (Number.isInteger(position) && position >= 0 && position < 7) {
        result[position] = text(value);
      }
    });
  } catch {
    return result;
  }

  return result;
}

function parseEnabledDays(raw: unknown): Set<TimetableDayKey> {
  const enabled = new Set<TimetableDayKey>();
  if (!raw || typeof raw !== 'string' || !raw.trim()) {
    return enabled;
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, string | number>;
    TIMETABLE_DAY_KEYS.forEach((key) => {
      if (parsed[key] != null && String(parsed[key]) !== '' && String(parsed[key]) !== '0') {
        enabled.add(key);
      }
    });
  } catch {
    return enabled;
  }

  return enabled;
}

export function mapDbRowToTimetableForm(
  row: Record<string, unknown>,
  typologyId: string,
  editableSubscriptionTimetable: boolean
): CardTimetableForm {
  const amTimes = unserializePhpArray(row.am_time);
  const pmTimes = unserializePhpArray(row.pm_time);
  const rangeValues = unserializePhpArray(row.rangValue);
  const enabledDays = parseEnabledDays(row.enabled);

  const days = TIMETABLE_DAY_KEYS.reduce((acc, key) => {
    const index = DAY_INDEX[key];
    const range = parseRangeMinutes(rangeValues[index] || '0#0');
    const amTime = amTimes[index] || minutesToDisplayTime(range.start);
    const pmTime = pmTimes[index] || minutesToDisplayTime(range.end);

    acc[key] = {
      enabled: enabledDays.has(key),
      amTime,
      pmTime,
      rangeStart: range.start,
      rangeEnd: range.end > range.start ? range.end : range.start + 60
    };
    return acc;
  }, {} as Record<TimetableDayKey, TimetableDaySchedule>);

  return {
    id: row.id != null ? String(row.id) : null,
    typologyId,
    reserveMaxNumber: text(row.reserve_maxnumber) || '5',
    permitMinuteAccess: row.permit_minute_access != null ? String(row.permit_minute_access) : '',
    blockingMinuteAccess: row.blocking_minute_access != null ? String(row.blocking_minute_access) : '',
    editableSubscriptionTimetable,
    days
  };
}

export function buildTimetableDbValues(form: CardTimetableForm): Record<string, unknown> {
  const amTime: string[] = [];
  const pmTime: string[] = [];
  const rangValue: string[] = [];
  const enabled: Record<string, string> = {};

  TIMETABLE_DAY_KEYS.forEach((key) => {
    const day = form.days[key];
    if (day.enabled) {
      enabled[key] = '1';
    }
    amTime.push(day.enabled ? day.amTime : '');
    pmTime.push(day.enabled ? day.pmTime : '');
    rangValue.push(day.enabled ? formatRangeMinutes(day.rangeStart, day.rangeEnd) : '0#');
  });

  return {
    typology_message_id: form.typologyId,
    subscription_id: 0,
    am_time: serialize(amTime),
    pm_time: serialize(pmTime),
    rangValue: serialize(rangValue),
    enabled: JSON.stringify(enabled),
    permit_minute_access: form.permitMinuteAccess ? Number(form.permitMinuteAccess) : null,
    blocking_minute_access: form.blockingMinuteAccess ? Number(form.blockingMinuteAccess) : null,
    reserve_maxnumber: form.reserveMaxNumber || '5'
  };
}

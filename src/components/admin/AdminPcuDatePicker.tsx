'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays } from 'lucide-react';

const MONTH_NAMES = [
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

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function parseIsoDate(iso: string): Date | null {
  if (!iso?.trim() || iso.startsWith('0000')) return null;
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

export function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${mo}-${day}`;
}

/** dd/mm/yyyy ↔ yyyy-mm-dd (accepts legacy mm/dd/yyyy when unambiguous). */
export function ddMmYyyyToIso(value: string): string {
  const parts = value.trim().split('/');
  if (parts.length !== 3) return '';
  const [first, second, yyyy] = parts;
  if (!yyyy || !first || !second) return '';
  const a = Number(first);
  const b = Number(second);
  let dd: string;
  let mm: string;
  if (a > 12 && b >= 1 && b <= 12) {
    dd = first;
    mm = second;
  } else if (b > 12 && a >= 1 && a <= 12) {
    mm = first;
    dd = second;
  } else {
    dd = first;
    mm = second;
  }
  return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
}

export function isoToDdMmYyyy(iso: string): string {
  const d = parseIsoDate(iso);
  if (!d) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
}

/** Display yyyy-mm-dd as dd/mm/yyyy; passthrough for empty or non-ISO values. */
export function formatPcuIsoDate(value: string | null | undefined): string {
  const raw = value?.trim() ?? '';
  if (!raw) return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    return isoToDdMmYyyy(raw.slice(0, 10));
  }
  return raw;
}

/** @deprecated Use ddMmYyyyToIso */
export const mmDdYyyyToIso = ddMmYyyyToIso;

/** @deprecated Use isoToDdMmYyyy */
export const isoToMmDdYyyy = isoToDdMmYyyy;

type AdminPcuDatePickerProps = {
  value: string;
  onChange: (iso: string) => void;
  disabled?: boolean;
  /** When true (default), admins can pick past subscription dates. */
  allowPastDates?: boolean;
  /** ISO date (yyyy-mm-dd); dates on or before this day are not selectable. */
  minDateIso?: string;
  /** Render the month grid under the field instead of a floating popover. */
  inline?: boolean;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
};

export default function AdminPcuDatePicker({
  value,
  onChange,
  disabled,
  allowPastDates = true,
  minDateIso,
  inline = false,
  placeholder = 'dd/mm/yyyy',
  className = '',
  inputClassName = '',
}: AdminPcuDatePickerProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const today = useMemo(() => startOfDay(new Date()), []);
  const minDate = useMemo(() => parseIsoDate(minDateIso ?? ''), [minDateIso]);
  const selected = parseIsoDate(value);

  const [viewYear, setViewYear] = useState(selected?.getFullYear() ?? today.getFullYear());
  const [viewMonth, setViewMonth] = useState(selected?.getMonth() ?? today.getMonth());

  useEffect(() => {
    const d = parseIsoDate(value);
    if (d) {
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
    }
  }, [value]);

  useEffect(() => {
    if (!open || inline) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open, inline]);

  const cells = useMemo(() => {
    const first = new Date(viewYear, viewMonth, 1);
    const startPad = first.getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const rows: Array<{ date: Date | null; key: string }> = [];
    for (let i = 0; i < startPad; i++) {
      rows.push({ date: null, key: `pad-${i}` });
    }
    for (let day = 1; day <= daysInMonth; day++) {
      rows.push({ date: new Date(viewYear, viewMonth, day), key: `d-${day}` });
    }
    return rows;
  }, [viewMonth, viewYear]);

  const displayValue = value ? isoToDdMmYyyy(value) : '';

  const years = useMemo(() => {
    const y = today.getFullYear();
    const start = allowPastDates ? y - 15 : y - 2;
    const end = y + 2;
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, [allowPastDates, today]);

  const calendar = open ? (
    <div
      className={
        inline
          ? 'mt-2 w-full border border-gray-300 bg-white shadow-sm rounded'
          : 'absolute left-0 top-full z-50 mt-1 w-[220px] border border-gray-300 bg-white shadow-lg'
      }
    >
      <div className="bg-[#7d0e1f] text-white px-2 py-2 flex items-center justify-center gap-2 text-sm font-semibold">
        <select
          value={viewMonth}
          onChange={(e) => setViewMonth(Number(e.target.value))}
          className="bg-transparent border border-white/80 text-white text-sm px-1 py-0.5 rounded cursor-pointer"
        >
          {MONTH_NAMES.map((name, idx) => (
            <option key={name} value={idx} className="text-black">
              {name}
            </option>
          ))}
        </select>
        <select
          value={viewYear}
          onChange={(e) => setViewYear(Number(e.target.value))}
          className="bg-transparent border border-white/80 text-white text-sm px-1 py-0.5 rounded cursor-pointer"
        >
          {years.map((y) => (
            <option key={y} value={y} className="text-black">
              {y}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-7 text-center text-xs font-bold border-b border-gray-200 py-1 bg-gradient-to-b from-white to-gray-100">
        {WEEKDAYS.map((w) => (
          <span key={w} className="text-gray-800">
            {w}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 text-center text-sm bg-[#f7f7f7] p-0.5">
        {cells.map(({ date, key }) => {
          if (!date) {
            return <span key={key} className="py-1.5" />;
          }
          const dayStart = startOfDay(date);
          const isPast = !allowPastDates && dayStart.getTime() < today.getTime();
          const isOnOrBeforeMin =
            minDate != null && dayStart.getTime() <= minDate.getTime();
          const isBlocked = isPast || isOnOrBeforeMin;
          const isToday = dayStart.getTime() === today.getTime();
          const isSelected = selected && startOfDay(selected).getTime() === dayStart.getTime();

          return (
            <button
              key={key}
              type="button"
              disabled={isBlocked || disabled}
              onClick={() => {
                onChange(toIsoDate(date));
                setOpen(false);
              }}
              className={`py-1.5 text-sm transition ${
                isBlocked
                  ? 'text-gray-300 bg-gray-100 cursor-not-allowed'
                  : isSelected
                    ? 'border-2 border-[#c9a227] text-[#c9a227] font-semibold bg-white'
                    : isToday
                      ? 'border border-[#c9a227] text-[#c9a227] bg-white hover:bg-[#fff8dc]'
                      : 'text-gray-900 hover:bg-[#e8e8e8] bg-white'
              }`}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  ) : null;

  return (
    <div
      ref={wrapRef}
      className={`${inline ? 'block w-full' : 'relative inline-flex items-center gap-2'} ${className}`}
    >
      <div className={inline ? 'flex items-center gap-2 w-full' : 'contents'}>
        <input
          type="text"
          readOnly
          value={displayValue}
          placeholder={placeholder}
          disabled={disabled}
          onClick={() => !disabled && setOpen((v) => !v)}
          className={
            inputClassName ||
            `px-2 py-1 border border-gray-300 bg-white text-sm cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
              inline ? 'flex-1 min-w-0 rounded' : 'w-28'
            }`
          }
        />
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen((v) => !v)}
          className="w-7 h-7 shrink-0 border border-gray-300 rounded bg-gray-100 inline-flex items-center justify-center hover:bg-gray-200 disabled:opacity-60"
          aria-label="Open calendar"
        >
          <CalendarDays className="w-4 h-4 text-gray-600" />
        </button>
      </div>
      {calendar}
    </div>
  );
}

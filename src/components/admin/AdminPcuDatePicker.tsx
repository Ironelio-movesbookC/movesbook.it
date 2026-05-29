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

/** mm/dd/yyyy ↔ yyyy-mm-dd */
export function mmDdYyyyToIso(value: string): string {
  const parts = value.trim().split('/');
  if (parts.length !== 3) return '';
  const [mm, dd, yyyy] = parts;
  if (!yyyy || !mm || !dd) return '';
  return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
}

export function isoToMmDdYyyy(iso: string): string {
  const d = parseIsoDate(iso);
  if (!d) return '';
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${mm}/${dd}/${d.getFullYear()}`;
}

type AdminPcuDatePickerProps = {
  value: string;
  onChange: (iso: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
};

export default function AdminPcuDatePicker({
  value,
  onChange,
  disabled,
  placeholder = '0000-00-00',
  className = '',
}: AdminPcuDatePickerProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const today = useMemo(() => startOfDay(new Date()), []);
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
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

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

  const displayValue = value ? isoToMmDdYyyy(value) : '';

  const years = useMemo(() => {
    const y = today.getFullYear();
    return Array.from({ length: 12 }, (_, i) => y - 2 + i);
  }, [today]);

  return (
    <div ref={wrapRef} className={`relative inline-flex items-center gap-2 ${className}`}>
      <input
        type="text"
        readOnly
        value={displayValue}
        placeholder={placeholder}
        disabled={disabled}
        onClick={() => !disabled && setOpen((v) => !v)}
        className="px-2 py-1 border border-gray-300 bg-white text-sm w-28 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="w-7 h-7 border border-gray-300 rounded bg-gray-100 inline-flex items-center justify-center hover:bg-gray-200 disabled:opacity-60"
        aria-label="Open calendar"
      >
        <CalendarDays className="w-4 h-4 text-gray-600" />
      </button>

      {open ? (
        <div className="absolute left-0 top-full z-50 mt-1 w-[220px] border border-gray-300 bg-white shadow-lg">
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
              const isPast = dayStart.getTime() < today.getTime();
              const isToday = dayStart.getTime() === today.getTime();
              const isSelected = selected && startOfDay(selected).getTime() === dayStart.getTime();

              return (
                <button
                  key={key}
                  type="button"
                  disabled={isPast || disabled}
                  onClick={() => {
                    onChange(toIsoDate(date));
                    setOpen(false);
                  }}
                  className={`py-1.5 text-sm transition ${
                    isPast
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
      ) : null}
    </div>
  );
}

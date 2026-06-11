'use client';

import { useEffect, useMemo, useState } from 'react';
import { Calendar } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const LEGACY_FIELD_CLASS =
  'h-8 min-w-[10rem] border border-zinc-400 bg-[#ffffd9] px-2 text-sm text-zinc-900 placeholder:text-zinc-500';

function formatDisplayDate(d: Date): string {
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function toInputValue(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseInputValue(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : null;
  if (iso) {
    const d = new Date(`${iso}T12:00:00`);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(trimmed);
  return Number.isNaN(d.getTime()) ? null : d;
}

export default function ClubWebsiteLastUpdatePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const parsed = parseInputValue(value);
  const [viewDate, setViewDate] = useState(() => parsed ?? new Date());
  const [draft, setDraft] = useState<Date | null>(parsed);

  useEffect(() => {
    const next = parseInputValue(value);
    setDraft(next);
    if (next) setViewDate(next);
  }, [value]);

  const { year, month, days, startOffset } = useMemo(() => {
    const y = viewDate.getFullYear();
    const m = viewDate.getMonth();
    const first = new Date(y, m, 1);
    const last = new Date(y, m + 1, 0);
    const offset = (first.getDay() + 6) % 7;
    const cells: (Date | null)[] = [];
    for (let i = 0; i < offset; i++) cells.push(null);
    for (let d = 1; d <= last.getDate(); d++) cells.push(new Date(y, m, d));
    return { year: y, month: m, days: cells, startOffset: offset };
  }, [viewDate]);

  const monthLabel = viewDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  const applyDate = (d: Date) => {
    setDraft(d);
    onChange(formatDisplayDate(d));
    setOpen(false);
  };

  return (
    <div className="relative flex items-center gap-1.5">
      <span className="text-sm text-zinc-800">{t('club_website_last_update_label')}</span>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 w-8 items-center justify-center border border-zinc-400 bg-[#f0f0f0] text-zinc-700 hover:bg-zinc-200"
        aria-label={t('club_website_last_update_label')}
        aria-expanded={open}
      >
        <Calendar className="h-4 w-4" />
      </button>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t('club_website_last_update_label')}
        className={LEGACY_FIELD_CLASS}
      />
      {open ? (
        <div
          className="absolute right-0 top-full z-30 mt-1 w-[17rem] border border-zinc-400 bg-white shadow-lg"
          role="dialog"
          aria-label={t('club_website_last_update_label')}
        >
          <div className="flex items-center justify-between border-b border-zinc-300 bg-zinc-100 px-2 py-1.5 text-xs font-semibold text-zinc-800">
            <button
              type="button"
              className="px-1 hover:text-sky-700"
              onClick={() => setViewDate(new Date(year, month - 1, 1))}
              aria-label="Previous month"
            >
              ‹
            </button>
            <span>{monthLabel}</span>
            <button
              type="button"
              className="px-1 hover:text-sky-700"
              onClick={() => setViewDate(new Date(year, month + 1, 1))}
              aria-label="Next month"
            >
              ›
            </button>
          </div>
          <div className="grid grid-cols-7 gap-0 border-b border-zinc-200 px-1 py-1 text-center text-[10px] font-medium text-zinc-500">
            {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0 p-1 text-center text-xs">
            {days.map((day, idx) =>
              day ? (
                <button
                  key={toInputValue(day)}
                  type="button"
                  onClick={() => applyDate(day)}
                  className={`m-0.5 py-1 hover:bg-sky-100 ${
                    draft && toInputValue(draft) === toInputValue(day)
                      ? 'bg-[#ffffd9] font-semibold ring-1 ring-amber-400'
                      : ''
                  }`}
                >
                  {day.getDate()}
                </button>
              ) : (
                <span key={`empty-${idx}`} />
              )
            )}
          </div>
          <div className="flex justify-between gap-2 border-t border-zinc-300 bg-zinc-50 px-2 py-1.5">
            <button
              type="button"
              className="text-xs font-medium text-sky-800 hover:underline"
              onClick={() => applyDate(new Date())}
            >
              {t('club_website_date_today')}
            </button>
            <button
              type="button"
              className="text-xs font-medium text-sky-800 hover:underline"
              onClick={() => setOpen(false)}
            >
              {t('btn_done')}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export { LEGACY_FIELD_CLASS };

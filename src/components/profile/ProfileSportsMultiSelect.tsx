'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { formatSportLabel, PROFILE_SPORT_OPTIONS } from '@/lib/profileSports';

type ProfileSportsMultiSelectProps = {
  id?: string;
  value: string[];
  onChange: (sports: string[]) => void;
  disabled?: boolean;
};

export default function ProfileSportsMultiSelect({
  id = 'profile-main-sports',
  value,
  onChange,
  disabled = false,
}: ProfileSportsMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  const toggleSport = (sport: string) => {
    if (value.includes(sport)) {
      onChange(value.filter((s) => s !== sport));
    } else {
      onChange([...value, sport]);
    }
  };

  const summaryLabel =
    value.length === 0
      ? 'Select sports…'
      : value.length <= 2
        ? value.map(formatSportLabel).join(', ')
        : `${value.length} sports selected`;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        id={id}
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 border border-gray-300 rounded-lg bg-white text-left text-sm text-gray-900 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
      >
        <span className={value.length === 0 ? 'text-gray-500' : ''}>{summaryLabel}</span>
        <ChevronDown className={`w-4 h-4 shrink-0 text-gray-500 transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {open ? (
        <div
          role="listbox"
          aria-multiselectable
          className="absolute z-20 mt-1 w-full border border-gray-300 rounded-lg bg-white shadow-lg max-h-56 overflow-y-auto p-3"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {PROFILE_SPORT_OPTIONS.map((sport) => (
              <label
                key={sport}
                className="flex items-center gap-2 text-sm text-gray-800 cursor-pointer rounded px-1 py-0.5 hover:bg-gray-50"
              >
                <input
                  type="checkbox"
                  checked={value.includes(sport)}
                  onChange={() => toggleSport(sport)}
                  className="rounded border-gray-400 text-blue-600 focus:ring-blue-500"
                />
                <span>{formatSportLabel(sport)}</span>
              </label>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

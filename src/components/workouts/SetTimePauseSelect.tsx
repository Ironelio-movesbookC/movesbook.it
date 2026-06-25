'use client';

import { coerceSetTimePauseValue, getSetTimePauseOptions } from '@/constants/moveframe.constants';

interface SetTimePauseSelectProps {
  sport: string;
  value: string | undefined | null;
  onChange: (value: string) => void;
  compact?: boolean;
  className?: string;
}

/** Dropdown for Set-time pause presets (Section B/C tables + aerobic individual planning). */
export default function SetTimePauseSelect({
  sport,
  value,
  onChange,
  compact = false,
  className = '',
}: SetTimePauseSelectProps) {
  const options = getSetTimePauseOptions(sport);
  const selected = coerceSetTimePauseValue(sport, value);

  return (
    <select
      value={selected}
      onChange={(e) => onChange(e.target.value)}
      title="Select pause"
      aria-label="Pause"
      className={`w-full cursor-pointer appearance-auto border border-gray-400 bg-white shadow-sm focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 ${
        compact ? 'px-2 py-1.5 text-xs text-center rounded' : 'px-3 py-2 text-sm rounded'
      } ${className}`}
    >
      {options.map((p) => (
        <option key={p} value={p}>
          {p}
        </option>
      ))}
    </select>
  );
}

'use client';

import { formatPauseMinDigits } from '@/utils/pauseRestValueFormat';

interface PauseMinInputProps {
  value: string;
  onChange: (value: string) => void;
  onBlurFormatted?: (formatted: string) => void;
  compact?: boolean;
  className?: string;
  placeholder?: string;
}

/** Digit entry for Pause Min. (Set time / Restart time in PAUSE SETTINGS): 184 → 0'18''4 */
export default function PauseMinInput({
  value,
  onChange,
  onBlurFormatted,
  compact = false,
  className = '',
  placeholder = "e.g., 184 → 0'18''4",
}: PauseMinInputProps) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => {
        const raw = e.target.value;
        if (/^\d+$/.test(raw) || raw === '') {
          onChange(raw);
        } else {
          onChange(raw.replace(/\D/g, ''));
        }
      }}
      onBlur={(e) => {
        const digits = e.target.value.replace(/\D/g, '');
        const formatted = digits ? formatPauseMinDigits(digits) : '';
        onChange(formatted);
        onBlurFormatted?.(formatted);
      }}
      className={`w-full border border-gray-300 rounded focus:ring-2 focus:ring-cyan-500 font-mono ${
        compact ? 'px-2 py-1.5 text-xs text-center' : 'px-3 py-2 text-sm'
      } ${className}`}
      placeholder={placeholder}
      autoComplete="off"
    />
  );
}

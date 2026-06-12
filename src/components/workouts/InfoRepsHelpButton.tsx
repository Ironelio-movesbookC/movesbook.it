'use client';

import React from 'react';

const INFO_REPS_BTN_TITLE =
  'Learn how reps relate to % of load on 1 MR (valid up to about 40 repetitions)';

type InfoRepsHelpButtonProps = {
  onClick: (e: React.MouseEvent) => void;
  /** compact = table header; default = toolbar row */
  variant?: 'compact' | 'default';
};

/** Circular “i” button — opens Info Reps long-text dialog (Language → Long texts / InfoReps). */
export function InfoRepsHelpButton({ onClick, variant = 'default' }: InfoRepsHelpButtonProps) {
  if (variant === 'compact') {
    return (
      <button
        type="button"
        onClick={onClick}
        className="inline-flex flex-col items-center gap-0.5"
        title={INFO_REPS_BTN_TITLE}
        aria-label="Info Reps"
      >
        <span className="inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border border-violet-600 bg-violet-300 text-[10px] font-bold leading-none text-white shadow-sm hover:bg-violet-400">
          i
        </span>
        <span className="text-[8px] font-semibold leading-none text-violet-800 whitespace-nowrap">
          Info Reps
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-full border border-violet-500 bg-violet-100 px-2 py-0.5 text-[11px] font-semibold text-violet-900 hover:bg-violet-200"
      title={INFO_REPS_BTN_TITLE}
      aria-label="Info Reps"
    >
      <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-violet-600 bg-violet-300 text-[9px] font-bold leading-none text-white">
        i
      </span>
      Info Reps
    </button>
  );
}

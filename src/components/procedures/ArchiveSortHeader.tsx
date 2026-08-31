'use client';

import type { ReactNode } from 'react';
import type { ArchiveSortDir } from '@/components/procedures/archiveColumnSort';

type Props = {
  label: ReactNode;
  sortable?: boolean;
  active?: boolean;
  direction?: ArchiveSortDir;
  onSort?: () => void;
};

/** Double-arrow header control used by every archive table. */
export default function ArchiveSortHeader({
  label,
  sortable = false,
  active = false,
  direction = 'asc',
  onSort,
}: Props) {
  if (!sortable) {
    return <span>{label}</span>;
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onSort?.();
      }}
      className="inline-flex items-center gap-1 text-left font-inherit text-inherit hover:opacity-90"
      aria-label={`Sort by ${typeof label === 'string' ? label : 'column'}`}
      title="Sort ascending / descending"
    >
      <span>{label}</span>
      <span className="inline-flex flex-col leading-[0.55] text-[8px] select-none" aria-hidden>
        <span className={active && direction === 'asc' ? 'text-amber-300' : 'text-white/55'}>▲</span>
        <span className={active && direction === 'desc' ? 'text-amber-300' : 'text-white/55'}>▼</span>
      </span>
    </button>
  );
}

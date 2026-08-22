'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  archiveScopeFilters,
  defaultArchiveScope,
  type ArchiveScope,
  type ArchiveScopeFilters,
} from '@/lib/club/archives/archiveScope';

export type ArchiveScopeState = {
  scope: ArchiveScope;
  setScope: (scope: ArchiveScope) => void;
  recordId: string | null;
  memberId: string | null;
  /** Hand these straight to the list call for the active scope. */
  filters: ArchiveScopeFilters;
};

/**
 * Reads the record/member selection an archive was opened with and keeps the chosen width.
 * See `@/lib/club/archives/archiveScope` for the convention.
 */
export function useArchiveScope(): ArchiveScopeState {
  const searchParams = useSearchParams();
  const recordId = searchParams?.get('recordId') || null;
  const memberId = searchParams?.get('memberId') || null;
  const urlDefault = defaultArchiveScope(recordId, memberId);
  const [scope, setScope] = useState<ArchiveScope>(urlDefault);

  // Re-apply the URL default when navigating between archives (e.g. payment form → Payments).
  // useState alone would keep a stale "all" from the first empty render.
  useEffect(() => {
    setScope(urlDefault);
  }, [urlDefault, recordId, memberId]);

  const filters = useMemo(
    () => archiveScopeFilters(scope, recordId, memberId),
    [scope, recordId, memberId]
  );

  return { scope, setScope, recordId, memberId, filters };
}

type Props = {
  state: ArchiveScopeState;
  /** Radio group name — unique per archive so two grids on one page stay independent. */
  name: string;
  /** Called after a change, e.g. to jump back to page 1. */
  onChange?: () => void;
};

export default function ArchiveScopeRadios({ state, name, onChange }: Props) {
  const { scope, setScope, recordId, memberId } = state;

  // Nothing was selected upstream, so there is no narrower view to offer.
  if (!recordId && !memberId) return null;

  const choose = (next: ArchiveScope) => {
    setScope(next);
    onChange?.();
  };

  return (
    <div className="flex items-center gap-4 text-sm text-gray-700">
      {recordId && (
        <label className="inline-flex items-center gap-2 cursor-pointer select-none">
          <input
            type="radio"
            name={name}
            checked={scope === 'record'}
            onChange={() => choose('record')}
          />
          Record selected
        </label>
      )}
      {memberId && (
        <label className="inline-flex items-center gap-2 cursor-pointer select-none">
          <input
            type="radio"
            name={name}
            checked={scope === 'member'}
            onChange={() => choose('member')}
          />
          Member selected
        </label>
      )}
      <label className="inline-flex items-center gap-2 cursor-pointer select-none">
        <input
          type="radio"
          name={name}
          checked={scope === 'all'}
          onChange={() => choose('all')}
        />
        All members
      </label>
    </div>
  );
}

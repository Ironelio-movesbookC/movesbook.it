'use client';

import { useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

/** Parse `?ids=a,b,c` from the URL (scope from payment form). */
export function useScopedRecordIds(): string[] {
  const searchParams = useSearchParams();
  return useMemo(() => {
    const raw = searchParams.get('ids') ?? '';
    return raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }, [searchParams]);
}

/** Empty when "Display all" is checked — otherwise the scoped ids. */
export function useEffectiveScopedRecordIds(): string[] {
  const searchParams = useSearchParams();
  const scopedIds = useScopedRecordIds();
  if (searchParams.get('all') === '1') return [];
  return scopedIds;
}

type Props = {
  /** Short label, e.g. "historicals", "payments", "receipts". */
  archiveLabel: string;
};

/**
 * Shown when archives were opened from the payment form with `?ids=…`.
 * Checking it shows the full SERVICES archive (all members), keeping ids in the URL
 * so unchecking restores the selected-deadlines filter.
 */
export default function DisplayAllArchivesCheckbox({ archiveLabel }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const scopedIds = useScopedRecordIds();

  if (scopedIds.length === 0) return null;

  const displayAll = searchParams.get('all') === '1';

  function toggle(checked: boolean) {
    const next = new URLSearchParams(searchParams.toString());
    if (checked) next.set('all', '1');
    else next.delete('all');
    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <label className="inline-flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
      <input
        type="checkbox"
        className="h-4 w-4 rounded border-gray-300 text-teal-700 focus:ring-teal-600"
        checked={displayAll}
        onChange={(e) => toggle(e.target.checked)}
      />
      Display all {archiveLabel} (all members — ignore selected deadlines)
    </label>
  );
}

/** Preserve ids (+ optional all) when building sibling archive tab hrefs. */
export function scopedArchiveQuery(searchParams: URLSearchParams): string {
  const ids = searchParams.get('ids');
  const all = searchParams.get('all');
  const qs = new URLSearchParams();
  if (ids) qs.set('ids', ids);
  if (all === '1') qs.set('all', '1');
  const s = qs.toString();
  return s ? `?${s}` : '';
}

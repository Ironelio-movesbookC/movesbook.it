'use client';

import { useMemo } from 'react';
import { filterBachecaLabelsForMembers } from '@/lib/clubBachecaLabels';
import { useClubBachecaLabels } from '@/hooks/useClubBachecaLabels';

/** Activated, member-visible bacheca sections only. */
export function useClubBachecaMemberLabels(clubId: string | undefined) {
  const { labels: allLabels, loading, error, hydrated } = useClubBachecaLabels(clubId);

  const labels = useMemo(
    () => filterBachecaLabelsForMembers(allLabels),
    [allLabels],
  );

  return { labels, loading, error, hydrated };
}

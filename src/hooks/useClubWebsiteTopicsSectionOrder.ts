'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { reorderFriendItems } from '@/lib/clubWebsiteFriendList';
import type { ClubWebsiteFriendItem } from '@/lib/clubWebsiteFriendList';
import type { ClubWebsiteTopic } from '@/lib/clubWebsiteTopics';
import {
  buildDefaultTopicsSectionOrder,
  loadTopicsSectionOrder,
  saveTopicsSectionOrder,
  swapTopicsSectionEntry,
  type TopicsSectionRowRef,
} from '@/lib/clubWebsiteTopicsSectionOrder';

export function useClubWebsiteTopicsSectionOrder(
  clubId: string | undefined,
  customTopics: ClubWebsiteTopic[],
  friendItems: ClubWebsiteFriendItem[],
  onReorderCustomTopics: (id: string, direction: 'up' | 'down') => void,
  onReorderFriendItems: (id: string, direction: 'up' | 'down') => void,
) {
  const defaultOrder = useMemo(
    () => buildDefaultTopicsSectionOrder(customTopics, friendItems),
    [customTopics, friendItems],
  );

  const [sectionOrder, setSectionOrder] = useState<TopicsSectionRowRef[]>(defaultOrder);

  useEffect(() => {
    setSectionOrder(loadTopicsSectionOrder(clubId, customTopics, friendItems));
  }, [clubId, customTopics, friendItems, defaultOrder]);

  const moveSectionEntry = useCallback(
    (id: string, kind: TopicsSectionRowRef['kind'], direction: 'up' | 'down') => {
      setSectionOrder((prev) => {
        const idx = prev.findIndex((entry) => entry.kind === kind && entry.id === id);
        if (idx < 0) return prev;
        const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
        if (swapIdx < 0 || swapIdx >= prev.length) return prev;

        const current = prev[idx];
        const neighbor = prev[swapIdx];
        const next = swapTopicsSectionEntry(prev, id, kind, direction);
        if (!next) return prev;

        if (current.kind === 'custom' && neighbor.kind === 'custom') {
          onReorderCustomTopics(id, direction);
        } else if (current.kind === 'friend' && neighbor.kind === 'friend') {
          onReorderFriendItems(id, direction);
        }

        if (clubId) saveTopicsSectionOrder(clubId, next);
        return next;
      });
    },
    [clubId, onReorderCustomTopics, onReorderFriendItems],
  );

  return { sectionOrder, moveSectionEntry };
}

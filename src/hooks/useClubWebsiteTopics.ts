'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  createClubWebsiteTopic,
  loadClubWebsiteTopics,
  saveClubWebsiteTopics,
  type ClubWebsiteTopic,
} from '@/lib/clubWebsiteTopics';

export function useClubWebsiteTopics(clubId: string | undefined) {
  const [topics, setTopics] = useState<ClubWebsiteTopic[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!clubId) {
      setTopics([]);
      setHydrated(true);
      return;
    }
    setTopics(loadClubWebsiteTopics(clubId));
    setHydrated(true);
  }, [clubId]);

  const persist = useCallback(
    (next: ClubWebsiteTopic[]) => {
      setTopics(next);
      if (clubId) saveClubWebsiteTopics(clubId, next);
    },
    [clubId]
  );

  const addTopic = useCallback(
    (name: string): ClubWebsiteTopic | null => {
      const trimmed = name.trim();
      if (!trimmed) return null;
      const topic = createClubWebsiteTopic(trimmed);
      setTopics((prev) => {
        const next = [...prev, topic];
        if (clubId) saveClubWebsiteTopics(clubId, next);
        return next;
      });
      return topic;
    },
    [clubId]
  );

  const updateTopic = useCallback(
    (id: string, patch: Partial<ClubWebsiteTopic>) => {
      setTopics((prev) => {
        const next = prev.map((t) => (t.id === id ? { ...t, ...patch } : t));
        if (clubId) saveClubWebsiteTopics(clubId, next);
        return next;
      });
    },
    [clubId]
  );

  const toggleActivated = useCallback(
    (id: string) => {
      setTopics((prev) => {
        const next = prev.map((t) =>
          t.id === id ? { ...t, activated: !t.activated } : t
        );
        if (clubId) saveClubWebsiteTopics(clubId, next);
        return next;
      });
    },
    [clubId]
  );

  const removeTopic = useCallback(
    (id: string) => {
      setTopics((prev) => {
        const next = prev.filter((t) => t.id !== id);
        if (clubId) saveClubWebsiteTopics(clubId, next);
        return next;
      });
    },
    [clubId]
  );

  const moveTopic = useCallback(
    (id: string, direction: 'up' | 'down') => {
      setTopics((prev) => {
        const idx = prev.findIndex((t) => t.id === id);
        if (idx < 0) return prev;
        const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
        if (swapIdx < 0 || swapIdx >= prev.length) return prev;
        const next = [...prev];
        [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
        if (clubId) saveClubWebsiteTopics(clubId, next);
        return next;
      });
    },
    [clubId]
  );

  const reload = useCallback(() => {
    if (!clubId) {
      setTopics([]);
      return;
    }
    setTopics(loadClubWebsiteTopics(clubId));
  }, [clubId]);

  return {
    topics,
    hydrated,
    addTopic,
    updateTopic,
    toggleActivated,
    removeTopic,
    moveTopic,
    persist,
    reload,
  };
}

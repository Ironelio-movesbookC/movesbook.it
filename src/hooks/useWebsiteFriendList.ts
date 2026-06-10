'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  applyFriendItemActivation,
  canFriendItemHaveSubtopics,
  createClubWebsiteFriendItem,
  defaultClubWebsiteFriendItems,
  insertFriendItem,
  loadWebsiteFriendItems,
  reorderFriendItems,
  removeFriendItemFromList,
  saveWebsiteFriendItems,
  type ClubWebsiteFriendItem,
  type WebsiteFriendListScope,
} from '@/lib/clubWebsiteFriendList';

export function useWebsiteFriendList(
  scope: WebsiteFriendListScope,
  ownerId: string | undefined
) {
  const [items, setItems] = useState<ClubWebsiteFriendItem[]>(() => defaultClubWebsiteFriendItems());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!ownerId) {
      setItems(defaultClubWebsiteFriendItems());
      setHydrated(true);
      return;
    }
    setItems(loadWebsiteFriendItems(scope, ownerId));
    setHydrated(true);
  }, [scope, ownerId]);

  const persist = useCallback(
    (next: ClubWebsiteFriendItem[]) => {
      setItems(next);
      if (ownerId) saveWebsiteFriendItems(scope, ownerId, next);
    },
    [scope, ownerId]
  );

  const updateItem = useCallback(
    (id: string, patch: Partial<ClubWebsiteFriendItem>) => {
      setItems((prev) => {
        let next = prev.map((item) => (item.id === id ? { ...item, ...patch } : item));
        if (patch.activated === false) {
          next = applyFriendItemActivation(next, id, false);
        } else if (patch.activated === true) {
          next = next.map((item) => (item.id === id ? { ...item, activated: true } : item));
        }
        if (ownerId) saveWebsiteFriendItems(scope, ownerId, next);
        return next;
      });
    },
    [scope, ownerId]
  );

  const toggleActivated = useCallback(
    (id: string) => {
      setItems((prev) => {
        const current = prev.find((i) => i.id === id);
        if (!current) return prev;
        const next = applyFriendItemActivation(prev, id, !current.activated);
        if (ownerId) saveWebsiteFriendItems(scope, ownerId, next);
        return next;
      });
    },
    [scope, ownerId]
  );

  const removeItem = useCallback(
    (id: string) => {
      if (id === 'friends-root') return;
      setItems((prev) => {
        const next = removeFriendItemFromList(prev, id);
        if (ownerId) saveWebsiteFriendItems(scope, ownerId, next);
        return next;
      });
    },
    [scope, ownerId]
  );

  const addSubtopicUnder = useCallback(
    (parentId: string, name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return null;
      let created: ClubWebsiteFriendItem | null = null;
      setItems((prev) => {
        const parent = prev.find((i) => i.id === parentId);
        if (!parent || !canFriendItemHaveSubtopics(parent)) return prev;
        const item = createClubWebsiteFriendItem(trimmed, true, parentId);
        created = item;
        const next = insertFriendItem(prev, item, parentId);
        if (ownerId) saveWebsiteFriendItems(scope, ownerId, next);
        return next;
      });
      return created;
    },
    [scope, ownerId]
  );

  const addNestedUnderRoot = useCallback(
    (name: string) => addSubtopicUnder('friends-root', name),
    [addSubtopicUnder]
  );

  const addPeerTopic = useCallback(
    (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return null;
      const item = createClubWebsiteFriendItem(trimmed, false, 'friends-root');
      setItems((prev) => {
        const next = [...prev, item];
        if (ownerId) saveWebsiteFriendItems(scope, ownerId, next);
        return next;
      });
      return item;
    },
    [scope, ownerId]
  );

  const moveItem = useCallback(
    (id: string, direction: 'up' | 'down') => {
      setItems((prev) => {
        const next = reorderFriendItems(prev, id, direction);
        if (ownerId) saveWebsiteFriendItems(scope, ownerId, next);
        return next;
      });
    },
    [scope, ownerId]
  );

  return {
    items,
    hydrated,
    updateItem,
    toggleActivated,
    removeItem,
    addSubtopicUnder,
    addNestedUnderRoot,
    addPeerTopic,
    moveItem,
    persist,
  };
}

import type { ClubWebsiteFriendItem } from '@/lib/clubWebsiteFriendList';
import { friendItemsToRows } from '@/lib/clubWebsiteFriendList';
import type { ClubWebsiteTopic } from '@/lib/clubWebsiteTopics';
import { dispatchClubWebsiteSettingsChanged } from '@/lib/clubWebsiteSettingsEvents';

export type TopicsSectionRowRef = {
  kind: 'custom' | 'friend';
  id: string;
};

const STORAGE_PREFIX = 'club-website-topics-section-order';

export function topicsSectionOrderStorageKey(clubId: string): string {
  return `${STORAGE_PREFIX}:${clubId}`;
}

function entryKey(entry: TopicsSectionRowRef): string {
  return `${entry.kind}:${entry.id}`;
}

export function buildDefaultTopicsSectionOrder(
  customTopics: ClubWebsiteTopic[],
  friendItems: ClubWebsiteFriendItem[],
): TopicsSectionRowRef[] {
  const customEntries: TopicsSectionRowRef[] = [];
  const placed = new Set<string>();
  const roots = customTopics.filter((topic) => !topic.parentId);
  for (const root of roots) {
    customEntries.push({ kind: 'custom', id: root.id });
    placed.add(root.id);
    for (const child of customTopics.filter((topic) => topic.parentId === root.id)) {
      customEntries.push({ kind: 'custom', id: child.id });
      placed.add(child.id);
    }
  }
  for (const topic of customTopics) {
    if (placed.has(topic.id)) continue;
    customEntries.push({ kind: 'custom', id: topic.id });
  }

  const friendIds = friendItemsToRows(friendItems).map((row) => row.id);
  return [
    ...customEntries,
    ...friendIds.map((id) => ({ kind: 'friend' as const, id })),
  ];
}

export function reconcileTopicsSectionOrder(
  stored: TopicsSectionRowRef[],
  defaults: TopicsSectionRowRef[],
): TopicsSectionRowRef[] {
  const defaultByKey = new Map(defaults.map((entry) => [entryKey(entry), entry]));
  const result: TopicsSectionRowRef[] = [];
  const seen = new Set<string>();

  for (const entry of stored) {
    const key = entryKey(entry);
    if (!defaultByKey.has(key) || seen.has(key)) continue;
    result.push(entry);
    seen.add(key);
  }

  for (let defaultIdx = 0; defaultIdx < defaults.length; defaultIdx += 1) {
    const entry = defaults[defaultIdx];
    const key = entryKey(entry);
    if (seen.has(key)) continue;

    // Place new rows next to their neighbors from the default (parent/sibling) order,
    // not at the end of the whole section.
    let insertAt = result.length;
    for (let i = defaultIdx - 1; i >= 0; i -= 1) {
      const prevKey = entryKey(defaults[i]);
      const idxInResult = result.findIndex((e) => entryKey(e) === prevKey);
      if (idxInResult >= 0) {
        insertAt = idxInResult + 1;
        break;
      }
    }
    if (insertAt === result.length) {
      for (let i = defaultIdx + 1; i < defaults.length; i += 1) {
        const nextKey = entryKey(defaults[i]);
        const idxInResult = result.findIndex((e) => entryKey(e) === nextKey);
        if (idxInResult >= 0) {
          insertAt = idxInResult;
          break;
        }
      }
    }

    result.splice(insertAt, 0, entry);
    seen.add(key);
  }

  return result;
}

export function loadTopicsSectionOrder(
  clubId: string | undefined,
  customTopics: ClubWebsiteTopic[],
  friendItems: ClubWebsiteFriendItem[],
): TopicsSectionRowRef[] {
  const defaults = buildDefaultTopicsSectionOrder(customTopics, friendItems);
  if (!clubId || typeof window === 'undefined') return defaults;

  try {
    const raw = localStorage.getItem(topicsSectionOrderStorageKey(clubId));
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as TopicsSectionRowRef[];
    if (!Array.isArray(parsed)) return defaults;
    return reconcileTopicsSectionOrder(parsed, defaults);
  } catch {
    return defaults;
  }
}

export function saveTopicsSectionOrder(clubId: string, order: TopicsSectionRowRef[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(topicsSectionOrderStorageKey(clubId), JSON.stringify(order));
  dispatchClubWebsiteSettingsChanged(clubId);
}

export function swapTopicsSectionEntry(
  order: TopicsSectionRowRef[],
  id: string,
  kind: TopicsSectionRowRef['kind'],
  direction: 'up' | 'down',
): TopicsSectionRowRef[] | null {
  const idx = order.findIndex((entry) => entry.kind === kind && entry.id === id);
  if (idx < 0) return null;
  const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= order.length) return null;
  const next = [...order];
  [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
  return next;
}

export function findTopicsSectionEntryIndex(
  order: TopicsSectionRowRef[],
  id: string,
  kind: TopicsSectionRowRef['kind'],
): number {
  return order.findIndex((entry) => entry.kind === kind && entry.id === id);
}

/** Parent peer for an indented friend row in flat section order. */
export function findFriendParentIdInSectionOrder(
  order: TopicsSectionRowRef[],
  rowIndex: number,
  indent: boolean,
): string | null {
  if (!indent) return null;
  for (let i = rowIndex - 1; i >= 0; i -= 1) {
    const entry = order[i];
    if (entry.kind !== 'friend') continue;
    return entry.id;
  }
  return null;
}

/** Nested friend rows immediately following a parent row in section order. */
export function getNestedFriendIdsInSectionOrder(
  order: TopicsSectionRowRef[],
  parentIndex: number,
  rowById: Record<string, { indent: boolean } | undefined>,
): string[] {
  const nested: string[] = [];
  for (let i = parentIndex + 1; i < order.length; i += 1) {
    const entry = order[i];
    if (entry.kind !== 'friend') break;
    const row = rowById[entry.id];
    if (!row?.indent) break;
    nested.push(entry.id);
  }
  return nested;
}

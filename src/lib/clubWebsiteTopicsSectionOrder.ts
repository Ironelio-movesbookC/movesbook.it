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
  const friendIds = friendItemsToRows(friendItems).map((row) => row.id);
  return [
    ...customTopics.map((topic) => ({ kind: 'custom' as const, id: topic.id })),
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

  for (const entry of defaults) {
    const key = entryKey(entry);
    if (!seen.has(key)) {
      result.push(entry);
      seen.add(key);
    }
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

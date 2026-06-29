import { emptyClubWebsiteLangRecord } from '@/lib/clubWebsiteLanguages';
import {
  FRIEND_LIST_ROWS,
  buildFriendListLayout,
  type FriendListLayout,
  type FriendListRow,
} from '@/components/club/websiteSettings/clubWebsiteSettingsSidebarData';
import {
  DEFAULT_TOPIC_SETTINGS_FIELDS,
  normalizeTopicSettingsFields,
  type ClubWebsiteTopicSettingsFields,
} from '@/lib/clubWebsiteTopicSettingsFields';
import {
  DEFAULT_TOPIC_BANNER_COLOR,
  DEFAULT_TOPIC_TITLE_COLOR,
} from '@/lib/clubWebsiteTopics';
import { dispatchClubWebsiteSettingsChanged } from '@/lib/clubWebsiteSettingsEvents';
import { isTopicAudienceAllowed } from '@/lib/clubWebsiteTopicSettingsFields';

export type ClubWebsiteFriendItem = {
  id: string;
  name: string;
  indent: boolean;
  parentId: string | null;
  /** Visible to club members when true (and all ancestors enabled). */
  activated: boolean;
  title: string;
  sectionName: string;
  bannerColor: string;
  titleColor: string;
  lastUpdate: string;
  contentsByLang: Record<string, string>;
  keywordsByLang: Record<string, string>;
} & ClubWebsiteTopicSettingsFields;

export type WebsiteFriendListScope = 'club' | 'personal';

function storageKey(scope: WebsiteFriendListScope, ownerId: string): string {
  const prefix =
    scope === 'club' ? 'club-website-friend-list' : 'personal-website-friend-list';
  return `${prefix}:${ownerId}`;
}

function inferParentIdsFromLayout(items: ClubWebsiteFriendItem[]): Map<string, string | null> {
  const rows = friendItemsToRows(items);
  const layout = buildFriendListLayout(rows);
  const map = new Map<string, string | null>();
  map.set('friends-root', null);
  layout.rootNested.forEach((r) => map.set(r.id, 'friends-root'));
  layout.segments.forEach(({ peer, nested }) => {
    map.set(peer.id, 'friends-root');
    nested.forEach((n) => map.set(n.id, peer.id));
  });
  return map;
}

export function normalizeClubWebsiteFriendItem(
  raw: Partial<ClubWebsiteFriendItem> & { id: string }
): ClubWebsiteFriendItem {
  const settings = normalizeTopicSettingsFields(raw);
  const name =
    raw.name ??
    (raw.id === 'friends-root' ? 'List of friends' : FRIEND_LIST_ROWS.find((r) => r.id === raw.id)?.label ?? '');
  return {
    id: raw.id,
    name,
    indent: raw.indent ?? false,
    parentId: raw.parentId ?? null,
    activated: raw.activated ?? true,
    title: raw.title ?? name,
    sectionName: raw.sectionName ?? name,
    bannerColor: raw.bannerColor ?? DEFAULT_TOPIC_BANNER_COLOR,
    titleColor: raw.titleColor ?? DEFAULT_TOPIC_TITLE_COLOR,
    lastUpdate: raw.lastUpdate ?? '',
    contentsByLang: raw.contentsByLang ?? emptyClubWebsiteLangRecord(),
    keywordsByLang: raw.keywordsByLang ?? emptyClubWebsiteLangRecord(),
    ...settings,
  };
}

function createItemFromRow(row: FriendListRow, parentId: string | null): ClubWebsiteFriendItem {
  return normalizeClubWebsiteFriendItem({
    id: row.id,
    name: row.id === 'friends-root' ? 'List of friends' : row.label,
    indent: row.indent,
    parentId,
    activated: row.status === 'on',
    title: row.id === 'friends-root' ? 'List of friends' : row.label,
    sectionName: row.id === 'friends-root' ? 'List of friends' : row.label,
    bannerColor: DEFAULT_TOPIC_BANNER_COLOR,
    titleColor: DEFAULT_TOPIC_TITLE_COLOR,
    lastUpdate: '',
    contentsByLang: emptyClubWebsiteLangRecord(),
    keywordsByLang: emptyClubWebsiteLangRecord(),
    ...DEFAULT_TOPIC_SETTINGS_FIELDS,
  });
}

export function defaultClubWebsiteFriendItems(): ClubWebsiteFriendItem[] {
  const rows = FRIEND_LIST_ROWS;
  const layout = buildFriendListLayout(rows);
  const items: ClubWebsiteFriendItem[] = [createItemFromRow(layout.root, null)];
  layout.rootNested.forEach((r) => items.push(createItemFromRow(r, 'friends-root')));
  layout.segments.forEach(({ peer, nested }) => {
    items.push(createItemFromRow(peer, 'friends-root'));
    nested.forEach((n) => items.push(createItemFromRow(n, peer.id)));
  });
  return items;
}

export function friendItemToListRow(item: ClubWebsiteFriendItem): FriendListRow {
  return {
    id: item.id,
    label: item.id === 'friends-root' ? 'List of friends' : item.name,
    indent: item.indent,
    status: item.activated ? 'on' : 'off',
  };
}

export function friendItemsToRows(items: ClubWebsiteFriendItem[]): FriendListRow[] {
  const root = items.find((i) => i.id === 'friends-root');
  if (!root) return FRIEND_LIST_ROWS;
  const rest = items.filter((i) => i.id !== 'friends-root');
  const byId = Object.fromEntries(items.map((i) => [i.id, i]));
  const orderedRest = rest
    .map((item) => byId[item.id])
    .filter((item): item is ClubWebsiteFriendItem => Boolean(item));
  return [friendItemToListRow(root), ...orderedRest.map(friendItemToListRow)];
}

function syncFriendItemParentIds(items: ClubWebsiteFriendItem[]): ClubWebsiteFriendItem[] {
  const parentMap = inferParentIdsFromLayout(items);
  return items.map((item) => ({
    ...item,
    parentId: parentMap.get(item.id) ?? item.parentId ?? null,
  }));
}

export function getFriendItemDescendantIds(
  items: ClubWebsiteFriendItem[],
  parentId: string
): string[] {
  const withParents = items.map((item) => {
    if (item.parentId != null) return item;
    const map = inferParentIdsFromLayout(items);
    return { ...item, parentId: map.get(item.id) ?? null };
  });
  const result: string[] = [];
  const queue = [parentId];
  while (queue.length) {
    const pid = queue.shift()!;
    withParents
      .filter((i) => i.parentId === pid)
      .forEach((child) => {
        result.push(child.id);
        queue.push(child.id);
      });
  }
  return result;
}

/** Item id plus all descendant ids (subtopics) removed together. */
export function getFriendItemIdsForRemoval(
  items: ClubWebsiteFriendItem[],
  id: string
): string[] {
  if (id === 'friends-root') return [];
  return [id, ...getFriendItemDescendantIds(items, id)];
}

export function removeFriendItemFromList(
  items: ClubWebsiteFriendItem[],
  id: string
): ClubWebsiteFriendItem[] {
  const toRemove = new Set(getFriendItemIdsForRemoval(items, id));
  if (toRemove.size === 0) return items;
  return items.filter((item) => !toRemove.has(item.id));
}

export function applyFriendItemActivation(
  items: ClubWebsiteFriendItem[],
  id: string,
  activated: boolean
): ClubWebsiteFriendItem[] {
  let next = items.map((i) => (i.id === id ? { ...i, activated } : i));
  if (!activated) {
    const descendants = getFriendItemDescendantIds(next, id);
    next = next.map((i) => (descendants.includes(i.id) ? { ...i, activated: false } : i));
  }
  return next;
}

/** Indented row nested under a topic — cannot have its own subtopics. */
export function isFriendListSubtopic(item: ClubWebsiteFriendItem): boolean {
  return item.id !== 'friends-root' && item.indent;
}

export function resolveFriendItemParentId(
  items: ClubWebsiteFriendItem[],
  item: ClubWebsiteFriendItem
): string | null {
  if (item.parentId != null) return item.parentId;
  return inferParentIdsFromLayout(items).get(item.id) ?? null;
}

export function canFriendItemHaveSubtopics(item: ClubWebsiteFriendItem): boolean {
  return item.id === 'friends-root' || !isFriendListSubtopic(item);
}

export type FriendItemDeleteConfirmKey =
  | 'club_friend_delete_subtopic_confirm'
  | 'club_friend_delete_topic_confirm'
  | 'club_friend_delete_topic_cascade_confirm';

export function getFriendItemDeleteConfirmKey(
  items: ClubWebsiteFriendItem[],
  id: string
): FriendItemDeleteConfirmKey {
  const item = items.find((i) => i.id === id);
  if (!item || id === 'friends-root') return 'club_friend_delete_topic_confirm';
  const hasDescendants = getFriendItemDescendantIds(items, id).length > 0;
  if (hasDescendants) return 'club_friend_delete_topic_cascade_confirm';
  if (isFriendListSubtopic(item)) return 'club_friend_delete_subtopic_confirm';
  return 'club_friend_delete_topic_confirm';
}

/** Nearest topic-level ancestor whose audience applies to this subtopic. */
export function getTopicParentForSubtopic(
  items: ClubWebsiteFriendItem[],
  subtopic: ClubWebsiteFriendItem
): ClubWebsiteFriendItem | null {
  if (!isFriendListSubtopic(subtopic)) return null;
  const map = inferParentIdsFromLayout(items);
  let parentId = subtopic.parentId ?? map.get(subtopic.id) ?? null;
  while (parentId) {
    const parent = items.find((i) => i.id === parentId);
    if (!parent) return null;
    if (!isFriendListSubtopic(parent)) return parent;
    parentId = parent.parentId ?? map.get(parent.id) ?? null;
  }
  return items.find((i) => i.id === 'friends-root') ?? null;
}

export function getEffectiveFriendItemAudience(
  items: ClubWebsiteFriendItem[],
  item: ClubWebsiteFriendItem
) {
  if (!isFriendListSubtopic(item)) return item.audience;
  const parent = getTopicParentForSubtopic(items, item);
  return parent?.audience ?? item.audience;
}

export function clearClubWebsiteFriendItemContent(): Pick<
  ClubWebsiteFriendItem,
  'contentsByLang' | 'keywordsByLang' | 'lastUpdate'
> {
  return {
    contentsByLang: emptyClubWebsiteLangRecord(),
    keywordsByLang: emptyClubWebsiteLangRecord(),
    lastUpdate: '',
  };
}

export function getFriendItemSettingsVariant(
  item: ClubWebsiteFriendItem
): 'root' | 'topic' | 'subtopic' {
  if (item.id === 'friends-root') return 'root';
  if (isFriendListSubtopic(item)) return 'subtopic';
  return 'topic';
}

export function isClubWebsiteFriendItemVisibleToMembers(
  items: ClubWebsiteFriendItem[],
  item: ClubWebsiteFriendItem
): boolean {
  if (!item.activated || !item.name.trim()) return false;
  const map = inferParentIdsFromLayout(items);
  let parentId = item.parentId ?? map.get(item.id) ?? null;
  while (parentId) {
    const parent = items.find((i) => i.id === parentId);
    if (!parent?.activated) return false;
    parentId = parent.parentId ?? map.get(parentId) ?? null;
  }
  const audience = getEffectiveFriendItemAudience(items, item);
  return isTopicAudienceAllowed(audience);
}

export function filterClubWebsiteFriendItemsForMembers(
  items: ClubWebsiteFriendItem[]
): ClubWebsiteFriendItem[] {
  return items.filter((item) => isClubWebsiteFriendItemVisibleToMembers(items, item));
}

export type ClubDashboardFriendTopicEntry = {
  id: string;
  name: string;
  item: ClubWebsiteFriendItem;
  subtopics: ClubDashboardFriendTopicEntry[];
};

function mapVisibleDashboardSubtopics(
  items: ClubWebsiteFriendItem[],
  rows: FriendListRow[],
  byId: Record<string, ClubWebsiteFriendItem>
): ClubDashboardFriendTopicEntry[] {
  return rows
    .map((row) => byId[row.id])
    .filter(
      (item): item is ClubWebsiteFriendItem =>
        Boolean(item && isClubWebsiteFriendItemVisibleToMembers(items, item) && item.name.trim())
    )
    .map((item) => ({
      id: item.id,
      name: item.name,
      item,
      subtopics: [],
    }));
}

/** Member-visible friend list tree for dashboard sidebars (link vs label uses showInClubDashboardTopics in UI). */
export function getClubDashboardFriendTopics(
  items: ClubWebsiteFriendItem[]
): ClubDashboardFriendTopicEntry[] {
  const rows = friendItemsToRows(items);
  const layout = buildFriendListLayout(rows);
  const byId = Object.fromEntries(items.map((i) => [i.id, i]));
  const result: ClubDashboardFriendTopicEntry[] = [];

  const rootItem = byId['friends-root'];
  if (rootItem && isClubWebsiteFriendItemVisibleToMembers(items, rootItem)) {
    result.push({
      id: rootItem.id,
      name: rootItem.name,
      item: rootItem,
      subtopics: mapVisibleDashboardSubtopics(items, layout.rootNested, byId),
    });
  }

  for (const segment of layout.segments) {
    const peerItem = byId[segment.peer.id];
    if (!peerItem || !isClubWebsiteFriendItemVisibleToMembers(items, peerItem) || !peerItem.name.trim()) {
      continue;
    }
    result.push({
      id: peerItem.id,
      name: peerItem.name,
      item: peerItem,
      subtopics: mapVisibleDashboardSubtopics(items, segment.nested, byId),
    });
  }

  return result;
}

export function loadWebsiteFriendItems(
  scope: WebsiteFriendListScope,
  ownerId: string
): ClubWebsiteFriendItem[] {
  if (typeof window === 'undefined' || !ownerId) return defaultClubWebsiteFriendItems();
  try {
    const raw = localStorage.getItem(storageKey(scope, ownerId));
    if (!raw) return defaultClubWebsiteFriendItems();
    const parsed = JSON.parse(raw) as Partial<ClubWebsiteFriendItem>[];
    if (!Array.isArray(parsed) || !parsed.some((i) => i.id === 'friends-root')) {
      return defaultClubWebsiteFriendItems();
    }
    const normalized = parsed.map((i) => normalizeClubWebsiteFriendItem(i as ClubWebsiteFriendItem));
    const parentMap = inferParentIdsFromLayout(normalized);
    return normalized.map((i) => ({
      ...i,
      parentId: i.parentId ?? parentMap.get(i.id) ?? null,
    }));
  } catch {
    return defaultClubWebsiteFriendItems();
  }
}

export function saveWebsiteFriendItems(
  scope: WebsiteFriendListScope,
  ownerId: string,
  items: ClubWebsiteFriendItem[]
): void {
  if (typeof window === 'undefined' || !ownerId) return;
  try {
    localStorage.setItem(storageKey(scope, ownerId), JSON.stringify(items));
    if (scope === 'club') {
      dispatchClubWebsiteSettingsChanged(ownerId);
    }
  } catch (error) {
    console.error('Failed to save website friend list:', error);
  }
}

export function loadClubWebsiteFriendItems(clubId: string): ClubWebsiteFriendItem[] {
  return loadWebsiteFriendItems('club', clubId);
}

export function saveClubWebsiteFriendItems(clubId: string, items: ClubWebsiteFriendItem[]): void {
  saveWebsiteFriendItems('club', clubId, items);
}

export function createClubWebsiteFriendItem(
  name: string,
  indent: boolean,
  parentId: string | null
): ClubWebsiteFriendItem {
  const trimmed = name.trim();
  return normalizeClubWebsiteFriendItem({
    id: `friend-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    name: trimmed,
    indent,
    parentId,
    activated: true,
    title: trimmed,
    sectionName: trimmed,
    bannerColor: DEFAULT_TOPIC_BANNER_COLOR,
    titleColor: DEFAULT_TOPIC_TITLE_COLOR,
    lastUpdate: '',
    contentsByLang: emptyClubWebsiteLangRecord(),
    keywordsByLang: emptyClubWebsiteLangRecord(),
    ...DEFAULT_TOPIC_SETTINGS_FIELDS,
  });
}

export function insertFriendItem(
  items: ClubWebsiteFriendItem[],
  item: ClubWebsiteFriendItem,
  afterId?: string
): ClubWebsiteFriendItem[] {
  if (!afterId) {
    const layout = buildFriendListLayout(friendItemsToRows(items));
    const lastRootNestedId = layout.rootNested.at(-1)?.id;
    if (lastRootNestedId) {
      const idx = items.findIndex((i) => i.id === lastRootNestedId);
      const next = [...items];
      next.splice(idx + 1, 0, item);
      return next;
    }
    const rootIdx = items.findIndex((i) => i.id === 'friends-root');
    const next = [...items];
    next.splice(rootIdx + 1, 0, item);
    return next;
  }
  const idx = items.findIndex((i) => i.id === afterId);
  if (idx < 0) return [...items, item];
  const next = [...items];
  next.splice(idx + 1, 0, item);
  return next;
}

function friendListLayoutToFlatIds(layout: FriendListLayout): string[] {
  const ids = [layout.root.id];
  ids.push(...layout.rootNested.map((r) => r.id));
  for (const seg of layout.segments) {
    ids.push(seg.peer.id);
    ids.push(...seg.nested.map((r) => r.id));
  }
  return ids;
}

function flatIdsToFriendItems(
  ids: string[],
  byId: Record<string, ClubWebsiteFriendItem>
): ClubWebsiteFriendItem[] {
  const seen = new Set<string>();
  const ordered: ClubWebsiteFriendItem[] = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    const item = byId[id];
    if (!item) continue;
    seen.add(id);
    ordered.push(item);
  }
  return ordered;
}

function mergeReorderedFriendItems(
  reordered: ClubWebsiteFriendItem[],
  previous: ClubWebsiteFriendItem[]
): ClubWebsiteFriendItem[] {
  const reorderedIds = new Set(reordered.map((item) => item.id));
  const orphans = previous.filter((item) => !reorderedIds.has(item.id));
  return syncFriendItemParentIds([...reordered, ...orphans]);
}

/** Whether an item can move up/down within its sibling group (topics or subtopics). */
export function getFriendItemMoveAvailability(
  items: ClubWebsiteFriendItem[],
  id: string
): { up: boolean; down: boolean } {
  if (id === 'friends-root') return { up: false, down: false };
  const rows = friendItemsToRows(items);
  const layout = buildFriendListLayout(rows);

  const rootIdx = layout.rootNested.findIndex((r) => r.id === id);
  if (rootIdx >= 0) {
    return { up: rootIdx > 0, down: rootIdx < layout.rootNested.length - 1 };
  }

  const peerIdx = layout.segments.findIndex((s) => s.peer.id === id);
  if (peerIdx >= 0) {
    return { up: peerIdx > 0, down: peerIdx < layout.segments.length - 1 };
  }

  for (const seg of layout.segments) {
    const nestedIdx = seg.nested.findIndex((r) => r.id === id);
    if (nestedIdx >= 0) {
      return { up: nestedIdx > 0, down: nestedIdx < seg.nested.length - 1 };
    }
  }

  return { up: false, down: false };
}

export function reorderFriendItems(
  items: ClubWebsiteFriendItem[],
  id: string,
  direction: 'up' | 'down'
): ClubWebsiteFriendItem[] {
  if (id === 'friends-root') return items;

  const rows = friendItemsToRows(items);
  const layout = buildFriendListLayout(rows);
  const byId = Object.fromEntries(items.map((i) => [i.id, i]));

  const rootIdx = layout.rootNested.findIndex((r) => r.id === id);
  if (rootIdx >= 0) {
    const swapIdx = direction === 'up' ? rootIdx - 1 : rootIdx + 1;
    if (swapIdx < 0 || swapIdx >= layout.rootNested.length) return items;
    const rootNested = [...layout.rootNested];
    [rootNested[rootIdx], rootNested[swapIdx]] = [rootNested[swapIdx], rootNested[rootIdx]];
    const reordered = flatIdsToFriendItems(
      friendListLayoutToFlatIds({ ...layout, rootNested }),
      byId
    );
    return mergeReorderedFriendItems(reordered, items);
  }

  const peerIdx = layout.segments.findIndex((s) => s.peer.id === id);
  if (peerIdx >= 0) {
    const swapIdx = direction === 'up' ? peerIdx - 1 : peerIdx + 1;
    if (swapIdx < 0 || swapIdx >= layout.segments.length) return items;
    const segments = [...layout.segments];
    [segments[peerIdx], segments[swapIdx]] = [segments[swapIdx], segments[peerIdx]];
    const reordered = flatIdsToFriendItems(
      friendListLayoutToFlatIds({ ...layout, segments }),
      byId
    );
    return mergeReorderedFriendItems(reordered, items);
  }

  for (let si = 0; si < layout.segments.length; si += 1) {
    const seg = layout.segments[si];
    const nestedIdx = seg.nested.findIndex((r) => r.id === id);
    if (nestedIdx < 0) continue;
    const swapIdx = direction === 'up' ? nestedIdx - 1 : nestedIdx + 1;
    if (swapIdx < 0 || swapIdx >= seg.nested.length) return items;
    const nested = [...seg.nested];
    [nested[nestedIdx], nested[swapIdx]] = [nested[swapIdx], nested[nestedIdx]];
    const segments = layout.segments.map((s, i) => (i === si ? { ...s, nested } : s));
    const reordered = flatIdsToFriendItems(
      friendListLayoutToFlatIds({ ...layout, segments }),
      byId
    );
    return mergeReorderedFriendItems(reordered, items);
  }

  return items;
}

export function friendItemToSettingsFormItem(item: ClubWebsiteFriendItem) {
  return {
    id: item.id,
    name: item.name,
    activated: item.activated,
    showInClubDashboardTopics: item.showInClubDashboardTopics,
    contentDisplayMode: item.contentDisplayMode,
    externalUrl: item.externalUrl,
    openInSamePage: item.openInSamePage,
    audience: item.audience,
  };
}

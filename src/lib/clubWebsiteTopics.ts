import { emptyClubWebsiteLangRecord } from '@/lib/clubWebsiteLanguages';
import { dispatchClubWebsiteSettingsChanged } from '@/lib/clubWebsiteSettingsEvents';
import {
  DEFAULT_TOPIC_SETTINGS_FIELDS,
  normalizeTopicSettingsFields,
  type ClubWebsiteTopicSettingsFields,
} from '@/lib/clubWebsiteTopicSettingsFields';

export type ClubWebsiteTopic = {
  id: string;
  /** Display name in sidebar. */
  name: string;
  /** When true, members see this topic (read-only). */
  activated: boolean;
  /** Blue header title text. */
  title: string;
  sectionName: string;
  bannerColor: string;
  titleColor: string;
  lastUpdate: string;
  contentsByLang: Record<string, string>;
  keywordsByLang: Record<string, string>;
} & ClubWebsiteTopicSettingsFields;

const STORAGE_PREFIX = 'club-website-topics';

export const DEFAULT_TOPIC_BANNER_COLOR = '#5b9bd5';
export const DEFAULT_TOPIC_TITLE_COLOR = '#ffffff';

export function createClubWebsiteTopic(name: string): ClubWebsiteTopic {
  const trimmed = name.trim();
  return {
    id: `topic-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    name: trimmed,
    activated: true,
    title: trimmed,
    sectionName: trimmed,
    bannerColor: DEFAULT_TOPIC_BANNER_COLOR,
    titleColor: DEFAULT_TOPIC_TITLE_COLOR,
    lastUpdate: '',
    contentsByLang: emptyClubWebsiteLangRecord(),
    keywordsByLang: emptyClubWebsiteLangRecord(),
    ...DEFAULT_TOPIC_SETTINGS_FIELDS,
  };
}

export function normalizeClubWebsiteTopic(raw: Partial<ClubWebsiteTopic> & { id: string; name: string }): ClubWebsiteTopic {
  const settings = normalizeTopicSettingsFields(raw);
  return {
    id: raw.id,
    name: raw.name,
    activated: raw.activated ?? true,
    title: raw.title ?? raw.name,
    sectionName: raw.sectionName ?? raw.name,
    bannerColor: raw.bannerColor ?? DEFAULT_TOPIC_BANNER_COLOR,
    titleColor: raw.titleColor ?? DEFAULT_TOPIC_TITLE_COLOR,
    lastUpdate: raw.lastUpdate ?? '',
    contentsByLang: raw.contentsByLang ?? emptyClubWebsiteLangRecord(),
    keywordsByLang: raw.keywordsByLang ?? emptyClubWebsiteLangRecord(),
    ...settings,
  };
}

export function isClubWebsiteTopicVisibleToMembers(topic: ClubWebsiteTopic): boolean {
  return topic.activated && topic.name.trim().length > 0;
}

export function filterClubWebsiteTopicsForMembers(topics: ClubWebsiteTopic[]): ClubWebsiteTopic[] {
  return topics.filter(isClubWebsiteTopicVisibleToMembers);
}

export function filterClubWebsiteTopicsForDashboard(topics: ClubWebsiteTopic[]): ClubWebsiteTopic[] {
  return filterClubWebsiteTopicsForMembers(topics).filter((t) => t.showInClubDashboardTopics);
}

export function topicToSettingsFormItem(topic: ClubWebsiteTopic) {
  return {
    id: topic.id,
    name: topic.name,
    activated: topic.activated,
    showInClubDashboardTopics: topic.showInClubDashboardTopics,
    contentDisplayMode: topic.contentDisplayMode,
    externalUrl: topic.externalUrl,
    openInSamePage: topic.openInSamePage,
    audience: topic.audience,
  };
}

export function clearClubWebsiteTopicContent(): Pick<
  ClubWebsiteTopic,
  'contentsByLang' | 'keywordsByLang' | 'lastUpdate'
> {
  return {
    contentsByLang: emptyClubWebsiteLangRecord(),
    keywordsByLang: emptyClubWebsiteLangRecord(),
    lastUpdate: '',
  };
}

function storageKey(clubId: string): string {
  return `${STORAGE_PREFIX}:${clubId}`;
}

function removedTestTopicsMigrationKey(clubId: string): string {
  return `${STORAGE_PREFIX}-removed:${clubId}:123-football`;
}

const REMOVED_TEST_TOPIC_NAMES = new Set(['123', 'football']);

function stripRemovedTestTopics(clubId: string, topics: ClubWebsiteTopic[]): ClubWebsiteTopic[] {
  if (typeof window === 'undefined' || !clubId) return topics;
  if (localStorage.getItem(removedTestTopicsMigrationKey(clubId))) return topics;

  const cleaned = topics.filter((topic) => !REMOVED_TEST_TOPIC_NAMES.has(topic.name.trim()));
  localStorage.setItem(removedTestTopicsMigrationKey(clubId), '1');
  if (cleaned.length !== topics.length) {
    localStorage.setItem(storageKey(clubId), JSON.stringify(cleaned));
    dispatchClubWebsiteSettingsChanged(clubId);
  }
  return cleaned;
}

export function loadClubWebsiteTopics(clubId: string): ClubWebsiteTopic[] {
  if (typeof window === 'undefined' || !clubId) return [];
  try {
    const raw = localStorage.getItem(storageKey(clubId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Partial<ClubWebsiteTopic>[];
    const topics = Array.isArray(parsed)
      ? parsed.map((t) => normalizeClubWebsiteTopic(t as ClubWebsiteTopic))
      : [];
    return stripRemovedTestTopics(clubId, topics);
  } catch {
    return [];
  }
}

export function saveClubWebsiteTopics(clubId: string, topics: ClubWebsiteTopic[]): void {
  if (typeof window === 'undefined' || !clubId) return;
  localStorage.setItem(storageKey(clubId), JSON.stringify(topics));
  dispatchClubWebsiteSettingsChanged(clubId);
}

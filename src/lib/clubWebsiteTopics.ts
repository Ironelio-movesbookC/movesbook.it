import { emptyClubWebsiteLangRecord } from '@/lib/clubWebsiteLanguages';

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
};

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
  };
}

export function isClubWebsiteTopicVisibleToMembers(topic: ClubWebsiteTopic): boolean {
  return topic.activated && topic.name.trim().length > 0;
}

export function filterClubWebsiteTopicsForMembers(topics: ClubWebsiteTopic[]): ClubWebsiteTopic[] {
  return topics.filter(isClubWebsiteTopicVisibleToMembers);
}

function storageKey(clubId: string): string {
  return `${STORAGE_PREFIX}:${clubId}`;
}

export function loadClubWebsiteTopics(clubId: string): ClubWebsiteTopic[] {
  if (typeof window === 'undefined' || !clubId) return [];
  try {
    const raw = localStorage.getItem(storageKey(clubId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ClubWebsiteTopic[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveClubWebsiteTopics(clubId: string, topics: ClubWebsiteTopic[]): void {
  if (typeof window === 'undefined' || !clubId) return;
  localStorage.setItem(storageKey(clubId), JSON.stringify(topics));
}

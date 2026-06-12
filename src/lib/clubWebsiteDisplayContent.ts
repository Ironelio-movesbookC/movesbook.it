import {
  filterClubWebsiteFriendItemsForMembers,
  type ClubWebsiteFriendItem,
} from '@/lib/clubWebsiteFriendList';
import {
  filterClubWebsiteTopicsForMembers,
  type ClubWebsiteTopic,
} from '@/lib/clubWebsiteTopics';

/** Legacy display preview — World Triathlon athlete profile (member-facing example). */
export const CLUB_WEBSITE_DISPLAY_EXAMPLE_SITE_URL =
  'https://www.triathlon.org/athletes/profile/704/gianfranco-coppa/athleteprofile';

export function topicHasHtmlContent(
  item: { contentsByLang: Record<string, string> },
  lang = 'en'
): boolean {
  const html = item.contentsByLang[lang] || item.contentsByLang.en || '';
  return html.trim().length > 0;
}

export function topicHasEmbedUrl(item: {
  contentDisplayMode: string;
  externalUrl: string;
}): boolean {
  return item.contentDisplayMode === 'link' && item.externalUrl.trim().length > 0;
}

export function findFirstMemberEmbedTopic(
  friendItems: ClubWebsiteFriendItem[],
  topics: ClubWebsiteTopic[]
): { url: string; title: string } | null {
  const visibleFriends = filterClubWebsiteFriendItemsForMembers(friendItems);
  for (const item of visibleFriends) {
    if (item.id === 'friends-root') continue;
    if (topicHasEmbedUrl(item)) {
      return { url: item.externalUrl.trim(), title: item.title };
    }
  }

  const visibleTopics = filterClubWebsiteTopicsForMembers(topics);
  for (const topic of visibleTopics) {
    if (topicHasEmbedUrl(topic)) {
      return { url: topic.externalUrl.trim(), title: topic.title };
    }
  }

  return null;
}

export type MemberDisplayEmbed = {
  url: string;
  title: string;
  isExample: boolean;
};

/** Resolve iframe URL for member display — configured topic first, else legacy demo site. */
export function resolveMemberDisplayEmbed(
  friendItems: ClubWebsiteFriendItem[],
  topics: ClubWebsiteTopic[],
  selectedTopicId: string,
  lang = 'en'
): MemberDisplayEmbed | null {
  const visibleFriends = filterClubWebsiteFriendItemsForMembers(friendItems);
  const visibleTopics = filterClubWebsiteTopicsForMembers(topics);

  const friendItem = visibleFriends.find((i) => i.id === selectedTopicId) ?? null;
  const customTopic = visibleTopics.find((tpc) => tpc.id === selectedTopicId) ?? null;

  const selected = friendItem ?? customTopic;
  if (selected) {
    if (topicHasEmbedUrl(selected)) {
      return {
        url: selected.externalUrl.trim(),
        title: selected.title,
        isExample: false,
      };
    }
    if (topicHasHtmlContent(selected, lang)) {
      return null;
    }
  }

  const configured = findFirstMemberEmbedTopic(friendItems, topics);
  if (configured) {
    return { ...configured, isExample: false };
  }

  return {
    url: CLUB_WEBSITE_DISPLAY_EXAMPLE_SITE_URL,
    title: '',
    isExample: true,
  };
}

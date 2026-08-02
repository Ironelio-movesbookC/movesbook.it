import type { ClubDashboardFriendTopicEntry } from '@/lib/clubWebsiteFriendList';
import type { ClubWebsiteFriendItem } from '@/lib/clubWebsiteFriendList';
import type { ClubWebsiteTopic } from '@/lib/clubWebsiteTopics';

/** Unified topic node for dashboard horizontal / scrollable displays. */
export type ClubDashboardTopicNode = {
  id: string;
  name: string;
  activated: boolean;
  item: ClubWebsiteFriendItem | ClubWebsiteTopic;
  subtopics: ClubDashboardTopicNode[];
};

export function buildClubDashboardTopicNodes(
  friendTopics: ClubDashboardFriendTopicEntry[],
  customTopics: ClubWebsiteTopic[],
): ClubDashboardTopicNode[] {
  const friendNodes: ClubDashboardTopicNode[] = friendTopics.map((topic) => ({
    id: topic.id,
    name: topic.name,
    activated: topic.item.activated,
    item: topic.item,
    subtopics: topic.subtopics.map((sub) => ({
      id: sub.id,
      name: sub.name,
      activated: sub.item.activated,
      item: sub.item,
      subtopics: [],
    })),
  }));

  const roots = customTopics.filter((topic) => !topic.parentId);
  const customNodes: ClubDashboardTopicNode[] = roots.map((topic) => ({
    id: topic.id,
    name: topic.name,
    activated: topic.activated,
    item: topic,
    subtopics: customTopics
      .filter((child) => child.parentId === topic.id)
      .map((child) => ({
        id: child.id,
        name: child.name,
        activated: child.activated,
        item: child,
        subtopics: [],
      })),
  }));

  return [...friendNodes, ...customNodes];
}

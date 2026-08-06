'use client';

import { useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { useClubWebsiteFriendList } from '@/hooks/useClubWebsiteFriendList';
import { useClubWebsiteTopics } from '@/hooks/useClubWebsiteTopics';
import ClubWebsiteMemberContentPanel from '@/components/club/websiteSettings/ClubWebsiteMemberContentPanel';

export default function ClubTopicMemberPanel({
  clubId,
  topicId,
  topicLabel,
  clubDisplayName = '',
  compact = false,
}: {
  clubId: string;
  topicId: string;
  topicLabel?: string;
  clubDisplayName?: string;
  /** Tighter layout when embedded in the club dashboard main column. */
  compact?: boolean;
}) {
  const { items: friendItems, hydrated: friendsHydrated } = useClubWebsiteFriendList(clubId);
  const { topics: customTopics, hydrated: topicsHydrated } = useClubWebsiteTopics(clubId);

  const resolvedLabel = useMemo(() => {
    if (topicLabel?.trim()) return topicLabel.trim();
    const friend = friendItems.find((i) => i.id === topicId);
    if (friend) return friend.name || friend.title;
    const topic = customTopics.find((tpc) => tpc.id === topicId);
    return topic?.name ?? topic?.title ?? topicId;
  }, [topicLabel, friendItems, customTopics, topicId]);

  const loading = !friendsHydrated || !topicsHydrated;

  if (loading && friendItems.length === 0 && customTopics.length === 0) {
    return (
      <div className="flex min-h-[240px] flex-1 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-teal-700" />
      </div>
    );
  }

  return (
    <div className={`flex min-h-0 flex-1 flex-col ${compact ? '' : 'border border-zinc-300 bg-[#f0f0f0]'}`}>
      <ClubWebsiteMemberContentPanel
        selectedTopicId={topicId}
        selectedTopicLabel={resolvedLabel}
        friendItems={friendItems}
        customTopics={customTopics}
        clubDisplayName={clubDisplayName}
        clubId={clubId}
        displayMode
      />
    </div>
  );
}

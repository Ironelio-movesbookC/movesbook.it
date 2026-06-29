'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  filterClubWebsiteFriendItemsForMembers,
  loadClubWebsiteFriendItems,
  type ClubWebsiteFriendItem,
} from '@/lib/clubWebsiteFriendList';
import {
  filterClubWebsiteTopicsForMembers,
  loadClubWebsiteTopics,
  type ClubWebsiteTopic,
} from '@/lib/clubWebsiteTopics';
import {
  findFirstMemberEmbedTopic,
  topicHasEmbedUrl,
  topicHasHtmlContent,
} from '@/lib/clubWebsiteDisplayContent';
import ClubWebsiteSettingsSidebar from '@/components/club/websiteSettings/ClubWebsiteSettingsSidebar';
import ClubWebsiteMemberContentPanel from '@/components/club/websiteSettings/ClubWebsiteMemberContentPanel';
import RightSidebar from '@/components/dashboard/RightSidebar';

function pickInitialSelection(
  friendItems: ClubWebsiteFriendItem[],
  topics: ClubWebsiteTopic[]
): { id: string; label: string } {
  const visibleFriends = filterClubWebsiteFriendItemsForMembers(friendItems);
  const linkTopic = visibleFriends.find(
    (i) => i.id !== 'friends-root' && topicHasEmbedUrl(i)
  );
  if (linkTopic) return { id: linkTopic.id, label: linkTopic.name };

  const withHtml = visibleFriends.find(
    (i) => i.id !== 'friends-root' && topicHasHtmlContent(i)
  );
  if (withHtml) return { id: withHtml.id, label: withHtml.name };

  const visibleTopics = filterClubWebsiteTopicsForMembers(topics);
  const topicLink = visibleTopics.find((tpc) => topicHasEmbedUrl(tpc));
  if (topicLink) return { id: topicLink.id, label: topicLink.name };

  const topicHtml = visibleTopics.find((tpc) => topicHasHtmlContent(tpc));
  if (topicHtml) return { id: topicHtml.id, label: topicHtml.name };

  if (findFirstMemberEmbedTopic(friendItems, topics)) {
    return { id: 'bacheca', label: 'Bacheca' };
  }

  if (visibleFriends.some((i) => i.id === 'friends-root')) {
    return { id: 'friends-root', label: 'List of friends' };
  }

  return { id: 'bacheca', label: 'Bacheca' };
}

export default function ClubWebsiteMemberDisplay({
  clubId: clubIdProp,
  clubDisplayName,
  adminDisplayName,
  clubType,
  adminCountry,
  adminLocality,
  logoImageUrl,
}: {
  clubId?: string | null;
  clubDisplayName: string;
  adminDisplayName: string;
  clubType?: string | null;
  adminCountry?: string | null;
  adminLocality?: string | null;
  logoImageUrl?: string | null;
}) {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const queryClubId = searchParams?.get('clubId');
  const queryTopicId = searchParams?.get('topic');
  const clubId = clubIdProp ?? queryClubId ?? null;

  const [friendItems, setFriendItems] = useState<ClubWebsiteFriendItem[]>([]);
  const [customTopics, setCustomTopics] = useState<ClubWebsiteTopic[]>([]);
  const [selectedTopicId, setSelectedTopicId] = useState('bacheca');
  const [selectedTopicLabel, setSelectedTopicLabel] = useState('');

  useEffect(() => {
    if (!clubId) return;
    const items = loadClubWebsiteFriendItems(clubId);
    const topics = loadClubWebsiteTopics(clubId);
    setFriendItems(items);
    setCustomTopics(topics);

    if (queryTopicId) {
      setSelectedTopicId(queryTopicId);
      const friend = items.find((i) => i.id === queryTopicId);
      const topic = topics.find((tpc) => tpc.id === queryTopicId);
      setSelectedTopicLabel(friend?.name ?? topic?.name ?? queryTopicId);
      return;
    }

    const initial = pickInitialSelection(items, topics);
    setSelectedTopicId(initial.id);
    setSelectedTopicLabel(initial.label);
  }, [clubId, queryTopicId]);

  const handleSelectTopic = useCallback((id: string, label: string) => {
    setSelectedTopicId(id);
    setSelectedTopicLabel(label);
  }, []);

  if (!clubId) {
    return (
      <p className="py-12 text-center text-sm text-zinc-600">
        {t('club_website_display_no_club')}
      </p>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 w-full gap-0 border-y border-zinc-400 bg-zinc-200 shadow-sm">
      <ClubWebsiteSettingsSidebar
        displayMode
        clubId={clubId}
        adminDisplayName={adminDisplayName}
        clubDisplayName={clubDisplayName}
        clubType={clubType}
        adminCountry={adminCountry}
        adminLocality={adminLocality}
        logoImageUrl={logoImageUrl}
        selectedTopicId={selectedTopicId}
        onSelectTopic={handleSelectTopic}
      />

      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
        <ClubWebsiteMemberContentPanel
          selectedTopicId={selectedTopicId}
          selectedTopicLabel={selectedTopicLabel}
          friendItems={friendItems}
          customTopics={customTopics}
          clubDisplayName={clubDisplayName}
          clubId={clubId}
          displayMode
          showExampleNote
        />
      </div>

      <div className="hidden w-80 shrink-0 lg:block">
        <RightSidebar
          context="my-club"
          onAddMember={() => {}}
          isClubAccount
          athleteMyClubRightSidebar
        />
      </div>
    </div>
  );
}

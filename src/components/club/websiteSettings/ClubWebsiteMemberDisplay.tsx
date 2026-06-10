'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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
import ClubWebsiteSettingsSidebar from '@/components/club/websiteSettings/ClubWebsiteSettingsSidebar';
import ClubWebsiteMemberContentPanel from '@/components/club/websiteSettings/ClubWebsiteMemberContentPanel';
import RightSidebar from '@/components/dashboard/RightSidebar';

function pickInitialSelection(
  friendItems: ClubWebsiteFriendItem[],
  topics: ClubWebsiteTopic[]
): { id: string; label: string } {
  const visibleFriends = filterClubWebsiteFriendItemsForMembers(friendItems);
  const linkInPage = visibleFriends.find(
    (i) =>
      i.id !== 'friends-root' &&
      i.contentDisplayMode === 'link' &&
      i.externalUrl.trim() &&
      i.openInSamePage
  );
  if (linkInPage) return { id: linkInPage.id, label: linkInPage.name };

  const withHtml = visibleFriends.find(
    (i) =>
      i.id !== 'friends-root' &&
      (i.contentsByLang.en?.trim() || Object.values(i.contentsByLang).some((v) => v?.trim()))
  );
  if (withHtml) return { id: withHtml.id, label: withHtml.name };

  const visibleTopics = filterClubWebsiteTopicsForMembers(topics);
  if (visibleTopics[0]) return { id: visibleTopics[0].id, label: visibleTopics[0].name };

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

  const memberTopics = useMemo(
    () => filterClubWebsiteTopicsForMembers(customTopics),
    [customTopics]
  );

  const handleSelectTopic = useCallback((id: string, label: string) => {
    setSelectedTopicId(id);
    setSelectedTopicLabel(label);
  }, []);

  const noop = useCallback(() => {}, []);

  if (!clubId) {
    return (
      <p className="py-12 text-center text-sm text-zinc-600">
        {t('club_website_display_no_club')}
      </p>
    );
  }

  return (
    <div className="flex min-h-0 w-full flex-1 gap-0 border border-zinc-400 bg-zinc-200 shadow-sm">
      <ClubWebsiteSettingsSidebar
        displayMode
        adminDisplayName={adminDisplayName}
        clubDisplayName={clubDisplayName}
        clubType={clubType}
        adminCountry={adminCountry}
        adminLocality={adminLocality}
        logoImageUrl={logoImageUrl}
        selectedTopicId={selectedTopicId}
        customTopics={memberTopics}
        friendListItems={friendItems}
        friendListAdminMode={false}
        onSelectTopic={handleSelectTopic}
        onSelectCustomTopic={(id) => {
          const topic = memberTopics.find((tpc) => tpc.id === id);
          handleSelectTopic(id, topic?.name ?? id);
        }}
        onToggleCustomTopicActivated={noop}
        onFriendToggleActivated={noop}
        onFriendDelete={noop}
        onFriendMove={noop}
        onFriendUpdateItem={noop}
        onFriendEditContent={handleSelectTopic}
        onFriendAddSubtopic={noop}
      />

      <ClubWebsiteMemberContentPanel
        selectedTopicId={selectedTopicId}
        selectedTopicLabel={selectedTopicLabel}
        friendItems={friendItems}
        customTopics={customTopics}
        clubDisplayName={clubDisplayName}
      />

      <div className="hidden w-72 shrink-0 xl:block">
        <RightSidebar
          context="my-club"
          onAddMember={() => {}}
          athleteMyClubRightSidebar
        />
      </div>
    </div>
  );
}

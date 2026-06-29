'use client';

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react';
import { useClubWebsiteTopics } from '@/hooks/useClubWebsiteTopics';
import { useClubWebsiteFriendList } from '@/hooks/useClubWebsiteFriendList';
import { useClubWebsiteTopicsSectionOrder } from '@/hooks/useClubWebsiteTopicsSectionOrder';
import { clubWebsiteTopicEditorUrl } from '@/lib/clubWebsiteSettingsPaths';
import ClubWebsiteAddTopicModal from '@/components/club/websiteSettings/ClubWebsiteAddTopicModal';

export type ClubWebsiteSettingsSidebarContextValue = {
  clubId: string | undefined;
  addTopicOpen: boolean;
  setAddTopicOpen: (open: boolean) => void;
  topics: ReturnType<typeof useClubWebsiteTopics>;
  friends: ReturnType<typeof useClubWebsiteFriendList>;
  sectionOrder: ReturnType<typeof useClubWebsiteTopicsSectionOrder>['sectionOrder'];
  moveSectionEntry: ReturnType<typeof useClubWebsiteTopicsSectionOrder>['moveSectionEntry'];
};

const ClubWebsiteSettingsSidebarContext =
  createContext<ClubWebsiteSettingsSidebarContextValue | null>(null);

export function useClubWebsiteSettingsSidebar() {
  const ctx = useContext(ClubWebsiteSettingsSidebarContext);
  if (!ctx) {
    throw new Error(
      'useClubWebsiteSettingsSidebar must be used within ClubWebsiteSettingsSidebarProvider',
    );
  }
  return ctx;
}

/** Safe when sidebar is used in display-only mode without the provider. */
export function useOptionalClubWebsiteSettingsSidebar() {
  return useContext(ClubWebsiteSettingsSidebarContext);
}

export function ClubWebsiteSettingsSidebarProvider({
  clubId,
  children,
}: {
  clubId: string | undefined;
  children: ReactNode;
}) {
  const topics = useClubWebsiteTopics(clubId);
  const friends = useClubWebsiteFriendList(clubId);
  const [addTopicOpen, setAddTopicOpen] = useState(false);

  const { sectionOrder, moveSectionEntry } = useClubWebsiteTopicsSectionOrder(
    clubId,
    topics.topics,
    friends.items,
    topics.moveTopic,
    friends.moveItem,
  );

  const value: ClubWebsiteSettingsSidebarContextValue = {
    clubId,
    topics,
    friends,
    addTopicOpen,
    setAddTopicOpen,
    sectionOrder,
    moveSectionEntry,
  };

  const handleCreateTopic = useCallback(
    (name: string) => {
      const created = topics.addTopic(name);
      setAddTopicOpen(false);
      if (created) {
        window.open(clubWebsiteTopicEditorUrl(created.id), '_blank', 'noopener,noreferrer');
      }
    },
    [topics],
  );

  return (
    <ClubWebsiteSettingsSidebarContext.Provider value={value}>
      {children}
      <ClubWebsiteAddTopicModal
        open={addTopicOpen}
        onClose={() => setAddTopicOpen(false)}
        onCreate={handleCreateTopic}
      />
    </ClubWebsiteSettingsSidebarContext.Provider>
  );
}

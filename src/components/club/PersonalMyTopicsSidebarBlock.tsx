'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, MessagesSquare, Settings } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import ClubDashboardTopicsList from '@/components/club/ClubDashboardTopicsList';
import {
  CLUB_DEMO_FRIEND_TOPIC_IDS,
  getClubDashboardFriendTopics,
  sanitizePersonalWebsiteFriendItems,
} from '@/lib/clubWebsiteFriendList';
import { CLUB_WEBSITE_SETTINGS_CHANGED_EVENT } from '@/lib/clubWebsiteSettingsEvents';
import {
  CLUB_WEBSITE_SETTINGS_INDEX_PATH,
  clubWebsiteDisplayTopicUrl,
} from '@/lib/clubWebsiteSettingsPaths';
import { filterClubWebsiteTopicsForMembers } from '@/lib/clubWebsiteTopics';
import {
  PERSONAL_WEBSITE_TOPICS_PATH,
  personalWebsiteTopicDisplayUrl,
} from '@/lib/personalWebsiteSettingsPaths';
import { topicHasEmbedUrl, topicHasHtmlContent } from '@/lib/clubWebsiteDisplayContent';
import { writeClubWorkspaceTab } from '@/lib/club/clubWorkspaceTab';
import { consumeOpenPersonalTopicsSection } from '@/lib/club/clubTopicsNavigation';
import { useClubWebsiteFriendList } from '@/hooks/useClubWebsiteFriendList';
import { useClubWebsiteTopics } from '@/hooks/useClubWebsiteTopics';
import { usePersonalWebsiteFriendList } from '@/hooks/usePersonalWebsiteFriendList';

function isEmptyPersonalStarterTopic(entry: {
  id: string;
  subtopics: unknown[];
  item: Parameters<typeof topicHasHtmlContent>[0] & Parameters<typeof topicHasEmbedUrl>[0];
}): boolean {
  return (
    entry.id === 'friends-root' &&
    entry.subtopics.length === 0 &&
    !topicHasHtmlContent(entry.item) &&
    !topicHasEmbedUrl(entry.item)
  );
}

export default function PersonalMyTopicsSidebarBlock({
  userId,
  clubId,
  canManage = false,
}: {
  userId?: string;
  /** When set (club dashboard), show topics from club website settings. */
  clubId?: string;
  /** Entity admins (coach, team, group, club) may edit; members see read-only. */
  canManage?: boolean;
}) {
  const { t } = useLanguage();
  const router = useRouter();
  const [displayOpen, setDisplayOpen] = useState(true);
  const isClubMode = Boolean(clubId);
  const personalOwnerId = canManage && !isClubMode ? userId : undefined;

  useEffect(() => {
    if (isClubMode) return;
    if (consumeOpenPersonalTopicsSection()) {
      setDisplayOpen(true);
    }
  }, [isClubMode, userId]);

  const {
    items: clubFriendItems,
    reload: reloadClubFriendItems,
  } = useClubWebsiteFriendList(isClubMode ? clubId : undefined);
  const {
    topics: clubTopics,
    reload: reloadClubTopics,
  } = useClubWebsiteTopics(isClubMode ? clubId : undefined);
  const {
    items: personalFriendItems,
    persist: persistPersonalFriendItems,
    reload: reloadPersonalFriendItems,
  } = usePersonalWebsiteFriendList(personalOwnerId);

  // One-shot cleanup: strip club demo topics that leaked into this owner's personal site.
  useEffect(() => {
    if (!personalOwnerId || personalFriendItems.length === 0) return;
    const sanitized = sanitizePersonalWebsiteFriendItems(personalFriendItems);
    const changed =
      sanitized.length !== personalFriendItems.length ||
      sanitized.some((item, index) => item.id !== personalFriendItems[index]?.id);
    if (changed) persistPersonalFriendItems(sanitized);
  }, [personalOwnerId, personalFriendItems, persistPersonalFriendItems]);

  const clubFriendTopics = useMemo(
    () => (isClubMode ? getClubDashboardFriendTopics(clubFriendItems) : []),
    [isClubMode, clubFriendItems],
  );
  const clubCustomTopics = useMemo(
    () => (isClubMode ? filterClubWebsiteTopicsForMembers(clubTopics) : []),
    [isClubMode, clubTopics],
  );
  const personalTopics = useMemo(() => {
    if (isClubMode || !userId) return [];
    const sanitized = sanitizePersonalWebsiteFriendItems(personalFriendItems);
    const topics = getClubDashboardFriendTopics(sanitized).filter(
      (entry) => !CLUB_DEMO_FRIEND_TOPIC_IDS.has(entry.id)
    );
    // Empty personal starter (friends-root only, no content) → show empty state.
    if (topics.length === 1 && isEmptyPersonalStarterTopic(topics[0]!)) {
      return [];
    }
    if (topics.length === 0) return [];
    return topics;
  }, [isClubMode, userId, personalFriendItems]);

  const reload = useCallback(() => {
    if (isClubMode) {
      reloadClubFriendItems();
      reloadClubTopics();
      return;
    }
    reloadPersonalFriendItems();
  }, [isClubMode, reloadClubFriendItems, reloadClubTopics, reloadPersonalFriendItems]);

  useEffect(() => {
    reload();
  }, [userId, clubId, reload]);

  useEffect(() => {
    const onFocus = () => reload();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [reload]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (isClubMode) {
        if (
          e.key?.startsWith('club-website-friend-list:') ||
          e.key?.startsWith('club-website-topics:')
        ) {
          reload();
        }
        return;
      }
      if (e.key?.startsWith('personal-website-friend-list:')) reload();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [isClubMode, reload]);

  useEffect(() => {
    if (!isClubMode || !clubId) return;
    const onSettingsChanged = (e: Event) => {
      const detail = (e as CustomEvent<{ clubId?: string }>).detail;
      if (!detail?.clubId || detail.clubId === clubId) reload();
    };
    window.addEventListener(CLUB_WEBSITE_SETTINGS_CHANGED_EVENT, onSettingsChanged);
    return () => window.removeEventListener(CLUB_WEBSITE_SETTINGS_CHANGED_EVENT, onSettingsChanged);
  }, [isClubMode, clubId, reload]);

  const hasTopics = isClubMode
    ? clubFriendTopics.length > 0 || clubCustomTopics.length > 0
    : personalTopics.length > 0;

  const toggleDisplay = () => {
    setDisplayOpen((open) => {
      const next = !open;
      if (next) reload();
      return next;
    });
  };

  const settingsPath = isClubMode ? CLUB_WEBSITE_SETTINGS_INDEX_PATH : PERSONAL_WEBSITE_TOPICS_PATH;
  const settingsAria = isClubMode
    ? t('sidebar_club_topics_settings_aria')
    : t('sidebar_my_topics_settings_aria');

  const openSettingsInCurrentSection = useCallback(() => {
    writeClubWorkspaceTab(isClubMode ? 'my-entity' : 'my-page');
    if (isClubMode && clubId && typeof window !== 'undefined') {
      localStorage.setItem('selectedClub', clubId);
    }
    router.push(settingsPath);
  }, [isClubMode, clubId, router, settingsPath]);

  const openClubTopicPanel = useCallback(
    (topicId: string) => {
      if (!clubId) return;
      writeClubWorkspaceTab('my-entity');
      if (typeof window !== 'undefined') {
        localStorage.setItem('selectedClub', clubId);
      }
      // Member display page — never the settings editor.
      router.push(clubWebsiteDisplayTopicUrl(clubId, topicId));
    },
    [clubId, router],
  );

  /** Stay on My Page when opening a personal topic/subtopic for display. */
  const openPersonalTopicDisplay = useCallback(
    (topicId: string) => {
      writeClubWorkspaceTab('my-page');
      router.push(personalWebsiteTopicDisplayUrl(topicId));
    },
    [router],
  );

  return (
    <div className="flex min-h-[44px] w-full flex-col border-b border-black/25">
      <div className="flex w-full items-stretch">
        <div className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2.5 text-white">
          <MessagesSquare className="h-4 w-4 shrink-0 opacity-90" />
          <span className="truncate">{t('sidebar_my_topics')}</span>
        </div>
        {canManage ? (
          <button
            type="button"
            title={settingsAria}
            aria-label={settingsAria}
            onClick={openSettingsInCurrentSection}
            className="flex shrink-0 items-center border-l border-black/25 px-3 text-gray-300 transition-colors hover:bg-zinc-700/90"
          >
            <Settings className="h-4 w-4" />
          </button>
        ) : null}
        <button
          type="button"
          onClick={toggleDisplay}
          aria-expanded={displayOpen}
          aria-label={displayOpen ? t('collapse') : t('expand')}
          className="flex shrink-0 items-center gap-1 border-l border-black/25 px-2 text-[11px] text-gray-300 transition-colors hover:bg-zinc-700/90"
        >
          <span className="hidden sm:inline">{t('sidebar_display')}</span>
          <ChevronDown
            className={`h-4 w-4 transition-transform duration-200 ${displayOpen ? 'rotate-180' : ''}`}
          />
        </button>
      </div>
      {displayOpen && hasTopics ? (
        isClubMode ? (
          <ClubDashboardTopicsList
            clubId={clubId}
            friendTopics={clubFriendTopics}
            customTopics={clubCustomTopics}
            onViewTopicContent={openClubTopicPanel}
          />
        ) : (
          <ClubDashboardTopicsList
            friendTopics={personalTopics}
            customTopics={[]}
            onViewTopicContent={openPersonalTopicDisplay}
          />
        )
      ) : displayOpen && !hasTopics ? (
        <p className="border-t border-black/25 bg-[#252525] px-3 py-2.5 text-[11px] leading-snug text-white/60">
          {t('club_dashboard_topics_empty')}
        </p>
      ) : null}
    </div>
  );
}

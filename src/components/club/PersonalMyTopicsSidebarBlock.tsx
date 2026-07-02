'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, MessagesSquare, Settings } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import ClubDashboardTopicsList from '@/components/club/ClubDashboardTopicsList';
import { getClubDashboardFriendTopics } from '@/lib/clubWebsiteFriendList';
import { CLUB_WEBSITE_SETTINGS_CHANGED_EVENT } from '@/lib/clubWebsiteSettingsEvents';
import {
  CLUB_WEBSITE_SETTINGS_INDEX_PATH,
  clubTopicDashboardUrl,
} from '@/lib/clubWebsiteSettingsPaths';
import { filterClubWebsiteTopicsForMembers } from '@/lib/clubWebsiteTopics';
import {
  PERSONAL_WEBSITE_TOPICS_PATH,
  personalWebsiteTopicDisplayUrl,
} from '@/lib/personalWebsiteSettingsPaths';
import { writeClubWorkspaceTab } from '@/lib/club/clubWorkspaceTab';
import { useClubWebsiteFriendList } from '@/hooks/useClubWebsiteFriendList';
import { useClubWebsiteTopics } from '@/hooks/useClubWebsiteTopics';
import { usePersonalWebsiteFriendList } from '@/hooks/usePersonalWebsiteFriendList';

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

  const {
    items: clubFriendItems,
    reload: reloadClubFriendItems,
  } = useClubWebsiteFriendList(clubId);
  const {
    topics: clubTopics,
    reload: reloadClubTopics,
  } = useClubWebsiteTopics(clubId);
  const {
    items: personalFriendItems,
    reload: reloadPersonalFriendItems,
  } = usePersonalWebsiteFriendList(canManage && !isClubMode ? userId : undefined);

  const clubFriendTopics = useMemo(
    () => (isClubMode ? getClubDashboardFriendTopics(clubFriendItems) : []),
    [isClubMode, clubFriendItems],
  );
  const clubCustomTopics = useMemo(
    () => (isClubMode ? filterClubWebsiteTopicsForMembers(clubTopics) : []),
    [isClubMode, clubTopics],
  );
  const personalTopics = useMemo(
    () =>
      !isClubMode && userId ? getClubDashboardFriendTopics(personalFriendItems) : [],
    [isClubMode, userId, personalFriendItems],
  );

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

  const openClubTopicPanel = useCallback(
    (topicId: string) => {
      if (!clubId) return;
      writeClubWorkspaceTab('my-entity');
      if (typeof window !== 'undefined') {
        localStorage.setItem('selectedClub', clubId);
      }
      router.push(clubTopicDashboardUrl(clubId, topicId));
    },
    [clubId, router],
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
            onClick={() => {
              window.open(settingsPath, '_blank', 'noopener,noreferrer');
            }}
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
            topicHrefBuilder={personalWebsiteTopicDisplayUrl}
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

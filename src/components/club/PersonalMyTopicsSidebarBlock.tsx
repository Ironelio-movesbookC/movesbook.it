'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, MessagesSquare, Settings } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import ClubDashboardTopicsList from '@/components/club/ClubDashboardTopicsList';
import {
  getClubDashboardFriendTopics,
  loadClubWebsiteFriendItems,
  loadWebsiteFriendItems,
  type ClubDashboardFriendTopicEntry,
} from '@/lib/clubWebsiteFriendList';
import { CLUB_WEBSITE_SETTINGS_CHANGED_EVENT } from '@/lib/clubWebsiteSettingsEvents';
import { CLUB_WEBSITE_SETTINGS_INDEX_PATH } from '@/lib/clubWebsiteSettingsPaths';
import {
  filterClubWebsiteTopicsForMembers,
  loadClubWebsiteTopics,
} from '@/lib/clubWebsiteTopics';
import { PERSONAL_WEBSITE_TOPICS_PATH, personalWebsiteTopicDisplayUrl } from '@/lib/personalWebsiteSettingsPaths';
import {
  LEGACY_STATUS_OFF,
  LEGACY_STATUS_ON,
} from '@/components/club/websiteSettings/clubWebsiteSettingsSidebarData';

function StatusSquare({ on }: { on: boolean }) {
  return (
    <span
      className="inline-block shrink-0 rounded-none border border-zinc-300/90"
      style={{
        width: 11,
        height: 11,
        minWidth: 11,
        minHeight: 11,
        backgroundColor: on ? LEGACY_STATUS_ON : LEGACY_STATUS_OFF,
      }}
      aria-hidden
    />
  );
}

function ExpandChevron({
  open,
  onToggle,
  ariaLabel,
}: {
  open: boolean;
  onToggle: () => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onToggle();
      }}
      className="flex h-7 w-7 shrink-0 items-center justify-center text-white/90 hover:bg-white/10"
      aria-expanded={open}
      aria-label={ariaLabel}
    >
      <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
    </button>
  );
}

function PersonalTopicRow({
  entry,
  nested = false,
  showLink,
  expandControl,
}: {
  entry: ClubDashboardFriendTopicEntry;
  nested?: boolean;
  showLink: boolean;
  expandControl?: { open: boolean; onToggle: () => void; ariaLabel: string };
}) {
  const href = personalWebsiteTopicDisplayUrl(entry.id);
  const rowClass = `flex min-h-[36px] w-full items-center gap-2 border-b border-black/25 py-2 text-left text-sm transition-colors hover:bg-zinc-700/90 ${
    nested ? 'pl-8 pr-3' : 'px-3'
  } text-white`;

  const label = (
    <>
      <MessagesSquare className={`shrink-0 opacity-90 ${nested ? 'h-3.5 w-3.5' : 'h-4 w-4'}`} />
      <span className="min-w-0 flex-1 truncate">{entry.name}</span>
    </>
  );

  const labelClass = 'flex min-w-0 flex-1 items-center gap-2';

  return (
    <div className={`${rowClass} ${showLink ? '' : 'text-white/90'}`}>
      {showLink ? (
        <Link href={href} className={`${labelClass} text-white no-underline hover:underline`}>
          {label}
        </Link>
      ) : (
        <div className={labelClass}>{label}</div>
      )}
      {expandControl ? (
        <ExpandChevron
          open={expandControl.open}
          onToggle={expandControl.onToggle}
          ariaLabel={expandControl.ariaLabel}
        />
      ) : null}
      <StatusSquare on={entry.item.activated} />
    </div>
  );
}

export default function PersonalMyTopicsSidebarBlock({
  userId,
  clubId,
}: {
  userId?: string;
  /** When set (club dashboard), show topics from club website settings. */
  clubId?: string;
}) {
  const { t } = useLanguage();
  const [displayOpen, setDisplayOpen] = useState(true);
  const [segmentOpen, setSegmentOpen] = useState<Record<string, boolean>>({});
  const [refreshKey, setRefreshKey] = useState(0);
  const isClubMode = Boolean(clubId);

  const personalTopics = useMemo(() => {
    if (isClubMode || !userId) return [];
    return getClubDashboardFriendTopics(loadWebsiteFriendItems('personal', userId));
  }, [isClubMode, userId, refreshKey]);

  const clubFriendTopics = useMemo(() => {
    if (!isClubMode || !clubId) return [];
    return getClubDashboardFriendTopics(loadClubWebsiteFriendItems(clubId));
  }, [isClubMode, clubId, refreshKey]);

  const clubCustomTopics = useMemo(() => {
    if (!isClubMode || !clubId) return [];
    return filterClubWebsiteTopicsForMembers(loadClubWebsiteTopics(clubId));
  }, [isClubMode, clubId, refreshKey]);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    refresh();
  }, [userId, clubId, refresh]);

  useEffect(() => {
    const onFocus = () => refresh();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [refresh]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (isClubMode) {
        if (
          e.key?.startsWith('club-website-friend-list:') ||
          e.key?.startsWith('club-website-topics:')
        ) {
          refresh();
        }
        return;
      }
      if (e.key?.startsWith('personal-website-friend-list:')) refresh();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [isClubMode, refresh]);

  useEffect(() => {
    if (!isClubMode || !clubId) return;
    const onSettingsChanged = (e: Event) => {
      const detail = (e as CustomEvent<{ clubId?: string }>).detail;
      if (!detail?.clubId || detail.clubId === clubId) refresh();
    };
    window.addEventListener(CLUB_WEBSITE_SETTINGS_CHANGED_EVENT, onSettingsChanged);
    return () => window.removeEventListener(CLUB_WEBSITE_SETTINGS_CHANGED_EVENT, onSettingsChanged);
  }, [isClubMode, clubId, refresh]);

  const hasTopics = isClubMode
    ? clubFriendTopics.length > 0 || clubCustomTopics.length > 0
    : personalTopics.length > 0;

  const toggleDisplay = () => {
    setDisplayOpen((open) => {
      const next = !open;
      if (next) refresh();
      return next;
    });
  };

  const toggleSegment = (topicId: string) => {
    setSegmentOpen((prev) => ({ ...prev, [topicId]: !(prev[topicId] ?? true) }));
  };

  const settingsPath = isClubMode ? CLUB_WEBSITE_SETTINGS_INDEX_PATH : PERSONAL_WEBSITE_TOPICS_PATH;
  const settingsAria = isClubMode
    ? t('sidebar_club_topics_settings_aria')
    : t('sidebar_my_topics_settings_aria');

  return (
    <div className="flex min-h-[44px] w-full flex-col border-b border-black/25">
      <div className="flex w-full items-stretch">
        <div className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2.5 text-white">
          <MessagesSquare className="h-4 w-4 shrink-0 opacity-90" />
          <span className="truncate">{t('sidebar_my_topics')}</span>
        </div>
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
          />
        ) : (
          <div className="border-t border-black/25 bg-[#252525]">
            {personalTopics.map((topic) => {
              const hasNested = topic.subtopics.length > 0;
              const open = segmentOpen[topic.id] ?? true;
              const showTopicLink = topic.item.showInClubDashboardTopics;
              return (
                <div key={topic.id}>
                  <PersonalTopicRow
                    entry={topic}
                    showLink={showTopicLink}
                    expandControl={
                      hasNested
                        ? {
                            open,
                            onToggle: () => toggleSegment(topic.id),
                            ariaLabel: open ? t('collapse') : t('expand'),
                          }
                        : undefined
                    }
                  />
                  {hasNested && open
                    ? topic.subtopics.map((sub) => (
                        <PersonalTopicRow
                          key={sub.id}
                          entry={sub}
                          nested
                          showLink={sub.item.showInClubDashboardTopics}
                        />
                      ))
                    : null}
                </div>
              );
            })}
          </div>
        )
      ) : displayOpen && !hasTopics ? (
        <p className="border-t border-black/25 bg-[#252525] px-3 py-2.5 text-[11px] leading-snug text-white/60">
          {t('club_dashboard_topics_empty')}
        </p>
      ) : null}
    </div>
  );
}

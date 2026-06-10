'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, MessagesSquare, Settings } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  getClubDashboardFriendTopics,
  loadWebsiteFriendItems,
  type ClubDashboardFriendTopicEntry,
} from '@/lib/clubWebsiteFriendList';
import { PERSONAL_WEBSITE_TOPICS_PATH, personalWebsiteTopicDisplayUrl } from '@/lib/personalWebsiteSettingsPaths';
import {
  LEGACY_STATUS_OFF,
  LEGACY_STATUS_ON,
} from '@/components/club/websiteSettings/clubWebsiteSettingsSidebarData';

function StatusSquare({ on }: { on: boolean }) {
  return (
    <span
      className="inline-block h-3 w-3 shrink-0 border border-black/30"
      style={{ backgroundColor: on ? LEGACY_STATUS_ON : LEGACY_STATUS_OFF }}
      aria-hidden
    />
  );
}

function TopicRow({
  entry,
  nested = false,
  showLink,
}: {
  entry: ClubDashboardFriendTopicEntry;
  nested?: boolean;
  showLink: boolean;
}) {
  const href = personalWebsiteTopicDisplayUrl(entry.id);
  const inner = (
    <>
      <MessagesSquare className={`shrink-0 opacity-90 ${nested ? 'h-3.5 w-3.5' : 'h-4 w-4'}`} />
      <span className="min-w-0 flex-1 truncate">{entry.name}</span>
      <StatusSquare on={entry.item.activated} />
    </>
  );

  if (showLink) {
    return (
      <Link
        href={href}
        className={`flex min-h-[36px] w-full items-center gap-2 border-b border-black/25 px-3 py-2 text-left text-sm text-white no-underline transition-colors hover:bg-zinc-700/90 ${
          nested ? 'pl-6' : ''
        }`}
      >
        {inner}
      </Link>
    );
  }

  return (
    <div
      className={`flex min-h-[36px] w-full items-center gap-2 border-b border-black/25 px-3 py-2 text-sm text-white/90 ${
        nested ? 'pl-6' : ''
      }`}
    >
      {inner}
    </div>
  );
}

export default function PersonalMyTopicsSidebarBlock({ userId }: { userId?: string }) {
  const { t } = useLanguage();
  const [displayOpen, setDisplayOpen] = useState(true);
  const [segmentOpen, setSegmentOpen] = useState<Record<string, boolean>>({});
  const [refreshKey, setRefreshKey] = useState(0);

  const topics = useMemo(() => {
    if (!userId) return [];
    return getClubDashboardFriendTopics(loadWebsiteFriendItems('personal', userId));
  }, [userId, refreshKey]);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    if (!userId) return;
    refresh();
  }, [userId, refresh]);

  useEffect(() => {
    const onFocus = () => refresh();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [refresh]);

  useEffect(() => {
    if (!userId) return;
    const onStorage = (e: StorageEvent) => {
      if (e.key?.startsWith('personal-website-friend-list:')) refresh();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [userId, refresh]);

  const hasTopics = topics.length > 0;

  return (
    <div className="flex min-h-[44px] w-full flex-col border-b border-black/25">
      <div className="flex w-full items-stretch">
        <div className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2.5 text-white">
          <MessagesSquare className="h-4 w-4 shrink-0 opacity-90" />
          <span className="truncate">{t('sidebar_my_topics')}</span>
        </div>
        <button
          type="button"
          title={t('sidebar_my_topics_settings_aria')}
          aria-label={t('sidebar_my_topics_settings_aria')}
          onClick={() => {
            window.open(PERSONAL_WEBSITE_TOPICS_PATH, '_blank', 'noopener,noreferrer');
          }}
          className="flex shrink-0 items-center border-l border-black/25 px-3 text-gray-300 transition-colors hover:bg-zinc-700/90"
        >
          <Settings className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setDisplayOpen((v) => !v)}
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
        <div className="border-t border-black/25 bg-[#252525]">
          {topics.map((topic) => {
            const hasNested = topic.subtopics.length > 0;
            const open = segmentOpen[topic.id] ?? true;
            const showTopicLink = topic.item.showInClubDashboardTopics;
            return (
              <div key={topic.id}>
                <div className="flex items-stretch">
                  {hasNested ? (
                    <button
                      type="button"
                      onClick={() =>
                        setSegmentOpen((prev) => ({ ...prev, [topic.id]: !(prev[topic.id] ?? true) }))
                      }
                      className="flex w-8 shrink-0 items-center justify-center border-b border-black/25 text-white/80 hover:bg-zinc-700/90"
                      aria-label={open ? t('collapse') : t('expand')}
                    >
                      <ChevronDown
                        className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`}
                      />
                    </button>
                  ) : null}
                  <div className={hasNested ? 'min-w-0 flex-1' : 'w-full'}>
                    <TopicRow entry={topic} showLink={showTopicLink} />
                  </div>
                </div>
                {hasNested && open
                  ? topic.subtopics.map((sub) => (
                      <TopicRow key={sub.id} entry={sub} nested showLink />
                    ))
                  : null}
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

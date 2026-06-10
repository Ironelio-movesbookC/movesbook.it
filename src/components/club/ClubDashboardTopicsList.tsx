'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, Mail } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { ClubDashboardFriendTopicEntry } from '@/lib/clubWebsiteFriendList';
import type { ClubWebsiteTopic } from '@/lib/clubWebsiteTopics';
import { clubWebsiteDisplayTopicUrl } from '@/lib/clubWebsiteSettingsPaths';

const LEGACY_STATUS_ON = '#88bb55';
const LEGACY_STATUS_OFF = '#cc4444';

function StatusSquare({ active }: { active: boolean }) {
  return (
    <span
      className="inline-block shrink-0 rounded-none border border-zinc-300/90"
      style={{
        width: 11,
        height: 11,
        backgroundColor: active ? LEGACY_STATUS_ON : LEGACY_STATUS_OFF,
      }}
      aria-hidden
    />
  );
}

function TopicLink({
  name,
  href,
  nested = false,
  activated = true,
}: {
  name: string;
  href: string;
  nested?: boolean;
  activated?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex min-h-[40px] w-full items-center gap-2 border-b border-black/25 px-3 py-2 text-left text-white no-underline transition-colors hover:bg-zinc-700/90 ${
        nested ? 'pl-8 text-[13px]' : 'pl-6'
      }`}
    >
      <Mail className={`shrink-0 opacity-90 ${nested ? 'h-3.5 w-3.5' : 'h-4 w-4'}`} />
      <span className="min-w-0 flex-1 truncate">{name}</span>
      <StatusSquare active={activated} />
    </Link>
  );
}

function TopicHeader({
  name,
  activated = true,
  nested = false,
}: {
  name: string;
  activated?: boolean;
  nested?: boolean;
}) {
  return (
    <div
      className={`flex min-h-[40px] items-center gap-2 border-b border-black/25 px-3 py-2 text-white/90 ${
        nested ? 'pl-8 text-[13px]' : 'pl-6'
      }`}
    >
      <Mail className={`shrink-0 opacity-90 ${nested ? 'h-3.5 w-3.5' : 'h-4 w-4'}`} />
      <span className="min-w-0 flex-1 truncate font-medium">{name}</span>
      <StatusSquare active={activated} />
    </div>
  );
}

export default function ClubDashboardTopicsList({
  clubId,
  friendTopics,
  customTopics,
}: {
  clubId?: string;
  friendTopics: ClubDashboardFriendTopicEntry[];
  customTopics: ClubWebsiteTopic[];
}) {
  const { t } = useLanguage();
  const [segmentOpen, setSegmentOpen] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(friendTopics.map((topic) => [topic.id, true]))
  );

  if (friendTopics.length === 0 && customTopics.length === 0) return null;

  const topicHref = (id: string) => clubWebsiteDisplayTopicUrl(clubId, id);

  return (
    <div className="border-t border-black/25 bg-[#252525]">
      {friendTopics.map((topic) => {
        const showTopicLink = topic.item.showInClubDashboardTopics;
        const hasNested = topic.subtopics.length > 0;
        const open = segmentOpen[topic.id] ?? true;

        return (
          <div key={topic.id}>
            <div className="flex items-stretch border-b border-black/25">
              {hasNested ? (
                <button
                  type="button"
                  onClick={() =>
                    setSegmentOpen((prev) => ({ ...prev, [topic.id]: !(prev[topic.id] ?? true) }))
                  }
                  className="flex w-8 shrink-0 items-center justify-center text-white/80 transition-colors hover:bg-zinc-700/90"
                  aria-label={open ? t('collapse') : t('expand')}
                >
                  <ChevronDown
                    className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`}
                  />
                </button>
              ) : null}
              <div className={hasNested ? 'min-w-0 flex-1' : 'w-full'}>
                {showTopicLink ? (
                  <Link
                    href={topicHref(topic.id)}
                    className="flex min-h-[40px] w-full items-center gap-2 px-3 py-2 text-left text-white no-underline transition-colors hover:bg-zinc-700/90"
                  >
                    <Mail className="h-4 w-4 shrink-0 opacity-90" />
                    <span className="min-w-0 flex-1 truncate">{topic.name}</span>
                    <StatusSquare active={topic.item.activated} />
                  </Link>
                ) : (
                  <TopicHeader name={topic.name} activated={topic.item.activated} nested={false} />
                )}
              </div>
            </div>
            {hasNested && open
              ? topic.subtopics.map((sub) =>
                  sub.item.showInClubDashboardTopics ? (
                    <TopicLink
                      key={sub.id}
                      name={sub.name}
                      href={topicHref(sub.id)}
                      nested
                      activated={sub.item.activated}
                    />
                  ) : (
                    <TopicHeader
                      key={sub.id}
                      name={sub.name}
                      activated={sub.item.activated}
                      nested
                    />
                  )
                )
              : null}
          </div>
        );
      })}
      {customTopics.map((topic) => (
        <TopicLink
          key={topic.id}
          name={topic.name}
          href={topicHref(topic.id)}
          activated={topic.activated}
        />
      ))}
    </div>
  );
}

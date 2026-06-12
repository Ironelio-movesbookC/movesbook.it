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
        minWidth: 11,
        minHeight: 11,
        backgroundColor: active ? LEGACY_STATUS_ON : LEGACY_STATUS_OFF,
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

function TopicRow({
  name,
  href,
  nested = false,
  activated = true,
  showLink,
  expandControl,
}: {
  name: string;
  href: string;
  nested?: boolean;
  activated?: boolean;
  showLink: boolean;
  expandControl?: { open: boolean; onToggle: () => void; ariaLabel: string };
}) {
  const rowClass = `flex min-h-[40px] w-full items-center gap-2 border-b border-black/25 py-2 text-left text-white transition-colors hover:bg-zinc-700/90 ${
    nested ? 'pl-8 pr-3 text-[13px]' : 'px-3'
  }`;

  const label = (
    <>
      <Mail className={`shrink-0 opacity-90 ${nested ? 'h-3.5 w-3.5' : 'h-4 w-4'}`} />
      <span className={`min-w-0 flex-1 truncate ${nested ? '' : 'font-medium'}`}>{name}</span>
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

  const toggleSegment = (topicId: string) => {
    setSegmentOpen((prev) => ({ ...prev, [topicId]: !(prev[topicId] ?? true) }));
  };

  return (
    <div className="border-t border-black/25 bg-[#252525]">
      {friendTopics.map((topic) => {
        const showTopicLink = topic.item.showInClubDashboardTopics;
        const hasNested = topic.subtopics.length > 0;
        const open = segmentOpen[topic.id] ?? true;

        return (
          <div key={topic.id}>
            <TopicRow
              name={topic.name}
              href={topicHref(topic.id)}
              activated={topic.item.activated}
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
                  <TopicRow
                    key={sub.id}
                    name={sub.name}
                    href={topicHref(sub.id)}
                    nested
                    activated={sub.item.activated}
                    showLink={sub.item.showInClubDashboardTopics}
                  />
                ))
              : null}
          </div>
        );
      })}
      {customTopics.map((topic) => (
        <TopicRow
          key={topic.id}
          name={topic.name}
          href={topicHref(topic.id)}
          activated={topic.activated}
          showLink={topic.showInClubDashboardTopics}
        />
      ))}
    </div>
  );
}

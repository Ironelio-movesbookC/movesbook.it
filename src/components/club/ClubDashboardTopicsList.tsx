'use client';

import { useState } from 'react';
import { ChevronDown, FileText, Mail } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { ClubDashboardFriendTopicEntry } from '@/lib/clubWebsiteFriendList';
import type { ClubWebsiteFriendItem } from '@/lib/clubWebsiteFriendList';
import type { ClubWebsiteTopic } from '@/lib/clubWebsiteTopics';
import { clubWebsiteDisplayTopicUrl } from '@/lib/clubWebsiteSettingsPaths';
import { topicHasEmbedUrl, topicHasHtmlContent } from '@/lib/clubWebsiteDisplayContent';
import { FriendListStatusSquare } from '@/components/club/websiteSettings/ClubWebsiteFriendListToolbar';

type TopicContent = Pick<
  ClubWebsiteFriendItem,
  | 'id'
  | 'contentDisplayMode'
  | 'externalUrl'
  | 'contentsByLang'
  | 'activated'
  | 'openInSamePage'
>;

function resolveDashboardTopicOpenUrl(
  item: TopicContent,
  clubId: string | undefined,
  topicHrefBuilder?: (topicId: string) => string,
): string | null {
  if (topicHasEmbedUrl(item)) {
    return item.externalUrl.trim();
  }
  if (topicHasHtmlContent(item)) {
    return topicHrefBuilder
      ? topicHrefBuilder(item.id)
      : clubWebsiteDisplayTopicUrl(clubId, item.id);
  }
  return null;
}

function canDisplayDashboardTopic(item: TopicContent): boolean {
  return topicHasEmbedUrl(item) || topicHasHtmlContent(item);
}

function openDashboardTopicExternal(
  item: TopicContent,
  clubId: string | undefined,
  topicHrefBuilder?: (topicId: string) => string,
) {
  const url = resolveDashboardTopicOpenUrl(item, clubId, topicHrefBuilder);
  if (!url) return;
  window.open(url, '_blank', 'noopener,noreferrer');
}

function ExpandChevron({
  open,
  onToggle,
  ariaLabel,
  compact = false,
}: {
  open: boolean;
  onToggle: () => void;
  ariaLabel: string;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onToggle();
      }}
      className={`flex shrink-0 items-center justify-center text-amber-400 hover:bg-white/10 ${
        compact ? 'h-5 w-5' : 'h-7 w-7'
      }`}
      aria-expanded={open}
      aria-label={ariaLabel}
    >
      <ChevronDown
        className={`${compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} transition-transform ${open ? 'rotate-180' : ''}`}
        strokeWidth={2.5}
      />
    </button>
  );
}

function DocumentOpenButton({
  onOpen,
  ariaLabel,
  compact = false,
}: {
  onOpen: () => void;
  ariaLabel: string;
  compact?: boolean;
}) {
  const iconBtn = compact
    ? 'flex h-5 w-5 shrink-0 items-center justify-center text-white/95 hover:bg-white/15'
    : 'flex h-7 w-7 shrink-0 items-center justify-center text-white/95 hover:bg-white/15';
  const iconSize = compact ? 'h-3 w-3' : 'h-3.5 w-3.5';

  return (
    <button
      type="button"
      className={iconBtn}
      onClick={(e) => {
        e.stopPropagation();
        onOpen();
      }}
      aria-label={ariaLabel}
    >
      <FileText className={iconSize} />
    </button>
  );
}

function TopicRow({
  name,
  nested = false,
  activated,
  item,
  clubId,
  topicHrefBuilder,
  onViewTopicContent,
  expandControl,
}: {
  name: string;
  nested?: boolean;
  activated: boolean;
  item: TopicContent;
  clubId?: string;
  topicHrefBuilder?: (topicId: string) => string;
  onViewTopicContent?: (topicId: string, label: string) => void;
  expandControl?: { open: boolean; onToggle: () => void; ariaLabel: string };
}) {
  const { t } = useLanguage();
  const hasDirectLink = topicHasEmbedUrl(item);
  const hasHtmlContent = topicHasHtmlContent(item);
  const hasDisplayContent = canDisplayDashboardTopic(item);
  const openDirectLinkNewTab = () => {
    const url = item.externalUrl.trim();
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
  };
  const openLink = () => {
    if (hasDirectLink && item.openInSamePage && onViewTopicContent) {
      onViewTopicContent(item.id, name);
      return;
    }
    if (hasDirectLink) {
      openDirectLinkNewTab();
      return;
    }
    openHtmlContent();
  };
  const openHtmlContent = () => {
    if (onViewTopicContent) {
      onViewTopicContent(item.id, name);
      return;
    }
    openDashboardTopicExternal(item, clubId, topicHrefBuilder);
  };
  const openDocument = () => {
    if (hasDirectLink || hasHtmlContent) {
      openLink();
      return;
    }
  };
  const rowClass = `flex min-h-[40px] w-full items-center gap-2 border-b border-black/25 py-2 text-left text-white transition-colors hover:bg-zinc-700/90 ${
    nested ? 'pl-8 pr-3 text-[13px]' : 'px-3'
  }`;

  const mailIcon = (
    <Mail className={`shrink-0 opacity-90 ${nested ? 'h-3.5 w-3.5' : 'h-4 w-4'}`} />
  );

  const titleLabel = (
    <span className={`min-w-0 flex-1 truncate ${nested ? '' : 'font-medium'}`}>{name}</span>
  );

  const titleIsClickable = hasDirectLink || hasHtmlContent;

  return (
    <div className={rowClass}>
      {titleIsClickable ? (
        <button
          type="button"
          onClick={hasDirectLink ? openLink : openHtmlContent}
          className="flex min-w-0 flex-1 items-center gap-2 text-left text-white hover:underline"
        >
          {mailIcon}
          {titleLabel}
        </button>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-2 text-white/95">
          {mailIcon}
          {titleLabel}
        </div>
      )}
      <div className="flex shrink-0 items-center justify-end gap-0.5">
        {expandControl ? (
          <ExpandChevron
            open={expandControl.open}
            onToggle={expandControl.onToggle}
            ariaLabel={expandControl.ariaLabel}
            compact={nested}
          />
        ) : null}
        <span className="flex h-7 w-7 items-center justify-center">
          <FriendListStatusSquare status={activated ? 'on' : 'off'} />
        </span>
        {hasDisplayContent ? (
          <DocumentOpenButton
            onOpen={openDocument}
            ariaLabel={t('club_dashboard_open_topic_aria')}
            compact={nested}
          />
        ) : null}
      </div>
    </div>
  );
}

export default function ClubDashboardTopicsList({
  clubId,
  friendTopics,
  customTopics,
  topicHrefBuilder,
  onViewTopicContent,
}: {
  clubId?: string;
  friendTopics: ClubDashboardFriendTopicEntry[];
  customTopics: ClubWebsiteTopic[];
  /** Override display URL (e.g. personal My Topics). */
  topicHrefBuilder?: (topicId: string) => string;
  /** Inline read-only HTML in the club dashboard main panel (editor-mode topics). */
  onViewTopicContent?: (topicId: string, label: string) => void;
}) {
  const { t } = useLanguage();
  const [segmentOpen, setSegmentOpen] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(friendTopics.map((topic) => [topic.id, true])),
  );

  if (friendTopics.length === 0 && customTopics.length === 0) return null;

  const toggleSegment = (topicId: string) => {
    setSegmentOpen((prev) => ({ ...prev, [topicId]: !(prev[topicId] ?? true) }));
  };

  const renderFriendTopicRow = (
    entry: ClubDashboardFriendTopicEntry,
    variant: 'root' | 'sub',
    expandControl?: { open: boolean; onToggle: () => void },
  ) => (
    <TopicRow
      key={entry.id}
      name={entry.name}
      nested={variant === 'sub' && entry.id !== 'friends-root'}
      activated={entry.item.activated}
      item={entry.item}
      clubId={clubId}
      topicHrefBuilder={topicHrefBuilder}
      onViewTopicContent={onViewTopicContent}
      expandControl={
        expandControl
          ? {
              open: expandControl.open,
              onToggle: expandControl.onToggle,
              ariaLabel: expandControl.open ? t('collapse') : t('expand'),
            }
          : undefined
      }
    />
  );

  return (
    <div className="border-t border-black/25 bg-[#252525]">
      {friendTopics.map((topic) => {
        const hasNested = topic.subtopics.length > 0;
        const open = segmentOpen[topic.id] ?? true;
        const isRoot = topic.id === 'friends-root';

        return (
          <div key={topic.id}>
            {renderFriendTopicRow(
              topic,
              isRoot ? 'root' : 'sub',
              hasNested ? { open, onToggle: () => toggleSegment(topic.id) } : undefined,
            )}
            {hasNested && open
              ? topic.subtopics.map((sub) => renderFriendTopicRow(sub, 'sub'))
              : null}
          </div>
        );
      })}
      {customTopics.map((topic) => (
        <TopicRow
          key={topic.id}
          name={topic.name}
          activated={topic.activated}
          item={topic}
          clubId={clubId}
          topicHrefBuilder={topicHrefBuilder}
          onViewTopicContent={onViewTopicContent}
        />
      ))}
    </div>
  );
}

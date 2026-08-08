'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { ClubDashboardFriendTopicEntry } from '@/lib/clubWebsiteFriendList';
import { getClubDashboardFriendTopics } from '@/lib/clubWebsiteFriendList';
import type { ClubWebsiteTopic } from '@/lib/clubWebsiteTopics';
import { filterClubWebsiteTopicsForMembers } from '@/lib/clubWebsiteTopics';
import {
  buildClubDashboardTopicNodes,
  type ClubDashboardTopicNode,
} from '@/lib/club/clubDashboardTopicNodes';
import { useClubWebsiteFriendList } from '@/hooks/useClubWebsiteFriendList';
import { useClubWebsiteTopics } from '@/hooks/useClubWebsiteTopics';
import ClubTopicMemberPanel from '@/components/club/websiteSettings/ClubTopicMemberPanel';
import { topicHasEmbedUrl, topicHasHtmlContent } from '@/lib/clubWebsiteDisplayContent';

function canOpenNode(node: ClubDashboardTopicNode): boolean {
  return topicHasEmbedUrl(node.item) || topicHasHtmlContent(node.item);
}

function openNodeExternal(node: ClubDashboardTopicNode) {
  if (topicHasEmbedUrl(node.item) && node.item.externalUrl.trim()) {
    window.open(node.item.externalUrl.trim(), '_blank', 'noopener,noreferrer');
  }
}

export function ClubDashboardTopicsHorizontalBar({
  nodes,
  onOpenTopic,
  className = '',
}: {
  nodes: ClubDashboardTopicNode[];
  onOpenTopic: (node: ClubDashboardTopicNode) => void;
  className?: string;
}) {
  const { t } = useLanguage();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [dropdownId, setDropdownId] = useState<string | null>(null);
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
    };
  }, []);

  const scrollBy = (direction: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * Math.max(180, el.clientWidth * 0.45), behavior: 'smooth' });
  };

  const handleTopicClick = (node: ClubDashboardTopicNode) => {
    if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
    clickTimerRef.current = setTimeout(() => {
      clickTimerRef.current = null;
      if (node.subtopics.length > 0) {
        setDropdownId((current) => (current === node.id ? null : node.id));
      }
    }, 250);
  };

  const handleTopicDoubleClick = (node: ClubDashboardTopicNode) => {
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }
    setDropdownId(null);
    onOpenTopic(node);
  };

  if (nodes.length === 0) {
    return (
      <p className="px-3 py-4 text-center text-sm text-zinc-600">
        {t('club_dashboard_topics_empty')}
      </p>
    );
  }

  return (
    <div className={`relative border border-zinc-300 bg-[#e8e8e8] ${className}`}>
      <div className="flex items-stretch">
        <button
          type="button"
          onClick={() => scrollBy(-1)}
          className="flex w-9 shrink-0 items-center justify-center border-r border-zinc-400 bg-[#d8d8d8] text-zinc-800 hover:bg-[#cfcfcf]"
          aria-label={t('club_topics_scroll_left')}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <div
          ref={scrollerRef}
          className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto scroll-smooth px-2 py-2 [scrollbar-width:thin]"
        >
          {nodes.map((node) => {
            const open = dropdownId === node.id;
            return (
              <div key={node.id} className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => handleTopicClick(node)}
                  onDoubleClick={() => handleTopicDoubleClick(node)}
                  className={`min-w-[7.5rem] max-w-[11rem] rounded-none border px-2.5 py-2 text-center text-xs font-semibold leading-tight text-zinc-800 shadow-sm ${
                    open
                      ? 'border-sky-600 bg-gradient-to-b from-white to-[#c5d4e8] ring-1 ring-sky-500'
                      : 'border-zinc-500 bg-gradient-to-b from-[#f8f8f8] to-[#d4d4d4] hover:from-white hover:to-[#e0e0e0]'
                  }`}
                  title={t('club_topics_double_click_hint')}
                >
                  <span className="line-clamp-2">{node.name}</span>
                </button>
                {open && node.subtopics.length > 0 ? (
                  <div className="absolute left-0 top-full z-20 mt-0.5 min-w-full border border-zinc-500 bg-white shadow-lg">
                    {node.subtopics.map((sub) => (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => {
                          setDropdownId(null);
                          onOpenTopic(sub);
                        }}
                        onDoubleClick={() => {
                          setDropdownId(null);
                          onOpenTopic(sub);
                        }}
                        className="block w-full border-b border-zinc-200 px-2.5 py-2 text-left text-[11px] font-medium text-zinc-800 last:border-b-0 hover:bg-sky-50"
                      >
                        {sub.name}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => scrollBy(1)}
          className="flex w-9 shrink-0 items-center justify-center border-l border-zinc-400 bg-[#d8d8d8] text-zinc-800 hover:bg-[#cfcfcf]"
          aria-label={t('club_topics_scroll_right')}
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

export default function ClubDashboardTopicsHorizontalPanel({
  clubId,
  clubDisplayName = '',
  friendTopics: friendTopicsProp,
  customTopics: customTopicsProp,
}: {
  clubId: string;
  clubDisplayName?: string;
  friendTopics?: ClubDashboardFriendTopicEntry[];
  customTopics?: ClubWebsiteTopic[];
}) {
  const { t } = useLanguage();
  const { items: friendItems } = useClubWebsiteFriendList(clubId);
  const { topics: clubTopics } = useClubWebsiteTopics(clubId);

  const friendTopics = useMemo(
    () => friendTopicsProp ?? getClubDashboardFriendTopics(friendItems),
    [friendTopicsProp, friendItems],
  );
  const customTopics = useMemo(
    () => customTopicsProp ?? filterClubWebsiteTopicsForMembers(clubTopics),
    [customTopicsProp, clubTopics],
  );

  const nodes = useMemo(
    () => buildClubDashboardTopicNodes(friendTopics, customTopics),
    [friendTopics, customTopics],
  );

  const [openedId, setOpenedId] = useState<string | null>(null);
  const [openedLabel, setOpenedLabel] = useState('');

  const handleOpenTopic = useCallback((node: ClubDashboardTopicNode) => {
    if (topicHasEmbedUrl(node.item) && !node.item.openInSamePage) {
      openNodeExternal(node);
      return;
    }
    if (!canOpenNode(node) && !topicHasEmbedUrl(node.item)) {
      setOpenedId(node.id);
      setOpenedLabel(node.name);
      return;
    }
    setOpenedId(node.id);
    setOpenedLabel(node.name);
  }, []);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-zinc-900">{t('sidebar_club_topics')}</h2>
        <p className="text-[11px] text-zinc-500">{t('club_topics_horizontal_hint')}</p>
      </div>
      <ClubDashboardTopicsHorizontalBar nodes={nodes} onOpenTopic={handleOpenTopic} />
      {openedId ? (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded border border-zinc-300 bg-white">
          <ClubTopicMemberPanel
            clubId={clubId}
            topicId={openedId}
            topicLabel={openedLabel}
            clubDisplayName={clubDisplayName}
            compact
          />
        </div>
      ) : (
        <p className="py-8 text-center text-sm text-zinc-500">
          {t('club_topics_horizontal_empty_selection')}
        </p>
      )}
    </div>
  );
}

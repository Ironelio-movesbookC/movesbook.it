'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { Pencil, ChevronLeft, ChevronRight, Maximize2, Minimize2, Settings } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const SCROLL_STEP = 220;

/** Special topic: show all articles sorted by date (most recent); "+" is disabled when this is selected */
export const ALL_TOPICS = 'All';

/** Special value when "All users' sectors" is selected in the user-sectors dropdown (super admin). */
export const ALL_USER_SECTORS = '__all_user_sectors__';

export const NEWS_TOPICS = [
  'Events',
  'Nutrition',
  'Sport',
  'Training',
  'Medicine',
  'News',
  'Equipments',
  'Lounge music',
] as const;

/** Map from default topic label to i18n key (for translation). */
export const NEWS_TOPIC_KEYS: Record<string, string> = {
  'Events': 'news_topic_events',
  'Nutrition': 'news_topic_nutrition',
  'Sport': 'news_topic_sport',
  'Training': 'news_topic_training',
  'Medicine': 'news_topic_medicine',
  'News': 'news_topic_news',
  'Equipments': 'news_topic_equipments',
  'Lounge music': 'news_topic_lounge_music',
};

export type NewsTopic = (typeof NEWS_TOPICS)[number] | string;

/** Returns true if the topic is one of the built-in default topics (cannot be deleted). */
export function isDefaultTopic(topic: string | null): topic is (typeof NEWS_TOPICS)[number] {
  return topic != null && (NEWS_TOPICS as readonly string[]).includes(topic);
}

interface NewsTopicBarProps {
  /** List of topic labels; can include default + user-added topics */
  topics: string[];
  activeTopic: NewsTopic | null;
  onTopicSelect: (topic: NewsTopic) => void;
  /** Called when the pencil button is clicked (edit selected topic or new if none selected) */
  onAddNewTopic: () => void;
  /** Called when the "Add" button is clicked to add a new topic */
  onAddTopic?: () => void;
  isExpanded: boolean;
  onExpandReduce: () => void;
  /** Called when the gear (topic sort) button is clicked */
  onOpenTopicSort?: () => void;
  /** Topic names created by super admin; when selected, pencil is disabled for normal users */
  topicNamesCreatedBySuperAdmin?: string[];
  /** Topic names created by normal users; when non-empty (super admin), these go in a dropdown, not in the bar */
  topicNamesCreatedByNormalUsers?: string[];
  /** When set (e.g. super admin), overrides the "All" button label (e.g. "All defaults") */
  allTopicLabel?: string;
}

export default function NewsTopicBar({
  topics,
  activeTopic,
  onTopicSelect,
  onAddNewTopic,
  onAddTopic,
  isExpanded,
  onExpandReduce,
  onOpenTopicSort,
  topicNamesCreatedBySuperAdmin = [],
  topicNamesCreatedByNormalUsers = [],
  allTopicLabel,
}: NewsTopicBarProps) {
  /** Topics to show as buttons (exclude normal-user-created when dropdown is used) */
  const topicsForBar = topicNamesCreatedByNormalUsers.length > 0
    ? topics.filter((t) => !topicNamesCreatedByNormalUsers.includes(t))
    : topics;
  const { t } = useLanguage();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const translateTopic = useCallback((topic: string) => {
    const key = NEWS_TOPIC_KEYS[topic];
    return key ? t(key) : topic;
  }, [t]);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollState();
    el.addEventListener('scroll', updateScrollState);
    const ro = new ResizeObserver(updateScrollState);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', updateScrollState);
      ro.disconnect();
    };
  }, [updateScrollState, topicsForBar.length]);

  const scrollLeft = useCallback(() => {
    scrollRef.current?.scrollBy({ left: -SCROLL_STEP, behavior: 'smooth' });
  }, []);

  const scrollRight = useCallback(() => {
    scrollRef.current?.scrollBy({ left: SCROLL_STEP, behavior: 'smooth' });
  }, []);

  /** Default topics (Nutrition, Sport, etc.) cannot be deleted; disable Pencil when one is selected. Also disable when "All" is selected or when a topic created by super admin is selected (normal users cannot edit those). */
  const isDefaultTopicSelected = activeTopic != null && activeTopic !== ALL_TOPICS && isDefaultTopic(activeTopic);
  const isAllSelected = activeTopic === ALL_TOPICS;
  const isSuperAdminTopicSelected = activeTopic != null && topicNamesCreatedBySuperAdmin.includes(activeTopic);
  const isPencilDisabled = isAllSelected || isDefaultTopicSelected || isSuperAdminTopicSelected;

  return (
    <div className="flex items-center gap-2 mb-4 flex-nowrap overflow-hidden">
      {/* Add new topic button */}
      {onAddTopic && (
        <button
          type="button"
          onClick={onAddTopic}
          className="flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium border-2 border-cyan-500 bg-cyan-50 text-cyan-700 hover:bg-cyan-100 transition-colors"
          title={t('news_add_topic')}
          aria-label={t('news_add_topic')}
        >
          {t('news_add_topic')}
        </button>
      )}

      {/* Edit topic button (pencil) - disabled when "All" or a default topic is selected */}
      <button
        type="button"
        onClick={onAddNewTopic}
        disabled={isPencilDisabled}
        className={`flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-lg border-2 transition-colors ${
          isPencilDisabled
            ? 'border-amber-200 bg-amber-50/50 text-amber-400 cursor-not-allowed'
            : 'border-amber-400 bg-amber-50 text-amber-600 hover:bg-amber-100'
        }`}
        title={isPencilDisabled ? (isAllSelected ? 'Select a topic to edit' : isSuperAdminTopicSelected ? 'Cannot edit topic created by admin' : 'Cannot edit default topic') : 'Edit topic'}
        aria-label={isPencilDisabled ? (isAllSelected ? 'Select a topic to edit' : isSuperAdminTopicSelected ? 'Cannot edit topic created by admin' : 'Cannot edit default topic') : 'Edit topic'}
      >
        <Pencil className="w-5 h-5" />
      </button>

      {/* "All" - show all articles by date; when selected, "+" is disabled. Label can be overridden (e.g. "All defaults" for super admin). */}
      <button
        type="button"
        onClick={() => onTopicSelect(ALL_TOPICS)}
        className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
          activeTopic === ALL_TOPICS
            ? 'bg-gray-800 text-white'
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
        }`}
        title={allTopicLabel ?? t('news_all_ogp')}
        aria-label={allTopicLabel ?? t('news_all_ogp')}
      >
        {allTopicLabel ?? t('news_all_ogp')}
      </button>

      {/* Left arrow - scroll left */}
      <button
        type="button"
        onClick={scrollLeft}
        disabled={!canScrollLeft}
        className={`flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-lg border transition-colors ${
          canScrollLeft
            ? 'border-orange-400 bg-orange-500 text-white hover:bg-orange-600'
            : 'border-gray-300 bg-gray-200 text-gray-400 cursor-not-allowed'
        }`}
        title="Scroll topics left"
        aria-label="Scroll topics left"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      {/* Topic buttons - scrollable container (excludes user-created when dropdown is shown) */}
      <div
        ref={scrollRef}
        className="flex-1 min-w-0 overflow-x-auto overflow-y-hidden scroll-smooth [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <div className="flex items-center gap-2 flex-nowrap w-max py-1 pr-1">
          {topicsForBar.map((topic) => {
            const isActive = activeTopic === topic;
            const isOgpTopicByCurrentUser =
              !isDefaultTopic(topic) && !topicNamesCreatedBySuperAdmin.includes(topic);
            return (
              <button
                key={topic}
                type="button"
                onClick={() => onTopicSelect(topic)}
                className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-gray-800 text-white'
                    : isOgpTopicByCurrentUser
                      ? 'bg-[#A0EEFF] text-gray-800 hover:bg-[#8AE5F7] border border-gray-200'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {translateTopic(topic)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Right arrow - scroll right */}
      <button
        type="button"
        onClick={scrollRight}
        disabled={!canScrollRight}
        className={`flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-lg border transition-colors ${
          canScrollRight
            ? 'border-orange-400 bg-orange-500 text-white hover:bg-orange-600'
            : 'border-gray-300 bg-gray-200 text-gray-400 cursor-not-allowed'
        }`}
        title="Scroll topics right"
        aria-label="Scroll topics right"
      >
        <ChevronRight className="w-5 h-5" />
      </button>

      {/* Sectors inserted by users (super admin only) */}
      {topicNamesCreatedByNormalUsers.length > 0 && (
        <div className="flex-shrink-0 flex flex-col gap-1 ml-2">
          <label htmlFor="user-sectors-select" className="text-xs font-medium text-gray-600 whitespace-nowrap">
            Topics inserted by users
          </label>
          <select
            id="user-sectors-select"
            value={activeTopic === ALL_USER_SECTORS || (activeTopic != null && topicNamesCreatedByNormalUsers.includes(activeTopic)) ? activeTopic : ''}
            onChange={(e) => {
              const v = e.target.value;
              if (v) onTopicSelect(v);
            }}
            className="px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-800 text-sm font-medium min-w-[160px] focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
          >
            <option value="">Select topic</option>
            <option value={ALL_USER_SECTORS}>All users&apos; topics</option>
            {topicNamesCreatedByNormalUsers.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Expand / Reduce button */}
      <button
        type="button"
        onClick={onExpandReduce}
        className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-lg border border-gray-300 bg-white text-gray-600 hover:bg-gray-100 transition-colors ml-auto"
        title={isExpanded ? 'Reduce' : 'Expand'}
        aria-label={isExpanded ? 'Reduce view' : 'Expand to full page'}
      >
        {isExpanded ? (
          <Minimize2 className="w-5 h-5" />
        ) : (
          <Maximize2 className="w-5 h-5" />
        )}
      </button>

      {/* Gear - topic sort order (user's favorite sorting) */}
      {onOpenTopicSort && (
        <button
          type="button"
          onClick={onOpenTopicSort}
          className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-lg border border-gray-300 bg-white text-gray-600 hover:bg-gray-100 transition-colors"
          title="Sort topics (your favorite order)"
          aria-label="Sort topics"
        >
          <Settings className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}

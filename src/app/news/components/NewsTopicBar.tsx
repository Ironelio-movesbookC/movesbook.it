'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { Pencil, Plus, ChevronLeft, ChevronRight, Maximize2, Minimize2 } from 'lucide-react';

const SCROLL_STEP = 220;

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

export type NewsTopic = (typeof NEWS_TOPICS)[number] | string;

interface NewsTopicBarProps {
  /** List of topic labels; can include default + user-added topics */
  topics: string[];
  activeTopic: NewsTopic | null;
  onTopicSelect: (topic: NewsTopic) => void;
  /** Called when the pencil button is clicked (edit selected topic or new if none selected) */
  onAddNewTopic: () => void;
  /** Called when the "Add" button is clicked to add a new topic */
  onAddTopic?: () => void;
  /** Called when the "+" button is clicked to show the OGP input form (Save/Cancel area) */
  onAddClick?: () => void;
  isExpanded: boolean;
  onExpandReduce: () => void;
}

export default function NewsTopicBar({
  topics,
  activeTopic,
  onTopicSelect,
  onAddNewTopic,
  onAddTopic,
  onAddClick,
  isExpanded,
  onExpandReduce,
}: NewsTopicBarProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

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
  }, [updateScrollState, topics.length]);

  const scrollLeft = useCallback(() => {
    scrollRef.current?.scrollBy({ left: -SCROLL_STEP, behavior: 'smooth' });
  }, []);

  const scrollRight = useCallback(() => {
    scrollRef.current?.scrollBy({ left: SCROLL_STEP, behavior: 'smooth' });
  }, []);

  return (
    <div className="flex items-center gap-2 mb-4 flex-nowrap overflow-hidden">
      {/* Add new topic button */}
      {onAddTopic && (
        <button
          type="button"
          onClick={onAddTopic}
          className="flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium border-2 border-cyan-500 bg-cyan-50 text-cyan-700 hover:bg-cyan-100 transition-colors"
          title="Add new topic"
          aria-label="Add new topic"
        >
          Add
        </button>
      )}

      {/* Edit topic button (pencil) */}
      <button
        type="button"
        onClick={onAddNewTopic}
        className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-lg border-2 border-amber-400 bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors"
        title="Edit topic"
        aria-label="Edit topic"
      >
        <Pencil className="w-5 h-5" />
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

      {/* Topic buttons - scrollable container */}
      <div
        ref={scrollRef}
        className="flex-1 min-w-0 overflow-x-auto overflow-y-hidden scroll-smooth [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <div className="flex items-center gap-2 flex-nowrap w-max py-1 pr-1">
          {topics.map((topic) => (
            <button
              key={topic}
              type="button"
              onClick={() => onTopicSelect(topic)}
              className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTopic === topic
                  ? 'bg-gray-800 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {topic}
            </button>
          ))}
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

      {/* Plus button - shows the OGP input form (Save/Cancel area) when clicked */}
      <button
        type="button"
        onClick={onAddClick}
        className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-lg border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 transition-colors"
        title="Add"
        aria-label="Add"
      >
        <Plus className="w-5 h-5" />
      </button>

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
    </div>
  );
}

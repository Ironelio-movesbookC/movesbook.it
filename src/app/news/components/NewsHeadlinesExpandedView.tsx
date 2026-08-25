'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Clock, MessageCircle, ThumbsDown, ThumbsUp } from 'lucide-react';
import type { ArticlePasted } from './NewsArticlesList';
import { ogpDescriptionPlainText } from '@/components/shared/OgpRichDescription';
import {
  TOP_STORIES_AUTO_MS,
  TOP_STORIES_COUNT,
  estimateReadingMinutes,
  faviconUrl,
  formatRelativeShort,
  rankHeadlines,
  sourceName,
} from '@/lib/news/headlines';

interface NewsHeadlinesExpandedViewProps {
  articles: ArticlePasted[];
  getViewCount: (article: ArticlePasted) => number;
  likesMap: Record<string, { count: number; likedByMe: boolean }>;
  likeLoadingId: string | null;
  onLike: (id: string) => void;
  onOpenArticle: (article: ArticlePasted) => void;
  displayPicture: boolean;
  onDisplayPictureChange: (next: boolean) => void;
}

function SourceMark({ article, light = false }: { article: ArticlePasted; light?: boolean }) {
  const icon = faviconUrl(article.url);
  const name = sourceName(article);
  const [failed, setFailed] = useState(false);
  const initial = name.slice(0, 1).toUpperCase();

  return (
    <span
      className={`inline-flex w-5 h-5 rounded-[4px] overflow-hidden items-center justify-center shrink-0 text-[10px] font-bold ${
        light ? 'bg-white/25 text-white' : 'bg-gray-200 text-gray-600'
      }`}
    >
      {icon && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={icon}
          alt=""
          width={20}
          height={20}
          className="w-5 h-5 object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        initial
      )}
    </span>
  );
}

function EngagementRow({
  article,
  likesMap,
  likeLoadingId,
  onLike,
  light = false,
}: {
  article: ArticlePasted;
  likesMap: Record<string, { count: number; likedByMe: boolean }>;
  likeLoadingId: string | null;
  onLike: (id: string) => void;
  light?: boolean;
}) {
  const liked = likesMap[article.id]?.likedByMe;
  const count = likesMap[article.id]?.count ?? 0;
  const icon = light ? 'text-white/90 hover:text-white' : 'text-gray-500 hover:text-gray-800';

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onLike(article.id);
        }}
        disabled={!!likeLoadingId}
        className={`inline-flex items-center gap-1 ${icon} disabled:opacity-50`}
        aria-label={liked ? 'Unlike' : 'Like'}
      >
        <ThumbsUp className={`w-3.5 h-3.5 ${liked ? 'fill-current' : ''}`} />
        {count > 0 ? <span className="text-[11px] tabular-nums">{count}</span> : null}
      </button>
      <span className={`${icon} opacity-70`} aria-hidden>
        <ThumbsDown className="w-3.5 h-3.5" />
      </span>
      <span className={`${icon} opacity-70`} aria-hidden>
        <MessageCircle className="w-3.5 h-3.5" />
      </span>
    </div>
  );
}

export default function NewsHeadlinesExpandedView({
  articles,
  getViewCount,
  likesMap,
  likeLoadingId,
  onLike,
  onOpenArticle,
  displayPicture,
  onDisplayPictureChange,
}: NewsHeadlinesExpandedViewProps) {
  const ranked = useMemo(() => rankHeadlines(articles, getViewCount), [articles, getViewCount]);
  const topStories = ranked.slice(0, TOP_STORIES_COUNT);
  const rest = ranked.slice(TOP_STORIES_COUNT);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    setActiveIndex((i) => (topStories.length === 0 ? 0 : Math.min(i, topStories.length - 1)));
  }, [topStories.length]);

  const scrollToIndex = useCallback(
    (index: number, behavior: ScrollBehavior = 'smooth') => {
      const el = scrollerRef.current;
      if (!el || topStories.length === 0) return;
      const cards = el.querySelectorAll<HTMLElement>('[data-top-story]');
      const card = cards[index];
      if (!card) return;
      el.scrollTo({ left: card.offsetLeft - el.offsetLeft, behavior });
    },
    [topStories.length],
  );

  const scrollByCard = useCallback(
    (dir: -1 | 1) => {
      if (topStories.length === 0) return;
      setActiveIndex((current) => {
        const next =
          dir === 1
            ? current >= topStories.length - 1
              ? 0
              : current + 1
            : current <= 0
              ? topStories.length - 1
              : current - 1;
        scrollToIndex(next);
        return next;
      });
    },
    [scrollToIndex, topStories.length],
  );

  useEffect(() => {
    if (topStories.length < 2) return;
    const timer = window.setInterval(() => {
      if (pausedRef.current) return;
      setActiveIndex((current) => {
        const next = current >= topStories.length - 1 ? 0 : current + 1;
        scrollToIndex(next);
        return next;
      });
    }, TOP_STORIES_AUTO_MS);
    return () => window.clearInterval(timer);
  }, [scrollToIndex, topStories.length]);

  const handleScrollerScroll = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const cards = Array.from(el.querySelectorAll<HTMLElement>('[data-top-story]'));
    if (cards.length === 0) return;
    const scrollLeft = el.scrollLeft;
    let nearest = 0;
    let minDist = Number.POSITIVE_INFINITY;
    cards.forEach((card, i) => {
      const dist = Math.abs(card.offsetLeft - el.offsetLeft - scrollLeft);
      if (dist < minDist) {
        minDist = dist;
        nearest = i;
      }
    });
    setActiveIndex(nearest);
  }, []);

  return (
    <div className="flex flex-col gap-5 min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-gray-900">Top Stories</h2>
        <div className="flex items-center gap-3 text-sm">
          <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="radio"
              name="ogp-headlines-display-picture"
              checked={displayPicture}
              onChange={() => onDisplayPictureChange(true)}
              className="w-3.5 h-3.5 border-gray-300 text-cyan-600 focus:ring-cyan-500"
            />
            <span className="text-gray-700">Display picture</span>
          </label>
          <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="radio"
              name="ogp-headlines-display-picture"
              checked={!displayPicture}
              onChange={() => onDisplayPictureChange(false)}
              className="w-3.5 h-3.5 border-gray-300 text-cyan-600 focus:ring-cyan-500"
            />
            <span className="text-gray-700">Don&apos;t display picture</span>
          </label>
        </div>
      </div>

      {topStories.length > 0 && (
        <div
          className="relative group/carousel pb-5"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocusCapture={() => setPaused(true)}
          onBlurCapture={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
              setPaused(false);
            }
          }}
        >
          <div
            ref={scrollerRef}
            onScroll={handleScrollerScroll}
            className="flex gap-4 overflow-x-auto pb-1 snap-x snap-mandatory scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          >
            {topStories.map((a, index) => {
              const title = a.title || a.url || 'Untitled';
              return (
                <article
                  key={a.id}
                  data-top-story
                  className={`relative snap-start shrink-0 w-[min(22rem,78%)] sm:w-[min(24rem,46%)] h-52 sm:h-56 rounded-xl overflow-hidden cursor-pointer transition-[box-shadow,ring] duration-300 ${
                    index === activeIndex ? 'ring-2 ring-cyan-500/80 shadow-lg' : 'ring-1 ring-black/10'
                  }`}
                  onClick={() => onOpenArticle(a)}
                >
                  {a.image ? (
                    <Image
                      src={a.image}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 80vw, 24rem"
                      unoptimized
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-700 to-slate-900" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-3 flex flex-col gap-1.5">
                    <div className="flex items-center gap-1.5 text-[12px] text-white/90">
                      <SourceMark article={a} light />
                      <span className="truncate">{sourceName(a)}</span>
                    </div>
                    <h3 className="text-[15px] font-bold text-white leading-snug line-clamp-3">{title}</h3>
                    <EngagementRow
                      article={a}
                      likesMap={likesMap}
                      likeLoadingId={likeLoadingId}
                      onLike={onLike}
                      light
                    />
                  </div>
                </article>
              );
            })}
          </div>
          {topStories.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => scrollByCard(-1)}
                className="absolute left-1 top-1/2 -translate-y-1/2 z-10 p-1.5 rounded-md bg-white/90 border border-gray-200 text-gray-800 shadow-sm hover:bg-white opacity-0 group-hover/carousel:opacity-100 focus:opacity-100"
                aria-label="Previous top stories"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => scrollByCard(1)}
                className="absolute right-1 top-1/2 -translate-y-1/2 z-10 p-1.5 rounded-md bg-white/90 border border-gray-200 text-gray-800 shadow-sm hover:bg-white opacity-0 group-hover/carousel:opacity-100 focus:opacity-100"
                aria-label="Next top stories"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              <div
                className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1.5"
                role="tablist"
                aria-label="Top stories pages"
              >
                {topStories.map((story, i) => (
                  <button
                    key={story.id}
                    type="button"
                    onClick={() => {
                      setActiveIndex(i);
                      scrollToIndex(i);
                    }}
                    className={`rounded-full transition-all ${
                      i === activeIndex
                        ? 'w-2 h-2 bg-gray-700 shadow-sm'
                        : 'w-1.5 h-1.5 bg-gray-300 hover:bg-gray-500'
                    }`}
                    aria-label={`Top story ${i + 1}`}
                    aria-current={i === activeIndex ? 'true' : undefined}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      <div className="flex flex-col gap-3">
        {rest.map((a) => {
          const title = a.title || a.url || 'Untitled';
          const minutes = estimateReadingMinutes(
            ogpDescriptionPlainText(a.customDescription, a.description, ''),
            a.title,
          );
          const showThumb = displayPicture && !!a.image;
          return (
            <article
              key={a.id}
              className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden cursor-pointer hover:border-gray-300 transition-colors"
              onClick={() => onOpenArticle(a)}
            >
              <div className="flex gap-3 p-3 sm:p-4">
                <div className="flex-1 min-w-0 flex flex-col">
                  <div className="flex items-center gap-1.5 text-[12px] text-gray-500">
                    <SourceMark article={a} />
                    <span className="truncate">{sourceName(a)}</span>
                    <span aria-hidden>·</span>
                    <span className="shrink-0">{formatRelativeShort(a.savedAt)}</span>
                  </div>
                  <h3 className="mt-1.5 text-base sm:text-lg font-bold text-gray-900 leading-snug line-clamp-3">
                    {title}
                  </h3>
                  <div className="mt-auto pt-3 flex items-center justify-between gap-3 flex-wrap">
                    <EngagementRow
                      article={a}
                      likesMap={likesMap}
                      likeLoadingId={likeLoadingId}
                      onLike={onLike}
                    />
                    <span className="inline-flex items-center gap-1 text-[12px] text-emerald-600">
                      <Clock className="w-3.5 h-3.5" />
                      {minutes} min read
                    </span>
                  </div>
                </div>
                {showThumb && (
                  <div className="relative w-28 sm:w-40 h-20 sm:h-24 rounded-lg overflow-hidden shrink-0">
                    <Image
                      src={a.image!}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="160px"
                      unoptimized
                    />
                  </div>
                )}
              </div>
            </article>
          );
        })}
        {rest.length === 0 && topStories.length === 0 && (
          <p className="text-sm text-gray-500">No headlines to show.</p>
        )}
      </div>
    </div>
  );
}

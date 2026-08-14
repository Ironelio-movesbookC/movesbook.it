'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Clock, MessageCircle, ThumbsDown, ThumbsUp } from 'lucide-react';
import type { ArticlePasted } from './NewsArticlesList';
import { ogpDescriptionPlainText } from '@/components/shared/OgpRichDescription';
import {
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

  const scrollByCard = useCallback((dir: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>('[data-top-story]');
    const step = card ? card.offsetWidth + 16 : el.clientWidth * 0.7;
    el.scrollBy({ left: dir * step, behavior: 'smooth' });
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
        <div className="relative group/carousel">
          <div
            ref={scrollerRef}
            className="flex gap-4 overflow-x-auto pb-1 snap-x snap-mandatory scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          >
            {topStories.map((a) => {
              const title = a.title || a.url || 'Untitled';
              return (
                <article
                  key={a.id}
                  data-top-story
                  className="relative snap-start shrink-0 w-[min(22rem,78%)] sm:w-[min(24rem,46%)] h-52 sm:h-56 rounded-xl overflow-hidden cursor-pointer"
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
          {topStories.length > 2 && (
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

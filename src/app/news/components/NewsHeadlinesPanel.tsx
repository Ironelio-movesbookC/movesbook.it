'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Flame, MoreHorizontal } from 'lucide-react';
import type { ArticlePasted } from './NewsArticlesList';
import { ogpDescriptionPlainText } from '@/components/shared/OgpRichDescription';
import {
  HEADLINES_COMPACT_LIMIT,
  HEADLINES_PER_PAGE,
  faviconUrl,
  formatRelativeShort,
  rankHeadlines,
  sourceName,
} from '@/lib/news/headlines';

interface NewsHeadlinesPanelProps {
  articles: ArticlePasted[];
  getViewCount: (article: ArticlePasted) => number;
  onViewMore: () => void;
  onOpenArticle: (article: ArticlePasted) => void;
}

function SourceMark({ article }: { article: ArticlePasted }) {
  const icon = faviconUrl(article.url);
  const name = sourceName(article);
  const [failed, setFailed] = useState(false);
  const initial = name.slice(0, 1).toUpperCase();

  return (
    <span className="inline-flex w-4 h-4 rounded-[3px] overflow-hidden bg-gray-200 text-[9px] font-bold text-gray-600 items-center justify-center shrink-0">
      {icon && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={icon}
          alt=""
          width={16}
          height={16}
          className="w-4 h-4 object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        initial
      )}
    </span>
  );
}

export default function NewsHeadlinesPanel({
  articles,
  getViewCount,
  onViewMore,
  onOpenArticle,
}: NewsHeadlinesPanelProps) {
  const ranked = useMemo(
    () => rankHeadlines(articles, getViewCount).slice(0, HEADLINES_COMPACT_LIMIT),
    [articles, getViewCount],
  );
  const pageCount = Math.max(1, Math.ceil(ranked.length / HEADLINES_PER_PAGE));
  const [page, setPage] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPage((p) => Math.min(p, pageCount - 1));
  }, [pageCount]);

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [menuOpen]);

  const goPrev = useCallback(() => {
    setPage((p) => (p <= 0 ? pageCount - 1 : p - 1));
  }, [pageCount]);

  const goNext = useCallback(() => {
    setPage((p) => (p >= pageCount - 1 ? 0 : p + 1));
  }, [pageCount]);

  if (ranked.length === 0) return null;

  const slice = ranked.slice(page * HEADLINES_PER_PAGE, page * HEADLINES_PER_PAGE + HEADLINES_PER_PAGE);

  return (
    <article
      className="relative col-span-2 h-full min-h-[17rem] rounded-lg overflow-hidden border border-gray-200 bg-white shadow-sm flex flex-col"
      aria-label="News Headlines"
    >
      <div className="flex items-center justify-between px-3 pt-2.5 pb-1 shrink-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <Flame className="w-4 h-4 text-orange-500 fill-orange-500 shrink-0" aria-hidden />
          <h2 className="text-sm font-semibold text-gray-900 truncate">News Headlines</h2>
        </div>
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="p-1 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-800"
            aria-label="Headlines options"
            aria-expanded={menuOpen}
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 z-30 min-w-[9rem] rounded-md border border-gray-200 bg-white py-1 shadow-lg">
              <button
                type="button"
                className="w-full text-left px-3 py-1.5 text-sm text-gray-800 hover:bg-gray-50"
                onClick={() => {
                  setMenuOpen(false);
                  onViewMore();
                }}
              >
                View more
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="relative flex-1 min-h-0 flex flex-col px-3 pb-2">
        <ul className="flex-1 min-h-0 flex flex-col justify-start divide-y divide-gray-100">
          {slice.map((a) => {
            const title = a.title || ogpDescriptionPlainText(a.customDescription, a.description, a.url) || a.url || 'Untitled';
            return (
              <li key={a.id} className="py-2 first:pt-1">
                <button
                  type="button"
                  className="w-full text-left group/item"
                  onClick={() => onOpenArticle(a)}
                >
                  <span className="flex items-center gap-1.5 text-[11px] text-gray-500">
                    <SourceMark article={a} />
                    <span className="truncate">{sourceName(a)}</span>
                    <span aria-hidden>·</span>
                    <span className="shrink-0">{formatRelativeShort(a.savedAt)}</span>
                  </span>
                  <span className="mt-0.5 block text-[13px] font-bold text-gray-900 leading-snug line-clamp-2 group-hover/item:underline">
                    {title}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        {pageCount > 1 && (
          <>
            <button
              type="button"
              onClick={goPrev}
              className="absolute left-0.5 top-1/2 -translate-y-1/2 z-10 p-1 rounded-md bg-white/90 border border-gray-200 text-gray-700 shadow-sm hover:bg-gray-50"
              aria-label="Previous headlines"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={goNext}
              className="absolute right-0.5 top-1/2 -translate-y-1/2 z-10 p-1 rounded-md bg-white/90 border border-gray-200 text-gray-700 shadow-sm hover:bg-gray-50"
              aria-label="Next headlines"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}
      </div>

      <div className="flex items-center justify-between px-3 pb-2.5 pt-0.5 shrink-0">
        <div className="flex items-center gap-1.5" role="tablist" aria-label="Headlines pages">
          {Array.from({ length: pageCount }, (_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setPage(i)}
              className={`rounded-full transition-all ${
                i === page ? 'w-2 h-2 bg-gray-700' : 'w-1.5 h-1.5 bg-gray-300 hover:bg-gray-400'
              }`}
              aria-label={`Headlines page ${i + 1}`}
              aria-current={i === page ? 'true' : undefined}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={onViewMore}
          className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline"
        >
          View more
        </button>
      </div>
    </article>
  );
}

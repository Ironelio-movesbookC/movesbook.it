'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ArticlePasted } from './NewsArticlesList';
import { ogpDescriptionPlainText } from '@/components/shared/OgpRichDescription';

function formatDate(iso?: string) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return '';
  }
}

interface FeaturedNewsCardProps {
  articles: ArticlePasted[];
  onPreview?: (id: string) => void;
}

const AUTO_ADVANCE_MS = 5000;

/**
 * MSN-style featured card: 2 OGP columns wide, same row height as a single OGP card.
 */
export default function FeaturedNewsCard({ articles, onPreview }: FeaturedNewsCardProps) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    setIndex((i) => (articles.length === 0 ? 0 : Math.min(i, articles.length - 1)));
  }, [articles.length]);

  const goPrev = useCallback(() => {
    setIndex((i) => (i <= 0 ? articles.length - 1 : i - 1));
  }, [articles.length]);

  const goNext = useCallback(() => {
    setIndex((i) => (i >= articles.length - 1 ? 0 : i + 1));
  }, [articles.length]);

  useEffect(() => {
    if (articles.length < 2) return;
    const timer = window.setInterval(() => {
      if (pausedRef.current) return;
      setIndex((i) => (i >= articles.length - 1 ? 0 : i + 1));
    }, AUTO_ADVANCE_MS);
    return () => window.clearInterval(timer);
  }, [articles.length]);

  if (articles.length === 0) return null;

  const current = articles[index] ?? articles[0];
  const title = current.title || current.url || 'Featured news';
  const description = ogpDescriptionPlainText(
    current.customDescription,
    current.description,
    current.url,
  );

  return (
    <article
      className="relative col-span-2 h-full min-h-0 rounded-lg overflow-hidden border border-gray-200 shadow-sm group flex flex-col"
      aria-label="Featured news"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setPaused(false);
        }
      }}
    >
      <div className="relative flex-1 min-h-0">
        {current.image ? (
          <Image
            src={current.image}
            alt=""
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            unoptimized
            priority
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-slate-700 to-slate-900" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />

        {current.url && current.url !== '#' && (
          <a
            href={current.url}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute inset-0 z-[5] cursor-pointer"
            aria-label={`Open article: ${title}`}
          />
        )}

        {articles.length > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                goPrev();
              }}
              className="absolute left-1.5 top-1/2 -translate-y-1/2 z-20 p-1.5 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
              aria-label="Previous featured news"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                goNext();
              }}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 z-20 p-1.5 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
              aria-label="Next featured news"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}

        <div className="absolute inset-x-0 bottom-0 z-10 p-3 flex flex-col justify-end">
          {current.topic && (
            <span className="inline-flex self-start items-center rounded bg-white/20 backdrop-blur-sm px-1.5 py-0.5 text-[10px] font-medium text-white mb-1">
              {current.topic}
            </span>
          )}
          <button
            type="button"
            className="text-left w-full min-w-0"
            onClick={() => {
              if (onPreview) {
                onPreview(current.id);
              } else if (current.url && current.url !== '#') {
                window.open(current.url, '_blank', 'noopener,noreferrer');
              }
            }}
          >
            <h3 className="text-sm font-bold text-white line-clamp-2 leading-snug hover:underline">
              {title}
            </h3>
            {description ? (
              <p className="text-[11px] text-white/85 mt-0.5 line-clamp-1">{description}</p>
            ) : null}
          </button>
          <div className="flex items-center justify-between mt-1 gap-2 min-w-0">
            <span className="text-[10px] text-white/75">{formatDate(current.savedAt)}</span>
            {current.creatorUsername ? (
              <span className="text-[10px] text-white/75 truncate">by {current.creatorUsername}</span>
            ) : null}
          </div>
          {articles.length > 1 && (
            <div className="flex items-center justify-center gap-1 mt-1.5">
              {articles.map((a, i) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setIndex(i)}
                  className={`h-1 rounded-full transition-all ${
                    i === index ? 'w-4 bg-white' : 'w-1 bg-white/50 hover:bg-white/75'
                  }`}
                  aria-label={`Featured slide ${i + 1}`}
                  aria-current={i === index ? 'true' : undefined}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

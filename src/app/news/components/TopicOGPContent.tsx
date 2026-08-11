'use client';

import { useState, useMemo } from 'react';
import type { OGPData } from './OGPForm';
import { ChevronDown } from 'lucide-react';
import { ogpDescriptionPlainText } from '@/components/shared/OgpRichDescription';

export type ArticlePasted = OGPData & { customDescription?: string; id: string; topic: string; savedAt?: string };
export type ArticleTyped = { id: string; description: string; topic: string; savedAt?: string };

const PER_PAGE_OPTIONS = [5, 10, 15, 20] as const;

function formatDate(iso?: string) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return '';
  }
}

/** Resolve relative image URL so it loads in the client */
function resolveImageUrl(imageUrl: string | null | undefined, baseUrl: string | null | undefined): string | null {
  if (!imageUrl || !imageUrl.trim()) return null;
  const trimmed = imageUrl.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  try {
    return new URL(trimmed, baseUrl || 'https://example.com').href;
  } catch {
    return trimmed;
  }
}

/** Single OGP card: use direct image URL first (same as form preview), then proxy on error */
function OGPCard({ article: a, onRemove }: { article: ArticlePasted; onRemove?: () => void }) {
  const [imageError, setImageError] = useState(false);
  const [useProxyFallback, setUseProxyFallback] = useState(false);
  const resolvedImage = useMemo(
    () => resolveImageUrl(a.image, a.url),
    [a.image, a.url]
  );
  const showImage = resolvedImage && !imageError;
  const imgSrc = useMemo(() => {
    if (!resolvedImage) return null;
    if (useProxyFallback) {
      return `/api/ogp-image?url=${encodeURIComponent(resolvedImage)}`;
    }
    return resolvedImage;
  }, [resolvedImage, useProxyFallback]);
  const handleImageError = () => {
    if (!useProxyFallback) {
      setUseProxyFallback(true);
      return;
    }
    setImageError(true);
  };
  return (
    <article className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow group relative">
      <a
        href={a.url || '#'}
        target="_blank"
        rel="noopener noreferrer"
        className="block cursor-pointer focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-inset rounded-lg"
        onClick={(e) => {
          if (!a.url || a.url === '#') e.preventDefault();
        }}
      >
        <div className="aspect-video bg-gray-100 relative overflow-hidden">
          {showImage && imgSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={imgSrc}
              src={imgSrc}
              alt=""
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
              onError={handleImageError}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm p-4 text-center">
              No image
            </div>
          )}
        </div>
        <div className="p-3 flex flex-col min-h-0">
          <h4 className="font-medium text-gray-900 line-clamp-2 text-sm leading-snug">
            {a.title || a.url}
          </h4>
          {(a.description || a.customDescription) && (
            <p className="text-xs text-gray-500 mt-1 line-clamp-2 flex-1">
              {ogpDescriptionPlainText(a.customDescription, a.description)}
            </p>
          )}
          <p className="text-sm text-gray-600 mt-2">
            {formatDate(a.savedAt ?? new Date().toISOString())}
          </p>
        </div>
      </a>
      {onRemove && (
        <div className="absolute bottom-3 left-3 right-3 flex justify-end">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onRemove();
            }}
            className="text-xs text-red-600 opacity-0 group-hover:opacity-100 transition-opacity hover:underline bg-white/90 px-2 py-1 rounded"
          >
            Remove
          </button>
        </div>
      )}
    </article>
  );
}

interface TopicOGPContentProps {
  topic: string;
  pasted: ArticlePasted[];
  typed: ArticleTyped[];
  onRemovePasted?: (id: string) => void;
  onRemoveTyped?: (id: string) => void;
}

export default function TopicOGPContent({
  topic,
  pasted,
  typed,
  onRemovePasted,
  onRemoveTyped,
}: TopicOGPContentProps) {
  const [perPage, setPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const allItems = useMemo(() => {
    const pastedItems = pasted.map((a) => ({ type: 'pasted' as const, ...a }));
    const typedItems = typed.map((a) => ({ type: 'typed' as const, ...a }));
    return [...pastedItems, ...typedItems].sort((a, b) => {
      const dateA = (a.savedAt && new Date(a.savedAt).getTime()) || 0;
      const dateB = (b.savedAt && new Date(b.savedAt).getTime()) || 0;
      return dateB - dateA;
    });
  }, [pasted, typed]);

  const totalPages = Math.max(1, Math.ceil(allItems.length / perPage));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const start = (safePage - 1) * perPage;
  const pageItems = allItems.slice(start, start + perPage);

  const hasContent = allItems.length > 0;

  return (
    <div className="mt-4 rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="bg-gray-800 text-white px-4 py-2 font-semibold">
        OGP: {topic}
      </div>

      <div className="p-4">
        {!hasContent ? (
          <p className="text-sm text-gray-500 py-6">
            Content for <strong>{topic}</strong> will appear here. Click &quot;+&quot; to add links or descriptions.
          </p>
        ) : (
          <>
            {/* Pagination bar: number per page + Prev / pages / Next */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 whitespace-nowrap">Number of articles in one page</span>
                <div className="relative">
                  <select
                    value={perPage}
                    onChange={(e) => {
                      setPerPage(Number(e.target.value) as (typeof PER_PAGE_OPTIONS)[number]);
                      setCurrentPage(1);
                    }}
                    className="appearance-none pl-3 pr-8 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 text-sm font-medium focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  >
                    {PER_PAGE_OPTIONS.map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-gray-500 pointer-events-none absolute right-2 top-1/2 -translate-y-1/2" />
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safePage <= 1}
                  className="px-3 py-1.5 rounded border border-gray-300 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Prev
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setCurrentPage(p)}
                    className={`min-w-[2.25rem] py-1.5 rounded border text-sm font-medium ${
                      p === safePage
                        ? 'border-cyan-600 bg-cyan-600 text-white'
                        : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage >= totalPages}
                  className="px-3 py-1.5 rounded border border-gray-300 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>

            {/* Grid of article cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {pageItems.map((item) => {
                if (item.type === 'pasted') {
                  const a = item as ArticlePasted & { type: 'pasted' };
                  return (
                    <OGPCard
                      key={a.id}
                      article={a}
                      onRemove={onRemovePasted ? () => onRemovePasted(a.id) : undefined}
                    />
                  );
                }
                const a = item as ArticleTyped & { type: 'typed' };
                return (
                  <article
                    key={a.id}
                    className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow group"
                  >
                    <div className="aspect-video bg-gray-100 flex items-center justify-center">
                      <svg className="w-12 h-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                      </svg>
                    </div>
                    <div className="p-3">
                      <h4 className="font-medium text-gray-900 line-clamp-2 text-sm leading-snug">
                        {ogpDescriptionPlainText(a.description)}
                      </h4>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatDate(a.savedAt)}
                      </p>
                    </div>
                    {onRemoveTyped && (
                      <div className="px-3 pb-3">
                        <button
                          type="button"
                          onClick={() => onRemoveTyped(a.id)}
                          className="text-xs text-red-600 opacity-0 group-hover:opacity-100 transition-opacity hover:underline"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

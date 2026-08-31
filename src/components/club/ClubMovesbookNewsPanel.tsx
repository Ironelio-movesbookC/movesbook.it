'use client';

import { useCallback, useEffect, useState } from 'react';
import { BookOpen, ExternalLink, Globe, Loader2, Newspaper, X } from 'lucide-react';
import type { GlobalNewsFeedItem } from '@/lib/globalNewsAuth';
import SharedNewsItemPreviewModal, {
  previewPayloadFromFeedItem,
  type SharedNewsPreviewPayload,
} from '@/components/news/SharedNewsItemPreviewModal';
import NewsFeedMetaLine from '@/components/news/NewsFeedMetaLine';

type ClubMovesbookNewsPanelProps = {
  onClose?: () => void;
  title?: string;
};

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

function itemTitle(item: GlobalNewsFeedItem) {
  if (item.title?.trim()) return item.title.trim();
  if (item.kind === 'ogp') {
    return item.customDescription?.trim() || item.description?.trim() || item.url;
  }
  return 'Untitled';
}

/**
 * Club → Movesbook News: read-only view of superadmin Global News
 * (News + OGP News with inGlobalNews, sorted by date).
 */
export default function ClubMovesbookNewsPanel({
  onClose,
  title = 'Movesbook News',
}: ClubMovesbookNewsPanelProps) {
  const [items, setItems] = useState<GlobalNewsFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<SharedNewsPreviewPayload | null>(null);

  const loadItems = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Not authenticated');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/news/global', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      if (!res.ok) throw new Error('Failed to load Movesbook News');
      const data = (await res.json()) as { items?: GlobalNewsFeedItem[] };
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch {
      setError('Could not load Movesbook News.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  const openPreview = useCallback((item: GlobalNewsFeedItem) => {
    setPreview(previewPayloadFromFeedItem(item));
  }, []);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b border-gray-200 bg-gray-50 px-4 py-3">
        <BookOpen className="h-5 w-5 shrink-0 text-teal-700" />
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <p className="text-sm text-gray-500">
            News and OGP News shared by Movesbook, sorted by date
          </p>
        </div>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-700"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center gap-2 py-12 text-sm text-gray-600">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading…
          </div>
        ) : error ? (
          <p className="py-12 text-center text-sm text-red-600">{error}</p>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-10 text-center">
            <Globe className="mx-auto mb-3 h-10 w-10 text-gray-300" />
            <p className="font-medium text-gray-600">No Movesbook News yet</p>
            <p className="mt-1 text-sm text-gray-500">
              When Movesbook shares News or OGP News globally, they will appear here.
            </p>
          </div>
        ) : (
          <ul className="mx-auto max-w-5xl space-y-3">
            {items.map((item) => {
              const titleText = itemTitle(item);

              return (
                <li key={`${item.kind}-${item.id}`}>
                  <button
                    type="button"
                    onClick={() => openPreview(item)}
                    className="flex w-full gap-4 rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition-shadow hover:shadow-md"
                  >
                    <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
                      {item.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={
                            item.kind === 'news' &&
                            item.image &&
                            !item.image.startsWith('/') &&
                            !item.image.startsWith('http')
                              ? `/img/news/${item.image}`
                              : item.image
                          }
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-gray-400">
                          {item.kind === 'news' ? (
                            <Newspaper className="h-8 w-8" />
                          ) : (
                            <Globe className="h-8 w-8" />
                          )}
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${
                            item.kind === 'news'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-teal-100 text-teal-800'
                          }`}
                        >
                          {item.kind === 'news' ? 'News' : 'OGP News'}
                        </span>
                        <span className="text-xs text-gray-500">{formatDate(item.date)}</span>
                      </div>

                      <h3 className="line-clamp-2 text-base font-semibold text-gray-900">
                        {titleText}
                      </h3>

                      <NewsFeedMetaLine
                        kind={item.kind}
                        sector={item.kind === 'news' ? item.categoryName : item.topic}
                        mode={item.kind === 'news' ? item.method : null}
                        postedBy={item.kind === 'news' ? item.author : item.creatorUsername}
                      />

                      <div className="mt-3 flex flex-wrap items-center gap-3">
                        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-700">
                          {item.kind === 'ogp' ? (
                            <>
                              Open link
                              <ExternalLink className="h-3.5 w-3.5" />
                            </>
                          ) : (
                            'View article'
                          )}
                        </span>
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <SharedNewsItemPreviewModal item={preview} onClose={() => setPreview(null)} />
    </div>
  );
}

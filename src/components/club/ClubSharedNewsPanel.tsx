'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ExternalLink, Globe, Loader2, Newspaper, X } from 'lucide-react';
import type { ClubSharedFeedItem } from '@/lib/clubNewsShareAuth';

type ClubSharedNewsPanelProps = {
  clubId: string;
  type: 'news' | 'ogp' | 'all';
  title?: string;
  onClose?: () => void;
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

function itemTitle(item: ClubSharedFeedItem) {
  if (item.title?.trim()) return item.title.trim();
  if (item.kind === 'ogp') {
    return item.customDescription?.trim() || item.description?.trim() || item.url;
  }
  return 'Untitled';
}

/**
 * Club Global News — merged News + OGP News promoted into this club,
 * sorted chronologically (mirrors admin Global News).
 */
export default function ClubSharedNewsPanel({
  clubId,
  type,
  title,
  onClose,
}: ClubSharedNewsPanelProps) {
  const [items, setItems] = useState<ClubSharedFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removingKey, setRemovingKey] = useState<string | null>(null);

  const isGlobalFeed = type === 'all';

  const loadItems = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token || !clubId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/clubs/${encodeURIComponent(clubId)}/shared-news?type=${encodeURIComponent(type)}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!res.ok) throw new Error('Failed to load shared news');
      const data = (await res.json()) as { items?: ClubSharedFeedItem[] };
      setItems(data.items ?? []);
    } catch {
      setError('Could not load shared news for this club.');
    } finally {
      setLoading(false);
    }
  }, [clubId, type]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  const handleRemoveFromGlobal = useCallback(
    async (item: ClubSharedFeedItem) => {
      const token = localStorage.getItem('token');
      if (!token || !clubId) return;
      const key = `${item.kind}-${item.id}`;
      setRemovingKey(key);
      try {
        const path =
          item.kind === 'news'
            ? `/api/clubs/shared-news/news/${encodeURIComponent(item.id)}`
            : `/api/clubs/shared-news/ogp/${encodeURIComponent(item.id)}`;
        const res = await fetch(path, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ clubId, inClubGlobalNews: false }),
        });
        if (!res.ok) throw new Error('Failed to remove');
        setItems((prev) => prev.filter((x) => !(x.kind === item.kind && x.id === item.id)));
      } catch {
        setError('Could not remove from Club Global News');
      } finally {
        setRemovingKey(null);
      }
    },
    [clubId],
  );

  const panelTitle =
    title ??
    (type === 'ogp'
      ? 'OGP News'
      : type === 'news'
        ? 'News'
        : 'Club Global News');

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b border-gray-200 bg-gray-50 px-4 py-3">
        <Globe className="h-5 w-5 shrink-0 text-teal-700" />
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold text-gray-900">{panelTitle}</h2>
          {isGlobalFeed ? (
            <p className="text-sm text-gray-500">
              News and OGP News shared here, sorted by date
            </p>
          ) : null}
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
            <p className="font-medium text-gray-600">
              {isGlobalFeed
                ? 'No items in Club Global News yet'
                : `No shared ${type === 'ogp' ? 'OGP News' : 'News'} yet.`}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              {isGlobalFeed
                ? 'Use the globe icon on Club News or Club OGP News cards to share items here.'
                : 'Use "Share in My Clubs" on OGP News or News articles to add items here.'}
            </p>
          </div>
        ) : isGlobalFeed ? (
          <ul className="mx-auto max-w-5xl space-y-3">
            {items.map((item) => {
              const titleText = itemTitle(item);
              const viewHref =
                item.kind === 'news'
                  ? `/news-by-movesbook/${item.id}`
                  : item.url;
              const rowKey = `${item.kind}-${item.id}`;

              return (
                <li
                  key={rowKey}
                  className="flex gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
                    {item.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={
                          item.kind === 'news' && item.image && !item.image.startsWith('/')
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

                    <p className="mt-1 line-clamp-2 text-sm text-gray-600">
                      {item.kind === 'news'
                        ? [item.categoryName, item.method, item.author]
                            .filter(Boolean)
                            .join(' · ')
                        : [
                            item.topic,
                            item.creatorUsername ? `by ${item.creatorUsername}` : null,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                    </p>

                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      {item.kind === 'ogp' ? (
                        <a
                          href={viewHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-700 hover:text-teal-900"
                        >
                          Open link
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      ) : (
                        <Link
                          href={viewHref}
                          className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-700 hover:text-teal-900"
                        >
                          View article
                        </Link>
                      )}
                      <button
                        type="button"
                        onClick={() => void handleRemoveFromGlobal(item)}
                        disabled={removingKey === rowKey}
                        className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50"
                      >
                        Remove from Club Global News
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {items.map((item) =>
              item.kind === 'ogp' ? (
                <article
                  key={item.shareId}
                  className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
                >
                  {item.image ? (
                    <div className="relative h-40 w-full bg-gray-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.image}
                        alt={item.title ?? 'OGP'}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : null}
                  <div className="space-y-2 p-4">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span className="rounded bg-blue-100 px-2 py-0.5 font-medium text-blue-800">
                        {item.topic}
                      </span>
                      {item.creatorUsername ? <span>by {item.creatorUsername}</span> : null}
                    </div>
                    <h3 className="line-clamp-2 text-sm font-semibold text-gray-900">
                      {item.title || item.customDescription || item.description || 'Untitled'}
                    </h3>
                    <p className="text-xs text-gray-500">
                      Shared {new Date(item.sharedAt).toLocaleDateString()}
                    </p>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800"
                    >
                      Open link
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </article>
              ) : (
                <article
                  key={item.shareId}
                  className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
                >
                  {item.image ? (
                    <div className="relative h-40 w-full bg-gray-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={
                          item.image.startsWith('/')
                            ? item.image
                            : `/img/news/${item.image}`
                        }
                        alt={item.title ?? 'News'}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="flex h-24 items-center justify-center bg-gray-100">
                      <Newspaper className="h-8 w-8 text-gray-400" />
                    </div>
                  )}
                  <div className="space-y-2 p-4">
                    {item.categoryName ? (
                      <span className="inline-block rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                        {item.categoryName}
                      </span>
                    ) : null}
                    <h3 className="line-clamp-2 text-sm font-semibold text-gray-900">
                      {item.title || 'Untitled'}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {item.author ? `${item.author} · ` : ''}
                      Shared {new Date(item.sharedAt).toLocaleDateString()}
                    </p>
                    <Link
                      href={`/news-by-movesbook/${item.id}`}
                      className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800"
                    >
                      Read article
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </article>
              ),
            )}
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ExternalLink, Globe, Loader2, Newspaper } from 'lucide-react';
import type { ClubSharedFeedItem } from '@/lib/clubNewsShareAuth';

type ClubSharedNewsPanelProps = {
  clubId: string;
  type: 'news' | 'ogp' | 'all';
  title?: string;
};

export default function ClubSharedNewsPanel({
  clubId,
  type,
  title,
}: ClubSharedNewsPanelProps) {
  const [items, setItems] = useState<ClubSharedFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const panelTitle =
    title ??
    (type === 'ogp'
      ? 'OGP News'
      : type === 'news'
        ? 'News'
        : 'Club Global News');

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <h2 className="mb-4 text-2xl font-bold text-gray-900">{panelTitle}</h2>
      {loading ? (
        <div className="flex items-center gap-2 py-12 text-sm text-gray-600">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading…
        </div>
      ) : error ? (
        <p className="py-12 text-center text-sm text-red-600">{error}</p>
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
          <Globe className="mx-auto mb-3 h-10 w-10 text-gray-400" />
          <p className="text-sm text-gray-600">
            No shared {type === 'ogp' ? 'OGP News' : type === 'news' ? 'News' : 'items'} yet.
          </p>
          <p className="mt-2 text-xs text-gray-500">
            Use &quot;Share in My Clubs&quot; on OGP News or News articles to add items here.
          </p>
        </div>
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
                    <Image
                      src={item.image.startsWith('/') ? item.image : `/img/news/${item.image}`}
                      alt={item.title ?? 'News'}
                      fill
                      className="object-cover"
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
  );
}

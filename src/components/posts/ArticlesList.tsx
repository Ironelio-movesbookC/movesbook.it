'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Calendar, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface ArticleItem {
  id: string;
  title: string;
  image: string | null;
  createdAt: string;
  author: string | null;
  originalAuthor: string | null;
  category: { id: string; categoryName: string } | null;
  languageTitles: Array<{ title: string; language: { code: string } }>;
  briefDesc: string | null;
}

interface ArticlesListProps {
  mode: 'mine' | 'friends';
  perPageOptions?: number[];
}

const DEFAULT_PER_PAGE_OPTIONS = [5, 10, 15, 20];

function formatDatePosted(dateString: string) {
  const date = new Date(dateString);
  const day = date.getDate();
  const suffix = (d: number) => {
    if (d > 3 && d < 21) return 'th';
    switch (d % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  };
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${day}${suffix(day)} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

function getTitle(item: ArticleItem, lang: string) {
  const lt = item.languageTitles.find((l) => l.language.code === lang);
  if (lt?.title?.trim()) return lt.title;
  return item.title || '';
}

export default function ArticlesList({
  mode,
  perPageOptions = DEFAULT_PER_PAGE_OPTIONS,
}: ArticlesListProps) {
  const { user } = useAuth();

  const [articles, setArticles] = useState<ArticleItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  const fetchArticles = useCallback(async () => {
    if (!user) return;
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      let queryParam = '';

      if (mode === 'mine') {
        queryParam = `writerUsername=${encodeURIComponent(user.username)}`;
      } else {
        const friendsRes = await fetch('/api/user/friends', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!friendsRes.ok) throw new Error('Failed to load friends');
        const friendsData = await friendsRes.json();
        const usernames: string[] = (friendsData.friends ?? []).map((f: { username: string }) => f.username).filter(Boolean);
        if (usernames.length === 0) {
          setArticles([]);
          setTotal(0);
          setLoading(false);
          return;
        }
        queryParam = `writerUsernames=${usernames.map(encodeURIComponent).join(',')}`;
      }

      const res = await fetch(
        `/api/public/news?${queryParam}&page=${page}&limit=${perPage}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error('Failed to load articles');
      const data = await res.json();
      setArticles(data.news ?? []);
      setTotal(data.total ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [user, mode, page, perPage]);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  useEffect(() => {
    setPage(1);
  }, [mode]);

  const renderPagination = () => {
    if (totalPages <= 1) return null;
    const pages: (number | '...')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push('...');
      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
      if (page < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }

    return (
      <div className="flex items-center justify-center gap-1 mt-6 flex-wrap">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
          className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`ellipsis-${i}`} className="px-2 text-gray-400 text-sm">…</span>
          ) : (
            <button
              key={p}
              onClick={() => setPage(p as number)}
              className={`w-8 h-8 rounded-md text-sm font-medium transition-colors ${
                page === p
                  ? 'bg-yellow-400 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {p}
            </button>
          )
        )}
        <button
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page === totalPages}
          className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">
          {loading ? 'Loading…' : `${total} article${total !== 1 ? 's' : ''}`}
        </p>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Per page:</span>
          <select
            value={perPage}
            onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }}
            className="text-sm border border-gray-200 rounded-md px-2 py-1 text-gray-700 focus:outline-none focus:ring-2 focus:ring-yellow-400"
          >
            {perPageOptions.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          <span className="text-sm">Loading articles…</span>
        </div>
      )}

      {!loading && error && (
        <p className="text-sm text-red-500 text-center py-8">{error}</p>
      )}

      {!loading && !error && articles.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-8">No articles found.</p>
      )}

      {!loading && !error && articles.length > 0 && (
        <div className="space-y-4">
          {articles.map((item) => {
            const title = getTitle(item, 'en');
            const authorName = item.author || item.originalAuthor || 'private';
            return (
              <Link
                key={item.id}
                href={`/news-by-movesbook/${item.id}`}
                className="block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow group"
              >
                <div className="flex flex-col md:flex-row">
                  {item.image && (
                    <div className="md:w-48 flex-shrink-0 p-3 md:pr-0">
                      <div className="relative h-36 w-full rounded-lg overflow-hidden">
                        <Image
                          src={item.image}
                          alt={title}
                          fill
                          className="object-cover rounded-lg"
                        />
                      </div>
                    </div>
                  )}
                  <div className="flex-1 p-4">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      {item.category && (
                        <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                          {item.category.categoryName}
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors line-clamp-2">
                      {title}
                    </h3>
                    {item.briefDesc && (
                      <p className="text-gray-500 text-sm mb-3 line-clamp-2">{item.briefDesc}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-gray-400 flex-wrap">
                      <span>
                        By <span className="font-medium text-gray-600">{authorName}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDatePosted(item.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {!loading && renderPagination()}
    </div>
  );
}

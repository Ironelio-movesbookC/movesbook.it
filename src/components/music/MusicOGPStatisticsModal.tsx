'use client';

import { useCallback, useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';

export type MusicOgpStatRow = {
  userId: string;
  username: string;
  postCount: number;
  lastPostAt: string;
  daysSinceLastPost: number;
};

interface MusicOGPStatisticsModalProps {
  open: boolean;
  onClose: () => void;
  getAuthHeaders: () => HeadersInit;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function MusicOGPStatisticsModal({
  open,
  onClose,
  getAuthHeaders,
}: MusicOGPStatisticsModalProps) {
  const [rows, setRows] = useState<MusicOgpStatRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');

  const fetchStats = useCallback(
    async (q: string) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (q.trim()) params.set('q', q.trim());
        const qs = params.toString();
        const res = await fetch(
          `/api/music/ogp/statistics${qs ? `?${qs}` : ''}`,
          { headers: getAuthHeaders() }
        );
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(
            typeof data.error === 'string' ? data.error : 'Failed to load statistics'
          );
        }
        const data = await res.json();
        setRows(Array.isArray(data.users) ? data.users : []);
      } catch (e) {
        setRows([]);
        setError(e instanceof Error ? e.message : 'Failed to load statistics');
      } finally {
        setLoading(false);
      }
    },
    [getAuthHeaders]
  );

  useEffect(() => {
    if (!open) return;
    setSearchInput('');
    setAppliedQuery('');
    void fetchStats('');
  }, [open, fetchStats]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const handleSearch = () => {
    const q = searchInput.trim();
    setAppliedQuery(q);
    void fetchStats(q);
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="music-ogp-statistics-title"
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-200 shrink-0">
          <h2 id="music-ogp-statistics-title" className="text-lg font-semibold text-gray-900">
            OG Music statistics
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-4 py-3 border-b border-gray-100 flex flex-wrap items-center gap-2 shrink-0">
          <div className="relative flex-1 min-w-[180px]">
            <Search
              className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
              aria-hidden
            />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSearch();
              }}
              placeholder="Search username"
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              aria-label="Search username"
            />
          </div>
          <button
            type="button"
            onClick={handleSearch}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-[#1a2744] text-white hover:bg-[#243456] transition-colors"
          >
            Search
          </button>
          {appliedQuery ? (
            <button
              type="button"
              onClick={() => {
                setSearchInput('');
                setAppliedQuery('');
                void fetchStats('');
              }}
              className="px-3 py-2 rounded-lg text-sm font-medium text-gray-700 border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              Clear
            </button>
          ) : null}
        </div>

        <div className="flex-1 overflow-auto min-h-0">
          {loading ? (
            <p className="p-4 text-sm text-gray-500">Loading statistics...</p>
          ) : error ? (
            <p className="p-4 text-sm text-red-600">{error}</p>
          ) : rows.length === 0 ? (
            <p className="p-4 text-sm text-gray-500">
              {appliedQuery
                ? `No users found matching “${appliedQuery}”.`
                : 'No users have posted OG Music yet.'}
            </p>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr className="border-b border-gray-200">
                  <th className="px-4 py-2.5 font-semibold text-gray-700">Username</th>
                  <th className="px-4 py-2.5 font-semibold text-gray-700 text-right whitespace-nowrap">
                    OG Music posts
                  </th>
                  <th className="px-4 py-2.5 font-semibold text-gray-700 whitespace-nowrap">
                    Last post
                  </th>
                  <th className="px-4 py-2.5 font-semibold text-gray-700 text-right whitespace-nowrap">
                    Days since
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.userId}
                    className="border-b border-gray-100 hover:bg-gray-50/80"
                  >
                    <td className="px-4 py-2.5 font-medium text-gray-900">{row.username}</td>
                    <td className="px-4 py-2.5 text-right text-gray-800 tabular-nums">
                      {row.postCount}
                    </td>
                    <td className="px-4 py-2.5 text-gray-700 whitespace-nowrap">
                      {formatDate(row.lastPostAt)}
                    </td>
                    <td className="px-4 py-2.5 text-right text-gray-800 tabular-nums">
                      {row.daysSinceLastPost}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {!loading && !error && rows.length > 0 ? (
          <div className="px-4 py-2 border-t border-gray-100 text-xs text-gray-500 shrink-0">
            {rows.length} user{rows.length === 1 ? '' : 's'}
            {appliedQuery ? ` matching “${appliedQuery}”` : ''}
          </div>
        ) : null}
      </div>
    </div>
  );
}

'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Eye, Link2, Search, User } from 'lucide-react';
import {
  NAV_SEARCH_SCOPE_LABELS,
  navSearchLabelFromScope,
  navSearchScopeFromLabel,
  type NavSearchScope,
  type NavUserSearchRow,
} from '@/lib/adminNavUserSearchScope';

const PAGE_SIZE = 10;

const isDataUrl = (src?: string | null) =>
  typeof src === 'string' && src.startsWith('data:image/');

type AdminNavUserSearchResultsProps = {
  initialScope: NavSearchScope;
  initialQuery: string;
};

export default function AdminNavUserSearchResults({
  initialScope,
  initialQuery,
}: AdminNavUserSearchResultsProps) {
  const router = useRouter();
  const [scope, setScope] = useState<NavSearchScope>(initialScope);
  const [query, setQuery] = useState(initialQuery);
  const [users, setUsers] = useState<NavUserSearchRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const runSearch = useCallback(async (searchScope: NavSearchScope, searchQuery: string) => {
    const q = searchQuery.trim();
    if (!q) {
      setUsers([]);
      setTotal(0);
      setError('');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) {
        setError('Admin session not found. Please log in again.');
        setUsers([]);
        setTotal(0);
        return;
      }

      const params = new URLSearchParams({
        scope: searchScope,
        q,
        limit: '100',
      });
      const res = await fetch(`/api/admin/nav-user-search?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Search failed');

      setUsers(Array.isArray(data.users) ? data.users : []);
      setTotal(typeof data.total === 'number' ? data.total : 0);
      setCurrentPage(1);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Search failed');
      setUsers([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setScope(initialScope);
    setQuery(initialQuery);
    void runSearch(initialScope, initialQuery);
  }, [initialScope, initialQuery, runSearch]);

  const totalPages = Math.max(1, Math.ceil(users.length / PAGE_SIZE));
  const pageRows = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return users.slice(start, start + PAGE_SIZE);
  }, [users, currentPage]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const openPcu = (userId: string) => {
    router.push(`/subscriptionuserlists/historyuser/${userId}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    const params = new URLSearchParams();
    params.set('scope', scope);
    if (q) params.set('q', q);
    router.replace(`/admin/user-search?${params.toString()}`);
    void runSearch(scope, q);
  };

  const scopeLabel = navSearchLabelFromScope(scope);

  return (
    <div className="min-h-full bg-gray-100">
      <div className="flex items-center gap-3 px-4 py-3 bg-gray-200 border-b border-gray-300">
        <Search className="w-5 h-5 text-teal-700" />
        <span className="text-gray-800 font-medium">User search</span>
        {query.trim() ? (
          <span className="text-sm text-gray-600">
            {loading ? 'Searching…' : `${total} match${total === 1 ? '' : 'es'}`} in{' '}
            <span className="font-semibold">{scopeLabel}</span>
          </span>
        ) : null}
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6">
        <form
          onSubmit={handleSubmit}
          className="mb-4 flex flex-wrap items-center gap-2 rounded border border-gray-300 bg-white p-3 shadow-sm"
        >
          <span className="text-sm font-bold text-gray-700 whitespace-nowrap">Search in</span>
          <select
            value={scopeLabel}
            onChange={(e) => setScope(navSearchScopeFromLabel(e.target.value))}
            className="h-9 border border-gray-300 bg-white px-3 rounded text-sm text-gray-900"
          >
            {Object.values(NAV_SEARCH_SCOPE_LABELS).map((label) => (
              <option key={label} value={label}>
                {label}
              </option>
            ))}
          </select>
          <div className="relative flex-1 min-w-[12rem]">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by username or name…"
              className="w-full h-9 border border-gray-300 rounded px-3 pr-10 text-sm text-gray-900"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded bg-gray-700 hover:bg-gray-600"
              title="Search"
            >
              <Search className="w-4 h-4 text-white" />
            </button>
          </div>
        </form>

        {error ? (
          <div className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="flex justify-end gap-1 mb-2">
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            className="px-3 py-1.5 border border-gray-400 rounded bg-white text-gray-700 text-sm hover:bg-gray-50 disabled:opacity-50"
          >
            Prev
          </button>
          <button
            type="button"
            className="px-3 py-1.5 border border-gray-600 bg-gray-600 text-white rounded text-sm"
          >
            {currentPage}
          </button>
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            className="px-3 py-1.5 border border-gray-400 rounded bg-white text-gray-700 text-sm hover:bg-gray-50 disabled:opacity-50"
          >
            Next
          </button>
        </div>

        <div className="overflow-x-auto rounded border border-gray-300 bg-white shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-teal-700 text-white">
                <th className="px-4 py-3 font-semibold text-sm w-12">Image</th>
                <th className="px-4 py-3 font-semibold text-sm">UserName</th>
                <th className="px-4 py-3 font-semibold text-sm">Name</th>
                <th className="px-4 py-3 font-semibold text-sm">Country</th>
                <th className="px-4 py-3 font-semibold text-sm">Language</th>
                <th className="px-4 py-3 font-semibold text-sm">Last Login</th>
                <th className="px-4 py-3 font-semibold text-sm">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    Searching…
                  </td>
                </tr>
              ) : !query.trim() ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    Select a user type and enter a name, then click search.
                  </td>
                </tr>
              ) : pageRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    No users found.
                  </td>
                </tr>
              ) : (
                pageRows.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="w-10 h-10 rounded overflow-hidden bg-gray-200 flex items-center justify-center">
                        {row.imageUrl ? (
                          isDataUrl(row.imageUrl) ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={row.imageUrl}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Image
                              src={row.imageUrl}
                              alt={row.name}
                              width={40}
                              height={40}
                              className="object-cover w-full h-full"
                            />
                          )
                        ) : (
                          <User className="w-5 h-5 text-gray-500" />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => openPcu(row.id)}
                        className="text-red-600 hover:text-red-700 hover:underline font-medium"
                      >
                        {row.username}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-gray-800">{row.name}</td>
                    <td className="px-4 py-3 text-gray-700">{row.country}</td>
                    <td className="px-4 py-3 font-bold text-gray-800">{row.language}</td>
                    <td className="px-4 py-3 text-gray-600">{row.lastLogin}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openPcu(row.id)}
                          className="p-1.5 text-gray-500 hover:text-teal-600 hover:bg-teal-50 rounded"
                          title="Open panel control (PCU)"
                        >
                          <Link2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openPcu(row.id)}
                          className="p-1.5 text-gray-500 hover:text-teal-600 hover:bg-teal-50 rounded"
                          title="View PCU"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

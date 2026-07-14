'use client';

import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import type { SupportCategory } from '@/lib/messages/userThreads';

type LangOption = { id: string; code: string; name: string };

type FeedItem = {
  id: string;
  title: string;
  excerpt: string;
  updatedAt: string;
  messageCount?: number;
  author?: string;
};

type ThreadDetail = {
  thread: {
    id: string;
    subject: string;
    kind: string;
    createdAt: string;
    updatedAt: string;
    languageCode?: string | null;
    pathStaff?: string | null;
    supportCategory?: string | null;
    errorMessage?: string | null;
    authorName?: string | null;
  };
  messages: Array<{
    id: string;
    body: string;
    createdAt: string;
    isStaff: boolean;
    sender: { id: string; name: string; username: string } | null;
  }>;
};

export type AdminFeedbackKind = 'review' | 'support';

type Props = {
  kind: AdminFeedbackKind;
  category?: SupportCategory;
  bugsOnly?: boolean;
  excludeBugs?: boolean;
  title: string;
  description: string;
  emptyMessage?: string;
};

export default function AdminCustomerFeedbackPanel({
  kind,
  category,
  bugsOnly = false,
  excludeBugs = false,
  title,
  description,
  emptyMessage = 'No user submissions yet.',
}: Props) {
  const [langOptions, setLangOptions] = useState<LangOption[]>([]);
  const [filterLang, setFilterLang] = useState('');
  const [recentOnly, setRecentOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [threadDetail, setThreadDetail] = useState<ThreadDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [replyBody, setReplyBody] = useState('');
  const [replySending, setReplySending] = useState(false);
  const [replyError, setReplyError] = useState('');

  const authFetch = useCallback(async (path: string, init?: RequestInit) => {
    const token = localStorage.getItem('adminToken');
    if (!token) throw new Error('Admin session not found.');
    const headers = new Headers(init?.headers);
    headers.set('Authorization', `Bearer ${token}`);
    if (init?.body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    const res = await fetch(path, { ...init, headers, cache: 'no-store' });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data?.error || String(res.status));
    }
    return res.json();
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch('/api/public/news/languages');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) setLangOptions(data);
        }
      } catch {
        /* optional */
      }
    })();
  }, []);

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (kind === 'review') {
        const data = await authFetch('/api/messages/reviews?admin=1&pageSize=50');
        setItems(data.items || []);
      } else {
        const qs = new URLSearchParams({ feed: '1', pageSize: '50' });
        if (category) qs.set('category', category);
        if (bugsOnly) qs.set('bugs', '1');
        if (excludeBugs) qs.set('excludeBugs', '1');
        if (filterLang) qs.set('lang', filterLang);
        if (recentOnly) qs.set('recent', '1');
        const data = await authFetch(`/api/messages/support?${qs}`);
        setItems(data.items || []);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [authFetch, bugsOnly, category, excludeBugs, filterLang, kind, recentOnly]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  const openThread = useCallback(
    async (id: string) => {
      setSelectedId(id);
      setDetailLoading(true);
      setReplyError('');
      try {
        const data = await authFetch(`/api/messages/threads/${id}`);
        setThreadDetail(data);
      } catch {
        setThreadDetail(null);
        setReplyError('Could not load this thread.');
      } finally {
        setDetailLoading(false);
      }
    },
    [authFetch],
  );

  const submitReply = useCallback(async () => {
    if (!selectedId || !replyBody.trim()) return;
    setReplySending(true);
    setReplyError('');
    try {
      const data = await authFetch(`/api/messages/threads/${selectedId}`, {
        method: 'POST',
        body: JSON.stringify({ body: replyBody.trim() }),
      });
      setReplyBody('');
      setThreadDetail(data);
      await loadItems();
    } catch {
      setReplyError('Failed to send reply.');
    } finally {
      setReplySending(false);
    }
  }, [authFetch, loadItems, replyBody, selectedId]);

  const filteredItems = items.filter((item) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return `${item.title} ${item.excerpt} ${item.author || ''}`.toLowerCase().includes(q);
  });

  const fieldClass =
    'w-full border border-slate-300 rounded px-2 py-2 text-sm bg-white text-slate-900';

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        <p className="text-sm text-slate-600 mt-1">{description}</p>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex flex-wrap gap-3 items-center justify-between">
          <div className="flex flex-wrap gap-2 items-center">
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search title or author…"
              className="border border-slate-300 rounded px-3 py-1.5 text-sm w-56"
            />
            {kind === 'support' && (
              <>
                <select
                  value={filterLang}
                  onChange={(e) => setFilterLang(e.target.value)}
                  className="border border-slate-300 rounded px-2 py-1.5 text-sm"
                >
                  <option value="">All languages</option>
                  {langOptions.map((l) => (
                    <option key={l.id} value={l.code}>
                      {l.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setRecentOnly(false)}
                  className={`px-2.5 py-1 text-xs font-medium rounded ${
                    !recentOnly ? 'bg-[#058592] text-white' : 'bg-white border border-slate-300'
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setRecentOnly(true)}
                  className={`px-2.5 py-1 text-xs font-medium rounded ${
                    recentOnly ? 'bg-[#058592] text-white' : 'bg-white border border-slate-300'
                  }`}
                >
                  Recent (14 days)
                </button>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={() => void loadItems()}
            className="inline-flex items-center gap-1.5 text-sm text-[#058592] font-medium hover:underline"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {error && (
          <div className="px-4 py-2 text-sm text-red-700 bg-red-50 border-b border-red-100">{error}</div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[520px] divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
          <div className="flex flex-col max-h-[70vh] lg:max-h-[calc(100vh-280px)]">
            <div className="px-4 py-2 border-b border-slate-100 text-sm font-semibold text-slate-700">
              User submissions ({filteredItems.length})
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              {loading ? (
                <p className="text-slate-500 text-sm">Loading…</p>
              ) : filteredItems.length === 0 ? (
                <p className="text-slate-500 text-sm py-8 text-center">{emptyMessage}</p>
              ) : (
                <ul className="space-y-2">
                  {filteredItems.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => void openThread(item.id)}
                        className={`w-full text-left p-3 rounded border transition ${
                          selectedId === item.id
                            ? 'border-[#058592] bg-teal-50'
                            : 'border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className="font-semibold text-slate-900 text-sm leading-snug">{item.title}</div>
                        {item.excerpt ? (
                          <p className="text-slate-600 text-xs mt-1 line-clamp-2">{item.excerpt}</p>
                        ) : null}
                        <div className="text-[11px] text-slate-500 mt-1.5">
                          {item.author || '—'} · {new Date(item.updatedAt).toLocaleString()}
                          {item.messageCount != null ? ` · ${item.messageCount} msg` : ''}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="flex flex-col max-h-[70vh] lg:max-h-[calc(100vh-280px)] bg-slate-50/50">
            <div className="px-4 py-2 border-b border-slate-100 text-sm font-semibold text-slate-700">
              Thread detail
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {!selectedId ? (
                <p className="text-slate-500 text-sm py-12 text-center">
                  Select a submission from the list to read and reply.
                </p>
              ) : detailLoading ? (
                <p className="text-slate-500 text-sm">Loading thread…</p>
              ) : threadDetail ? (
                <div className="space-y-4">
                  <div>
                    <h2 className="font-semibold text-slate-900">{threadDetail.thread.subject || '—'}</h2>
                    <p className="text-xs text-slate-500 mt-1">
                      {threadDetail.thread.authorName} ·{' '}
                      {new Date(threadDetail.thread.updatedAt).toLocaleString()}
                    </p>
                    {threadDetail.thread.languageCode ? (
                      <p className="text-xs text-slate-500 mt-0.5">
                        Language: {threadDetail.thread.languageCode}
                      </p>
                    ) : null}
                    {threadDetail.thread.pathStaff ? (
                      <p className="text-xs text-slate-500 mt-0.5">
                        Path: {threadDetail.thread.pathStaff}
                      </p>
                    ) : null}
                    {threadDetail.thread.errorMessage ? (
                      <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded px-2 py-1 mt-2">
                        Error: {threadDetail.thread.errorMessage}
                      </p>
                    ) : null}
                  </div>

                  <ul className="space-y-2">
                    {threadDetail.messages.map((m) => (
                      <li
                        key={m.id}
                        className={`rounded p-3 text-sm ${
                          m.isStaff
                            ? 'bg-teal-50 border border-teal-100'
                            : 'bg-white border border-slate-200'
                        }`}
                      >
                        <span className="font-semibold text-slate-700 text-xs">
                          {m.isStaff ? 'Staff' : m.sender?.name || m.sender?.username || 'User'}
                        </span>
                        <p className="mt-1 whitespace-pre-wrap text-slate-800">{m.body}</p>
                        <p className="text-[10px] text-slate-400 mt-1">
                          {new Date(m.createdAt).toLocaleString()}
                        </p>
                      </li>
                    ))}
                  </ul>

                  <div className="pt-2 border-t border-slate-200">
                    <label className="block text-xs font-medium text-slate-700 mb-1">Staff reply</label>
                    <textarea
                      value={replyBody}
                      onChange={(e) => setReplyBody(e.target.value)}
                      rows={4}
                      placeholder="Write a reply to the user…"
                      className={fieldClass}
                    />
                    {replyError ? (
                      <p className="text-xs text-red-600 mt-1">{replyError}</p>
                    ) : null}
                    <button
                      type="button"
                      disabled={replySending || !replyBody.trim()}
                      onClick={() => void submitReply()}
                      className="mt-2 px-4 py-2 rounded bg-[#058592] text-white text-sm font-semibold disabled:opacity-50"
                    >
                      Send reply
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedId(null);
                      setThreadDetail(null);
                    }}
                    className="inline-flex items-center gap-1 text-sm text-[#058592] font-medium"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </button>
                  <p className="text-slate-500 text-sm">{replyError || 'Thread not found.'}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Bug, Lightbulb } from 'lucide-react';
import ListPageSelector from '@/components/ui/ListPageSelector';

type FeedItem = {
  id: string;
  title: string;
  excerpt: string;
  updatedAt: string;
  author?: string;
};

type ThreadDetail = {
  thread: {
    id: string;
    subject: string;
    updatedAt: string;
    errorMessage?: string | null;
    authorName?: string | null;
  };
  messages: Array<{
    id: string;
    body: string;
    createdAt: string;
    isStaff: boolean;
    sender: { name: string; username: string } | null;
  }>;
};

export default function AdminBugsMemoPanel() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [total, setTotal] = useState(0);

  const [leftView, setLeftView] = useState<'list' | 'thread'>('list');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [threadDetail, setThreadDetail] = useState<ThreadDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [composerObject, setComposerObject] = useState('');
  const [composerPath, setComposerPath] = useState('');
  const [composerErrorMsg, setComposerErrorMsg] = useState('');
  const [composerBody, setComposerBody] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const [replyBody, setReplyBody] = useState('');
  const [replySending, setReplySending] = useState(false);

  const composerRef = useRef<HTMLDivElement>(null);
  const composerBodyRef = useRef<HTMLTextAreaElement>(null);

  const authFetch = useCallback(async (path: string, init?: RequestInit) => {
    const token = localStorage.getItem('adminToken');
    if (!token) throw new Error('no_token');
    const headers = new Headers(init?.headers);
    headers.set('Authorization', `Bearer ${token}`);
    if (init?.body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    const res = await fetch(path, { ...init, headers, cache: 'no-store' });
    if (!res.ok) throw new Error(String(res.status));
    return res.json();
  }, []);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (searchQuery) qs.set('q', searchQuery);
      const data = await authFetch(`/api/admin/messages/bug-memos?${qs}`);
      setItems(data.items || []);
      setTotal(data.total || 0);
    } catch {
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [authFetch, page, pageSize, searchQuery]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const openThread = useCallback(
    async (id: string) => {
      setSelectedId(id);
      setLeftView('thread');
      setDetailLoading(true);
      try {
        const data = await authFetch(`/api/messages/threads/${id}`);
        setThreadDetail(data);
      } catch {
        setThreadDetail(null);
      } finally {
        setDetailLoading(false);
      }
    },
    [authFetch],
  );

  const resetComposer = () => {
    setComposerObject('');
    setComposerPath('');
    setComposerErrorMsg('');
    setComposerBody('');
    setSendError(null);
  };

  const submitComposer = async () => {
    if (!composerBody.trim()) return;
    setSending(true);
    setSendError(null);
    try {
      await authFetch('/api/admin/messages/bug-memos', {
        method: 'POST',
        body: JSON.stringify({
          subject: composerObject.trim(),
          body: composerBody.trim(),
          pathStaff: composerPath.trim() || undefined,
          errorMessage: composerErrorMsg.trim() || undefined,
        }),
      });
      resetComposer();
      setPage(1);
      await loadItems();
    } catch {
      setSendError('Failed to save bug memo.');
    } finally {
      setSending(false);
    }
  };

  const submitReply = async () => {
    if (!selectedId || !replyBody.trim()) return;
    setReplySending(true);
    try {
      await authFetch(`/api/messages/threads/${selectedId}`, {
        method: 'POST',
        body: JSON.stringify({ body: replyBody.trim() }),
      });
      setReplyBody('');
      await openThread(selectedId);
    } catch {
      setSendError('Failed to send reply.');
    } finally {
      setReplySending(false);
    }
  };

  const fieldClass =
    'w-full border border-slate-300 rounded px-2 py-2 text-sm bg-white !text-black placeholder:!text-slate-600 [caret-color:#000]';

  return (
    <div className="admin-bugs-memo-panel p-6 max-w-6xl mx-auto !text-black [color-scheme:light]">
      <div className="mb-4">
        <h1 className="text-2xl font-bold !text-slate-900">Bugs and fixed errors</h1>
        <p className="text-sm !text-slate-600 mt-1">
          Internal staff memo — record bugs solved (visible only to Super Admin).
        </p>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden !text-black">
        <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[600px] divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
          <div className="flex flex-col min-h-[400px] bg-white">
            <div className="px-3 py-2 border-b border-slate-200 bg-slate-50">
              <div className="font-semibold !text-slate-800">Staff bug memos</div>
              <div className="flex flex-wrap gap-2 items-center mt-2">
                <span className="text-xs text-red-700 font-medium">Search</span>
                <input
                  type="search"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="border border-slate-300 rounded px-2 py-1 text-xs flex-1 min-w-[120px] bg-white !text-black placeholder:!text-slate-500"
                  placeholder="Title, author, content…"
                />
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery(searchInput.trim());
                    setPage(1);
                  }}
                  className="px-2.5 py-1 text-xs font-semibold rounded bg-[#c43c54] text-white"
                >
                  Proceed
                </button>
              </div>
              <ListPageSelector
                page={page}
                totalPages={totalPages}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setPage(1);
                }}
              />
            </div>
            <div className="flex-1 overflow-y-auto p-3 bg-white">
              {loading ? (
                <p className="!text-slate-500 text-sm">Loading…</p>
              ) : leftView === 'list' ? (
                <ul className="space-y-2">
                  {items.length === 0 ? (
                    <p className="!text-slate-500 text-sm py-6 text-center">No bug memos yet.</p>
                  ) : null}
                  {items.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => void openThread(item.id)}
                        className="w-full text-left p-2 rounded border border-slate-200 hover:bg-amber-50/50 bg-white"
                      >
                        <div className="font-semibold text-sm !text-slate-900">{item.title}</div>
                        {item.excerpt ? (
                          <p className="text-xs !text-slate-600 mt-1 line-clamp-2">{item.excerpt}</p>
                        ) : null}
                        <p className="text-[11px] !text-slate-500 mt-1">
                          {item.author} · {new Date(item.updatedAt).toLocaleString()}
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="space-y-3 !text-black">
                  <button
                    type="button"
                    onClick={() => {
                      setLeftView('list');
                      setSelectedId(null);
                      setThreadDetail(null);
                    }}
                    className="inline-flex items-center gap-1 text-sm text-[#9b1d3d] font-medium"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to list
                  </button>
                  {detailLoading ? (
                    <p className="!text-slate-500 text-sm">Loading…</p>
                  ) : threadDetail ? (
                    <>
                      <h3 className="font-semibold !text-slate-900">{threadDetail.thread.subject}</h3>
                      {threadDetail.thread.errorMessage ? (
                        <p className="text-xs text-amber-800 bg-amber-50 rounded px-2 py-1">
                          Error: {threadDetail.thread.errorMessage}
                        </p>
                      ) : null}
                      <ul className="space-y-2">
                        {threadDetail.messages.map((m) => (
                          <li key={m.id} className="text-xs bg-slate-50 border rounded p-2 !text-slate-800">
                            <p className="whitespace-pre-wrap">{m.body}</p>
                          </li>
                        ))}
                      </ul>
                      <textarea
                        value={replyBody}
                        onChange={(e) => setReplyBody(e.target.value)}
                        rows={3}
                        className={fieldClass}
                        placeholder="Staff note…"
                      />
                      <button
                        type="button"
                        disabled={replySending || !replyBody.trim()}
                        onClick={() => void submitReply()}
                        className="mt-2 w-full py-2 rounded bg-[#058592] text-white text-xs font-semibold disabled:opacity-50"
                      >
                        Add note
                      </button>
                    </>
                  ) : null}
                </div>
              )}
            </div>
          </div>

          <div
            ref={composerRef}
            className="admin-bugs-memo-composer flex flex-col overflow-y-auto bg-slate-50 p-4 !text-black [color-scheme:light]"
          >
            <div className="relative flex justify-center mb-2">
              <div className="w-16 h-16 rounded-full bg-amber-100 border-2 border-amber-400 flex items-center justify-center">
                <Bug className="w-8 h-8 text-amber-800" strokeWidth={1.75} />
              </div>
              <button
                type="button"
                onClick={() => {
                  resetComposer();
                  composerBodyRef.current?.focus();
                }}
                className="absolute right-0 top-0 text-xs flex items-center gap-1 text-amber-800 font-semibold border border-amber-300 rounded px-2 py-1 bg-amber-50"
              >
                <Lightbulb className="w-4 h-4" />
                Post new
              </button>
            </div>
            <div className="text-center font-bold mb-3 !text-black">Send to the movebook staff</div>
            <div className="flex justify-center mb-4">
              <label className="inline-flex items-center gap-2 text-sm font-semibold !text-black">
                <input type="radio" checked readOnly />
                BUGS
              </label>
            </div>

            <label className="block text-xs font-medium !text-black mb-1">Object</label>
            <input
              type="text"
              value={composerObject}
              onChange={(e) => setComposerObject(e.target.value)}
              className={`${fieldClass} mb-3`}
            />
            <label className="block text-xs font-medium !text-black mb-1">Path (for Movesbook staff)</label>
            <input
              type="text"
              value={composerPath}
              onChange={(e) => setComposerPath(e.target.value)}
              className={`${fieldClass} mb-3`}
            />
            <label className="block text-xs font-medium !text-black mb-1">Error message (for Movesbook staff)</label>
            <input
              type="text"
              value={composerErrorMsg}
              onChange={(e) => setComposerErrorMsg(e.target.value)}
              className={`${fieldClass} mb-3`}
            />
            <label className="block text-xs font-medium !text-black mb-1">Message</label>
            <textarea
              ref={composerBodyRef}
              value={composerBody}
              onChange={(e) => setComposerBody(e.target.value)}
              rows={6}
              className={`${fieldClass} mb-4`}
              placeholder="Describe the bug and how it was fixed…"
            />
            {sendError ? <p className="text-xs text-red-600 mb-2">{sendError}</p> : null}
            <button
              type="button"
              disabled={sending || !composerBody.trim()}
              onClick={() => void submitComposer()}
              className="w-full py-2.5 rounded font-semibold text-white bg-[#c43c54] hover:bg-[#a83249] disabled:opacity-50"
            >
              Post
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

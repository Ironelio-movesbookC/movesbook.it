'use client';

import { useCallback, useEffect, useRef, useState, type MouseEvent } from 'react';
import {
  ArrowLeft,
  Bug,
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  Lightbulb,
  X,
} from 'lucide-react';
import ListPageSelector from '@/components/ui/ListPageSelector';
import { MAX_SUPPORT_IMAGES } from '@/lib/messages/supportImages';
import ThreadPathOpenLink from '@/components/messages/ThreadPathOpenLink';
import {
  SUPPORT_WORKFLOW_STATUS_CODES,
  SUPPORT_WORKFLOW_STATUS_LABELS,
  normalizeSupportWorkflowStatus,
  supportWorkflowStatusLabel,
  type SupportWorkflowStatus,
} from '@/lib/messages/supportStatus';

type FeedItem = {
  id: string;
  title: string;
  excerpt: string;
  updatedAt: string;
  author?: string;
  imageUrls?: string[];
  status?: string | null;
};

type ThreadDetail = {
  thread: {
    id: string;
    subject: string;
    updatedAt: string;
    errorMessage?: string | null;
    authorName?: string | null;
    pathStaff?: string | null;
    realPath?: string | null;
    imageUrls?: string[];
    status?: string | null;
  };
  messages: Array<{
    id: string;
    body: string;
    createdAt: string;
    isStaff: boolean;
    sender: { name: string; username: string } | null;
  }>;
};

type ComposerImage = {
  id: string;
  url: string;
  preview: string;
};

export default function AdminBugsMemoPanel() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [total, setTotal] = useState(0);
  const [filterStatus, setFilterStatus] = useState('');

  const [leftView, setLeftView] = useState<'list' | 'thread'>('list');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [threadDetail, setThreadDetail] = useState<ThreadDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);

  const [composerObject, setComposerObject] = useState('');
  const [composerPath, setComposerPath] = useState('');
  const [composerErrorMsg, setComposerErrorMsg] = useState('');
  const [composerBody, setComposerBody] = useState('');
  const [composerImages, setComposerImages] = useState<ComposerImage[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const [replyBody, setReplyBody] = useState('');
  const [replySending, setReplySending] = useState(false);

  const [pictureLightbox, setPictureLightbox] = useState<{
    urls: string[];
    index: number;
  } | null>(null);

  const composerRef = useRef<HTMLDivElement>(null);
  const composerBodyRef = useRef<HTMLTextAreaElement>(null);
  const composerFileInputRef = useRef<HTMLInputElement>(null);

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
      if (filterStatus) qs.set('status', filterStatus);
      const data = await authFetch(`/api/admin/messages/bug-memos?${qs}`);
      setItems(data.items || []);
      setTotal(data.total || 0);
    } catch {
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [authFetch, filterStatus, page, pageSize, searchQuery]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  useEffect(() => {
    if (!pictureLightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPictureLightbox(null);
      if (e.key === 'ArrowLeft') {
        setPictureLightbox((cur) => {
          if (!cur || cur.urls.length < 2) return cur;
          return { ...cur, index: (cur.index - 1 + cur.urls.length) % cur.urls.length };
        });
      }
      if (e.key === 'ArrowRight') {
        setPictureLightbox((cur) => {
          if (!cur || cur.urls.length < 2) return cur;
          return { ...cur, index: (cur.index + 1) % cur.urls.length };
        });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pictureLightbox]);

  const openPictureLightbox = useCallback((urls: string[], index: number, e?: MouseEvent) => {
    e?.stopPropagation();
    e?.preventDefault();
    const clean = urls.filter(Boolean).slice(0, MAX_SUPPORT_IMAGES);
    if (!clean.length) return;
    setPictureLightbox({
      urls: clean,
      index: Math.max(0, Math.min(index, clean.length - 1)),
    });
  }, []);

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

  const clearComposerImages = useCallback(() => {
    setComposerImages((prev) => {
      prev.forEach((img) => {
        if (img.preview.startsWith('blob:')) URL.revokeObjectURL(img.preview);
      });
      return [];
    });
  }, []);

  const resetComposer = useCallback(() => {
    setComposerObject('');
    setComposerPath('');
    setComposerErrorMsg('');
    setComposerBody('');
    clearComposerImages();
    setSendError(null);
  }, [clearComposerImages]);

  const removeComposerImage = useCallback((id: string) => {
    setComposerImages((prev) => {
      const target = prev.find((img) => img.id === id);
      if (target?.preview.startsWith('blob:')) URL.revokeObjectURL(target.preview);
      return prev.filter((img) => img.id !== id);
    });
  }, []);

  const handleComposerImagesSelected = useCallback(
    async (files: FileList | null) => {
      if (!files?.length) return;
      const remaining = MAX_SUPPORT_IMAGES - composerImages.length;
      if (remaining <= 0) {
        setSendError(`You can attach up to ${MAX_SUPPORT_IMAGES} pictures.`);
        return;
      }
      const picked = Array.from(files).slice(0, remaining);
      const token = localStorage.getItem('adminToken');
      if (!token) {
        setSendError('Admin session not found.');
        return;
      }
      setUploadingImages(true);
      setSendError(null);
      try {
        for (const file of picked) {
          if (!file.type.startsWith('image/')) continue;
          const form = new FormData();
          form.append('file', file);
          const res = await fetch('/api/messages/support/upload-image', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: form,
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok || !data.path) {
            setSendError('Failed to upload picture.');
            continue;
          }
          const preview = URL.createObjectURL(file);
          setComposerImages((prev) => {
            if (prev.length >= MAX_SUPPORT_IMAGES) {
              URL.revokeObjectURL(preview);
              return prev;
            }
            return [
              ...prev,
              {
                id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                url: String(data.path),
                preview,
              },
            ];
          });
        }
      } catch {
        setSendError('Failed to upload picture.');
      } finally {
        setUploadingImages(false);
        if (composerFileInputRef.current) composerFileInputRef.current.value = '';
      }
    },
    [composerImages.length],
  );

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
          imageUrls: composerImages.map((img) => img.url).slice(0, MAX_SUPPORT_IMAGES),
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

  const updateThreadStatus = async (status: SupportWorkflowStatus) => {
    if (!selectedId) return;
    setStatusSaving(true);
    setSendError(null);
    try {
      const data = await authFetch(`/api/messages/threads/${selectedId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      setThreadDetail(data);
      setItems((prev) =>
        prev.map((item) => (item.id === selectedId ? { ...item, status } : item)),
      );
    } catch {
      setSendError('Failed to update status.');
    } finally {
      setStatusSaving(false);
    }
  };

  const fieldClass =
    'w-full border border-slate-300 rounded px-2 py-2 text-sm bg-white !text-black placeholder:!text-slate-600 [caret-color:#000]';

  return (
    <div className="admin-bugs-memo-panel w-full p-2 sm:p-3 !text-black [color-scheme:light]">
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
                <select
                  value={filterStatus}
                  onChange={(e) => {
                    setFilterStatus(e.target.value);
                    setPage(1);
                  }}
                  aria-label="Filter by status"
                  title="Filter by status"
                  className="border border-slate-300 rounded px-2 py-1 text-xs font-semibold bg-white text-red-600 min-w-[130px]"
                >
                  <option value="">All status</option>
                  {SUPPORT_WORKFLOW_STATUS_CODES.map((code) => (
                    <option key={code} value={code}>
                      {SUPPORT_WORKFLOW_STATUS_LABELS[code]}
                    </option>
                  ))}
                </select>
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
                      <div className="rounded border border-slate-200 bg-white overflow-hidden">
                        <button
                          type="button"
                          onClick={() => void openThread(item.id)}
                          className="w-full text-left p-2 hover:bg-amber-50/50"
                        >
                          <div className="font-semibold text-sm !text-slate-900">{item.title}</div>
                          {item.excerpt ? (
                            <p className="text-xs !text-slate-600 mt-1 line-clamp-2">{item.excerpt}</p>
                          ) : null}
                          <p className="text-[11px] !text-slate-500 mt-1">
                            {item.author} · {new Date(item.updatedAt).toLocaleString()}
                          </p>
                          <div className="mt-1">
                            <span className="inline-block rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-600">
                              {supportWorkflowStatusLabel(item.status)}
                            </span>
                          </div>
                        </button>
                        {item.imageUrls && item.imageUrls.length > 0 ? (
                          <div className="px-2 pb-2 flex gap-1.5 flex-wrap border-t border-slate-100 bg-white">
                            {item.imageUrls.slice(0, MAX_SUPPORT_IMAGES).map((src, imgIdx) => (
                              <button
                                key={src}
                                type="button"
                                title="View picture"
                                onClick={(e) => openPictureLightbox(item.imageUrls || [], imgIdx, e)}
                                className="p-0 rounded border border-slate-200 overflow-hidden bg-slate-100 hover:ring-2 hover:ring-[#c43c54]/40 focus:outline-none focus:ring-2 focus:ring-[#c43c54]"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={src}
                                  alt=""
                                  className="h-14 w-14 object-cover pointer-events-none"
                                />
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </div>
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
                      <div className="flex flex-wrap items-center gap-2">
                        <label
                          className="text-xs font-semibold text-slate-700"
                          htmlFor="bug-fixed-status"
                        >
                          Edit status
                        </label>
                        <select
                          id="bug-fixed-status"
                          disabled={statusSaving}
                          value={normalizeSupportWorkflowStatus(threadDetail.thread.status)}
                          onChange={(e) =>
                            void updateThreadStatus(e.target.value as SupportWorkflowStatus)
                          }
                          className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-red-600 disabled:opacity-50"
                        >
                          {SUPPORT_WORKFLOW_STATUS_CODES.map((code) => (
                            <option key={code} value={code}>
                              {SUPPORT_WORKFLOW_STATUS_LABELS[code]}
                            </option>
                          ))}
                        </select>
                        {statusSaving ? (
                          <span className="text-[11px] text-slate-500">Saving…</span>
                        ) : null}
                      </div>
                      {threadDetail.thread.errorMessage ? (
                        <p className="text-xs text-amber-800 bg-amber-50 rounded px-2 py-1">
                          Error: {threadDetail.thread.errorMessage}
                        </p>
                      ) : null}
                      <ThreadPathOpenLink
                        pathStaff={threadDetail.thread.pathStaff}
                        realPath={threadDetail.thread.realPath}
                        pathLabel="Path"
                        openLabel="Open link"
                      />
                      {threadDetail.thread.imageUrls && threadDetail.thread.imageUrls.length > 0 ? (
                        <div className="flex gap-1.5 flex-wrap">
                          {threadDetail.thread.imageUrls
                            .slice(0, MAX_SUPPORT_IMAGES)
                            .map((src, imgIdx) => (
                              <button
                                key={src}
                                type="button"
                                title="View picture"
                                onClick={(e) =>
                                  openPictureLightbox(threadDetail.thread.imageUrls || [], imgIdx, e)
                                }
                                className="p-0 rounded border border-slate-200 overflow-hidden bg-slate-100 hover:ring-2 hover:ring-[#c43c54]/40 focus:outline-none focus:ring-2 focus:ring-[#c43c54]"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={src}
                                  alt=""
                                  className="h-20 w-20 object-cover pointer-events-none"
                                />
                              </button>
                            ))}
                        </div>
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
              className={`${fieldClass} mb-3`}
              placeholder="Describe the bug and how it was fixed…"
            />

            <div className="mb-4">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <button
                  type="button"
                  disabled={uploadingImages || composerImages.length >= MAX_SUPPORT_IMAGES}
                  onClick={() => composerFileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-slate-400 rounded bg-white text-black hover:bg-slate-100 disabled:opacity-50"
                >
                  <ImagePlus className="w-4 h-4" />
                  {uploadingImages ? 'Uploading…' : 'Add pictures'}
                </button>
                <span className="text-[11px] text-slate-600">
                  Up to {MAX_SUPPORT_IMAGES} pictures ({composerImages.length}/{MAX_SUPPORT_IMAGES})
                </span>
                <input
                  ref={composerFileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  multiple
                  className="hidden"
                  onChange={(e) => void handleComposerImagesSelected(e.target.files)}
                />
              </div>
              {composerImages.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {composerImages.map((img) => (
                    <div
                      key={img.id}
                      className="relative h-20 w-20 rounded border border-slate-300 overflow-hidden bg-white"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.preview || img.url} alt="" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        title="Remove picture"
                        aria-label="Remove picture"
                        onClick={() => removeComposerImage(img.id)}
                        className="absolute top-0.5 right-0.5 rounded-full bg-black/70 p-0.5 text-white hover:bg-black"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            {sendError ? <p className="text-xs text-red-600 mb-2">{sendError}</p> : null}
            <button
              type="button"
              disabled={sending || uploadingImages || !composerBody.trim()}
              onClick={() => void submitComposer()}
              className="w-full py-2.5 rounded font-semibold text-white bg-[#c43c54] hover:bg-[#a83249] disabled:opacity-50"
            >
              Post
            </button>
          </div>
        </div>
      </div>

      {pictureLightbox ? (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="View picture"
          onClick={() => setPictureLightbox(null)}
        >
          <button
            type="button"
            className="absolute top-4 right-4 z-10 rounded-full bg-black/60 p-2 text-white hover:bg-black/80"
            aria-label="Close"
            onClick={() => setPictureLightbox(null)}
          >
            <X className="w-5 h-5" />
          </button>

          {pictureLightbox.urls.length > 1 ? (
            <>
              <button
                type="button"
                className="absolute left-3 sm:left-6 z-10 rounded-full bg-black/60 p-2 text-white hover:bg-black/80"
                aria-label="Previous picture"
                onClick={(e) => {
                  e.stopPropagation();
                  setPictureLightbox((cur) => {
                    if (!cur) return cur;
                    return {
                      ...cur,
                      index: (cur.index - 1 + cur.urls.length) % cur.urls.length,
                    };
                  });
                }}
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                type="button"
                className="absolute right-3 sm:right-6 z-10 rounded-full bg-black/60 p-2 text-white hover:bg-black/80"
                aria-label="Next picture"
                onClick={(e) => {
                  e.stopPropagation();
                  setPictureLightbox((cur) => {
                    if (!cur) return cur;
                    return {
                      ...cur,
                      index: (cur.index + 1) % cur.urls.length,
                    };
                  });
                }}
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          ) : null}

          <div
            className="relative max-h-[90vh] max-w-[min(96vw,56rem)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={pictureLightbox.urls[pictureLightbox.index]}
              alt=""
              className="max-h-[85vh] max-w-full rounded object-contain shadow-2xl"
            />
            {pictureLightbox.urls.length > 1 ? (
              <p className="mt-2 text-center text-sm text-white/90">
                {pictureLightbox.index + 1} / {pictureLightbox.urls.length}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

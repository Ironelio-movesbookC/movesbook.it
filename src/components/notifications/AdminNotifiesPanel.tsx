'use client';

import { useCallback, useEffect, useState } from 'react';
import { Eye, EyeOff, MapPin, Pencil, Plus, Trash2, X } from 'lucide-react';
import { STAFF_AUDIENCE_OPTIONS } from '@/lib/notifications/audience';
import type { NotificationDto } from '@/lib/notifications/notificationService';

function adminToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('adminToken') || localStorage.getItem('token');
}

const today = () => new Date().toISOString().slice(0, 10);

export default function AdminNotifiesPanel() {
  const [items, setItems] = useState<NotificationDto[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [recentOnly, setRecentOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [path, setPath] = useState('');
  const [untilDate, setUntilDate] = useState(today());
  const [langId, setLangId] = useState('0');
  const [prioritary, setPrioritary] = useState(false);
  const [roles, setRoles] = useState<string[]>([]);
  const [usernames, setUsernames] = useState('');

  const load = useCallback(async () => {
    const token = adminToken();
    if (!token) {
      setError('Admin session required');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const qs = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        q: search,
        role: roleFilter,
        recent: recentOnly ? '1' : '0',
      });
      const res = await fetch(`/api/admin/notifications?${qs}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load');
      setItems(data.items || []);
      setTotal(data.total || 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, roleFilter, recentOnly]);

  useEffect(() => {
    void load();
  }, [load]);

  function resetForm() {
    setEditId(null);
    setTitle('');
    setDescription('');
    setPath('');
    setUntilDate(today());
    setLangId('0');
    setPrioritary(false);
    setRoles([]);
    setUsernames('');
    setFormError('');
  }

  function openCreate() {
    resetForm();
    setModalOpen(true);
  }

  function openEdit(item: NotificationDto) {
    setEditId(item.id);
    setTitle(item.title);
    setDescription(item.description);
    setPath(item.path || '');
    setUntilDate(item.untilDate);
    setLangId(item.langId || '0');
    setPrioritary(item.prioritary);
    setRoles(item.audienceRoles);
    setUsernames(item.audienceUsernames.join(', '));
    setFormError('');
    setModalOpen(true);
  }

  async function save() {
    const token = adminToken();
    if (!token) return;
    setSaving(true);
    setFormError('');
    try {
      const res = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          editId: editId || undefined,
          title,
          description,
          path,
          untilDate,
          langId,
          prioritary,
          audienceRoles: roles,
          usernames,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setModalOpen(false);
      resetForm();
      await load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function toggleShow(item: NotificationDto) {
    const token = adminToken();
    if (!token) return;
    await fetch('/api/admin/notifications', {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id: item.id, isShow: !item.isShow }),
    });
    await load();
  }

  async function remove(item: NotificationDto) {
    if (!confirm('Delete this notification?')) return;
    const token = adminToken();
    if (!token) return;
    await fetch(`/api/admin/notifications?id=${encodeURIComponent(item.id)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    await load();
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const inactiveBtn =
    'bg-gray-100 text-gray-900 border-gray-300 hover:bg-gray-200';
  const activeDarkBtn = 'bg-neutral-800 text-white border-neutral-800';
  const activeTealBtn = 'bg-teal-800 text-white border-teal-800';
  const fieldClass =
    'w-full border border-gray-300 rounded px-2 py-1.5 text-sm text-gray-900 bg-white placeholder:text-gray-500';

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto text-gray-900">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Posted by Movesbook Staff</h1>
          <p className="text-sm text-gray-600 mt-1">
            Send notifications to users by role and/or username. Recipients see them under Notifications by
            Movesbook.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded bg-red-700 px-3 py-2 text-sm font-semibold text-white hover:bg-red-800"
        >
          <Plus className="h-4 w-4" />
          Add new
        </button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2 rounded border border-gray-300 bg-white p-3 text-gray-900">
        <div className="flex flex-wrap gap-1 text-sm">
          <button
            type="button"
            onClick={() => {
              setRoleFilter('');
              setPage(1);
            }}
            className={`px-2 py-1 rounded border ${!roleFilter ? activeDarkBtn : inactiveBtn}`}
          >
            All
          </button>
          {STAFF_AUDIENCE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                setRoleFilter(opt.value);
                setPage(1);
              }}
              className={`px-2 py-1 rounded border ${
                roleFilter === opt.value ? activeDarkBtn : inactiveBtn
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1 text-sm">
          <button
            type="button"
            onClick={() => {
              setRecentOnly(false);
              setPage(1);
            }}
            className={`px-2 py-1 rounded border ${!recentOnly ? activeTealBtn : inactiveBtn}`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => {
              setRecentOnly(true);
              setPage(1);
            }}
            className={`px-2 py-1 rounded border ${recentOnly ? activeTealBtn : inactiveBtn}`}
          >
            Recent
          </button>
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search title"
          className={`ml-auto border border-gray-300 rounded px-2 py-1 text-sm w-40 text-gray-900 bg-white placeholder:text-gray-500`}
        />
        <button
          type="button"
          onClick={() => {
            setPage(1);
            void load();
          }}
          className="rounded bg-neutral-800 px-3 py-1 text-sm text-white"
        >
          Proceed
        </button>
        <select
          value={pageSize}
          onChange={(e) => {
            setPageSize(Number(e.target.value));
            setPage(1);
          }}
          className="border border-gray-300 rounded px-2 py-1 text-sm text-gray-900 bg-white"
        >
          {[5, 10, 20, 50].map((n) => (
            <option key={n} value={n} className="text-gray-900">
              {n}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : error ? (
        <p className="text-sm text-red-700">{error}</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-gray-500">No notifications yet.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id} className="rounded border border-gray-300 bg-white">
              <div className="flex items-start gap-2 p-3">
                <button
                  type="button"
                  className="text-red-700 mt-1"
                  title="Delete"
                  onClick={() => void remove(item)}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="flex-1 text-left min-w-0"
                  onClick={() => setExpandedId((v) => (v === item.id ? null : item.id))}
                >
                  <div className="flex items-center gap-2">
                    {item.prioritary ? <MapPin className="h-4 w-4 text-red-600 shrink-0" /> : null}
                    <span className="font-semibold text-gray-900 truncate">{item.title}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Created {item.createdAt.slice(0, 10)} · until {item.untilDate}
                    {item.audienceRoles.length
                      ? ` · ${item.audienceRoles.join(', ')}`
                      : ''}
                    {item.audienceUsernames.length
                      ? ` · @${item.audienceUsernames.join(', @')}`
                      : ''}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => void toggleShow(item)}
                  title="Toggle visibility"
                  className="text-gray-800"
                >
                  {item.isShow ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4 text-gray-400" />}
                </button>
                <button
                  type="button"
                  onClick={() => openEdit(item)}
                  title="Edit"
                  className="text-gray-800"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              </div>
              {expandedId === item.id ? (
                <div className="border-t px-3 py-2 text-sm text-gray-700">
                  {item.path ? (
                    <p className="mb-2">
                      Path:{' '}
                      <a href={item.path} target="_blank" rel="noreferrer" className="text-blue-700 underline">
                        {item.path}
                      </a>
                    </p>
                  ) : null}
                  <div
                    className="prose prose-sm max-w-none max-h-40 overflow-auto border p-2"
                    dangerouslySetInnerHTML={{ __html: item.description }}
                  />
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex items-center gap-2 text-sm text-gray-900">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          className="rounded border border-gray-300 bg-white px-2 py-1 text-gray-900 disabled:opacity-40"
        >
          prev
        </button>
        <span className="text-gray-900">
          {page} / {totalPages} ({total})
        </span>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => setPage((p) => p + 1)}
          className="rounded border border-gray-300 bg-white px-2 py-1 text-gray-900 disabled:opacity-40"
        >
          next
        </button>
      </div>

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded bg-white shadow-lg text-gray-900">
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
              <h2 className="font-semibold text-gray-900">Send to the recipients</h2>
              <button type="button" onClick={() => setModalOpen(false)} className="text-gray-700">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3 p-4 text-gray-900">
              {formError ? <p className="text-sm text-red-700">{formError}</p> : null}
              <div className="flex items-center justify-between gap-2">
                <label className="text-sm font-medium text-gray-900">Displayed until</label>
                <input
                  type="date"
                  value={untilDate}
                  onChange={(e) => setUntilDate(e.target.value)}
                  className="border border-gray-300 rounded px-2 py-1 text-sm text-gray-900 bg-white"
                />
              </div>
              <select
                value={langId}
                onChange={(e) => setLangId(e.target.value)}
                className={fieldClass}
              >
                <option value="0" className="text-gray-900">
                  All languages
                </option>
              </select>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Object"
                className={fieldClass}
              />
              <input
                value={path}
                onChange={(e) => setPath(e.target.value)}
                placeholder="Path (optional)"
                className={fieldClass}
              />
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Message"
                rows={6}
                className={fieldClass}
              />
              <div className="text-sm text-gray-900">
                <p className="font-medium mb-1 text-gray-900">Recipients (roles)</p>
                <div className="flex flex-wrap gap-3">
                  {STAFF_AUDIENCE_OPTIONS.map((opt) => (
                    <label
                      key={opt.value}
                      className="inline-flex items-center gap-1.5 text-gray-900"
                    >
                      <input
                        type="checkbox"
                        checked={roles.includes(opt.value)}
                        onChange={(e) => {
                          setRoles((prev) =>
                            e.target.checked ? [...prev, opt.value] : prev.filter((r) => r !== opt.value)
                          );
                        }}
                      />
                      <span className="text-gray-900">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1 text-gray-900">
                  Username(s) of recipient(s)
                </label>
                <input
                  value={usernames}
                  onChange={(e) => setUsernames(e.target.value)}
                  placeholder="e.g. john, maria"
                  className={fieldClass}
                />
                <p className="text-xs text-gray-600 mt-1">
                  Optional. Comma or space separated. Resolved against real user accounts.
                </p>
              </div>
              <label className="inline-flex items-center gap-2 text-sm text-gray-900">
                <input
                  type="checkbox"
                  checked={prioritary}
                  onChange={(e) => setPrioritary(e.target.checked)}
                />
                <span className="text-gray-900">Put prioritary</span>
              </label>
              <div className="flex justify-center gap-2 pt-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void save()}
                  className="rounded bg-red-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Post'}
                </button>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded bg-gray-200 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

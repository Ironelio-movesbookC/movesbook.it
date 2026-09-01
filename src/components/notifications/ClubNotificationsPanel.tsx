'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Eye, EyeOff, MapPin, Plus, Trash2, X } from 'lucide-react';
import type { NotificationDto } from '@/lib/notifications/notificationService';

function userToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

const today = () => new Date().toISOString().slice(0, 10);

type Props = {
  /** When set = MY CLUB (one club). When omitted = MY PAGE (all owned clubs). */
  clubId?: string | null;
};

export default function ClubNotificationsPanel({ clubId }: Props) {
  const [items, setItems] = useState<NotificationDto[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [path, setPath] = useState('');
  const [untilDate, setUntilDate] = useState(today());
  const [prioritary, setPrioritary] = useState(false);
  const [audienceKind, setAudienceKind] = useState<'members' | 'staff'>('members');

  const load = useCallback(async () => {
    const token = userToken();
    if (!token) {
      setError('Please sign in');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const qs = new URLSearchParams({ page: String(page), pageSize: '10' });
      if (clubId) qs.set('clubId', clubId);
      const res = await fetch(`/api/notifications/club?${qs}`, {
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
  }, [clubId, page]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    const token = userToken();
    if (!token) return;
    setSaving(true);
    setFormError('');
    try {
      const body: Record<string, unknown> = {
        title,
        description,
        path,
        untilDate,
        prioritary,
        audienceKind,
      };
      if (clubId) body.clubId = clubId;
      const res = await fetch('/api/notifications/club', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setModalOpen(false);
      setTitle('');
      setDescription('');
      setPath('');
      setUntilDate(today());
      setPrioritary(false);
      setAudienceKind('members');
      await load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function toggleShow(item: NotificationDto) {
    const token = userToken();
    if (!token) return;
    await fetch('/api/notifications/club', {
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
    const token = userToken();
    if (!token) return;
    await fetch(`/api/notifications/club?id=${encodeURIComponent(item.id)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    await load();
  }

  const scopeLabel = clubId
    ? 'Members of the selected club (MY CLUB)'
    : 'Members of all clubs you own (MY PAGE)';

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto text-gray-900">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Posted by Club staff</h1>
          <p className="text-sm text-gray-600 mt-1">{scopeLabel}</p>
          <p className="text-xs text-gray-500 mt-1">
            Single-user targeting is not available here — use Messages or Chat.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/users/notification/all/all/movesbook"
            className="rounded border border-gray-300 px-3 py-1.5 text-sm bg-white text-gray-900 hover:bg-gray-50"
          >
            By Movesbook
          </Link>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-1 rounded bg-red-700 px-3 py-1.5 text-sm font-semibold text-white"
          >
            <Plus className="h-4 w-4" />
            Add new
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : error ? (
        <p className="text-sm text-red-700">{error}</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-gray-500">No club notifications sent yet.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id} className="rounded border border-gray-300 bg-white">
              <div className="flex items-start gap-2 p-3">
                <button type="button" className="text-red-700 mt-1" onClick={() => void remove(item)}>
                  <Trash2 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="flex-1 text-left"
                  onClick={() => setExpandedId((v) => (v === item.id ? null : item.id))}
                >
                  <div className="flex items-center gap-2">
                    {item.prioritary ? <MapPin className="h-4 w-4 text-red-600" /> : null}
                    <span className="font-semibold">{item.title}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {item.createdAt.slice(0, 10)} · until {item.untilDate} · {item.audienceKind} ·{' '}
                    {item.clubIds.length} club(s)
                  </p>
                </button>
                <button type="button" onClick={() => void toggleShow(item)}>
                  {item.isShow ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4 text-gray-400" />}
                </button>
              </div>
              {expandedId === item.id ? (
                <div
                  className="border-t px-3 py-2 prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: item.description }}
                />
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <p className="mt-3 text-xs text-gray-500">{total} total</p>

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
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900">Displayed until</span>
                <input
                  type="date"
                  value={untilDate}
                  onChange={(e) => setUntilDate(e.target.value)}
                  className="border border-gray-300 rounded px-2 py-1 text-sm text-gray-900 bg-white"
                />
              </div>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Object"
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm text-gray-900 bg-white placeholder:text-gray-500"
              />
              <input
                value={path}
                onChange={(e) => setPath(e.target.value)}
                placeholder="Path (optional)"
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm text-gray-900 bg-white placeholder:text-gray-500"
              />
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Message"
                rows={6}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm text-gray-900 bg-white placeholder:text-gray-500"
              />
              <div className="text-sm space-y-1 text-gray-900">
                <label className="flex items-center gap-2 text-gray-900">
                  <input
                    type="radio"
                    checked={audienceKind === 'members'}
                    onChange={() => setAudienceKind('members')}
                  />
                  For Members
                </label>
                <label className="flex items-center gap-2 text-gray-900">
                  <input
                    type="radio"
                    checked={audienceKind === 'staff'}
                    onChange={() => setAudienceKind('staff')}
                  />
                  For Club Staff
                </label>
              </div>
              <label className="inline-flex items-center gap-2 text-sm text-gray-900">
                <input
                  type="checkbox"
                  checked={prioritary}
                  onChange={(e) => setPrioritary(e.target.checked)}
                />
                Put prioritary
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

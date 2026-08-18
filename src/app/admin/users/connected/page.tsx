'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Mail, User } from 'lucide-react';
import { getAdminBearerToken } from '@/lib/admin/clientAdminAuth';
import type {
  ConnectedUserRow,
  UsersConnectedPayload,
} from '@/lib/admin/buildUsersConnected';
import {
  STATS_KIND_LABELS,
  STATS_USER_KINDS,
  type StatsUserKind,
} from '@/lib/admin/statisticsKinds';
import AdminUserPanelButton from '@/components/admin/AdminUserPanelButton';

const TYPE_OPTIONS: Array<{ value: StatsUserKind | 'all'; label: string }> = [
  { value: 'all', label: 'All users' },
  ...STATS_USER_KINDS.map((k) => ({ value: k, label: STATS_KIND_LABELS[k] })),
];

function GenderOrPhoto({
  user,
  accentClass,
}: {
  user: ConnectedUserRow;
  accentClass: string;
}) {
  if (user.imageUrl) {
    return (
      <div className="relative h-10 w-10 shrink-0 overflow-hidden border border-[#ccc] bg-white">
        <Image
          src={user.imageUrl}
          alt={user.username}
          fill
          sizes="40px"
          className="object-cover"
          unoptimized
        />
      </div>
    );
  }
  const symbol =
    user.gender === 'male' ? '♂' : user.gender === 'female' ? '♀' : null;
  return (
    <div
      className={`flex h-10 w-10 shrink-0 items-center justify-center border border-[#ccc] bg-white text-xl font-bold ${accentClass}`}
      title={user.gender || 'No photo'}
    >
      {symbol ?? <User className={`h-5 w-5 ${accentClass}`} />}
    </div>
  );
}

export default function AdminUsersConnectedPage() {
  const router = useRouter();
  const [authOk, setAuthOk] = useState(false);
  const [userType, setUserType] = useState<StatsUserKind | 'all'>('all');
  const [country, setCountry] = useState('');
  const [data, setData] = useState<UsersConnectedPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [msgOpen, setMsgOpen] = useState(false);
  const [msgUser, setMsgUser] = useState<ConnectedUserRow | null>(null);
  const [msgSubject, setMsgSubject] = useState('Message from Movesbook Admin');
  const [msgDraft, setMsgDraft] = useState('');
  const [msgSending, setMsgSending] = useState(false);
  const [msgError, setMsgError] = useState('');

  useEffect(() => {
    if (!localStorage.getItem('adminUser')) {
      router.push('/');
      return;
    }
    setAuthOk(true);
  }, [router]);

  const load = useCallback(async () => {
    const token = getAdminBearerToken();
    if (!token) {
      setError('Not authenticated');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (userType !== 'all') qs.set('userType', userType);
      if (country) qs.set('country', country);
      const res = await fetch(`/api/admin/users-connected?${qs}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      if (!res.ok) throw new Error('Failed to load');
      setData((await res.json()) as UsersConnectedPayload);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [userType, country]);

  useEffect(() => {
    if (!authOk) return;
    void load();
  }, [authOk, load]);

  const openMessage = (user: ConnectedUserRow) => {
    setMsgUser(user);
    setMsgSubject('Message from Movesbook Admin');
    setMsgDraft('');
    setMsgError('');
    setMsgOpen(true);
  };

  const sendMessage = async () => {
    if (!msgUser) return;
    const message = msgDraft.trim();
    if (!message) {
      setMsgError('Please enter a message.');
      return;
    }
    const token = getAdminBearerToken();
    if (!token) {
      setMsgError('Admin session not found.');
      return;
    }
    setMsgSending(true);
    setMsgError('');
    try {
      const res = await fetch('/api/admin/registered-users/actions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          segment: 'all',
          userIds: [msgUser.id],
          message,
          subject: msgSubject.trim() || 'Message from Movesbook Admin',
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Failed to send message');
      setMsgOpen(false);
      window.alert('Message sent.');
    } catch (e) {
      setMsgError(e instanceof Error ? e.message : 'Failed to send message');
    } finally {
      setMsgSending(false);
    }
  };

  if (!authOk) return null;

  return (
    <div className="min-h-full bg-[#ececec] p-4 md:p-6">
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#058592]">
          Super Admin
        </p>
        <h1 className="mt-1 text-2xl font-bold text-[#222]">Users Connected</h1>
        <p className="mt-1 text-sm text-[#555]">
          Green = online now · Orange = connected today but not online
        </p>
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3 border border-[#cfcfcf] bg-white p-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-semibold text-[#333]">Type of user</span>
          <select
            className="border border-[#bbb] bg-white px-2 py-1.5"
            value={userType}
            onChange={(e) => setUserType(e.target.value as StatsUserKind | 'all')}
          >
            {TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-semibold text-[#333]">Country</span>
          <select
            className="min-w-[160px] border border-[#bbb] bg-white px-2 py-1.5"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
          >
            <option value="">All country</option>
            {(data?.countries ?? []).map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <div className="ml-auto flex gap-4 text-sm">
          <span className="font-semibold text-green-700">
            Online: {data?.onlineCount ?? 0}
          </span>
          <span className="font-semibold text-orange-600">
            Today: {data?.todayOfflineCount ?? 0}
          </span>
        </div>
      </div>

      {error ? (
        <div className="mb-3 border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <div className="border border-[#cfcfcf] bg-white">
        {loading ? (
          <div className="p-8 text-center text-[#666]">Loading…</div>
        ) : !data?.users.length ? (
          <div className="p-8 text-center text-[#888]">No connected users today.</div>
        ) : (
          <ul className="divide-y divide-[#eee]">
            {data.users.map((user) => {
              const online = user.presence === 'online';
              const accent = online ? 'text-green-700' : 'text-orange-600';
              return (
                <li key={user.id} className="flex items-start gap-3 px-4 py-3">
                  <GenderOrPhoto user={user} accentClass={accent} />
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/admin/all?openUser=${encodeURIComponent(user.id)}`}
                      className={`font-bold hover:underline ${accent}`}
                    >
                      {user.username}
                    </Link>
                    <div className="text-sm text-[#555]">
                      {user.location || '—'} · {user.kindLabel}
                    </div>
                    <button
                      type="button"
                      onClick={() => openMessage(user)}
                      className="mt-1 inline-flex items-center gap-1 text-sm text-[#333] hover:underline"
                    >
                      <Mail className="h-3.5 w-3.5" />
                      Send Message
                    </button>
                  </div>
                  <AdminUserPanelButton userId={user.id} userType={user.userType} />
                  <span
                    className={`shrink-0 self-start rounded px-2 py-0.5 text-xs font-bold ${
                      online
                        ? 'bg-green-100 text-green-800'
                        : 'bg-orange-100 text-orange-800'
                    }`}
                  >
                    {online ? 'Online' : 'Today'}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {msgOpen && msgUser ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="mb-1 text-lg font-semibold text-gray-900">Send message</h2>
            <p className="mb-4 text-sm text-gray-600">To {msgUser.username}</p>
            <label className="mb-2 block text-sm font-medium text-gray-700">Subject</label>
            <input
              type="text"
              value={msgSubject}
              onChange={(e) => setMsgSubject(e.target.value)}
              className="mb-3 w-full rounded border border-gray-400 px-3 py-2 text-sm"
            />
            <label className="mb-2 block text-sm font-medium text-gray-700">Message</label>
            <textarea
              value={msgDraft}
              onChange={(e) => setMsgDraft(e.target.value)}
              rows={5}
              className="mb-3 w-full resize-none rounded border border-gray-400 px-3 py-2 text-sm"
            />
            {msgError ? <p className="mb-2 text-sm text-red-600">{msgError}</p> : null}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setMsgOpen(false)}
                className="rounded border border-gray-400 px-4 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={msgSending}
                onClick={() => void sendMessage()}
                className="rounded bg-[#058592] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {msgSending ? 'Sending…' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

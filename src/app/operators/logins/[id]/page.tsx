'use client';

import { useParams } from 'next/navigation';
import Image from 'next/image';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { User } from 'lucide-react';
import { OperatorNavBar } from '@/components/operators/OperatorNavBar';
import type { OperatorNavVariant } from '@/lib/operatorNavTabs';

type LogType = 'in' | 'out' | 'both';

type StaffPayload = {
  id: string;
  kind: string;
  username: string;
  name: string;
  country: string;
  language: string;
  imageUrl: string | null;
};

type LogRow = {
  id: string;
  loginAt: string;
  logoutAt: string | null;
};

const isDataUrl = (src?: string | null) =>
  typeof src === 'string' && src.startsWith('data:image/');

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

function toDatetimeLocalValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function OperatorLoginsPage() {
  const params = useParams();
  const id = params?.id as string;

  const [variant, setVariant] = useState<OperatorNavVariant>({ kind: 'standard' });

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('operatorNavVariant');
      if (!raw) return;
      const parsed = JSON.parse(raw) as OperatorNavVariant;
      if (parsed?.kind === 'standard' || parsed?.kind === 'myCustomers') {
        setVariant(parsed);
      } else if (parsed?.kind === 'coadmin' && typeof parsed.coadminId === 'string') {
        setVariant(parsed);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const [dateFrom, setDateFrom] = useState(() => {
    const t = new Date();
    t.setDate(t.getDate() - 30);
    t.setHours(0, 0, 0, 0);
    return toDatetimeLocalValue(t);
  });
  const [dateTo, setDateTo] = useState(() => {
    const t = new Date();
    t.setHours(23, 59, 0, 0);
    return toDatetimeLocalValue(t);
  });
  const [logType, setLogType] = useState<LogType>('both');

  const [staff, setStaff] = useState<StaffPayload | null>(null);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionBusy, setActionBusy] = useState(false);

  const queryString = useMemo(() => {
    const from = dateFrom ? new Date(dateFrom).toISOString() : '';
    const to = dateTo ? new Date(dateTo).toISOString() : '';
    const qs = new URLSearchParams();
    if (from) qs.set('from', from);
    if (to) qs.set('to', to);
    qs.set('type', logType);
    return qs.toString();
  }, [dateFrom, dateTo, logType]);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) {
        setError('Admin session not found.');
        return;
      }
      const res = await fetch(`/api/admin/operators/${id}/login-logs?${queryString}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to load login logs');
      setStaff(data.staff ?? null);
      setLogs(Array.isArray(data.logs) ? data.logs : []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load');
      setStaff(null);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [id, queryString]);

  useEffect(() => {
    void load();
  }, [load]);

  const applyFilters = () => {
    void load();
  };

  const postSession = async (action: 'login' | 'logout') => {
    setActionBusy(true);
    setError('');
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) {
        setError('Admin session not found.');
        return;
      }
      const res = await fetch(`/api/admin/operators/${id}/login-logs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Action failed');
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setActionBusy(false);
    }
  };

  return (
    <div className="min-h-full bg-gray-100">
      <OperatorNavBar operatorId={id} activeTabId="logins" variant={variant} />

      <div className="max-w-6xl mx-auto px-6 py-6 space-y-4">
        <div className="bg-white border border-gray-300 rounded-lg p-4 shadow-sm">
          <h1 className="text-lg font-semibold text-gray-900 mb-3">Login history</h1>
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Date from</label>
              <input
                type="datetime-local"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded bg-white text-gray-900 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Date to</label>
              <input
                type="datetime-local"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded bg-white text-gray-900 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Type of log</label>
              <select
                value={logType}
                onChange={(e) => setLogType(e.target.value as LogType)}
                className="px-3 py-2 border border-gray-300 rounded bg-white text-gray-900 text-sm min-w-[140px]"
              >
                <option value="in">In (login time in range)</option>
                <option value="out">Out (logout time in range)</option>
                <option value="both">Both</option>
              </select>
            </div>
            <button
              type="button"
              onClick={applyFilters}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded"
            >
              Apply
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-3">
            Optional: record a session for testing, or call <code className="text-xs bg-gray-100 px-1 rounded">POST …/login-logs</code> from your operator auth flow.
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            <button
              type="button"
              disabled={actionBusy || loading}
              onClick={() => void postSession('login')}
              className="px-3 py-1.5 text-sm border border-gray-400 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
            >
              Record login (now)
            </button>
            <button
              type="button"
              disabled={actionBusy || loading}
              onClick={() => void postSession('logout')}
              className="px-3 py-1.5 text-sm border border-gray-400 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
            >
              Record logout (close session)
            </button>
          </div>
        </div>

        {error ? (
          <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : null}

        <div className="overflow-x-auto rounded border border-gray-300 bg-white shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-teal-700 text-white">
                <th className="px-4 py-3 font-semibold text-sm w-14">Image</th>
                <th className="px-4 py-3 font-semibold text-sm">UserName</th>
                <th className="px-4 py-3 font-semibold text-sm">Name</th>
                <th className="px-4 py-3 font-semibold text-sm">Country</th>
                <th className="px-4 py-3 font-semibold text-sm">Language</th>
                <th className="px-4 py-3 font-semibold text-sm">Login</th>
                <th className="px-4 py-3 font-semibold text-sm">Logout</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    Loading…
                  </td>
                </tr>
              ) : !staff ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    No staff data.
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    No login rows in this range. Adjust dates or record a login.
                  </td>
                </tr>
              ) : (
                logs.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" aria-hidden />
                        <div className="w-10 h-10 rounded overflow-hidden bg-gray-200 flex items-center justify-center flex-shrink-0">
                          {staff.imageUrl ? (
                            isDataUrl(staff.imageUrl) ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={staff.imageUrl}
                                alt=""
                                width={40}
                                height={40}
                                className="object-cover w-full h-full"
                              />
                            ) : (
                              <Image
                                src={staff.imageUrl}
                                alt=""
                                width={40}
                                height={40}
                                className="object-cover w-full h-full"
                              />
                            )
                          ) : (
                            <User className="w-5 h-5 text-gray-500" />
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-red-600 font-medium">{staff.username}</td>
                    <td className="px-4 py-3 text-gray-800">{staff.name}</td>
                    <td className="px-4 py-3 text-gray-700">{staff.country}</td>
                    <td className="px-4 py-3 font-bold text-gray-800">{staff.language}</td>
                    <td className="px-4 py-3 text-gray-800 whitespace-nowrap">{formatDateTime(row.loginAt)}</td>
                    <td className="px-4 py-3 text-gray-800 whitespace-nowrap">{formatDateTime(row.logoutAt)}</td>
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

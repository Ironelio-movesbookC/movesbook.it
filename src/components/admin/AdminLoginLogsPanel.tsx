'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { User } from 'lucide-react';
import {
  OperatorFilterPopover,
  matchesLoginLogSessionFilter,
  matchesOperatorRoleFilter,
  type OperatorLoginFilter,
} from '@/components/operators/OperatorFilterPopover';

export type LogType = 'in' | 'out' | 'both';

export type AdminLoginLogRow = {
  id: string;
  loginAt: string;
  logoutAt: string | null;
  userTypeLabel: string;
  profileHref?: string | null;
  account: {
    id: string;
    username: string;
    name: string;
    country: string;
    language: string;
    imageUrl: string | null;
  };
};

export type AdminLoginLogsVariant = 'operators' | 'users' | 'editors';

const isDataUrl = (src?: string | null) =>
  typeof src === 'string' && src.startsWith('data:image/');

export function formatLoginLogDateTime(iso: string | null | undefined): string {
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

function accountKindFromUserTypeLabel(
  label: string,
): 'OPERATOR' | 'CO_ADMIN' | null {
  if (label === 'Co-Admin') return 'CO_ADMIN';
  if (label === 'Operator') return 'OPERATOR';
  return null;
}

type AdminLoginLogsPanelProps = {
  title: string;
  description: string;
  apiPath: string;
  variant: AdminLoginLogsVariant;
  emptyMessage?: string;
  listTitle?: string;
};

export default function AdminLoginLogsPanel({
  title,
  description,
  apiPath,
  variant,
  emptyMessage = 'No login rows in this range. Adjust dates or wait for new logins.',
  listTitle = 'Login list',
}: AdminLoginLogsPanelProps) {
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

  const [rows, setRows] = useState<AdminLoginLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterCountry, setFilterCountry] = useState('all');
  const [filterRole, setFilterRole] = useState('all');
  const [filterLogin, setFilterLogin] = useState<OperatorLoginFilter>('all');
  const [filterType, setFilterType] = useState('all');

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
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) {
        setError('Admin session not found.');
        setRows([]);
        return;
      }
      const res = await fetch(`${apiPath}?${queryString}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to load login logs');
      setRows(Array.isArray(data.rows) ? data.rows : []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [apiPath, queryString]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleProceed = () => {
    setFilterOpen(false);
  };

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let base = rows;

    if (variant === 'operators' && filterType !== 'all') {
      base = base.filter((r) => {
        const label = r.userTypeLabel.toLowerCase();
        if (filterType === 'superadmin') return label.includes('super admin');
        if (filterType === 'coadmin') return label.includes('co-admin');
        if (filterType === 'operator') return label === 'operator';
        return true;
      });
    }

    if (variant === 'users' && filterType !== 'all') {
      base = base.filter((r) => r.userTypeLabel === filterType);
    }

    if (variant === 'editors' && filterType !== 'all') {
      base = base.filter((r) => r.userTypeLabel === filterType);
    }

    if (filterCountry !== 'all') {
      base = base.filter((r) => (r.account.country || '').trim() === filterCountry);
    }

    if (variant === 'operators' || variant === 'editors') {
      base = base.filter((r) =>
        matchesOperatorRoleFilter(
          r.userTypeLabel,
          filterRole,
          accountKindFromUserTypeLabel(r.userTypeLabel),
        ),
      );
    }

    base = base.filter((r) => matchesLoginLogSessionFilter(r.logoutAt, filterLogin));

    if (!q) return base;
    return base.filter((r) => {
      const { account } = r;
      return `${account.username} ${account.name} ${account.country} ${account.language} ${r.userTypeLabel}`
        .toLowerCase()
        .includes(q);
    });
  }, [filterCountry, filterLogin, filterRole, filterType, rows, searchQuery, variant]);

  const typeSelect = (() => {
    if (variant === 'operators') {
      return (
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-3 py-2.5 border border-gray-300 rounded bg-white text-gray-800 min-w-[140px] focus:outline-none focus:ring-2 focus:ring-[#005c99]"
          aria-label="Filter by panel user type"
        >
          <option value="all">All</option>
          <option value="superadmin">Super Admin</option>
          <option value="coadmin">Co-Admins</option>
          <option value="operator">Operators</option>
        </select>
      );
    }
    if (variant === 'users') {
      return (
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-3 py-2.5 border border-gray-300 rounded bg-white text-gray-800 min-w-[160px] focus:outline-none focus:ring-2 focus:ring-[#005c99]"
          aria-label="Filter by user type"
        >
          <option value="all">All</option>
          <option value="Single User">Single User</option>
          <option value="Coach">Coach</option>
          <option value="Team admin">Team admin</option>
          <option value="Club admin">Club admin</option>
          <option value="Group admin">Group admin</option>
        </select>
      );
    }
    return (
      <select
        value={filterType}
        onChange={(e) => setFilterType(e.target.value)}
        className="px-3 py-2.5 border border-gray-300 rounded bg-white text-gray-800 min-w-[140px] focus:outline-none focus:ring-2 focus:ring-[#005c99]"
        aria-label="Filter by editor role"
      >
        <option value="all">All</option>
        <option value="Translator">Translator</option>
        <option value="Web operator">Web operator</option>
      </select>
    );
  })();

  const searchPlaceholder =
    variant === 'users'
      ? 'Fullname, username, user type'
      : 'Name, username, country, type';

  return (
    <div className="min-h-full bg-gray-50">
      <div className="max-w-[1800px] mx-auto px-6 py-6 space-y-4">
        <div className="bg-white border border-gray-300 rounded-lg p-4 shadow-sm">
          <h1 className="text-lg font-semibold text-gray-900 mb-1">{title}</h1>
          <p className="text-sm text-gray-600 mb-3">{description}</p>
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
              onClick={() => void load()}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded"
            >
              Apply
            </button>
          </div>
        </div>

        {error ? (
          <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : null}

        <div className="flex flex-wrap items-end gap-4">
          <OperatorFilterPopover
            open={filterOpen}
            onOpenChange={setFilterOpen}
            country={filterCountry}
            onCountryChange={setFilterCountry}
            role={filterRole}
            onRoleChange={setFilterRole}
            login={filterLogin}
            onLoginChange={setFilterLogin}
            showRole={variant !== 'users'}
            onClear={() => {
              setFilterCountry('all');
              setFilterRole('all');
              setFilterLogin('all');
            }}
          />

          {typeSelect}

          <div className="flex flex-col">
            <label htmlFor={`search-login-logs-${variant}`} className="text-sm text-gray-700 mb-1">
              Search
            </label>
            <input
              id={`search-login-logs-${variant}`}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="px-3 py-2 border border-gray-300 rounded bg-white text-gray-800 w-56 focus:outline-none focus:ring-2 focus:ring-[#005c99]"
            />
          </div>

          <button
            type="button"
            onClick={handleProceed}
            className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded transition"
          >
            Proceed
          </button>
        </div>

        <div className="px-4 py-2.5 bg-[#4f4f4f] text-white font-medium rounded-t border border-gray-300 border-b-0">
          {listTitle}
          {!loading && rows.length > 0 ? (
            <span className="font-normal text-gray-300 ml-2">
              ({filteredRows.length} of {rows.length})
            </span>
          ) : null}
        </div>

        <div className="overflow-x-auto rounded-b border border-gray-300 border-t-0 bg-white shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-teal-700 text-white">
                <th className="px-4 py-3 font-semibold text-sm w-14">Image</th>
                <th className="px-4 py-3 font-semibold text-sm">UserName</th>
                <th className="px-4 py-3 font-semibold text-sm">Name</th>
                <th className="px-4 py-3 font-semibold text-sm">User type</th>
                <th className="px-4 py-3 font-semibold text-sm">Country</th>
                <th className="px-4 py-3 font-semibold text-sm">Language</th>
                <th className="px-4 py-3 font-semibold text-sm">Login</th>
                <th className="px-4 py-3 font-semibold text-sm">Logout</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    Loading…
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    {rows.length === 0 ? emptyMessage : 'No rows match your search or filters.'}
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => {
                  const { account } = row;
                  const isOpen = !row.logoutAt;
                  return (
                    <tr key={row.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full flex-shrink-0 ${
                              isOpen ? 'bg-green-500' : 'bg-gray-400'
                            }`}
                            aria-hidden
                            title={isOpen ? 'Session open' : 'Session closed'}
                          />
                          <div className="w-10 h-10 rounded overflow-hidden bg-gray-200 flex items-center justify-center flex-shrink-0">
                            {account.imageUrl ? (
                              isDataUrl(account.imageUrl) ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={account.imageUrl}
                                  alt=""
                                  width={40}
                                  height={40}
                                  className="object-cover w-full h-full"
                                />
                              ) : (
                                <Image
                                  src={account.imageUrl}
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
                      <td className="px-4 py-3">
                        {row.profileHref ? (
                          <Link
                            href={row.profileHref}
                            className="text-red-600 font-medium hover:underline"
                          >
                            {account.username}
                          </Link>
                        ) : (
                          <span className="text-red-600 font-medium">{account.username}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-800">{account.name}</td>
                      <td className="px-4 py-3 text-gray-800 font-medium">{row.userTypeLabel}</td>
                      <td className="px-4 py-3 text-gray-700">{account.country}</td>
                      <td className="px-4 py-3 font-bold text-gray-800">{account.language}</td>
                      <td className="px-4 py-3 text-gray-800 whitespace-nowrap">
                        {formatLoginLogDateTime(row.loginAt)}
                      </td>
                      <td className="px-4 py-3 text-gray-800 whitespace-nowrap">
                        {formatLoginLogDateTime(row.logoutAt)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

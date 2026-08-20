'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Mail, User } from 'lucide-react';
import {
  OperatorFilterPopover,
  matchesLoginLogSessionFilter,
  matchesOperatorRoleFilter,
  type OperatorLoginFilter,
} from '@/components/operators/OperatorFilterPopover';
import {
  LAST_LOGGED_DATE_OPTIONS,
  parseLastLoggedDatePreset,
  parseLastLoggedUserType,
  resolveLastLoggedDateRange,
  type LastLoggedDatePreset,
} from '@/lib/admin/lastLoggedShared';
import type { StatsUserKind } from '@/lib/admin/statisticsKinds';
import { getAdminBearerToken } from '@/lib/admin/clientAdminAuth';
import AdminUserPanelButton from '@/components/admin/AdminUserPanelButton';

const STATS_KIND_TO_LOGIN_LABEL: Record<StatsUserKind, string> = {
  single: 'Single User',
  coaches: 'Coach',
  teams: 'Team admin',
  clubs: 'Club admin',
  groups: 'Group admin',
};

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
  /** When set from Last Logged View All, force that branding even after date Apply. */
  context?: 'default' | 'last-logged';
};

export default function AdminLoginLogsPanel({
  title,
  description,
  apiPath,
  variant,
  emptyMessage = 'No login rows in this range. Adjust dates or wait for new logins.',
  listTitle = 'Login list',
  context = 'default',
}: AdminLoginLogsPanelProps) {
  const searchParams = useSearchParams();

  const initialFromUrl = useMemo(() => {
    if (variant !== 'users') return null;
    const dateRaw = searchParams?.get('date');
    const fromRaw = searchParams?.get('from');
    const toRaw = searchParams?.get('to');
    const typeRaw = (searchParams?.get('type') || '').toLowerCase();
    const userType = parseLastLoggedUserType(searchParams?.get('userType'));
    const country = searchParams?.get('country')?.trim() || '';
    const hasSidebarParams = Boolean(dateRaw || fromRaw || toRaw || userType !== 'all' || country);
    if (!hasSidebarParams && !typeRaw) return null;

    let from: Date;
    let to: Date;
    let datePreset: LastLoggedDatePreset | null = null;
    if (dateRaw) {
      datePreset = parseLastLoggedDatePreset(dateRaw);
      const range = resolveLastLoggedDateRange(datePreset);
      from = range.from;
      to = range.to;
    } else if (fromRaw || toRaw) {
      from = fromRaw ? new Date(fromRaw) : new Date();
      to = toRaw ? new Date(toRaw) : new Date();
      if (Number.isNaN(from.getTime())) {
        from = new Date();
        from.setDate(from.getDate() - 30);
        from.setHours(0, 0, 0, 0);
      }
      if (Number.isNaN(to.getTime())) {
        to = new Date();
        to.setHours(23, 59, 0, 0);
      }
    } else if (hasSidebarParams) {
      const range = resolveLastLoggedDateRange('today');
      from = range.from;
      to = range.to;
      datePreset = 'today';
    } else {
      return null;
    }

    const logType: LogType =
      typeRaw === 'in' || typeRaw === 'out' || typeRaw === 'both'
        ? typeRaw
        : dateRaw
          ? 'in'
          : 'both';

    return {
      dateFrom: toDatetimeLocalValue(from),
      dateTo: toDatetimeLocalValue(to),
      logType,
      datePreset,
      userType,
      country,
      filterType: userType === 'all' ? 'all' : STATS_KIND_TO_LOGIN_LABEL[userType],
    };
  }, [searchParams, variant]);

  const [dateFrom, setDateFrom] = useState(() => {
    if (initialFromUrl) return initialFromUrl.dateFrom;
    const t = new Date();
    t.setDate(t.getDate() - 30);
    t.setHours(0, 0, 0, 0);
    return toDatetimeLocalValue(t);
  });
  const [dateTo, setDateTo] = useState(() => {
    if (initialFromUrl) return initialFromUrl.dateTo;
    const t = new Date();
    t.setHours(23, 59, 0, 0);
    return toDatetimeLocalValue(t);
  });
  const [logType, setLogType] = useState<LogType>(
    () => initialFromUrl?.logType ?? 'both',
  );
  const [urlDatePreset, setUrlDatePreset] = useState<LastLoggedDatePreset | null>(
    () => initialFromUrl?.datePreset ?? null,
  );
  const [urlUserType, setUrlUserType] = useState<StatsUserKind | 'all'>(
    () => initialFromUrl?.userType ?? 'all',
  );
  const [urlCountry, setUrlCountry] = useState(() => initialFromUrl?.country ?? '');

  const [rows, setRows] = useState<AdminLoginLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterCountry, setFilterCountry] = useState(
    () => (initialFromUrl?.country ? initialFromUrl.country : 'all'),
  );
  const [filterRole, setFilterRole] = useState('all');
  const [filterLogin, setFilterLogin] = useState<OperatorLoginFilter>('all');
  const [filterType, setFilterType] = useState(() => initialFromUrl?.filterType ?? 'all');

  /** Checked (tagged) account ids for bulk Send Mail — users variant only. */
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(() => new Set());
  const [msgOpen, setMsgOpen] = useState(false);
  const [msgTargets, setMsgTargets] = useState<Array<{ id: string; username: string }>>([]);
  const [msgSubject, setMsgSubject] = useState('Message from Movesbook Admin');
  const [msgDraft, setMsgDraft] = useState('');
  const [msgSending, setMsgSending] = useState(false);
  const [msgError, setMsgError] = useState('');

  const allowMailActions = variant === 'users';
  const isLastLoggedView = context === 'last-logged' || (Boolean(urlDatePreset) && variant === 'users');

  const displayTitle = isLastLoggedView ? 'Last Logged users' : title;
  const displayDescription = isLastLoggedView
    ? `Users who logged in (${LAST_LOGGED_DATE_OPTIONS.find((o) => o.value === urlDatePreset)?.label ?? 'selected period'}). Same login log grid as Super Admin → Logins about users. Check rows to mail several users, or use Send Mail on one row.`
    : description;
  const displayListTitle = isLastLoggedView ? 'Last Logged users' : listTitle;

  useEffect(() => {
    if (!initialFromUrl) return;
    setDateFrom(initialFromUrl.dateFrom);
    setDateTo(initialFromUrl.dateTo);
    setLogType(initialFromUrl.logType);
    setUrlDatePreset(initialFromUrl.datePreset);
    setUrlUserType(initialFromUrl.userType);
    setUrlCountry(initialFromUrl.country);
    setFilterType(initialFromUrl.filterType);
    setFilterCountry(initialFromUrl.country ? initialFromUrl.country : 'all');
    setSelectedUserIds(new Set());
  }, [initialFromUrl]);

  const queryString = useMemo(() => {
    const qs = new URLSearchParams();
    if (urlDatePreset && variant === 'users') {
      qs.set('date', urlDatePreset);
    } else {
      const from = dateFrom ? new Date(dateFrom).toISOString() : '';
      const to = dateTo ? new Date(dateTo).toISOString() : '';
      if (from) qs.set('from', from);
      if (to) qs.set('to', to);
    }
    qs.set('type', logType);
    if (variant === 'users') {
      if (urlUserType !== 'all') qs.set('userType', urlUserType);
      if (urlCountry) qs.set('country', urlCountry);
    }
    return qs.toString();
  }, [dateFrom, dateTo, logType, urlCountry, urlDatePreset, urlUserType, variant]);

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

  const onApplyDates = () => {
    setUrlDatePreset(null);
    void load();
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

  const uniqueFilteredUserIds = useMemo(() => {
    const ids: string[] = [];
    const seen = new Set<string>();
    for (const r of filteredRows) {
      if (seen.has(r.account.id)) continue;
      seen.add(r.account.id);
      ids.push(r.account.id);
    }
    return ids;
  }, [filteredRows]);

  const allFilteredSelected =
    uniqueFilteredUserIds.length > 0 &&
    uniqueFilteredUserIds.every((id) => selectedUserIds.has(id));

  const toggleSelectUser = (userId: string) => {
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const toggleSelectAllFiltered = () => {
    setSelectedUserIds((prev) => {
      if (allFilteredSelected) {
        const next = new Set(prev);
        for (const id of uniqueFilteredUserIds) next.delete(id);
        return next;
      }
      const next = new Set(prev);
      for (const id of uniqueFilteredUserIds) next.add(id);
      return next;
    });
  };

  const openMailForUsers = (targets: Array<{ id: string; username: string }>) => {
    if (targets.length === 0) {
      window.alert('Select at least one user (checkbox) or use Send Mail on a row.');
      return;
    }
    setMsgTargets(targets);
    setMsgSubject('Message from Movesbook Admin');
    setMsgDraft('');
    setMsgError('');
    setMsgOpen(true);
  };

  const openMailForSelected = () => {
    const byId = new Map<string, string>();
    for (const r of filteredRows) {
      if (selectedUserIds.has(r.account.id)) {
        byId.set(r.account.id, r.account.username);
      }
    }
    openMailForUsers(
      Array.from(byId.entries()).map(([id, username]) => ({ id, username })),
    );
  };

  const openMailForRow = (row: AdminLoginLogRow) => {
    openMailForUsers([{ id: row.account.id, username: row.account.username }]);
  };

  const sendMail = async () => {
    if (msgTargets.length === 0) return;
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
          userIds: msgTargets.map((t) => t.id),
          message,
          subject: msgSubject.trim() || 'Message from Movesbook Admin',
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Failed to send message');
      const sent = typeof body.sent === 'number' ? body.sent : msgTargets.length;
      const failed = Array.isArray(body.failed) ? body.failed.length : 0;
      setMsgOpen(false);
      setSelectedUserIds(new Set());
      if (failed > 0) {
        window.alert(`Message sent to ${sent} user(s). ${failed} failed — check email addresses.`);
      } else {
        window.alert(`Message sent to ${sent} user(s).`);
      }
    } catch (e) {
      setMsgError(e instanceof Error ? e.message : 'Failed to send message');
    } finally {
      setMsgSending(false);
    }
  };

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
          onChange={(e) => {
            const v = e.target.value;
            setFilterType(v);
            const entry = Object.entries(STATS_KIND_TO_LOGIN_LABEL).find(([, label]) => label === v);
            setUrlUserType(entry ? (entry[0] as StatsUserKind) : 'all');
          }}
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
    <div className="min-h-full bg-[#ececec]">
      <div className="mx-auto w-full max-w-full space-y-4 p-4 md:p-6">
        <div className="bg-white border border-gray-300 rounded-lg p-4 shadow-sm">
          <h1 className="text-lg font-semibold text-gray-900 mb-1">{displayTitle}</h1>
          <p className="text-sm text-gray-600 mb-3">{displayDescription}</p>
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Date from</label>
              <input
                type="datetime-local"
                value={dateFrom}
                onChange={(e) => {
                  setUrlDatePreset(null);
                  setDateFrom(e.target.value);
                }}
                className="px-3 py-2 border border-gray-300 rounded bg-white text-gray-900 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Date to</label>
              <input
                type="datetime-local"
                value={dateTo}
                onChange={(e) => {
                  setUrlDatePreset(null);
                  setDateTo(e.target.value);
                }}
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
              onClick={onApplyDates}
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
            onCountryChange={(c) => {
              setFilterCountry(c);
              if (variant === 'users') {
                setUrlCountry(c === 'all' ? '' : c);
              }
            }}
            role={filterRole}
            onRoleChange={setFilterRole}
            login={filterLogin}
            onLoginChange={setFilterLogin}
            showRole={variant !== 'users'}
            onClear={() => {
              setFilterCountry('all');
              setFilterRole('all');
              setFilterLogin('all');
              if (variant === 'users') setUrlCountry('');
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

          {allowMailActions ? (
            <button
              type="button"
              onClick={openMailForSelected}
              disabled={selectedUserIds.size === 0}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#058592] hover:bg-[#046f79] disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded transition"
            >
              <Mail className="w-4 h-4" />
              Send Mail
              {selectedUserIds.size > 0 ? ` (${selectedUserIds.size})` : ''}
            </button>
          ) : null}
        </div>

        <div className="px-4 py-2.5 bg-[#4f4f4f] text-white font-medium rounded-t border border-gray-300 border-b-0">
          {displayListTitle}
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
                {allowMailActions ? (
                  <th className="px-3 py-3 font-semibold text-sm w-12">
                    <input
                      type="checkbox"
                      checked={allFilteredSelected}
                      onChange={toggleSelectAllFiltered}
                      disabled={uniqueFilteredUserIds.length === 0}
                      className="rounded border-gray-300"
                      aria-label="Select all users in list"
                      title="Tag all users shown"
                    />
                  </th>
                ) : null}
                <th className="px-4 py-3 font-semibold text-sm w-14">Image</th>
                <th className="px-4 py-3 font-semibold text-sm">UserName</th>
                <th className="px-4 py-3 font-semibold text-sm">Name</th>
                <th className="px-4 py-3 font-semibold text-sm">User type</th>
                <th className="px-4 py-3 font-semibold text-sm">Country</th>
                <th className="px-4 py-3 font-semibold text-sm">Language</th>
                <th className="px-4 py-3 font-semibold text-sm">Login</th>
                <th className="px-4 py-3 font-semibold text-sm">Logout</th>
                {allowMailActions ? (
                  <th className="px-4 py-3 font-semibold text-sm min-w-[9rem]">Actions</th>
                ) : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td
                    colSpan={allowMailActions ? 10 : 8}
                    className="px-4 py-8 text-center text-gray-500"
                  >
                    Loading…
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={allowMailActions ? 10 : 8}
                    className="px-4 py-8 text-center text-gray-500"
                  >
                    {rows.length === 0 ? emptyMessage : 'No rows match your search or filters.'}
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => {
                  const { account } = row;
                  const isOpen = !row.logoutAt;
                  const profileHref =
                    row.profileHref ||
                    (variant === 'users'
                      ? `/admin/all?openUser=${encodeURIComponent(account.id)}`
                      : null);
                  const checked = selectedUserIds.has(account.id);
                  return (
                    <tr key={row.id} className="hover:bg-gray-50 transition">
                      {allowMailActions ? (
                        <td className="px-3 py-3">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleSelectUser(account.id)}
                            className="rounded border-gray-400"
                            aria-label={`Tag ${account.username}`}
                            title="Tag user for Send Mail"
                          />
                        </td>
                      ) : null}
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
                        {profileHref ? (
                          <Link
                            href={profileHref}
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
                      {allowMailActions ? (
                        <td className="px-4 py-3">
                          <div className="flex flex-col items-start gap-1.5">
                            <AdminUserPanelButton userId={account.id} />
                            <button
                              type="button"
                              onClick={() => openMailForRow(row)}
                              className="inline-flex items-center gap-1 text-sm text-[#058592] hover:underline"
                              title={`Send mail to ${account.username}`}
                            >
                              <Mail className="w-3.5 h-3.5" />
                              Send Mail
                            </button>
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {msgOpen && msgTargets.length > 0 ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="mb-1 text-lg font-semibold text-gray-900">Send Mail</h2>
            <p className="mb-4 text-sm text-gray-600">
              {msgTargets.length === 1
                ? `To ${msgTargets[0].username}`
                : `To ${msgTargets.length} tagged users`}
            </p>
            {msgTargets.length > 1 ? (
              <p className="mb-3 max-h-20 overflow-y-auto text-xs text-gray-500">
                {msgTargets.map((t) => t.username).join(', ')}
              </p>
            ) : null}
            <label className="mb-2 block text-sm font-medium text-gray-700">Subject</label>
            <input
              type="text"
              value={msgSubject}
              onChange={(e) => setMsgSubject(e.target.value)}
              className="send-message-field mb-3 w-full rounded border border-gray-400 px-3 py-2 text-sm text-gray-900"
            />
            <label className="mb-2 block text-sm font-medium text-gray-700">Message</label>
            <textarea
              value={msgDraft}
              onChange={(e) => setMsgDraft(e.target.value)}
              rows={5}
              className="send-message-field mb-3 w-full resize-none rounded border border-gray-400 px-3 py-2 text-sm text-gray-900"
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
                onClick={() => void sendMail()}
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

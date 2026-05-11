'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ExternalLink, LayoutGrid, LayoutList, Search as SearchIcon } from 'lucide-react';

export type AdminUserSegment = 'single-user' | 'coaches' | 'groups' | 'teams' | 'clubs';

export interface AdminRegisteredUsersListProps {
  segment: AdminUserSegment;
  /** Highlight word in the grey title bar, e.g. "Athlete", "Coach" */
  roleTitle: string;
  /** Purple subtitle bar */
  historicalSubtitle: string;
}

interface RowUser {
  id: string;
  username: string;
  email: string;
  displayName: string;
  userType: string;
  country: string | null;
  dateStart: string;
  dateEnd: string | null;
  version: string;
  amount: string;
  status: string;
}

type MembershipTab = 'all' | 'current' | 'last';

type LoginFilter = 'all' | 'active7' | 'active24h' | 'never';

interface FilterState {
  country: string;
  mainSport: string;
  version: string;
  login: LoginFilter;
  subDay: string;
  subMonth: string;
  subYear: string;
  rangeFrom: string;
  rangeTo: string;
}

const EMPTY_FILTERS: FilterState = {
  country: '',
  mainSport: '',
  version: '',
  login: 'all',
  subDay: '',
  subMonth: '',
  subYear: '',
  rangeFrom: '',
  rangeTo: '',
};

const ORDER_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Ordering' },
  { value: 'username', label: 'by Username' },
  { value: 'fullname', label: 'by Full Name' },
  { value: 'date', label: 'by date' },
  { value: 'date_end', label: 'by date end subscription' },
];

const LOGIN_OPTIONS: { value: LoginFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active24h', label: 'Seen in 24h' },
  { value: 'active7', label: 'Seen in 7 days' },
  { value: 'never', label: 'Never logged in' },
];

const MONTH_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'select' },
  ...[
    'jan',
    'feb',
    'mar',
    'apr',
    'may',
    'jun',
    'jul',
    'aug',
    'sep',
    'oct',
    'nov',
    'dec',
  ].map((label, i) => ({ value: String(i + 1), label })),
];

const DAY_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'select' },
  ...Array.from({ length: 31 }, (_, i) => ({
    value: String(i + 1),
    label: String(i + 1),
  })),
];

const YEAR_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'select' },
  ...Array.from({ length: 2026 - 1990 + 1 }, (_, i) => {
    const y = 1990 + i;
    return { value: String(y), label: String(y) };
  }),
];

const VERSION_BY_SEGMENT: Record<AdminUserSegment, string[]> = {
  'single-user': ['User — base version'],
  coaches: ['Coach — base'],
  groups: ['Group account'],
  teams: ['Team account'],
  clubs: ['Club account'],
};

export default function AdminRegisteredUsersList({
  segment,
  roleTitle,
  historicalSubtitle,
}: AdminRegisteredUsersListProps) {
  const [membershipTab, setMembershipTab] = useState<MembershipTab>('all');
  const [searchDraft, setSearchDraft] = useState('');
  const [searchApplied, setSearchApplied] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [rows, setRows] = useState<RowUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [orderBy, setOrderBy] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [draftFilters, setDraftFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [metaCountries, setMetaCountries] = useState<string[]>([]);
  const [metaSports, setMetaSports] = useState<{ value: string; label: string }[]>([]);

  const filterWrapRef = useRef<HTMLDivElement>(null);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const versionOptions = useMemo(() => VERSION_BY_SEGMENT[segment], [segment]);

  useEffect(() => {
    let cancelled = false;
    async function loadMeta() {
      const token = localStorage.getItem('adminToken');
      if (!token) return;
      try {
        const res = await fetch(`/api/admin/registered-users/meta?segment=${encodeURIComponent(segment)}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || cancelled) return;
        if (Array.isArray(data.countries)) setMetaCountries(data.countries);
        if (Array.isArray(data.sports)) setMetaSports(data.sports);
      } catch {
        /* ignore */
      }
    }
    void loadMeta();
    return () => {
      cancelled = true;
    };
  }, [segment]);

  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (!filterOpen) return;
      const el = filterWrapRef.current;
      if (el && !el.contains(e.target as Node)) {
        setFilterOpen(false);
        setDraftFilters({ ...appliedFilters });
      }
    }
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, [filterOpen, appliedFilters]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) {
        setError('Admin session not found. Please log in again.');
        setRows([]);
        return;
      }
      const params = new URLSearchParams({
        segment,
        page: String(page),
        pageSize: String(pageSize),
        q: searchApplied,
      });
      if (orderBy) params.set('order', orderBy);
      if (appliedFilters.country) params.set('country', appliedFilters.country);
      if (appliedFilters.mainSport) params.set('sport', appliedFilters.mainSport);
      if (appliedFilters.version) params.set('version', appliedFilters.version);
      if (appliedFilters.login !== 'all') params.set('login', appliedFilters.login);
      if (appliedFilters.subDay) params.set('subDay', appliedFilters.subDay);
      if (appliedFilters.subMonth) params.set('subMonth', appliedFilters.subMonth);
      if (appliedFilters.subYear) params.set('subYear', appliedFilters.subYear);
      if (appliedFilters.rangeFrom) params.set('createdFrom', appliedFilters.rangeFrom);
      if (appliedFilters.rangeTo) params.set('createdTo', appliedFilters.rangeTo);

      const res = await fetch(`/api/admin/registered-users?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to load users');
      setRows(Array.isArray(data?.users) ? data.users : []);
      setTotal(typeof data?.total === 'number' ? data.total : 0);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, searchApplied, segment, orderBy, appliedFilters]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPage(1);
    setSelected(new Set());
  }, [membershipTab]);

  useEffect(() => {
    setPage(1);
  }, [orderBy]);

  useEffect(() => {
    setAppliedFilters(EMPTY_FILTERS);
    setDraftFilters(EMPTY_FILTERS);
    setOrderBy('');
    setPage(1);
    setSelected(new Set());
    setFilterOpen(false);
  }, [segment]);

  const allOnPageSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));

  const toggleSelectAll = () => {
    if (allOnPageSelected) {
      setSelected(new Set());
      return;
    }
    setSelected(new Set(rows.map((r) => r.id)));
  };

  const toggleRow = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const pageNumbers = useMemo(() => {
    const maxButtons = 5;
    if (totalPages <= maxButtons) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const half = Math.floor(maxButtons / 2);
    let start = Math.max(1, page - half);
    let end = Math.min(totalPages, start + maxButtons - 1);
    if (end - start < maxButtons - 1) start = Math.max(1, end - maxButtons + 1);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, [page, totalPages]);

  const applySearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchApplied(searchDraft.trim());
    setPage(1);
  };

  const openFilterPanel = () => {
    setDraftFilters({ ...appliedFilters });
    setFilterOpen(true);
  };

  const filterOk = () => {
    setAppliedFilters({ ...draftFilters });
    setFilterOpen(false);
    setPage(1);
  };

  const filterExit = () => {
    setDraftFilters({ ...appliedFilters });
    setFilterOpen(false);
  };

  return (
    <div className="max-w-[1800px] mx-auto px-4 sm:px-6 py-6 text-gray-900">
      {/* Title strip */}
      <div className="bg-[#b8b8b8] px-4 py-3 border border-gray-400">
        <h1 className="text-lg sm:text-xl font-semibold text-gray-800">
          Details of subscription — <span className="text-red-600">{roleTitle}</span>
        </h1>
      </div>

      <div className="bg-[#6b4c9a] text-white px-4 py-2.5 text-sm sm:text-base font-medium border-x border-b border-[#5a3d82]">
        {historicalSubtitle}
      </div>

      {/* Membership tabs + toolbar */}
      <div className="bg-gray-100 border border-t-0 border-gray-300 p-3 sm:p-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          {(
            [
              ['all', 'All memberships'],
              ['current', 'Only current memberships'],
              ['last', 'Last membership'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setMembershipTab(key)}
              className={`px-4 py-2 text-sm font-semibold rounded border transition ${
                membershipTab === key
                  ? 'bg-red-600 text-white border-red-700'
                  : 'bg-neutral-900 text-white border-black hover:bg-neutral-800'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex flex-col lg:flex-row lg:items-start gap-3 flex-wrap">
          <div ref={filterWrapRef} className="relative flex flex-wrap items-start gap-2">
            <button
              type="button"
              onClick={() => (filterOpen ? filterExit() : openFilterPanel())}
              className="px-3 py-2 bg-neutral-900 text-white text-sm font-medium border border-black rounded flex items-center gap-1"
            >
              Filter <span className="text-[10px]">▾</span>
            </button>

            <select
              value={orderBy}
              onChange={(e) => setOrderBy(e.target.value)}
              className="h-9 border border-black bg-white px-3 text-sm rounded min-w-[160px] text-gray-800"
            >
              {ORDER_OPTIONS.map((o) => (
                <option key={o.value || 'ordering'} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>

            {filterOpen && (
              <div className="absolute left-0 top-full z-50 mt-1 w-[min(100vw-2rem,420px)] border border-black bg-[#fff8dc] shadow-lg">
                <div className="p-4 space-y-3 text-sm">
                  <FilterRow label="Country">
                    <select
                      value={draftFilters.country}
                      onChange={(e) => setDraftFilters((f) => ({ ...f, country: e.target.value }))}
                      className="w-full max-w-[220px] border border-gray-500 bg-white px-2 py-1.5 text-sm ml-auto"
                    >
                      <option value="">All</option>
                      {metaCountries.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </FilterRow>

                  <FilterRow label="Main Sport">
                    <select
                      value={draftFilters.mainSport}
                      onChange={(e) => setDraftFilters((f) => ({ ...f, mainSport: e.target.value }))}
                      className="w-full max-w-[220px] border border-gray-500 bg-white px-2 py-1.5 text-sm ml-auto"
                    >
                      <option value="">All</option>
                      {metaSports.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </FilterRow>

                  <FilterRow label="Version">
                    <select
                      value={draftFilters.version}
                      onChange={(e) => setDraftFilters((f) => ({ ...f, version: e.target.value }))}
                      className="w-full max-w-[220px] border border-gray-500 bg-white px-2 py-1.5 text-sm ml-auto"
                    >
                      <option value="">All</option>
                      {versionOptions.map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </FilterRow>

                  <div className="flex flex-wrap items-center gap-2 justify-between">
                    <span className="font-medium text-gray-900 shrink-0">Subscription</span>
                    <div className="flex flex-wrap gap-1 justify-end">
                      <select
                        value={draftFilters.subDay}
                        onChange={(e) => setDraftFilters((f) => ({ ...f, subDay: e.target.value }))}
                        className="border border-gray-500 bg-white px-1 py-1 text-xs sm:text-sm"
                      >
                        {DAY_OPTIONS.map((d) => (
                          <option key={d.value || 'd0'} value={d.value}>
                            {d.label}
                          </option>
                        ))}
                      </select>
                      <select
                        value={draftFilters.subMonth}
                        onChange={(e) => setDraftFilters((f) => ({ ...f, subMonth: e.target.value }))}
                        className="border border-gray-500 bg-white px-1 py-1 text-xs sm:text-sm"
                      >
                        {MONTH_OPTIONS.map((m) => (
                          <option key={m.value || 'm0'} value={m.value}>
                            {m.label}
                          </option>
                        ))}
                      </select>
                      <select
                        value={draftFilters.subYear}
                        onChange={(e) => setDraftFilters((f) => ({ ...f, subYear: e.target.value }))}
                        className="border border-gray-500 bg-white px-1 py-1 text-xs sm:text-sm"
                      >
                        {YEAR_OPTIONS.map((y) => (
                          <option key={y.value || 'y0'} value={y.value}>
                            {y.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="font-medium text-gray-900">Datarange</span>
                    <div className="flex flex-wrap items-center gap-2 pl-0 sm:pl-2">
                      <input
                        type="date"
                        value={draftFilters.rangeFrom}
                        onChange={(e) => setDraftFilters((f) => ({ ...f, rangeFrom: e.target.value }))}
                        className="border border-gray-500 bg-white px-2 py-1 text-sm flex-1 min-w-[140px]"
                      />
                      <span className="text-gray-500">—</span>
                      <input
                        type="date"
                        value={draftFilters.rangeTo}
                        onChange={(e) => setDraftFilters((f) => ({ ...f, rangeTo: e.target.value }))}
                        className="border border-gray-500 bg-white px-2 py-1 text-sm flex-1 min-w-[140px]"
                      />
                    </div>
                  </div>

                  <FilterRow label="Login">
                    <select
                      value={draftFilters.login}
                      onChange={(e) =>
                        setDraftFilters((f) => ({ ...f, login: e.target.value as LoginFilter }))
                      }
                      className="w-full max-w-[220px] border border-gray-500 bg-white px-2 py-1.5 text-sm ml-auto"
                    >
                      {LOGIN_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </FilterRow>
                </div>

                <div className="flex justify-center gap-4 border-t border-gray-400 bg-[#f5ebc8] py-3">
                  <button
                    type="button"
                    onClick={filterOk}
                    className="px-8 py-1.5 bg-[#c4c4c4] border border-gray-600 text-sm font-semibold text-gray-900 hover:bg-[#b8b8b8]"
                  >
                    OK
                  </button>
                  <button
                    type="button"
                    onClick={filterExit}
                    className="px-8 py-1.5 bg-[#c4c4c4] border border-gray-600 text-sm font-semibold text-gray-900 hover:bg-[#b8b8b8]"
                  >
                    Exit
                  </button>
                </div>
              </div>
            )}
          </div>

          <form onSubmit={applySearch} className="flex flex-1 flex-wrap items-center gap-2 min-w-[240px]">
            <span className="text-sm font-semibold text-gray-700 whitespace-nowrap">Search user</span>
            <input
              type="text"
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
              placeholder="Fullname, Username"
              className="flex-1 min-w-[160px] h-9 border border-gray-500 px-3 text-sm rounded bg-white"
            />
            <button
              type="submit"
              className="h-9 px-5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded border border-red-800"
            >
              Search
            </button>
          </form>

          <div className="flex items-center gap-1 ml-auto">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`p-2 rounded border ${viewMode === 'list' ? 'bg-amber-400 border-amber-600' : 'bg-white border-gray-400'}`}
              title="List view"
            >
              <LayoutList className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded border ${viewMode === 'grid' ? 'bg-amber-400 border-amber-600' : 'bg-white border-gray-400'}`}
              title="Grid view"
            >
              <LayoutGrid className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 text-sm text-blue-800 underline">
          <button type="button" className="hover:text-blue-950">
            Print
          </button>
          <button type="button" className="hover:text-blue-950">
            Send Msg
          </button>
          <button type="button" className="hover:text-blue-950">
            Send mail
          </button>
          <button type="button" className="hover:text-blue-950">
            Delete Subscriptions
          </button>
        </div>
      </div>

      {/* Select all + pagination bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-[#d9d9d9] border border-t-0 border-gray-300 px-3 py-2">
        <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
          <input
            type="checkbox"
            checked={allOnPageSelected}
            onChange={toggleSelectAll}
            className="rounded border-gray-600"
          />
          Select all
        </label>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-2 py-1 text-sm bg-white border border-gray-500 rounded disabled:opacity-40"
          >
            Prev
          </button>
          {pageNumbers.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setPage(n)}
              className={`min-w-[2rem] px-2 py-1 text-sm rounded border ${
                n === page ? 'bg-red-600 text-white border-red-800' : 'bg-white border-gray-500'
              }`}
            >
              {n}
            </button>
          ))}
          {totalPages > pageNumbers[pageNumbers.length - 1]! && (
            <span className="text-sm text-gray-600 px-1">…</span>
          )}
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="px-2 py-1 text-sm bg-white border border-gray-500 rounded disabled:opacity-40"
          >
            Next
          </button>
          <span className="text-xs text-gray-600 ml-2">
            {total} record{total !== 1 ? 's' : ''}
          </span>
        </div>

        <button
          type="button"
          className="px-4 py-2 bg-neutral-900 text-white text-sm font-semibold border border-black rounded sm:ml-4"
        >
          Renewal selected memberships
        </button>
      </div>

      {error && (
        <div className="mt-3 p-3 bg-red-50 text-red-800 text-sm border border-red-200 rounded">{error}</div>
      )}

      {loading ? (
        <div className="py-16 text-center text-gray-600">Loading…</div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
          {rows.map((r) => (
            <div
              key={r.id}
              className="border border-gray-300 bg-white p-4 rounded shadow-sm text-sm space-y-1"
            >
              <div className="font-semibold">{r.displayName}</div>
              <div className="text-gray-600">@{r.username}</div>
              <div>
                {r.dateStart} — {r.dateEnd ?? '—'}
              </div>
              <div>{r.version}</div>
              <div className="text-green-700 font-medium">{r.status}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto border border-t-0 border-gray-300">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="bg-[#4a8f96] text-white">
                <th className="w-10 px-2 py-2 text-left font-semibold border-r border-[#3d7a80]" />
                <th className="px-3 py-2 text-left font-semibold border-r border-[#3d7a80]">Date Start</th>
                <th className="px-3 py-2 text-left font-semibold border-r border-[#3d7a80]">Date End</th>
                <th className="px-3 py-2 text-left font-semibold border-r border-[#3d7a80]">Version</th>
                <th className="px-3 py-2 text-left font-semibold border-r border-[#3d7a80]">Username</th>
                <th className="px-2 py-2 text-left font-semibold border-r border-[#3d7a80] w-14">E</th>
                <th className="px-3 py-2 text-left font-semibold border-r border-[#3d7a80]">Status</th>
                <th className="w-12 px-2 py-2 text-center font-semibold"> </th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-gray-500 bg-white">
                    No registered users in this category yet.
                  </td>
                </tr>
              ) : (
                rows.map((r, i) => (
                  <tr
                    key={r.id}
                    className={i % 2 === 0 ? 'bg-white' : 'bg-[#f3f3f3]'}
                  >
                    <td className="px-2 py-2 border-t border-gray-300">
                      <input
                        type="checkbox"
                        checked={selected.has(r.id)}
                        onChange={() => toggleRow(r.id)}
                        className="rounded border-gray-500"
                      />
                    </td>
                    <td className="px-3 py-2 border-t border-gray-300 whitespace-nowrap">{r.dateStart}</td>
                    <td className="px-3 py-2 border-t border-gray-300 whitespace-nowrap">
                      {r.dateEnd ?? '—'}
                    </td>
                    <td className="px-3 py-2 border-t border-gray-300">{r.version}</td>
                    <td className="px-3 py-2 border-t border-gray-300 font-medium">{r.username}</td>
                    <td className="px-2 py-2 border-t border-gray-300 text-gray-700">{r.amount}</td>
                    <td className="px-3 py-2 border-t border-gray-300">{r.status}</td>
                    <td className="px-2 py-2 border-t border-gray-300 text-center">
                      <button
                        type="button"
                        className="inline-flex p-1.5 border border-gray-500 bg-white rounded hover:bg-gray-100"
                        title="View details"
                      >
                        <SearchIcon className="w-4 h-4 text-gray-700" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {!loading && rows.length > 0 && (
        <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
          <ExternalLink className="w-3 h-3 shrink-0" />
          Data comes from live registrations in Movesbook ({segment}).
        </p>
      )}
    </div>
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2 justify-between">
      <span className="font-medium text-gray-900 shrink-0">{label}</span>
      {children}
    </div>
  );
}

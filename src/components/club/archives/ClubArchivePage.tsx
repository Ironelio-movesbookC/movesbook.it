'use client';

import { useCallback, useEffect, useState } from 'react';
import ProcedureArchiveShell from '@/components/procedures/ProcedureArchiveShell';
import ProcedureArchiveTable from '@/components/procedures/ProcedureArchiveTable';
import ProcedurePagination from '@/components/procedures/ProcedurePagination';
import { fetchClubArchive, type ArchiveFetchParams, type ArchiveType } from '@/lib/club/archives/clubArchiveClient';
import type { Column, Member } from '@/types/clubTable';

type Props = {
  title: string;
  archiveType: ArchiveType;
  columns: Column[];
  pageSize?: number;
  direction?: 'all' | 'IN' | 'OUT';
  footerHint?: string;
  emptyMessage?: string;
  showFilters?: boolean;
};

export default function ClubArchivePage({
  title,
  archiveType,
  columns,
  pageSize = 25,
  direction,
  footerHint,
  emptyMessage = 'No records found.',
  showFilters = true,
}: Props) {
  const [data, setData] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [orderBy, setOrderBy] = useState<'recent' | 'old'>('recent');
  const [appliedFilters, setAppliedFilters] = useState<ArchiveFetchParams>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchClubArchive(archiveType, {
        page,
        pageSize,
        direction: archiveType === 'cash-movements' ? direction : undefined,
        ...appliedFilters,
      });
      setTotal(res.total);
      setData(res.items as Member[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [archiveType, appliedFilters, direction, page, pageSize]);

  useEffect(() => {
    load();
  }, [load]);

  function applyFilterForm(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setAppliedFilters({
      search: search.trim() || undefined,
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
      orderBy,
    });
  }

  function clearFilters() {
    setSearch('');
    setFromDate('');
    setToDate('');
    setOrderBy('recent');
    setPage(1);
    setAppliedFilters({});
  }

  return (
    <ProcedureArchiveShell
      title={title}
      activeTab=""
      tabs={[]}
      error={error || undefined}
      footerHint={footerHint}
      pagination={
        total > pageSize ? (
          <ProcedurePagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} />
        ) : undefined
      }
    >
      {showFilters && (
        <form onSubmit={applyFilterForm} className="flex flex-wrap gap-3 items-end p-3 border-b border-gray-200 bg-gray-50 text-sm">
          <label className="block">
            <span className="text-gray-600 text-xs">Search</span>
            <input
              type="text"
              className="mt-1 block border border-gray-300 rounded px-2 py-1.5 min-w-[160px]"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name, code, notes..."
            />
          </label>
          <label className="block">
            <span className="text-gray-600 text-xs">From</span>
            <input
              type="date"
              className="mt-1 block border border-gray-300 rounded px-2 py-1.5"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="text-gray-600 text-xs">To</span>
            <input
              type="date"
              className="mt-1 block border border-gray-300 rounded px-2 py-1.5"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="text-gray-600 text-xs">Order</span>
            <select
              className="mt-1 block border border-gray-300 rounded px-2 py-1.5"
              value={orderBy}
              onChange={(e) => setOrderBy(e.target.value as 'recent' | 'old')}
            >
              <option value="recent">Most recent</option>
              <option value="old">Oldest first</option>
            </select>
          </label>
          <button type="submit" className="px-3 py-1.5 bg-teal-700 text-white rounded hover:bg-teal-800">
            Filter
          </button>
          <button
            type="button"
            onClick={clearFilters}
            className="px-3 py-1.5 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
          >
            Clear
          </button>
        </form>
      )}
      {loading ? (
        <div className="p-4 text-gray-500">Loading...</div>
      ) : (
        <ProcedureArchiveTable columns={columns} rows={data} emptyMessage={emptyMessage} />
      )}
    </ProcedureArchiveShell>
  );
}

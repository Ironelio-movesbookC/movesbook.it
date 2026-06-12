'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import PromocodesTabs from '@/components/promocodes/PromocodesTabs';
import PromocodesPagination, {
  PromocodeAppliesTable,
} from '@/components/promocodes/PromocodeAppliesTable';
import { promocodesFetch, usePromocodesAdminAuth } from '@/components/promocodes/usePromocodesAdminAuth';
import { usePromocodeDialogs } from '@/components/promocodes/usePromocodeDialogs';
import type { PaginatedResult, PromocodeApplyRow } from '@/lib/promocodes/types';

export default function PromocodesIndexPage() {
  const ready = usePromocodesAdminAuth();
  const { showAlert, showConfirm, dialogs } = usePromocodeDialogs();
  const [data, setData] = useState<PaginatedResult<PromocodeApplyRow> | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [orderBy, setOrderBy] = useState('');
  const [registeredOnly, setRegisteredOnly] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: '25',
        registeredOnly: registeredOnly ? '1' : '0',
      });
      if (search.trim()) params.set('search', search.trim());
      if (orderBy) params.set('orderBy', orderBy);
      const res = await promocodesFetch(`/api/admin/promocodes/applies?${params}`);
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [page, search, orderBy, registeredOnly]);

  useEffect(() => {
    if (ready) void load();
  }, [ready, load]);

  const deleteSelected = () => {
    if (!selectedId) {
      showAlert('Please select a row first.');
      return;
    }
    showConfirm(
      'Delete selected invite record?',
      async () => {
        await promocodesFetch('/api/admin/promocodes/applies', {
          method: 'DELETE',
          body: JSON.stringify({ ids: [selectedId] }),
        });
        void load();
      },
      { title: 'Confirm delete', confirmLabel: 'Delete', destructive: true }
    );
  };

  if (!ready) return null;

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="promocodes-page max-w-[1400px] mx-auto">
      <div className="reddish_row1 mtop10">Subscriptions with Promo codes</div>

      <PromocodesTabs active="index" />

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setFilterOpen(!filterOpen)}
          className="px-4 py-2 bg-gray-700 text-white text-sm rounded"
        >
          Filter ▾
        </button>
        <button type="button" onClick={() => window.print()} className="text-sm text-blue-800 underline">
          Print
        </button>
        <button
          type="button"
          onClick={() => showAlert('Send message flow not yet connected.')}
          className="text-sm text-blue-800 underline"
        >
          Send Msg
        </button>
        <button type="button" onClick={deleteSelected} className="text-sm text-red-700 underline">
          Delete
        </button>
        <div className="ml-auto">
          {registeredOnly ? (
            <div className="flex items-center gap-2">
              <Link
                href="/promocodes"
                onClick={(e) => {
                  e.preventDefault();
                  setRegisteredOnly(false);
                  setPage(1);
                }}
                className="px-4 py-2 border-2 border-[#7b0a26] bg-[#7b0a26] text-white text-sm font-bold rounded"
              >
                Show all invites
              </Link>
              <span className="text-green-800 font-bold text-sm">Completed registrations only</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setRegisteredOnly(true);
                setPage(1);
              }}
              className="px-4 py-2 border-2 border-[#7b0a26] bg-white text-[#7b0a26] text-sm font-bold rounded hover:bg-red-50"
            >
              Display only registrations
            </button>
          )}
        </div>
      </div>

      {filterOpen && (
        <div className="mt-3 p-4 bg-gray-100 border border-gray-300 rounded flex flex-wrap items-end gap-3">
          <select
            value={orderBy}
            onChange={(e) => setOrderBy(e.target.value)}
            className="px-3 py-2 border text-sm min-w-[220px]"
          >
            <option value="">Ordering</option>
            <option value="created_desc">By date (newest first)</option>
            <option value="created_asc">By date (oldest first)</option>
          </select>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Username or email"
            className="px-3 py-2 border text-sm min-w-[220px]"
          />
          <button
            type="button"
            onClick={() => {
              setPage(1);
              void load();
            }}
            className="px-4 py-2 bg-[#7b0a26] text-white text-sm rounded"
          >
            Search
          </button>
          <button type="button" onClick={() => setFilterOpen(false)} className="px-4 py-2 border text-sm rounded">
            Exit
          </button>
        </div>
      )}

      <PromocodesPagination page={page} totalPages={totalPages} onPageChange={setPage} />

      {loading ? (
        <div className="py-12 text-center text-gray-500">Loading…</div>
      ) : (
        <PromocodeAppliesTable
          rows={data?.items ?? []}
          variant="index"
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
      )}

      <PromocodesPagination page={page} totalPages={totalPages} onPageChange={setPage} />
      {dialogs}
    </div>
  );
}

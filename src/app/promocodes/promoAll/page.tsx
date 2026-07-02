'use client';

import { useCallback, useEffect, useState } from 'react';
import PromocodesTabs from '@/components/promocodes/PromocodesTabs';
import PromocodesPagination, {
  PromocodeAppliesTable,
} from '@/components/promocodes/PromocodeAppliesTable';
import { promocodesFetch, usePromocodesAdminAuth } from '@/components/promocodes/usePromocodesAdminAuth';
import type { PaginatedResult, PromocodeApplyRow } from '@/lib/promocodes/types';

export default function PromocodesPromoAllPage() {
  const ready = usePromocodesAdminAuth();
  const [data, setData] = useState<PaginatedResult<PromocodeApplyRow> | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [orderBy, setOrderBy] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '25' });
      if (search.trim()) params.set('search', search.trim());
      if (orderBy) params.set('orderBy', orderBy);
      const res = await promocodesFetch(`/api/admin/promocodes/applies?${params}`);
      setData(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [page, search, orderBy]);

  useEffect(() => {
    if (ready) void load();
  }, [ready, load]);

  if (!ready) return null;

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="promocodes-page max-w-[1400px] mx-auto">
      <div className="reddish_row1 mtop10">Subscriptions with Promo codes</div>

      <PromocodesTabs active="promoAll" />

      <form
        className="mt-4 flex flex-wrap items-center gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          void load();
        }}
      >
        <select
          value={orderBy}
          onChange={(e) => setOrderBy(e.target.value)}
          className="px-3 py-2 border text-sm min-w-[200px]"
        >
          <option value="">Ordering</option>
          <option value="created_desc">By date (newest first)</option>
          <option value="created_asc">By date (oldest first)</option>
        </select>
        <span className="text-sm font-semibold">Search user</span>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Username or email"
          className="px-3 py-2 border text-sm min-w-[200px]"
        />
        <button type="submit" className="px-4 py-2 bg-[#7b0a26] text-white text-sm rounded">
          Search
        </button>
      </form>

      <PromocodesPagination page={page} totalPages={totalPages} onPageChange={setPage} />

      {loading ? (
        <div className="py-12 text-center text-gray-500">Loading…</div>
      ) : (
        <PromocodeAppliesTable rows={data?.items ?? []} variant="promoAll" />
      )}

      <PromocodesPagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}

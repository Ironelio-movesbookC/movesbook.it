'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import ProcedureArchiveShell from '@/components/procedures/ProcedureArchiveShell';
import ProcedureArchiveTable from '@/components/procedures/ProcedureArchiveTable';
import ProcedurePagination from '@/components/procedures/ProcedurePagination';
import type { ProcedureTab } from '@/components/procedures/types';
import { fetchClubArchive } from '@/lib/club/archives/clubArchiveClient';
import { formatDate, formatEuro } from '@/lib/club/servicePurchasesClient';
import type { Column, Member } from '@/types/clubTable';

const PAGE_SIZE = 25;

const columns: Column[] = [
  { key: 'name', header: 'Full Name' },
  { key: 'typology', header: 'Typology' },
  { key: 'service', header: 'Detail' },
  { key: 'insertDate', header: 'Date', render: (v) => formatDate(v) },
  { key: 'paid', header: 'Payment IN', render: (v) => formatEuro(v) },
  {
    key: 'originalDebt',
    header: 'OF..',
    render: (_, row) =>
      `${Number(row.residualDebt ?? 0).toFixed(2)} / ${Number(row.originalDebt ?? 0).toFixed(2)}`,
  },
  { key: 'rest', header: 'Rest', render: (v) => formatEuro(v) },
  { key: 'casual', header: 'Notes' },
  { key: 'operator', header: 'Operator' },
];

const tabs: ProcedureTab[] = [
  { id: 'deadlines', label: 'Archive of Deadlines', href: '/clubs/archive_deadlines' },
  { id: 'payments', label: 'Archive of Payments', href: '/clubs/archive_payments' },
  { id: 'receipts', label: 'Archive of Receipts', href: '/clubs/archive_receipts' },
];

function ArchivePaymentsPageInner() {
  const searchParams = useSearchParams();
  const memberId = searchParams.get('memberId');

  const [scope, setScope] = useState<'member' | 'all'>(memberId ? 'member' : 'all');
  const [data, setData] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchClubArchive('payments', {
        page,
        pageSize: PAGE_SIZE,
        memberId: scope === 'member' && memberId ? memberId : undefined,
      });
      setTotal(res.total);
      setData(res.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [page, scope, memberId]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <ProcedureArchiveShell
      title="Archive of Payments"
      activeTab="payments"
      tabs={tabs}
      tabsTrailing={
        memberId ? (
          <div className="flex items-center gap-4 text-sm text-gray-700">
            <label className="inline-flex items-center gap-2 cursor-pointer select-none">
              <input
                type="radio"
                name="paymentsScope"
                checked={scope === 'member'}
                onChange={() => {
                  setScope('member');
                  setPage(1);
                }}
              />
              Member selected
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer select-none">
              <input
                type="radio"
                name="paymentsScope"
                checked={scope === 'all'}
                onChange={() => {
                  setScope('all');
                  setPage(1);
                }}
              />
              All members
            </label>
          </div>
        ) : undefined
      }
      error={error}
      footerHint="All typologies (Services, Products, Expenses, Member debts, …)."
      pagination={
        <ProcedurePagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
      }
    >
      <ProcedureArchiveTable columns={columns} rows={data} loading={loading} />
    </ProcedureArchiveShell>
  );
}

export default function ArchivePaymentsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-gray-500">Loading...</div>}>
      <ArchivePaymentsPageInner />
    </Suspense>
  );
}

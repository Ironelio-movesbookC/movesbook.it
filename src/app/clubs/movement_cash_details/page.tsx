'use client';

import { useCallback, useEffect, useState } from 'react';
import ProcedureArchiveShell from '@/components/procedures/ProcedureArchiveShell';
import ProcedureArchiveTable from '@/components/procedures/ProcedureArchiveTable';
import ProcedurePagination from '@/components/procedures/ProcedurePagination';
import {
  SERVICE_SALE_PAGE_SIZE,
  serviceSaleMovementColumns,
} from '@/components/procedures/configs/serviceSale';
import { Member } from '@/types/clubTable';
import { fetchPayments } from '@/lib/club/serviceSaleClient';

export default function MovementCashDetailsPage() {
  const [data, setData] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchPayments({ page, pageSize: SERVICE_SALE_PAGE_SIZE });
      setTotal(res.total);
      setData(
        res.items.map((p) => ({
          id: p.id,
          name: p.memberName,
          typology: p.typology,
          service: p.serviceName,
          insertDate: p.paymentDate ?? undefined,
          paid: p.paid,
          rest: p.balance,
          payMod: '-',
          casual: p.description,
          operator: p.operatorName,
        }))
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <ProcedureArchiveShell
      title="Cash Movements (Service Payments)"
      activeTab=""
      tabs={[]}
      error={error}
      footerHint="All service sale payments from the procedure engine."
      pagination={
        <ProcedurePagination
          page={page}
          pageSize={SERVICE_SALE_PAGE_SIZE}
          total={total}
          onPageChange={setPage}
        />
      }
    >
      <ProcedureArchiveTable
        columns={serviceSaleMovementColumns}
        rows={data}
        loading={loading}
        emptyMessage="No payment movements found."
      />
    </ProcedureArchiveShell>
  );
}

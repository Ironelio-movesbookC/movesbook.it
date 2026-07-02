'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ProcedureArchiveShell from '@/components/procedures/ProcedureArchiveShell';
import ProcedureArchiveTable from '@/components/procedures/ProcedureArchiveTable';
import ProcedurePagination from '@/components/procedures/ProcedurePagination';
import {
  getServiceSaleTabs,
  SERVICE_SALE_PAGE_SIZE,
  serviceSaleDeadlineColumns,
} from '@/components/procedures/configs/serviceSale';
import { Member } from '@/types/clubTable';
import { fetchDeadlines } from '@/lib/club/serviceSaleClient';

export default function DeadLinePage() {
  const router = useRouter();
  const [data, setData] = useState<Member[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchDeadlines({ page, pageSize: SERVICE_SALE_PAGE_SIZE });
      setTotal(res.total);
      setData(
        res.items.map((p) => ({
          id: p.id,
          name: p.memberName,
          typology: p.typology,
          service: p.serviceName,
          course: p.sectorName,
          insertDate: p.paydate ?? undefined,
          value: p.value,
          paid: p.pay,
          rest: p.rest,
          casual: p.notes,
          operator: p.operatorName,
          dateEnd: p.lastPaymentDate ?? undefined,
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
      title="Archive of Deadlines"
      activeTab="deadline"
      tabs={getServiceSaleTabs('deadline', selectedId)}
      error={error}
      footerHint="Shows services with remaining balance. Double-click to record a payment."
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
        columns={serviceSaleDeadlineColumns}
        rows={data}
        selectedId={selectedId}
        loading={loading}
        onRowClick={(row) => row.id && setSelectedId(row.id)}
        onRowDoubleClick={(row) => row.id && router.push(`/clubs/payment_detail/${row.id}`)}
      />
    </ProcedureArchiveShell>
  );
}

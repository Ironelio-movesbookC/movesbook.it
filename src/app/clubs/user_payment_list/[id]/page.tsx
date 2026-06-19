'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import ProcedureArchiveShell from '@/components/procedures/ProcedureArchiveShell';
import ProcedureArchiveTable from '@/components/procedures/ProcedureArchiveTable';
import ProcedurePagination from '@/components/procedures/ProcedurePagination';
import {
  getServiceSaleTabs,
  SERVICE_SALE_PAGE_SIZE,
  serviceSalePaymentDetailColumns,
} from '@/components/procedures/configs/serviceSale';
import { Member } from '@/types/clubTable';
import { fetchPaymentsForRecord } from '@/lib/club/serviceSaleClient';

export default function UserPaymentListPage() {
  const params = useParams();
  const spId = String(params?.id ?? '');

  const [data, setData] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchPaymentsForRecord(spId, { page, pageSize: SERVICE_SALE_PAGE_SIZE });
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
          casual: p.description,
          operator: p.operatorName,
        }))
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [spId, page]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <ProcedureArchiveShell
      title={`Payments for service #${spId}`}
      activeTab="payments"
      tabs={getServiceSaleTabs('payments', spId)}
      error={error}
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
        columns={serviceSalePaymentDetailColumns}
        rows={data}
        loading={loading}
      />
    </ProcedureArchiveShell>
  );
}

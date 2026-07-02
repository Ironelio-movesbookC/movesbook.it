'use client';

import { useCallback, useEffect, useState } from 'react';
import ProcedureArchiveShell from '@/components/procedures/ProcedureArchiveShell';
import ProcedureArchiveTable from '@/components/procedures/ProcedureArchiveTable';
import ProcedurePagination from '@/components/procedures/ProcedurePagination';
import {
  getServiceSaleTabs,
  SERVICE_SALE_PAGE_SIZE,
  serviceSaleReceiptColumns,
} from '@/components/procedures/configs/serviceSale';
import { Member } from '@/types/clubTable';
import { fetchReceipts } from '@/lib/club/serviceSaleClient';

export default function ServiceReceiptsPage() {
  const [data, setData] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchReceipts({ page, pageSize: SERVICE_SALE_PAGE_SIZE });
      setTotal(res.total);
      setData(
        res.items.map((r) => ({
          id: r.id,
          name: r.memberName,
          typology: r.typology,
          service: r.serviceName,
          insertDate: r.receiptDate ?? undefined,
          category: r.documentType,
          contract: r.documentNumber,
          value: r.cost,
          paid: r.paymentIn,
          casual: r.annotations,
          operator: r.operatorName,
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
      title="Archive of Receipts"
      activeTab="receipts"
      tabs={getServiceSaleTabs('receipts')}
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
      <ProcedureArchiveTable columns={serviceSaleReceiptColumns} rows={data} loading={loading} />
    </ProcedureArchiveShell>
  );
}

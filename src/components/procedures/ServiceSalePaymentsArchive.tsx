'use client';

import { useCallback, useEffect, useState } from 'react';
import ProcedureArchiveShell from '@/components/procedures/ProcedureArchiveShell';
import ProcedureArchiveTable from '@/components/procedures/ProcedureArchiveTable';
import ProcedurePagination from '@/components/procedures/ProcedurePagination';
import {
  SERVICE_SALE_PAGE_SIZE,
  serviceSaleCashInColumns,
  serviceSaleMovementColumns,
} from '@/components/procedures/configs/serviceSale';
import type { Column } from '@/types/clubTable';
import { Member } from '@/types/clubTable';
import { fetchPayments } from '@/lib/club/serviceSaleClient';

type Variant = 'all' | 'in';

type Props = {
  title: string;
  footerHint: string;
  variant?: Variant;
  columns?: Column[];
};

function mapPaymentRow(p: {
  id: string;
  memberName: string;
  typology: string;
  serviceName: string;
  paymentDate: string | null;
  paid: number;
  balance: number;
  description: string;
  operatorName: string;
}): Member {
  return {
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
  };
}

export default function ServiceSalePaymentsArchive({
  title,
  footerHint,
  variant = 'all',
  columns,
}: Props) {
  const [data, setData] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const tableColumns =
    columns ?? (variant === 'in' ? serviceSaleCashInColumns : serviceSaleMovementColumns);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchPayments({ page, pageSize: SERVICE_SALE_PAGE_SIZE });
      setTotal(res.total);
      setData(res.items.map(mapPaymentRow));
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
      title={title}
      activeTab=""
      tabs={[]}
      error={error}
      footerHint={footerHint}
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
        columns={tableColumns}
        rows={data}
        loading={loading}
        emptyMessage="No payment movements found."
      />
    </ProcedureArchiveShell>
  );
}

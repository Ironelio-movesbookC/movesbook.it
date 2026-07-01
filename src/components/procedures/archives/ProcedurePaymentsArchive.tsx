'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import ProcedureArchiveShell from '@/components/procedures/ProcedureArchiveShell';
import ProcedureArchiveTable from '@/components/procedures/ProcedureArchiveTable';
import ProcedurePagination from '@/components/procedures/ProcedurePagination';
import { buildProcedureColumns } from '@/components/procedures/configs/buildColumns';
import { createProcedureClient, type ProcedurePaymentView } from '@/lib/club/procedureClient';
import {
  getProcedureDefinition,
  getProcedureTabs,
  type ProcedureArchiveTabId,
} from '@/lib/procedures/registry';
import type { ProcedureTypeCode } from '@/lib/procedures/types';
import type { Member } from '@/types/clubTable';

type Props = {
  procedureCode: ProcedureTypeCode;
  activeTab: ProcedureArchiveTabId;
};

function toPaymentRow(payment: ProcedurePaymentView): Member {
  return {
    id: payment.id,
    name: payment.memberName,
    typology: payment.typology,
    service: payment.primaryLabel,
    insertDate: payment.paymentDate ?? undefined,
    paid: payment.paid,
    rest: payment.balance,
    casual: payment.description,
    operator: payment.operatorName,
  };
}

export default function ProcedurePaymentsArchive({ procedureCode, activeTab }: Props) {
  const def = getProcedureDefinition(procedureCode)!;
  const client = useMemo(() => createProcedureClient(procedureCode), [procedureCode]);
  const columns = useMemo(() => buildProcedureColumns(def), [def]);

  const [data, setData] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await client.fetchPayments({ page, pageSize: client.pageSize });
      setTotal(res.total);
      setData(res.items.map(toPaymentRow));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [client, page]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <ProcedureArchiveShell
      title={def.archiveTitles.payments}
      activeTab={activeTab}
      tabs={getProcedureTabs(procedureCode, activeTab)}
      error={error}
      pagination={
        <ProcedurePagination
          page={page}
          pageSize={client.pageSize}
          total={total}
          onPageChange={setPage}
        />
      }
    >
      <ProcedureArchiveTable columns={columns.paymentColumns} rows={data} loading={loading} />
    </ProcedureArchiveShell>
  );
}

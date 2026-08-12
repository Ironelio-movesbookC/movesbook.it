'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import ProcedureArchiveShell from '@/components/procedures/ProcedureArchiveShell';
import ProcedureArchiveTable from '@/components/procedures/ProcedureArchiveTable';
import ProcedurePagination from '@/components/procedures/ProcedurePagination';
import { buildProcedureColumns } from '@/components/procedures/configs/buildColumns';
import { createProcedureClient, type ProcedureReceiptView } from '@/lib/club/procedureClient';
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

function toReceiptRow(receipt: ProcedureReceiptView): Member {
  return {
    id: receipt.id,
    name: receipt.memberName,
    typology: receipt.typology,
    service: receipt.primaryLabel,
    insertDate: receipt.receiptDate ?? undefined,
    category: receipt.documentType,
    contract: receipt.documentNumber,
    value: receipt.cost,
    paid: receipt.paymentIn,
    casual: receipt.annotations,
    operator: receipt.operatorName,
  };
}

function ProcedureReceiptsArchiveInner({ procedureCode, activeTab }: Props) {
  const def = getProcedureDefinition(procedureCode)!;
  const client = useMemo(() => createProcedureClient(procedureCode), [procedureCode]);
  const columns = useMemo(() => buildProcedureColumns(def), [def]);
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
      const res = await client.fetchReceipts({
        page,
        pageSize: client.pageSize,
        memberId: scope === 'member' && memberId ? memberId : undefined,
      });
      setTotal(res.total);
      setData(res.items.map(toReceiptRow));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [client, page, scope, memberId]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <ProcedureArchiveShell
      title={def.archiveTitles.receipts}
      activeTab={activeTab}
      tabs={getProcedureTabs(procedureCode, activeTab)}
      tabsTrailing={
        memberId ? (
          <div className="flex items-center gap-4 text-sm text-gray-700">
            <label className="inline-flex items-center gap-2 cursor-pointer select-none">
              <input
                type="radio"
                name="receiptsScope"
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
                name="receiptsScope"
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
      pagination={
        <ProcedurePagination
          page={page}
          pageSize={client.pageSize}
          total={total}
          onPageChange={setPage}
        />
      }
    >
      <ProcedureArchiveTable columns={columns.receiptColumns} rows={data} loading={loading} />
    </ProcedureArchiveShell>
  );
}

export default function ProcedureReceiptsArchive(props: Props) {
  return (
    <Suspense fallback={<div className="p-6 text-gray-500">Loading...</div>}>
      <ProcedureReceiptsArchiveInner {...props} />
    </Suspense>
  );
}

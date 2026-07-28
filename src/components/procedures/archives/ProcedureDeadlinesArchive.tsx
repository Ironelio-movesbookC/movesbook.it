'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import ProcedureArchiveShell from '@/components/procedures/ProcedureArchiveShell';
import ProcedureArchiveTable from '@/components/procedures/ProcedureArchiveTable';
import ProcedurePagination from '@/components/procedures/ProcedurePagination';
import { buildProcedureColumns } from '@/components/procedures/configs/buildColumns';
import { createProcedureClient, type ProcedureRecordView } from '@/lib/club/procedureClient';
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

type DeadlineRow = Member & {
  id: string;
  memberId: string;
  rest: number;
};

function toDeadlineRow(record: ProcedureRecordView): DeadlineRow {
  return {
    id: record.id,
    memberId: record.userId,
    name: record.memberName,
    image: record.memberImage ?? undefined,
    typology: record.typology,
    service: record.primaryLabel,
    course: record.secondaryLabel || undefined,
    insertDate: record.paydate ?? undefined,
    value: record.value,
    paid: record.pay,
    rest: record.rest,
    casual: record.notes,
    operator: record.operatorName,
    dateEnd: record.lastPaymentDate ?? undefined,
  };
}

function selectionIsPayable(rows: DeadlineRow[]): boolean {
  if (rows.length === 0) return false;
  const memberId = rows[0].memberId;
  return rows.every((r) => r.memberId === memberId && Number(r.rest) > 0);
}

export default function ProcedureDeadlinesArchive({ procedureCode, activeTab }: Props) {
  const router = useRouter();
  const def = getProcedureDefinition(procedureCode)!;
  const client = useMemo(() => createProcedureClient(procedureCode), [procedureCode]);
  const columns = useMemo(() => buildProcedureColumns(def), [def]);

  const [data, setData] = useState<DeadlineRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await client.fetchDeadlines({ page, pageSize: client.pageSize });
      setTotal(res.total);
      setData(res.items.map(toDeadlineRow));
      setCheckedIds(new Set());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [client, page]);

  useEffect(() => {
    load();
  }, [load]);

  const checkedRows = useMemo(
    () => data.filter((r) => checkedIds.has(r.id)),
    [data, checkedIds]
  );

  /** PHP: Pay deadlines selected requires 2+ rows, same member, all Rest > 0. */
  const canPaySelected = checkedRows.length > 1 && selectionIsPayable(checkedRows);

  function openPayment(ids: string[]) {
    if (ids.length === 0) return;
    const [primary, ...rest] = ids;
    const href =
      rest.length > 0
        ? `${def.routes.paymentDetail(primary)}?ids=${encodeURIComponent(ids.join(','))}`
        : def.routes.paymentDetail(primary);
    router.push(href);
  }

  function handleDoubleClick(row: Member) {
    const deadline = data.find((r) => r.id === row.id);
    if (!deadline) return;
    if (Number(deadline.rest) <= 0) {
      window.alert('Payment is not possible because deadline results already paid');
      return;
    }
    openPayment([deadline.id]);
  }

  function handleToggleCheck(row: Member, checked: boolean) {
    if (!row.id) return;
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(row.id!);
      else next.delete(row.id!);
      return next;
    });
    setSelectedId(row.id);
  }

  function handleToggleCheckAll(checked: boolean) {
    if (!checked) {
      setCheckedIds(new Set());
      return;
    }
    setCheckedIds(new Set(data.map((r) => r.id)));
  }

  function handlePaySelected() {
    if (!canPaySelected) {
      window.alert(
        'Select 2 or more deadlines with Rest > 0 that belong to the same member.'
      );
      return;
    }
    openPayment(checkedRows.map((r) => r.id));
  }

  const payButtonClass = canPaySelected
    ? 'mb-[-1px] rounded-t border border-b-0 border-gray-300 bg-[#d3d3d3] px-3 py-2 text-sm font-medium text-[#626262] hover:bg-[#c8c8c8]'
    : 'mb-[-1px] cursor-not-allowed rounded-t border border-b-0 border-gray-200 bg-[#f0f0f0] px-3 py-2 text-sm font-medium text-[#c0c0c0]';

  return (
    <ProcedureArchiveShell
      title={def.archiveTitles.deadlines}
      activeTab={activeTab}
      tabs={getProcedureTabs(procedureCode, activeTab, selectedId)}
      error={error}
      footerHint="Double-click a row with Rest > 0 to pay. Or check several (same member, Rest > 0) and use Pay deadlines selected."
      tabActions={
        <button
          type="button"
          className={payButtonClass}
          disabled={!canPaySelected}
          onClick={handlePaySelected}
        >
          Pay deadlines selected
        </button>
      }
      pagination={
        <ProcedurePagination
          page={page}
          pageSize={client.pageSize}
          total={total}
          onPageChange={setPage}
        />
      }
    >
      <ProcedureArchiveTable
        columns={columns.deadlineColumns}
        rows={data}
        selectedId={selectedId}
        selectedIds={checkedIds}
        showCheckboxes
        loading={loading}
        onRowClick={(row) => row.id && setSelectedId(row.id)}
        onRowDoubleClick={handleDoubleClick}
        onToggleCheck={handleToggleCheck}
        onToggleCheckAll={handleToggleCheckAll}
      />
    </ProcedureArchiveShell>
  );
}

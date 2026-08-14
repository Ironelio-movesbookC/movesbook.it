'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import ProcedureArchiveShell from '@/components/procedures/ProcedureArchiveShell';
import ProcedureArchiveTable from '@/components/procedures/ProcedureArchiveTable';
import ProcedurePagination from '@/components/procedures/ProcedurePagination';
import { buildProcedureColumns } from '@/components/procedures/configs/buildColumns';
import type { ProcedureTab } from '@/components/procedures/types';
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
    procedureType: record.procedureType,
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
  const [displayAlsoPaid, setDisplayAlsoPaid] = useState(false);
  const [selectionError, setSelectionError] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    setSelectionError('');
    try {
      const res = await client.fetchDeadlines({
        page,
        pageSize: client.pageSize,
        includePaid: displayAlsoPaid,
      });
      setTotal(res.total);
      setData(res.items.map(toDeadlineRow));
      setCheckedIds(new Set());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [client, page, displayAlsoPaid]);

  useEffect(() => {
    load();
  }, [load]);

  const checkedRows = useMemo(
    () => data.filter((r) => checkedIds.has(r.id)),
    [data, checkedIds]
  );

  const selectedMemberId = useMemo(
    () => (selectedId ? data.find((r) => r.id === selectedId)?.memberId ?? null : null),
    [data, selectedId]
  );
  const memberQuery = selectedMemberId ? `?memberId=${encodeURIComponent(selectedMemberId)}` : '';

  /** PHP: Pay deadlines selected requires 2+ rows, same member, all Rest > 0. */
  const canPaySelected = checkedRows.length > 1 && selectionIsPayable(checkedRows);

  function openPayment(ids: string[]) {
    if (ids.length === 0) return;
    const [primary, ...rest] = ids;
    const deadline = data.find((r) => r.id === primary);
    const code = deadline?.procedureType as ProcedureTypeCode | undefined;
    const routeDef = code ? getProcedureDefinition(code) : def;

    const base = routeDef?.routes.paymentDetail(primary) ?? def.routes.paymentDetail(primary);
    const href =
      rest.length > 0
        ? `${base}?ids=${encodeURIComponent(ids.join(','))}`
        : base;
    router.push(href);
  }

  function handleDoubleClick(row: Member) {
    const deadline = data.find((r) => r.id === row.id);
    if (!deadline) return;
    if (Number(deadline.rest) <= 0) {
      setSelectionError('Payment is not possible because deadline results already paid');
      return;
    }
    openPayment([deadline.id]);
  }

  function handleToggleCheck(row: Member, checked: boolean) {
    if (!row.id) return;
    setSelectionError('');
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(row.id!);
      else next.delete(row.id!);
      return next;
    });
    setSelectedId(row.id);
  }

  function handleToggleCheckAll(checked: boolean) {
    setSelectionError('');
    if (!checked) {
      setCheckedIds(new Set());
      return;
    }
    setCheckedIds(new Set(data.filter((r) => Number(r.rest) > 0).map((r) => r.id)));
  }

  function handlePaySelected() {
    setSelectionError('');
    if (!canPaySelected) {
      setSelectionError(
        'Select 2 or more deadlines with Rest > 0 that belong to the same member.'
      );
      return;
    }
    openPayment(checkedRows.map((r) => r.id));
  }

  const tabs: ProcedureTab[] = [
    ...getProcedureTabs(procedureCode, activeTab, selectedId, selectedMemberId),
    {
      id: 'pay-selected' as any,
      label: 'Pay more deadlines',
      onClick: handlePaySelected,
      disabled: !canPaySelected,
    },
  ];

  return (
    <ProcedureArchiveShell
      title={def.archiveTitles.deadlines}
      activeTab={activeTab}
      tabs={tabs}
      tabsTrailing={
        <label className="inline-flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-gray-300 text-teal-700 focus:ring-teal-600"
            checked={displayAlsoPaid}
            onChange={(e) => {
              setDisplayAlsoPaid(e.target.checked);
              setPage(1);
              setSelectedId(null);
              setSelectionError('');
            }}
          />
          Display also paid
        </label>
      }
      error={error || selectionError}
      footerHint="Double-click a row with Rest > 0 to pay. Or check several (same member, Rest > 0) and use Pay more deadlines."
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

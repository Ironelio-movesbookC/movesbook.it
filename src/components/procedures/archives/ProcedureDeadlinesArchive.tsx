'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Pencil, Trash2 } from 'lucide-react';
import ProcedureArchiveShell from '@/components/procedures/ProcedureArchiveShell';
import ProcedureArchiveTabs from '@/components/procedures/ProcedureArchiveTabs';
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

function toDeadlineRow(
  record: ProcedureRecordView,
  onEdit?: (id: string) => void,
  onDelete?: (id: string) => void
): DeadlineRow {
  const row: DeadlineRow = {
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

  if (onEdit) {
    row.edit = (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onEdit(record.id);
        }}
        className="text-blue-600 hover:text-blue-800"
      >
        <Pencil className="w-4 h-4" />
      </button>
    );
  }

  if (onDelete) {
    row.delete = (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(record.id);
        }}
        className="text-red-500 hover:text-red-700"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    );
  }

  return row;
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
      setData(
        res.items.map((record) =>
          toDeadlineRow(
            record,
            (id) => {
              // Edit logic: navigate to record edit page or open modal
              // For now, mirroring the Historical tab's lack of explicit edit route but providing the button
              router.push(def.routes.paymentDetail(id));
            },
            async (id) => {
              if (!confirm(`Delete this deadline record?`)) return;
              try {
                await client.deleteRecord(id);
                load();
              } catch (e) {
                alert(e instanceof Error ? e.message : 'Delete failed');
              }
            }
          )
        )
      );
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

  const displayAlsoPaidToggle = (
    <label className="inline-flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none ml-auto pb-2">
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
  );

  const typologyButtons = (
    <div className="flex flex-wrap gap-1 mb-3">
      <span className="text-xs font-bold text-red-600 w-full mb-1">Deadlines incoming - Payment will be IN</span>
      {[
        { id: 'memberships', label: 'Memberships', href: '/clubs/memberships/deadlines' },
        { id: 'subscriptions', label: 'Subscriptions', href: '/clubs/courses/deadlines' },
        { id: 'services', label: 'Services', href: '/clubs/dead_line' },
        { id: 'sellings', label: 'Sellings', href: '/ArchiveSeles/product_deadline' },
        { id: 'member_debts', label: 'Member debts', href: '/clubs/member_debt_dead_line' },
      ].map((b) => (
        <Link
          key={b.id}
          href={b.href}
          className={`px-3 py-1 text-xs font-bold text-white rounded shadow-sm ${
            def.routes.deadlines === b.href ? 'bg-blue-600 ring-2 ring-blue-300' : 'bg-black hover:bg-gray-800'
          }`}
        >
          {b.label}
        </Link>
      ))}
      <div className="w-full mt-2 mb-1">
        <span className="text-xs font-bold text-red-600">Deadlines outcoming - Payment will be OUT</span>
      </div>
      {[
        { id: 'member_credits', label: 'Member credits', href: '/clubs/member_credit_dead_line' },
        { id: 'employ_to_pay', label: 'Employ to pay', href: '/clubs/member_credit_dead_line' },
      ].map((b) => (
        <Link
          key={b.id}
          href={b.href}
          className={`px-3 py-1 text-xs font-bold text-white rounded shadow-sm ${
            def.routes.deadlines === b.href ? 'bg-blue-600 ring-2 ring-blue-300' : 'bg-black hover:bg-gray-800'
          }`}
        >
          {b.label}
        </Link>
      ))}
    </div>
  );

  return (
    <ProcedureArchiveShell
      title={def.archiveTitles.deadlines}
      activeTab={activeTab}
      tabs={tabs}
      tabActions={
        <div className="w-full">
          {typologyButtons}
          <div className="flex items-center gap-1 border-b border-gray-200">
            <ProcedureArchiveTabs tabs={tabs} activeTab={activeTab} />
            {displayAlsoPaidToggle}
          </div>
        </div>
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

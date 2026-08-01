'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import ProcedureArchiveShell from '@/components/procedures/ProcedureArchiveShell';
import ProcedureArchiveTable from '@/components/procedures/ProcedureArchiveTable';
import ProcedurePagination from '@/components/procedures/ProcedurePagination';
import type { ProcedureTab } from '@/components/procedures/types';
import { fetchClubArchive } from '@/lib/club/archives/clubArchiveClient';
import { getProcedureDefinition } from '@/lib/procedures/registry';
import type { ProcedureTypeCode } from '@/lib/procedures/types';
import { formatDate, formatEuro } from '@/lib/club/servicePurchasesClient';
import type { Column, Member } from '@/types/clubTable';

const PAGE_SIZE = 25;

const columns: Column[] = [
  { key: 'name', header: 'Full Name' },
  { key: 'typology', header: 'Typology' },
  { key: 'service', header: 'Detail' },
  { key: 'insertDate', header: 'Date', render: (v) => formatDate(v) },
  { key: 'value', header: 'Cost', render: (v) => formatEuro(v) },
  { key: 'paid', header: 'Paid', render: (v) => formatEuro(v) },
  { key: 'rest', header: 'Rest', render: (v) => formatEuro(v) },
  { key: 'dateEnd', header: 'Last payment', render: (v) => formatDate(v) },
  { key: 'casual', header: 'Notes' },
  { key: 'operator', header: 'Operator' },
];

function sameMemberAndOpenRest(rows: Member[]): boolean {
  if (rows.length === 0) return false;
  const firstUserId = rows[0]?.userId;
  const firstType = rows[0]?.procedureType;
  if (!firstUserId || !firstType) return false;
  return rows.every(
    (r) => r.userId === firstUserId && r.procedureType === firstType && (r.rest ?? 0) > 0
  );
}

function paymentHref(row: Member, ids?: string[]): string | null {
  const code = row.procedureType as ProcedureTypeCode | undefined;
  if (!code || !row.id) return null;
  const def = getProcedureDefinition(code);
  if (!def) return null;
  const base = def.routes.paymentDetail(row.id);
  if (ids && ids.length > 1) {
    return `${base}?ids=${encodeURIComponent(ids.join(','))}`;
  }
  return base;
}

export default function ArchiveDeadlinesPage() {
  const router = useRouter();
  const [data, setData] = useState<Member[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [selectionError, setSelectionError] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [displayAlsoPaid, setDisplayAlsoPaid] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchClubArchive('deadlines', {
        page,
        pageSize: PAGE_SIZE,
        includePaid: displayAlsoPaid,
      });
      setTotal(res.total);
      setData(res.items);
      setCheckedIds(new Set());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [page, displayAlsoPaid]);

  useEffect(() => {
    load();
  }, [load]);

  const checkedRows = useMemo(
    () => data.filter((r) => r.id && checkedIds.has(r.id)),
    [data, checkedIds]
  );

  const canPaySelected = checkedRows.length > 1 && sameMemberAndOpenRest(checkedRows);

  function toggleSelect(row: Member) {
    if (!row.id || (row.rest ?? 0) <= 0) return;
    setSelectionError('');
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(row.id!)) next.delete(row.id!);
      else next.add(row.id!);
      return next;
    });
    setSelectedId(row.id);
  }

  function toggleSelectAll(checked: boolean) {
    setSelectionError('');
    if (!checked) {
      setCheckedIds(new Set());
      return;
    }
    setCheckedIds(new Set(data.filter((r) => r.id && (r.rest ?? 0) > 0).map((r) => r.id!)));
  }

  function handlePaySelected() {
    setSelectionError('');
    if (checkedRows.length < 2) {
      setSelectionError('Select at least two deadlines with Rest > 0.');
      return;
    }
    if (!sameMemberAndOpenRest(checkedRows)) {
      setSelectionError(
        'Checked deadlines must belong to the same member, same typology, and all have Rest > 0.'
      );
      return;
    }
    const ids = checkedRows.map((r) => r.id!).filter(Boolean);
    const href = paymentHref(checkedRows[0]!, ids);
    if (href) router.push(href);
  }

  const tabs: ProcedureTab[] = [
    { id: 'deadlines', label: 'Archive of Deadlines', href: '/clubs/archive_deadlines' },
    { id: 'payments', label: 'Archive of Payments', href: '/clubs/archive_payments' },
    { id: 'receipts', label: 'Archive of Receipts', href: '/clubs/archive_receipts' },
    {
      id: 'pay-selected',
      label: 'Pay more deadlines',
      onClick: handlePaySelected,
      disabled: !canPaySelected,
    },
  ];

  return (
    <ProcedureArchiveShell
      title="Archive of Deadlines"
      activeTab="deadlines"
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
      footerHint="All typologies. Double-click a row with Rest > 0 to pay, or check several (same member + typology) and use Pay more deadlines."
      pagination={
        <ProcedurePagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
      }
    >
      <ProcedureArchiveTable
        columns={columns}
        rows={data}
        selectedId={selectedId}
        loading={loading}
        selectable
        selectedIds={checkedIds}
        onToggleSelect={toggleSelect}
        onToggleSelectAll={toggleSelectAll}
        onRowClick={(row) => row.id && setSelectedId(row.id)}
        onRowDoubleClick={(row) => {
          if (!row.id || (row.rest ?? 0) <= 0) {
            setSelectionError('Payment is not possible because this deadline is already paid.');
            return;
          }
          const href = paymentHref(row);
          if (href) router.push(href);
        }}
      />
    </ProcedureArchiveShell>
  );
}

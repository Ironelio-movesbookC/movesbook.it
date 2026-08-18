'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Pencil, Trash2 } from 'lucide-react';
import ProcedureArchiveShell from '@/components/procedures/ProcedureArchiveShell';
import ProcedureArchiveTable from '@/components/procedures/ProcedureArchiveTable';
import ProcedurePagination from '@/components/procedures/ProcedurePagination';
import {
  SERVICE_SALE_PAGE_SIZE,
  serviceSaleDeadlineColumns,
} from '@/components/procedures/configs/serviceSale';
import type { ProcedureTab } from '@/components/procedures/types';
import { Member } from '@/types/clubTable';
import { deleteDeadline, fetchDeadlines } from '@/lib/club/serviceSaleClient';

function sameMemberAndOpenRest(rows: Member[]): boolean {
  if (rows.length === 0) return false;
  const firstUserId = rows[0]?.userId;
  if (!firstUserId) return false;
  return rows.every((r) => r.userId === firstUserId && (r.rest ?? 0) > 0);
}

function DeadLinePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const memberId = searchParams?.get('memberId');
  const [scope, setScope] = useState<'member' | 'all'>(memberId ? 'member' : 'all');
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
      const res = await fetchDeadlines({
        page,
        pageSize: SERVICE_SALE_PAGE_SIZE,
        includePaid: displayAlsoPaid,
        memberId: scope === 'member' && memberId ? memberId : undefined,
      });
      setTotal(res.total);
      setData(
        res.items.map((p) => {
          const row: Member = {
            id: p.id,
            userId: p.userId,
            name: p.memberName,
            typology: p.typology,
            service: p.serviceName,
            course: p.sectorName,
            insertDate: p.recordDate ?? undefined,
            expirationDate: p.expireDate ?? p.paydate ?? undefined,
            value: p.value,
            paid: p.pay,
            rest: p.rest,
            casual: p.notes,
            operator: p.operatorName,
            dateEnd: p.lastPaymentDate ?? undefined,
          };

          row.edit = (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/clubs/payment_detail/${p.id}`);
              }}
              className="text-blue-600 hover:text-blue-800"
            >
              <Pencil className="w-4 h-4" />
            </button>
          );

          row.delete = (
            <button
              type="button"
              onClick={async (e) => {
                e.stopPropagation();
                if (!confirm('Delete this deadline record?')) return;
                try {
                  await deleteDeadline(p.id);
                  load();
                } catch (err) {
                  alert(err instanceof Error ? err.message : 'Delete failed');
                }
              }}
              className="text-red-500 hover:text-red-700"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          );

          return row;
        })
      );
      setCheckedIds(new Set());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [page, displayAlsoPaid, scope, memberId, router]);

  useEffect(() => {
    load();
  }, [load]);

  const checkedRows = useMemo(
    () => data.filter((r) => r.id && checkedIds.has(r.id)),
    [data, checkedIds]
  );

  const canPaySelected =
    checkedRows.length > 1 && sameMemberAndOpenRest(checkedRows);

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
    setCheckedIds(
      new Set(data.filter((r) => r.id && (r.rest ?? 0) > 0).map((r) => r.id!))
    );
  }

  function handlePaySelected() {
    setSelectionError('');
    if (checkedRows.length < 2) {
      setSelectionError('Select at least two deadlines with Rest > 0.');
      return;
    }
    if (!sameMemberAndOpenRest(checkedRows)) {
      setSelectionError(
        'Checked deadlines must belong to the same member and all have Rest > 0.'
      );
      return;
    }
    const ids = checkedRows.map((r) => r.id!).filter(Boolean);
    const primary = ids[0]!;
    router.push(`/clubs/payment_detail/${primary}?ids=${ids.join(',')}`);
  }

  const memberQuery = memberId ? `?memberId=${encodeURIComponent(memberId)}` : '';

  const tabs: ProcedureTab[] = [
    { id: 'historical', label: 'Historical', href: `/clubs/archive_service_list${memberQuery}` },
    {
      id: 'deadline',
      label: 'Archive of Deadlines',
      href: `/clubs/dead_line${memberQuery}`,
    },
    {
      id: 'pay-selected',
      label: 'Pay more deadlines',
      onClick: handlePaySelected,
      disabled: !canPaySelected,
    },
    {
      id: 'payments',
      label: 'Payments',
      href: selectedId
        ? `/clubs/user_payment_list/${selectedId}`
        : `/clubs/service_payments${memberQuery}`,
    },
    { id: 'receipts', label: 'Receipts', href: `/clubs/service_receipts${memberQuery}` },
  ];

  return (
    <ProcedureArchiveShell
      title="Archive of Deadlines (Services)"
      activeTab="deadline"
      tabs={tabs}
      tabsTrailing={
        <div className="flex items-center gap-4">
          {memberId && (
            <div className="flex items-center gap-4 text-sm text-gray-700">
              <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="radio"
                  name="deadlinesScope"
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
                  name="deadlinesScope"
                  checked={scope === 'all'}
                  onChange={() => {
                    setScope('all');
                    setPage(1);
                  }}
                />
                All members
              </label>
            </div>
          )}
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
        </div>
      }
      error={error || selectionError}
      footerHint={
        displayAlsoPaid
          ? 'SERVICES only — showing open and fully paid deadlines. Double-click a row with Rest > 0 to record a payment.'
          : 'SERVICES only — shows service purchases with remaining balance. Check “Display also paid” to include Rest = 0. Double-click to record a payment.'
      }
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
        selectable
        selectedIds={checkedIds}
        onToggleSelect={toggleSelect}
        onToggleSelectAll={toggleSelectAll}
        onRowClick={(row) => row.id && setSelectedId(row.id)}
        onRowDoubleClick={(row) => {
          if (!row.id) return;
          if ((row.rest ?? 0) <= 0) {
            setSelectionError('Payment is not possible because this deadline is already paid.');
            return;
          }
          router.push(`/clubs/payment_detail/${row.id}`);
        }}
      />
    </ProcedureArchiveShell>
  );
}

export default function DeadLinePage() {
  return (
    <Suspense fallback={<div className="p-6 text-gray-500">Loading...</div>}>
      <DeadLinePageInner />
    </Suspense>
  );
}

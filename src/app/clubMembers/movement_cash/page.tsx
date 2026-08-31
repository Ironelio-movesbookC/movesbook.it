'use client';

/**
 * PHP Archive of Receipts — `/clubMembers/movement_cash`
 * Lists service purchases (ServicePurchase), not tax-document receipt rows.
 * Tabs: List name | Details of receipts
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import ProcedureArchiveShell from '@/components/procedures/ProcedureArchiveShell';
import ProcedureArchiveTable from '@/components/procedures/ProcedureArchiveTable';
import ProcedurePagination from '@/components/procedures/ProcedurePagination';
import ArchiveListToolbar from '@/components/procedures/ArchiveListToolbar';
import { useArchiveListFilters } from '@/components/procedures/useArchiveListFilters';
import {
  DeleteRowButton,
  EditRowButton,
  usePasswordGate,
} from '@/components/procedures/ArchiveRowActions';
import MovementCashDetailModal from '@/components/club/archives/MovementCashDetailModal';
import {
  deletePurchase,
  fetchPurchases,
  type ServiceSalePurchase,
} from '@/lib/club/serviceSaleClient';
import { formatDate, formatEuro } from '@/lib/club/servicePurchasesClient';
import { resolvePublicImageUrl } from '@/lib/profileImageUrl';
import type { Column, Member } from '@/types/clubTable';

type DayRange = 'all' | '7' | '15' | '30';
type ViewTab = 'list' | 'details';

const PAGE_SIZE = 10; // PHP paginate limit

function MemberImageCell({ src, name }: { src?: string; name?: string }) {
  const url = resolvePublicImageUrl(src);
  if (!url) {
    return (
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-300 bg-gray-100 text-[8px] font-bold leading-tight text-gray-500">
        NO
        <br />
        IMG
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={name || 'Member'}
      className="h-9 w-9 rounded-full border border-gray-300 object-cover"
    />
  );
}

const columns: Column[] = [
  {
    key: 'image',
    header: 'Image',
    render: (_v, row) => <MemberImageCell src={row.image} name={row.name} />,
  },
  { key: 'name', header: 'Full name' },
  {
    key: 'insertDate',
    header: 'Date',
    render: (v) => formatDate(v),
  },
  {
    key: 'paid',
    header: 'Value IN',
    render: (v) => (typeof v === 'number' && v > 0 ? `€ ${formatEuro(v)}` : ''),
  },
  {
    key: 'cost',
    header: 'Value Out',
    render: () => '',
  },
  { key: 'service', header: 'Service' },
  { key: 'category', header: 'Doc type' },
  { key: 'course', header: 'Category' },
  { key: 'operator', header: 'Vendor' },
  { key: 'casual', header: 'Description' },
  { key: 'edit', header: 'Edit' },
  { key: 'delete', header: 'Delete' },
];

function daysAgoIso(days: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function tabClass(active: boolean) {
  if (active) {
    return 'mb-[-1px] rounded-t border border-b-0 border-gray-400 bg-[#626262] px-3 py-2 text-sm font-medium text-white';
  }
  return 'mb-[-1px] rounded-t border border-b-0 border-transparent bg-[#d3d3d3] px-3 py-2 text-sm font-medium text-[#626262] hover:bg-[#c8c8c8]';
}

function rangeBtnClass(active: boolean) {
  return active
    ? 'rounded px-3 py-1.5 text-[13px] font-semibold text-white bg-red-700'
    : 'rounded px-3 py-1.5 text-[13px] font-semibold text-white bg-black hover:bg-gray-900';
}

export default function MovementCashPage() {
  const filters = useArchiveListFilters();
  const [items, setItems] = useState<ServiceSalePurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [total, setTotal] = useState(0);
  const [dayRange, setDayRange] = useState<DayRange>('all');
  const [view, setView] = useState<ViewTab>('list');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailMode, setDetailMode] = useState<'details' | 'edit'>('details');
  const { request: requestPassword, modal: passwordModal } = usePasswordGate();

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const dayFrom = dayRange !== 'all' ? daysAgoIso(Number(dayRange)) : undefined;
      const appliedFrom = filters.applied.fromDate;
      const fromDate =
        dayFrom && appliedFrom
          ? dayFrom > appliedFrom
            ? dayFrom
            : appliedFrom
          : appliedFrom || dayFrom;

      const res = await fetchPurchases({
        page,
        pageSize,
        ...filters.applied,
        fromDate,
      });
      setTotal(res.total);
      setItems(res.items);
      setSelectedIds(new Set());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [dayRange, filters.applied, page, pageSize]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [filters.applied, dayRange]);

  const rows: Member[] = useMemo(
    () =>
      items.map((r) => ({
        id: r.id,
        name: r.memberName,
        image: r.memberImage ?? undefined,
        insertDate: r.paydate ?? undefined,
        paid: r.pay,
        service: r.serviceName !== '-' ? r.serviceName : '',
        category: r.docType || '',
        course: r.sectorName !== '-' ? r.sectorName : '',
        operator: r.operatorName || '',
        casual: r.notes || '',
        edit: (
          <EditRowButton
            onClick={() =>
              requestPassword(() => {
                setSelectedId(r.id);
                setDetailMode('edit');
                setDetailOpen(true);
                setView('details');
              })
            }
          />
        ),
        delete: (
          <DeleteRowButton
            onClick={() =>
              requestPassword(async () => {
                try {
                  await deletePurchase(r.id);
                  load();
                } catch (e) {
                  setError(e instanceof Error ? e.message : 'Delete failed');
                }
              })
            }
          />
        ),
      })),
    [items, requestPassword, load]
  );

  function openDetails() {
    if (!selectedId) {
      window.alert('No record selected');
      return;
    }
    setDetailMode('details');
    setDetailOpen(true);
    setView('details');
  }

  function showList() {
    setView('list');
    setDetailOpen(false);
  }

  function handleDeleteSelected() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    requestPassword(async () => {
      try {
        for (const id of ids) {
          await deletePurchase(id);
        }
        setSelectedIds(new Set());
        load();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Delete failed');
      }
    });
  }

  const tabActions = (
    <>
      <button type="button" className={tabClass(view === 'list')} onClick={showList}>
        List name
      </button>
      <button type="button" className={tabClass(view === 'details')} onClick={openDetails}>
        Details of receipts
      </button>
    </>
  );

  return (
    <div className="p-4">
      <ProcedureArchiveShell
        title="Archive of Receipts"
        activeTab=""
        tabs={[]}
        tabActions={tabActions}
        error={error || undefined}
        footerHint="Select a purchase, then Details of receipts — or use Edit on the row. Check rows to delete selected. Edit and Delete ask for your password."
      >
        <div className="mb-3 flex flex-wrap gap-2">
          {(
            [
              ['all', 'All movements'],
              ['7', 'In the last 7 days'],
              ['15', 'In the last 15 days'],
              ['30', 'In the last 30 days'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={rangeBtnClass(dayRange === key)}
              onClick={() => {
                setPage(1);
                setDayRange(key);
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <ArchiveListToolbar
          title="Filter · Archive of Receipts"
          values={filters.draft}
          onChange={filters.onChange}
          onApply={() => {
            if (filters.apply()) setPage(1);
          }}
          onClear={() => {
            filters.clear();
            setPage(1);
          }}
          dateRangeError={filters.dateRangeError}
          selectedCount={selectedIds.size}
          onDeleteSelected={handleDeleteSelected}
          pagination={
            <ProcedurePagination
              page={page}
              pageSize={pageSize}
              total={total}
              onPageChange={setPage}
              onPageSizeChange={(n) => {
                setPageSize(n);
                setPage(1);
              }}
            />
          }
        />

        <ProcedureArchiveTable
          columns={columns}
          rows={rows}
          selectedId={selectedId}
          selectable
          selectOnlyOpenRest={false}
          selectedIds={selectedIds}
          loading={loading}
          emptyMessage="Data not available"
          onRowClick={(row) => row.id && setSelectedId(row.id)}
          onToggleSelect={(row) => {
            if (!row.id) return;
            setSelectedId(row.id);
            setSelectedIds((prev) => {
              const next = new Set(prev);
              if (next.has(row.id!)) next.delete(row.id!);
              else next.add(row.id!);
              return next;
            });
          }}
          onToggleSelectAll={(checked) => {
            if (!checked) {
              setSelectedIds(new Set());
              return;
            }
            setSelectedIds(new Set(rows.map((r) => r.id).filter(Boolean) as string[]));
          }}
        />
      </ProcedureArchiveShell>

      {passwordModal}

      <MovementCashDetailModal
        isOpen={detailOpen}
        purchaseId={selectedId}
        mode={detailMode}
        onClose={() => {
          setDetailOpen(false);
          setView('list');
        }}
      />
    </div>
  );
}

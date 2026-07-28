'use client';

/**
 * PHP Archive of Receipts — `/clubMembers/movement_cash`
 * Lists service purchases (ServicePurchase), not tax-document receipt rows.
 * Tabs: List name | Details of receipts
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pencil } from 'lucide-react';
import ProcedureArchiveShell from '@/components/procedures/ProcedureArchiveShell';
import ProcedureArchiveTable from '@/components/procedures/ProcedureArchiveTable';
import ProcedurePagination from '@/components/procedures/ProcedurePagination';
import MovementCashDetailModal from '@/components/club/archives/MovementCashDetailModal';
import {
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
  const [items, setItems] = useState<ServiceSalePurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [dayRange, setDayRange] = useState<DayRange>('all');
  const [view, setView] = useState<ViewTab>('list');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [orderBy, setOrderBy] = useState<'recent' | 'old'>('recent');

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailMode, setDetailMode] = useState<'details' | 'edit'>('details');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchPurchases({ page: 1, pageSize: 500 });
      let list = [...res.items];

      if (dayRange !== 'all') {
        const from = daysAgoIso(Number(dayRange));
        list = list.filter((r) => (r.paydate || '') >= from);
      }
      if (appliedSearch.trim()) {
        const q = appliedSearch.trim().toLowerCase();
        list = list.filter(
          (r) =>
            r.memberName.toLowerCase().includes(q) ||
            r.serviceName.toLowerCase().includes(q) ||
            r.sectorName.toLowerCase().includes(q) ||
            (r.notes || '').toLowerCase().includes(q) ||
            (r.operatorName || '').toLowerCase().includes(q)
        );
      }

      list.sort((a, b) => {
        const da = a.paydate || '';
        const db = b.paydate || '';
        return orderBy === 'recent' ? db.localeCompare(da) : da.localeCompare(db);
      });

      setTotal(list.length);
      const start = (page - 1) * PAGE_SIZE;
      setItems(list.slice(start, start + PAGE_SIZE));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [appliedSearch, dayRange, orderBy, page]);

  useEffect(() => {
    load();
  }, [load]);

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
          <button
            type="button"
            title="Edit"
            className="text-gray-700 hover:text-blue-700"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedId(r.id);
              setDetailMode('edit');
              setDetailOpen(true);
              setView('details');
            }}
          >
            <Pencil className="h-4 w-4" />
          </button>
        ),
      })),
    [items]
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
        footerHint="Select a purchase, then Details of receipts — or use Edit on the row."
        pagination={
          total > PAGE_SIZE ? (
            <ProcedurePagination
              page={page}
              pageSize={PAGE_SIZE}
              total={total}
              onPageChange={setPage}
            />
          ) : undefined
        }
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

        <form
          className="mb-3 flex flex-wrap items-end gap-3 rounded-md border border-teal-800/20 bg-[#eef6f5] px-4 py-3"
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            setAppliedSearch(search);
          }}
        >
          <label className="flex min-w-[160px] flex-col">
            <span className="mb-1 text-[12px] font-semibold text-gray-800">Ordering</span>
            <select
              className="!mb-0 h-9 rounded border border-gray-400 bg-white px-2.5 text-[13px] text-gray-900"
              value={orderBy}
              onChange={(e) => {
                setPage(1);
                setOrderBy(e.target.value as 'recent' | 'old');
              }}
            >
              <option value="recent">Most recent</option>
              <option value="old">Oldest first</option>
            </select>
          </label>
          <label className="flex min-w-[200px] flex-1 flex-col">
            <span className="mb-1 text-[12px] font-semibold text-gray-800">Search by firstname</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by firstname"
              className="h-9 rounded border border-gray-400 bg-white px-2.5 text-[13px] text-gray-900"
            />
          </label>
          <div className="flex h-9 items-center gap-2 self-end">
            <button
              type="submit"
              className="h-9 rounded border border-red-900 bg-red-700 px-4 text-[13px] font-semibold text-white hover:bg-red-800"
            >
              Proceed
            </button>
            <button
              type="button"
              className="h-9 rounded border border-gray-400 bg-white px-4 text-[13px] font-semibold text-gray-800"
              onClick={() => {
                setSearch('');
                setAppliedSearch('');
                setOrderBy('recent');
                setPage(1);
              }}
            >
              Clear
            </button>
          </div>
        </form>

        <ProcedureArchiveTable
          columns={columns}
          rows={rows}
          selectedId={selectedId}
          showCheckboxes
          showSelectAll={false}
          loading={loading}
          emptyMessage="Data not available"
          onRowClick={(row) => row.id && setSelectedId(row.id)}
          onToggleCheck={(row, checked) => {
            if (!row.id) return;
            setSelectedId(checked ? row.id : null);
          }}
        />
      </ProcedureArchiveShell>

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

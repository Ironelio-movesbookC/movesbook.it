'use client';

/**
 * Cash movements archive with PHP-style drill-down tabs:
 * Historical | Details deadline | Totals about payments
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import ProcedureArchiveShell from '@/components/procedures/ProcedureArchiveShell';
import ProcedureArchiveTable from '@/components/procedures/ProcedureArchiveTable';
import ProcedurePagination from '@/components/procedures/ProcedurePagination';
import { fetchClubArchive, type ArchiveFetchParams } from '@/lib/club/archives/clubArchiveClient';
import { createProcedureClient } from '@/lib/club/procedureClient';
import { parseCashMovementId } from '@/lib/club/cashMovementClient';
import { formatDate, formatEuro } from '@/lib/club/servicePurchasesClient';
import type { ProcedureTypeCode } from '@/lib/procedures/types';
import type { Column, Member } from '@/types/clubTable';

type ViewMode = 'historical' | 'details_deadline' | 'totals_payments';

type CashRow = Member & {
  id: string;
  procedureRecordId?: string;
  procedureType?: string;
};

type Props = {
  title: string;
  direction: 'all' | 'IN' | 'OUT';
  columns: Column[];
  footerHint?: string;
  onEditItem?: (item: Member) => void;
  onDeleteItem?: (item: Member) => void;
};

const deadlineColumns: Column[] = [
  { key: 'name', header: 'Full Name' },
  { key: 'typology', header: 'Typology' },
  { key: 'service', header: 'Service / Product' },
  { key: 'insertDate', header: 'Date', render: (v) => formatDate(v) },
  { key: 'value', header: 'Debt', render: (v) => formatEuro(v) },
  { key: 'paid', header: 'Paid', render: (v) => formatEuro(v) },
  { key: 'rest', header: 'Rest', render: (v) => formatEuro(v) },
  { key: 'casual', header: 'Description' },
  { key: 'operator', header: 'Operator' },
];

const totalsColumns: Column[] = [
  { key: 'name', header: 'Full Name' },
  { key: 'typology', header: 'Typology' },
  { key: 'service', header: 'Service / Product' },
  { key: 'insertDate', header: 'Date', render: (v) => formatDate(v) },
  { key: 'paid', header: 'Payment IN', render: (v) => formatEuro(v) },
  { key: 'rest', header: 'Rest', render: (v) => formatEuro(v) },
  { key: 'payMod', header: 'Pay mode' },
  { key: 'casual', header: 'Causal Payment' },
  { key: 'operator', header: 'Operator' },
];

function tabClass(active: boolean) {
  if (active) {
    return 'mb-[-1px] rounded-t border border-b-0 border-teal-600 bg-white px-3 py-2 text-sm font-medium text-teal-700';
  }
  return 'mb-[-1px] rounded-t border border-b-0 border-transparent bg-transparent px-3 py-2 text-sm font-medium text-gray-600 hover:text-teal-700';
}

export default function CashMovementsArchive({
  title,
  direction,
  columns,
  footerHint,
  onEditItem,
  onDeleteItem,
}: Props) {
  const pageSize = 25;
  const [view, setView] = useState<ViewMode>('historical');
  const [historical, setHistorical] = useState<CashRow[]>([]);
  const [detailRows, setDetailRows] = useState<Member[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [orderBy, setOrderBy] = useState<'recent' | 'old'>('recent');
  const [appliedFilters, setAppliedFilters] = useState<ArchiveFetchParams>({});
  const [dateRangeError, setDateRangeError] = useState('');

  const selectedRow = useMemo(
    () => historical.find((r) => r.id === selectedId) ?? null,
    [historical, selectedId]
  );

  const loadHistorical = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchClubArchive('cash-movements', {
        page,
        pageSize,
        direction,
        ...appliedFilters,
      });
      setTotal(res.total);
      const items = (res.items as CashRow[]).map((item) => {
        const enriched: CashRow = { ...item };
        if (onEditItem) {
          enriched.edit = (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEditItem(item);
              }}
              className="text-blue-600 hover:text-blue-800"
              title="Edit"
            >
              <Pencil className="h-4 w-4" />
            </button>
          );
        }
        if (onDeleteItem) {
          enriched.delete = (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteItem(item);
              }}
              className="text-red-500 hover:text-red-700"
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          );
        }
        // Backfill procedureType from prefixed id when API older payloads omit it
        if (!enriched.procedureType && enriched.id) {
          const parsed = parseCashMovementId(enriched.id);
          if (parsed) {
            enriched.procedureType = parsed.procedureType;
          }
        }
        return enriched;
      });
      setHistorical(items);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [appliedFilters, direction, onDeleteItem, onEditItem, page, pageSize]);

  useEffect(() => {
    loadHistorical();
  }, [loadHistorical]);

  async function loadDetailsDeadline(row: CashRow) {
    if (!row.procedureRecordId || !row.procedureType) {
      window.alert('Please select at least one record');
      return;
    }
    setDetailLoading(true);
    setError('');
    try {
      const client = createProcedureClient(row.procedureType as ProcedureTypeCode);
      const { record } = await client.fetchRecord(row.procedureRecordId);
      setDetailRows([
        {
          id: record.id,
          name: record.memberName,
          image: record.memberImage ?? undefined,
          typology: record.typology,
          service: record.primaryLabel,
          insertDate: record.paydate ?? undefined,
          value: record.value,
          paid: record.pay,
          rest: record.rest,
          casual: record.notes,
          operator: record.operatorName,
        },
      ]);
      setView('details_deadline');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load deadline details');
    } finally {
      setDetailLoading(false);
    }
  }

  async function loadTotalsPayments(row: CashRow) {
    if (!row.procedureRecordId || !row.procedureType) {
      window.alert('Please select at least one record');
      return;
    }
    setDetailLoading(true);
    setError('');
    try {
      const client = createProcedureClient(row.procedureType as ProcedureTypeCode);
      const res = await client.fetchPayments({
        recordId: row.procedureRecordId,
        page: 1,
        pageSize: 100,
      });
      setDetailRows(
        res.items.map((p) => ({
          id: p.id,
          name: p.memberName,
          typology: p.typology,
          service: p.primaryLabel,
          insertDate: p.paymentDate ?? undefined,
          paid: p.paid,
          rest: p.residualDebt ?? p.balance,
          payMod: p.payMode ?? undefined,
          casual: p.description,
          operator: p.operatorName,
        }))
      );
      setView('totals_payments');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load payment totals');
    } finally {
      setDetailLoading(false);
    }
  }

  function handleDetailsDeadline() {
    if (!selectedRow) {
      window.alert('Please select at least one record');
      return;
    }
    void loadDetailsDeadline(selectedRow);
  }

  function handleTotalsPayments() {
    if (!selectedRow) {
      window.alert('Please select at least one record');
      return;
    }
    void loadTotalsPayments(selectedRow);
  }

  function handleHistorical() {
    setView('historical');
    setDetailRows([]);
  }

  function applyFilterForm(e: React.FormEvent) {
    e.preventDefault();
    if (fromDate && toDate && fromDate > toDate) {
      setDateRangeError('"From" date cannot be after "To" date.');
      return;
    }
    setDateRangeError('');
    setPage(1);
    setView('historical');
    setAppliedFilters({
      search: search.trim() || undefined,
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
      orderBy,
    });
  }

  function clearFilters() {
    setSearch('');
    setFromDate('');
    setToDate('');
    setOrderBy('recent');
    setDateRangeError('');
    setPage(1);
    setView('historical');
    setAppliedFilters({});
  }

  function handleFromDateChange(value: string) {
    setFromDate(value);
    if (value && toDate && value > toDate) {
      setDateRangeError('"From" date cannot be after "To" date.');
    } else {
      setDateRangeError('');
    }
  }

  function handleToDateChange(value: string) {
    setToDate(value);
    if (fromDate && value && fromDate > value) {
      setDateRangeError('"From" date cannot be after "To" date.');
    } else {
      setDateRangeError('');
    }
  }

  const showingHistorical = view === 'historical';
  const tableColumns = showingHistorical
    ? columns
    : view === 'details_deadline'
      ? deadlineColumns
      : totalsColumns;
  const tableRows = showingHistorical ? historical : detailRows;
  const tableLoading = showingHistorical ? loading : detailLoading;

  const tabActions = (
    <>
      <button
        type="button"
        className={tabClass(view === 'historical')}
        onClick={handleHistorical}
      >
        Historical
      </button>
      <button
        type="button"
        className={tabClass(view === 'details_deadline')}
        onClick={handleDetailsDeadline}
      >
        Details deadline
      </button>
      <button
        type="button"
        className={tabClass(view === 'totals_payments')}
        onClick={handleTotalsPayments}
      >
        Totals about payments
      </button>
    </>
  );

  return (
    <ProcedureArchiveShell
      title={title}
      activeTab=""
      tabs={[]}
      tabActions={tabActions}
      error={error || undefined}
      footerHint={
        showingHistorical
          ? footerHint ??
            'Select a payment, then open Details deadline or Totals about payments.'
          : view === 'details_deadline'
            ? 'Parent deadline / debt related to the selected payment. Click Historical to go back.'
            : 'All payments related to the same deadline as the selected row. Click Historical to go back.'
      }
      pagination={
        showingHistorical && total > pageSize ? (
          <ProcedurePagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} />
        ) : undefined
      }
    >
      {showingHistorical && (
        <form
          onSubmit={applyFilterForm}
          className="mb-3 rounded-md border border-teal-800/20 bg-[#eef6f5] px-4 py-3"
        >
          <div className="mb-2 text-[13px] font-semibold text-teal-900">Filter movements</div>
          <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
            <label className="flex min-w-[180px] flex-1 flex-col">
              <span className="mb-1 block text-[12px] font-semibold text-gray-800">Search</span>
              <input
                type="text"
                className="block h-9 w-full rounded border border-gray-400 bg-white px-2.5 text-[13px] text-gray-900 placeholder:text-gray-400 focus:border-teal-700 focus:outline-none focus:ring-1 focus:ring-teal-700"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Name, typology, notes..."
              />
            </label>
            <label className="flex flex-col">
              <span className="mb-1 block text-[12px] font-semibold text-gray-800">From</span>
              <input
                type="date"
                className={`block h-9 rounded border bg-white px-2.5 text-[13px] text-gray-900 focus:outline-none focus:ring-1 ${
                  dateRangeError
                    ? 'border-red-500 focus:border-red-600 focus:ring-red-500'
                    : 'border-gray-400 focus:border-teal-700 focus:ring-teal-700'
                }`}
                value={fromDate}
                max={toDate || undefined}
                onChange={(e) => handleFromDateChange(e.target.value)}
              />
            </label>
            <label className="flex flex-col">
              <span className="mb-1 block text-[12px] font-semibold text-gray-800">To</span>
              <input
                type="date"
                className={`block h-9 rounded border bg-white px-2.5 text-[13px] text-gray-900 focus:outline-none focus:ring-1 ${
                  dateRangeError
                    ? 'border-red-500 focus:border-red-600 focus:ring-red-500'
                    : 'border-gray-400 focus:border-teal-700 focus:ring-teal-700'
                }`}
                value={toDate}
                min={fromDate || undefined}
                onChange={(e) => handleToDateChange(e.target.value)}
              />
            </label>
            <label className="flex min-w-[150px] flex-col">
              <span className="mb-1 block text-[12px] font-semibold text-gray-800">Order</span>
              <select
                className="!mb-0 box-border block h-9 w-full rounded border border-gray-400 bg-white px-2.5 text-[13px] leading-normal text-gray-900 focus:border-teal-700 focus:outline-none focus:ring-1 focus:ring-teal-700"
                value={orderBy}
                onChange={(e) => setOrderBy(e.target.value as 'recent' | 'old')}
              >
                <option value="recent">Most recent</option>
                <option value="old">Oldest first</option>
              </select>
            </label>
            <div className="flex h-9 items-center gap-2 self-end">
              <button
                type="submit"
                className="h-9 rounded border border-teal-900 bg-teal-800 px-4 text-[13px] font-semibold text-white hover:bg-teal-900"
              >
                Filter
              </button>
              <button
                type="button"
                onClick={clearFilters}
                className="h-9 rounded border border-gray-400 bg-white px-4 text-[13px] font-semibold text-gray-800 hover:bg-gray-100"
              >
                Clear
              </button>
            </div>
          </div>
          {dateRangeError && (
            <p className="mt-2 text-[12px] font-medium text-red-600">{dateRangeError}</p>
          )}
        </form>
      )}

      <ProcedureArchiveTable
        columns={tableColumns}
        rows={tableRows}
        selectedId={showingHistorical ? selectedId : null}
        showCheckboxes={showingHistorical}
        showSelectAll={false}
        loading={tableLoading}
        emptyMessage={
          showingHistorical
            ? 'No cash movements found.'
            : view === 'details_deadline'
              ? 'No related deadline found.'
              : 'No related payments found.'
        }
        onRowClick={
          showingHistorical
            ? (row) => {
                if (row.id) setSelectedId(row.id);
              }
            : undefined
        }
        onToggleCheck={
          showingHistorical
            ? (row, checked) => {
                if (!row.id) return;
                setSelectedId(checked ? row.id : null);
              }
            : undefined
        }
      />
    </ProcedureArchiveShell>
  );
}

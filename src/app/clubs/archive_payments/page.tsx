'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
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
import ArchiveScopeRadios, { useArchiveScope } from '@/components/procedures/ArchiveScopeRadios';
import EditPaymentModal from '@/components/club/archives/EditPaymentModal';
import type { ProcedureTab } from '@/components/procedures/types';
import { archiveScopeQuery } from '@/lib/club/archives/archiveScope';
import { fetchClubArchive } from '@/lib/club/archives/clubArchiveClient';
import { createProcedureClient } from '@/lib/club/procedureClient';
import type { ProcedureTypeCode } from '@/lib/procedures/types';
import { formatDate, formatEuro } from '@/lib/club/servicePurchasesClient';
import type { Column, Member } from '@/types/clubTable';

const PAGE_SIZE = 25;

const columns: Column[] = [
  { key: 'name', header: 'Full Name' },
  { key: 'typology', header: 'Typology' },
  { key: 'service', header: 'Detail' },
  { key: 'insertDate', header: 'Date', render: (v) => formatDate(v) },
  { key: 'paid', header: 'Payment IN', render: (v) => formatEuro(v) },
  {
    key: 'originalDebt',
    header: 'OF..',
    render: (_, row) =>
      `${Number(row.residualDebt ?? 0).toFixed(2)} / ${Number(row.originalDebt ?? 0).toFixed(2)}`,
  },
  { key: 'rest', header: 'Rest', render: (v) => formatEuro(v) },
  { key: 'casual', header: 'Notes' },
  { key: 'operator', header: 'Operator' },
  { key: 'edit', header: 'Edit', sortable: false },
  { key: 'delete', header: 'Delete', sortable: false },
];

function recordIdOf(row: Member): string | undefined {
  return row.procedureRecordId ?? row.id;
}

function ArchivePaymentsPageInner() {
  const scope = useArchiveScope();
  const filters = useArchiveListFilters();
  const [data, setData] = useState<Member[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [total, setTotal] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [editTarget, setEditTarget] = useState<{ code: ProcedureTypeCode; row: Member } | null>(null);
  const { request: requestPassword, modal: passwordModal } = usePasswordGate();

  const reload = useCallback(() => setRefreshKey((k) => k + 1), []);

  const openEdit = useCallback((row: Member) => {
    const code = row.procedureType as ProcedureTypeCode | undefined;
    if (!code || !row.id) return;
    setEditTarget({ code, row });
  }, []);

  const performDelete = useCallback(
    async (row: Member) => {
      const code = row.procedureType as ProcedureTypeCode | undefined;
      if (!code || !row.id) return;
      try {
        await createProcedureClient(code).deletePayment(row.id);
        reload();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Delete failed');
      }
    },
    [reload]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchClubArchive('payments', {
        page,
        pageSize,
        ...scope.filters,
        ...filters.applied,
      });
      setTotal(res.total);
      setData(
        res.items.map((row) => ({
          ...row,
          edit: <EditRowButton onClick={() => requestPassword(() => openEdit(row))} />,
          delete: <DeleteRowButton onClick={() => requestPassword(() => performDelete(row))} />,
        }))
      );
      setSelectedIds(new Set());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, scope.filters, filters.applied, requestPassword, openEdit, performDelete]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  useEffect(() => {
    setPage(1);
  }, [filters.applied, scope.filters]);

  // Same as Deadlines: the selected row travels to sibling archives via recordId + memberId.
  const selectedRow = useMemo(
    () => (selectedId ? data.find((r) => r.id === selectedId) ?? null : null),
    [data, selectedId]
  );
  const scopeQuery = archiveScopeQuery(
    selectedRow ? recordIdOf(selectedRow) : scope.recordId,
    selectedRow?.userId ?? selectedRow?.memberId ?? scope.memberId
  );

  const tabs: ProcedureTab[] = [
    { id: 'deadlines', label: 'Archive of Deadlines', href: `/clubs/archive_deadlines${scopeQuery}` },
    { id: 'payments', label: 'Archive of Payments', href: `/clubs/archive_payments${scopeQuery}` },
    { id: 'receipts', label: 'Archive of Receipts', href: `/clubs/archive_receipts${scopeQuery}` },
  ];

  function handleDeleteSelected() {
    const rows = data.filter((r) => r.id && selectedIds.has(r.id));
    if (rows.length === 0) return;
    requestPassword(async () => {
      try {
        for (const row of rows) {
          const code = row.procedureType as ProcedureTypeCode | undefined;
          if (!code || !row.id) continue;
          await createProcedureClient(code).deletePayment(row.id);
        }
        setSelectedIds(new Set());
        reload();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Delete failed');
      }
    });
  }

  return (
    <ProcedureArchiveShell
      title="Archive of Payments"
      activeTab="payments"
      tabs={tabs}
      tabsTrailing={
        <ArchiveScopeRadios state={scope} name="paymentsScope" onChange={() => setPage(1)} />
      }
      error={error}
      footerHint="All typologies (Services, Products, Expenses, Member debts, …). Select a row then open Deadlines/Receipts to keep that record/member. Check rows to delete selected. Edit and Delete ask for your password."
    >
      <ArchiveListToolbar
        title="Filter · Archive of Payments"
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
        rows={data}
        selectedId={selectedId}
        loading={loading}
        selectable
        selectOnlyOpenRest={false}
        selectedIds={selectedIds}
        onRowClick={(row) => row.id && setSelectedId(row.id)}
        onToggleSelect={(row) => {
          if (!row.id) return;
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
          setSelectedIds(new Set(data.map((r) => r.id).filter(Boolean) as string[]));
        }}
      />

      {passwordModal}

      {editTarget && (
        <EditPaymentModal
          isOpen
          procedureCode={editTarget.code}
          onClose={() => setEditTarget(null)}
          onSaved={reload}
          payment={{
            id: editTarget.row.id!,
            paymentDate:
              typeof editTarget.row.insertDate === 'string'
                ? editTarget.row.insertDate
                : editTarget.row.insertDate?.toISOString() ?? null,
            description: String(editTarget.row.casual ?? ''),
            operatorId: editTarget.row.operatorId ?? null,
          }}
        />
      )}
    </ProcedureArchiveShell>
  );
}

export default function ArchivePaymentsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-gray-500">Loading...</div>}>
      <ArchivePaymentsPageInner />
    </Suspense>
  );
}

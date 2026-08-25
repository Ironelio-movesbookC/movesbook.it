'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Pencil, Trash2 } from 'lucide-react';
import ProcedureArchiveShell from '@/components/procedures/ProcedureArchiveShell';
import ProcedureArchiveTable from '@/components/procedures/ProcedureArchiveTable';
import ProcedurePagination from '@/components/procedures/ProcedurePagination';
import ArchiveListToolbar from '@/components/procedures/ArchiveListToolbar';
import { useArchiveListFilters } from '@/components/procedures/useArchiveListFilters';
import ArchiveScopeRadios, { useArchiveScope } from '@/components/procedures/ArchiveScopeRadios';
import DisplayAllArchivesCheckbox, {
  scopedArchiveQuery,
  useEffectiveScopedRecordIds,
  useScopedRecordIds,
} from '@/components/procedures/DisplayAllArchivesCheckbox';
import {
  getServiceSaleTabs,
  SERVICE_SALE_PAGE_SIZE,
  serviceSalePaymentColumns,
} from '@/components/procedures/configs/serviceSale';
import { Member } from '@/types/clubTable';
import {
  fetchPayments,
  deletePayment,
  type ServiceSalePayment,
} from '@/lib/club/serviceSaleClient';
import AdminPasswordConfirmModal from '@/components/club/AdminPasswordConfirmModal';
import EditPaymentModal from '@/components/club/archives/EditPaymentModal';

function mapPayment(
  p: ServiceSalePayment,
  onEdit: (p: ServiceSalePayment) => void,
  onDelete: (id: string) => void
): Member {
  return {
    id: p.id,
    name: p.memberName,
    typology: p.typology,
    service: p.serviceName,
    insertDate: p.paymentDate ?? undefined,
    paid: p.paid,
    originalDebt: p.originalDebt,
    residualDebt: p.residualDebt,
    rest: p.balance,
    casual: p.description,
    operator: p.operatorName,
    edit: (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onEdit(p);
        }}
        className="text-blue-600 hover:text-blue-800"
        title="Edit"
      >
        <Pencil className="w-4 h-4" />
      </button>
    ),
    delete: (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(p.id);
        }}
        className="text-red-500 hover:text-red-700"
        title="Delete"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    ),
  };
}

function ServicePaymentsInner() {
  const searchParams = useSearchParams();
  const scopedIds = useScopedRecordIds();
  const effectiveIds = useEffectiveScopedRecordIds();
  const scopeQuery = scopedArchiveQuery(searchParams);
  const scope = useArchiveScope();
  const filters = useArchiveListFilters();

  const [data, setData] = useState<Member[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(SERVICE_SALE_PAGE_SIZE);
  const [total, setTotal] = useState(0);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTarget, setEditTarget] = useState<ServiceSalePayment | null>(null);
  const [showDeletePasswordModal, setShowDeletePasswordModal] = useState(false);
  const [deleteTargetIds, setDeleteTargetIds] = useState<string[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchPayments({
        page,
        pageSize,
        recordIds: effectiveIds.length > 0 ? effectiveIds : undefined,
        ...scope.filters,
        ...filters.applied,
      });
      setTotal(res.total);
      setData(
        res.items.map((p) =>
          mapPayment(
            p,
            (payment) => {
              setEditTarget(payment);
              setShowPasswordModal(true);
            },
            (id) => {
              setDeleteTargetIds([id]);
              setShowDeletePasswordModal(true);
            }
          )
        )
      );
      setSelectedIds(new Set());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, effectiveIds, scope.filters, filters.applied]);

  const performDelete = useCallback(
    async (ids: string[]) => {
      try {
        for (const id of ids) {
          await deletePayment(id);
        }
        setSelectedIds(new Set());
        load();
      } catch (e) {
        alert(e instanceof Error ? e.message : 'Delete failed');
      }
    },
    [load]
  );

  useEffect(() => {
    load();
  }, [load]);

  const effectiveIdsKey = effectiveIds.join(',');

  useEffect(() => {
    setPage(1);
  }, [effectiveIdsKey, filters.applied]);

  function handleDeleteSelected() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setDeleteTargetIds(ids);
    setShowDeletePasswordModal(true);
  }

  return (
    <ProcedureArchiveShell
      title="Archive of Payments (Services)"
      activeTab="payments"
      tabs={getServiceSaleTabs(
        'payments',
        scope.recordId,
        scopedIds.length > 0 ? scopedIds : null,
        scopeQuery || null,
        scope.memberId
      )}
      tabsTrailing={
        scopedIds.length > 0 ? (
          <DisplayAllArchivesCheckbox archiveLabel="payments" />
        ) : (
          <ArchiveScopeRadios state={scope} name="paymentsScope" onChange={() => setPage(1)} />
        )
      }
      error={error}
      footerHint={
        effectiveIds.length > 0
          ? `Showing payments for ${effectiveIds.length} selected deadline(s) only. Check “Display all payments” for the full list.`
          : 'Check rows to delete selected'
      }
    >
      <ArchiveListToolbar
        title="Filter · Archive of Payments (Services)"
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
        columns={serviceSalePaymentColumns}
        rows={data}
        loading={loading}
        selectable
        selectOnlyOpenRest={false}
        selectedIds={selectedIds}
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

      <AdminPasswordConfirmModal
        isOpen={showPasswordModal}
        onClose={() => {
          setShowPasswordModal(false);
          setEditTarget(null);
        }}
        onVerified={() => {
          setShowPasswordModal(false);
          setShowEditModal(true);
        }}
      />

      {editTarget && (
        <EditPaymentModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditTarget(null);
          }}
          onSaved={() => load()}
          payment={{
            id: editTarget.id,
            paymentDate: editTarget.paymentDate,
            description: editTarget.description,
            operatorId: editTarget.operatorId,
          }}
        />
      )}

      <AdminPasswordConfirmModal
        isOpen={showDeletePasswordModal}
        onClose={() => {
          setShowDeletePasswordModal(false);
          setDeleteTargetIds([]);
        }}
        onVerified={() => {
          setShowDeletePasswordModal(false);
          if (deleteTargetIds.length > 0) performDelete(deleteTargetIds);
          setDeleteTargetIds([]);
        }}
      />
    </ProcedureArchiveShell>
  );
}

export default function ServicePaymentsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-gray-500">Loading...</div>}>
      <ServicePaymentsInner />
    </Suspense>
  );
}

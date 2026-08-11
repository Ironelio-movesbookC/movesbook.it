'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Pencil, Trash2 } from 'lucide-react';
import ProcedureArchiveShell from '@/components/procedures/ProcedureArchiveShell';
import ProcedureArchiveTable from '@/components/procedures/ProcedureArchiveTable';
import ProcedurePagination from '@/components/procedures/ProcedurePagination';
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
import EditServicePaymentModal from '@/components/club/archives/EditServicePaymentModal';

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
  const memberId = scopedIds.length === 0 ? searchParams.get('memberId') : null;

  const [scope, setScope] = useState<'member' | 'all'>(memberId ? 'member' : 'all');
  const [data, setData] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTarget, setEditTarget] = useState<ServiceSalePayment | null>(null);
  const [showDeletePasswordModal, setShowDeletePasswordModal] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchPayments({
        page,
        pageSize: SERVICE_SALE_PAGE_SIZE,
        recordIds: effectiveIds.length > 0 ? effectiveIds : undefined,
        memberId: scope === 'member' && memberId ? memberId : undefined,
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
              setDeleteTargetId(id);
              setShowDeletePasswordModal(true);
            }
          )
        )
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [page, effectiveIds, scope, memberId]);

  const performDelete = useCallback(
    async (id: string) => {
      try {
        await deletePayment(id);
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

  useEffect(() => {
    setPage(1);
  }, [effectiveIds.join(',')]);

  return (
    <ProcedureArchiveShell
      title="Archive of Payments (Services)"
      activeTab="payments"
      tabs={getServiceSaleTabs(
        'payments',
        null,
        scopedIds.length > 0 ? scopedIds : null,
        scopeQuery || null,
        memberId
      )}
      tabsTrailing={
        memberId ? (
          <div className="flex items-center gap-4 text-sm text-gray-700">
            <label className="inline-flex items-center gap-2 cursor-pointer select-none">
              <input
                type="radio"
                name="paymentsScope"
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
                name="paymentsScope"
                checked={scope === 'all'}
                onChange={() => {
                  setScope('all');
                  setPage(1);
                }}
              />
              All members
            </label>
          </div>
        ) : (
          <DisplayAllArchivesCheckbox archiveLabel="payments" />
        )
      }
      error={error}
      footerHint={
        effectiveIds.length > 0
          ? `Showing payments for ${effectiveIds.length} selected deadline(s) only. Check “Display all payments” for the full list.`
          : undefined
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
      <ProcedureArchiveTable columns={serviceSalePaymentColumns} rows={data} loading={loading} />

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
        <EditServicePaymentModal
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
          setDeleteTargetId(null);
        }}
        onVerified={() => {
          setShowDeletePasswordModal(false);
          if (deleteTargetId) performDelete(deleteTargetId);
          setDeleteTargetId(null);
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

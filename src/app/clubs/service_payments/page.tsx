'use client';

import { useCallback, useEffect, useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import ProcedureArchiveShell from '@/components/procedures/ProcedureArchiveShell';
import ProcedureArchiveTable from '@/components/procedures/ProcedureArchiveTable';
import ProcedurePagination from '@/components/procedures/ProcedurePagination';
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

export default function ServicePaymentsPage() {
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
      const res = await fetchPayments({ page, pageSize: SERVICE_SALE_PAGE_SIZE });
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
  }, [page]);

  const performDelete = useCallback(async (id: string) => {
    try {
      await deletePayment(id);
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Delete failed');
    }
  }, [load]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <ProcedureArchiveShell
      title="Archive of Payments"
      activeTab="payments"
      tabs={getServiceSaleTabs('payments')}
      error={error}
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
        onClose={() => { setShowPasswordModal(false); setEditTarget(null); }}
        onVerified={() => {
          setShowPasswordModal(false);
          setShowEditModal(true);
        }}
      />

      {editTarget && (
        <EditServicePaymentModal
          isOpen={showEditModal}
          onClose={() => { setShowEditModal(false); setEditTarget(null); }}
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
        onClose={() => { setShowDeletePasswordModal(false); setDeleteTargetId(null); }}
        onVerified={() => {
          setShowDeletePasswordModal(false);
          if (deleteTargetId) performDelete(deleteTargetId);
          setDeleteTargetId(null);
        }}
      />
    </ProcedureArchiveShell>
  );
}

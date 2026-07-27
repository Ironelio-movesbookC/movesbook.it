'use client';

import { useCallback, useEffect, useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import ProcedureArchiveShell from '@/components/procedures/ProcedureArchiveShell';
import ProcedureArchiveTable from '@/components/procedures/ProcedureArchiveTable';
import ProcedurePagination from '@/components/procedures/ProcedurePagination';
import {
  getServiceSaleTabs,
  SERVICE_SALE_PAGE_SIZE,
  serviceSaleReceiptColumns,
} from '@/components/procedures/configs/serviceSale';
import { Member } from '@/types/clubTable';
import {
  fetchReceipts,
  deleteReceipt,
  type ServiceSaleReceipt,
} from '@/lib/club/serviceSaleClient';
import AdminPasswordConfirmModal from '@/components/club/AdminPasswordConfirmModal';
import EditServiceReceiptModal from '@/components/club/archives/EditServiceReceiptModal';

function mapReceipt(
  r: ServiceSaleReceipt,
  onEdit: (r: ServiceSaleReceipt) => void,
  onDelete: (id: string) => void
): Member {
  return {
    id: r.id,
    name: r.memberName,
    typology: r.typology,
    service: r.serviceName,
    insertDate: r.receiptDate ?? undefined,
    category: r.documentType,
    contract: r.documentNumber,
    value: r.cost,
    paid: r.paymentIn,
    casual: r.annotations,
    operator: r.operatorName,
    edit: (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onEdit(r);
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
          onDelete(r.id);
        }}
        className="text-red-500 hover:text-red-700"
        title="Delete"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    ),
  };
}

export default function ServiceReceiptsPage() {
  const [data, setData] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTarget, setEditTarget] = useState<ServiceSaleReceipt | null>(null);
  const [showDeletePasswordModal, setShowDeletePasswordModal] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchReceipts({ page, pageSize: SERVICE_SALE_PAGE_SIZE });
      setTotal(res.total);
      setData(
        res.items.map((r) =>
          mapReceipt(
            r,
            (receipt) => {
              setEditTarget(receipt);
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

  const performDelete = useCallback(
    async (id: string) => {
      try {
        await deleteReceipt(id);
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

  return (
    <ProcedureArchiveShell
      title="Archive of Receipts"
      activeTab="receipts"
      tabs={getServiceSaleTabs('receipts')}
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
      <ProcedureArchiveTable columns={serviceSaleReceiptColumns} rows={data} loading={loading} />

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
        <EditServiceReceiptModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditTarget(null);
          }}
          onSaved={() => load()}
          receipt={{
            id: editTarget.id,
            documentType: editTarget.documentType,
            documentNumber: editTarget.documentNumber,
            annotations: editTarget.annotations,
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

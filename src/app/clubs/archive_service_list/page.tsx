'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Trash2 } from 'lucide-react';
import ProcedureArchiveShell from '@/components/procedures/ProcedureArchiveShell';
import ProcedureArchiveTable from '@/components/procedures/ProcedureArchiveTable';
import ProcedurePagination from '@/components/procedures/ProcedurePagination';
import {
  getServiceSaleTabs,
  SERVICE_SALE_PAGE_SIZE,
  serviceSaleRecordColumns,
} from '@/components/procedures/configs/serviceSale';
import { Member } from '@/types/clubTable';
import {
  deletePurchase,
  fetchPurchases,
  type ServiceSalePurchase,
} from '@/lib/club/serviceSaleClient';
import AdminPasswordConfirmModal from '@/components/club/AdminPasswordConfirmModal';
import EditServicePurchaseModal from '@/components/club/archives/EditServicePurchaseModal';

function mapPurchase(
  p: ServiceSalePurchase,
  i: number,
  onDelete: (id: string) => void,
  onEdit: (p: ServiceSalePurchase) => void
): Member {
  return {
    id: p.id,
    number: i + 1,
    name: p.memberName,
    typology: p.typology,
    course: p.sectorName,
    service: p.serviceName,
    insertDate: p.paydate ?? undefined,
    value: p.value,
    paid: p.pay,
    rest: p.rest,
    casual: p.notes,
    operator: p.operatorName,
    dateEnd: p.lastPaymentDate ?? undefined,
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

export default function ArchiveServiceListPage() {
  const router = useRouter();
  const [data, setData] = useState<Member[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTarget, setEditTarget] = useState<ServiceSalePurchase | null>(null);
  const [showDeletePasswordModal, setShowDeletePasswordModal] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchPurchases({ page, pageSize: SERVICE_SALE_PAGE_SIZE });
      setTotal(res.total);
      setData(
        res.items.map((p, i) =>
          mapPurchase(
            p,
            (page - 1) * SERVICE_SALE_PAGE_SIZE + i,
            (id) => {
              setDeleteTargetId(id);
              setShowDeletePasswordModal(true);
            },
            (purchase) => {
              setEditTarget(purchase);
              setShowPasswordModal(true);
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
      await deletePurchase(id);
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
      title="Archive of Services"
      activeTab="historical"
      tabs={getServiceSaleTabs('historical', selectedId)}
      headerAction={
        <button
          type="button"
          onClick={() => router.push('/clubs/new_moment_cash')}
          className="text-sm bg-white text-teal-800 px-3 py-1 rounded hover:bg-teal-50"
        >
          + New service
        </button>
      }
      error={error}
      footerHint="Click to select · Double-click to open payment form for partial payments"
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
        columns={serviceSaleRecordColumns}
        rows={data}
        selectedId={selectedId}
        loading={loading}
        onRowClick={(row) => row.id && setSelectedId(row.id)}
        onRowDoubleClick={(row) => row.id && router.push(`/clubs/payment_detail/${row.id}`)}
      />

      <AdminPasswordConfirmModal
        isOpen={showPasswordModal}
        onClose={() => { setShowPasswordModal(false); setEditTarget(null); }}
        onVerified={() => {
          setShowPasswordModal(false);
          setShowEditModal(true);
        }}
      />

      {editTarget && (
        <EditServicePurchaseModal
          isOpen={showEditModal}
          onClose={() => { setShowEditModal(false); setEditTarget(null); }}
          onSaved={() => load()}
          purchase={{
            id: editTarget.id,
            paydate: editTarget.paydate,
            notes: editTarget.notes,
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

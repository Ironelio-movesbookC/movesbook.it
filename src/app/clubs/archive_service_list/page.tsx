'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
    userId: p.userId,
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

function ArchiveServiceListInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const scopedIds = useScopedRecordIds();
  const effectiveIds = useEffectiveScopedRecordIds();
  const scopeQuery = scopedArchiveQuery(searchParams);

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

  const selectedMemberId = useMemo(
    () => (selectedId ? data.find((r) => r.id === selectedId)?.userId ?? null : null),
    [data, selectedId]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchPurchases({
        page,
        pageSize: SERVICE_SALE_PAGE_SIZE,
        recordIds: effectiveIds.length > 0 ? effectiveIds : undefined,
      });
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
  }, [page, effectiveIds]);

  const performDelete = useCallback(
    async (id: string) => {
      try {
        await deletePurchase(id);
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
      title="Archive of Services"
      activeTab="historical"
      tabs={getServiceSaleTabs(
        'historical',
        selectedId,
        scopedIds.length > 0 ? scopedIds : null,
        scopeQuery || null,
        selectedMemberId
      )}
      tabsTrailing={<DisplayAllArchivesCheckbox archiveLabel="historicals" />}
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
      footerHint={
        effectiveIds.length > 0
          ? `Showing ${effectiveIds.length} selected deadline record(s) only. Check “Display all historicals” for the full list.`
          : 'Click to select · Double-click a row with Rest > 0 to open the payment form'
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
        columns={serviceSaleRecordColumns}
        rows={data}
        selectedId={selectedId}
        loading={loading}
        onRowClick={(row) => {
          setError('');
          if (row.id) setSelectedId(row.id);
        }}
        onRowDoubleClick={(row) => {
          if (!row.id) return;
          if ((row.rest ?? 0) <= 0) {
            setError(
              'Payment is not possible because this service is already fully paid (Rest = €0.00).'
            );
            setSelectedId(row.id);
            return;
          }
          setError('');
          router.push(`/clubs/payment_detail/${row.id}`);
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
        <EditServicePurchaseModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditTarget(null);
          }}
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

export default function ArchiveServiceListPage() {
  return (
    <Suspense fallback={<div className="p-6 text-gray-500">Loading...</div>}>
      <ArchiveServiceListInner />
    </Suspense>
  );
}

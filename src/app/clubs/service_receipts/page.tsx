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
import TaxDocumentModal, {
  type TaxDocumentFormValues,
} from '@/components/procedures/TaxDocumentModal';
import {
  getServiceSaleTabs,
  SERVICE_SALE_PAGE_SIZE,
  serviceSaleReceiptColumns,
} from '@/components/procedures/configs/serviceSale';
import { Member } from '@/types/clubTable';
import {
  fetchReceipts,
  deleteReceipt,
  updateReceipt,
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
    residualDebt: r.residualDebt,
    casual: r.annotations,
    operator: r.operatorName,
    isDuplicate: r.isDuplicate,
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

function ServiceReceiptsInner() {
  const searchParams = useSearchParams();
  const scopedIds = useScopedRecordIds();
  const effectiveIds = useEffectiveScopedRecordIds();
  const scopeQuery = scopedArchiveQuery(searchParams);
  const memberId = scopedIds.length === 0 ? searchParams.get('memberId') : null;

  const [scope, setScope] = useState<'member' | 'all'>(memberId ? 'member' : 'all');
  const [data, setData] = useState<Member[]>([]);
  const [receiptsById, setReceiptsById] = useState<Record<string, ServiceSaleReceipt>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTarget, setEditTarget] = useState<ServiceSaleReceipt | null>(null);
  const [taxTarget, setTaxTarget] = useState<ServiceSaleReceipt | null>(null);
  const [showDeletePasswordModal, setShowDeletePasswordModal] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchReceipts({
        page,
        pageSize: SERVICE_SALE_PAGE_SIZE,
        recordIds: effectiveIds.length > 0 ? effectiveIds : undefined,
        memberId: scope === 'member' && memberId ? memberId : undefined,
      });
      setTotal(res.total);
      const byId: Record<string, ServiceSaleReceipt> = {};
      for (const r of res.items) byId[r.id] = r;
      setReceiptsById(byId);
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
  }, [page, effectiveIds, scope, memberId]);

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

  const handleOpenReceipt = useCallback(
    (row: Member) => {
      if (!row.id) return;
      const receipt = receiptsById[row.id];
      if (!receipt) return;
      setTaxTarget(receipt);
    },
    [receiptsById]
  );

  const handleSaveTaxDocument = useCallback(
    async (values: TaxDocumentFormValues) => {
      if (!taxTarget) return;
      await updateReceipt(taxTarget.id, {
        documentType: values.documentType || undefined,
        documentNumber: values.documentNumber || undefined,
        annotations: values.causal || undefined,
      });
      await load();
    },
    [taxTarget, load]
  );

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [effectiveIds.join(',')]);

  return (
    <ProcedureArchiveShell
      title="Archive of Receipts (Services)"
      activeTab="receipts"
      tabs={getServiceSaleTabs(
        'receipts',
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
                name="receiptsScope"
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
                name="receiptsScope"
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
          <DisplayAllArchivesCheckbox archiveLabel="receipts" />
        )
      }
      error={error}
      footerHint={
        effectiveIds.length > 0
          ? `Showing receipts for ${effectiveIds.length} selected deadline(s) only. Check “Display all receipts” for the full list.`
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
      <ProcedureArchiveTable
        columns={serviceSaleReceiptColumns}
        rows={data}
        loading={loading}
        onRowDoubleClick={handleOpenReceipt}
      />

      {taxTarget && (
        <TaxDocumentModal
          open
          memberName={taxTarget.memberName}
          defaultCausal={taxTarget.annotations}
          defaultTotal={taxTarget.paymentIn}
          defaultResidual={taxTarget.residualDebt}
          saveLabel="Save document"
          initial={{
            documentType: taxTarget.documentType,
            documentNumber: taxTarget.documentNumber,
            documentDate: taxTarget.receiptDate ?? undefined,
            causal: taxTarget.annotations,
            total: taxTarget.paymentIn,
            residualTotal: taxTarget.residualDebt,
            memberDisplayName: taxTarget.memberName,
            originalMemberName: taxTarget.memberName,
            memberAlias: taxTarget.memberName,
          }}
          onClose={() => setTaxTarget(null)}
          onSave={handleSaveTaxDocument}
        />
      )}

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

export default function ServiceReceiptsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-gray-500">Loading...</div>}>
      <ServiceReceiptsInner />
    </Suspense>
  );
}

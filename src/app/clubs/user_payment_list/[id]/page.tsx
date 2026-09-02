'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import ProcedureArchiveShell from '@/components/procedures/ProcedureArchiveShell';
import ProcedureArchiveTable from '@/components/procedures/ProcedureArchiveTable';
import ProcedurePagination from '@/components/procedures/ProcedurePagination';
import {
  DeleteRowButton,
  EditRowButton,
  usePasswordGate,
} from '@/components/procedures/ArchiveRowActions';
import EditPaymentModal from '@/components/club/archives/EditPaymentModal';
import {
  getServiceSaleTabs,
  SERVICE_SALE_PAGE_SIZE,
  serviceSalePaymentDetailColumns,
} from '@/components/procedures/configs/serviceSale';
import { Member } from '@/types/clubTable';
import {
  deletePayment,
  fetchPaymentsForRecord,
  fetchPurchase,
  type ServiceSalePayment,
  type ServiceSalePurchase,
} from '@/lib/club/serviceSaleClient';

export default function UserPaymentListPage() {
  const params = useParams();
  const spId = String(params?.id ?? '');

  const [data, setData] = useState<Member[]>([]);
  const [purchase, setPurchase] = useState<ServiceSalePurchase | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [editTarget, setEditTarget] = useState<ServiceSalePayment | null>(null);
  const { request: requestPassword, modal: passwordModal } = usePasswordGate();

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchPaymentsForRecord(spId, { page, pageSize: SERVICE_SALE_PAGE_SIZE });
      setTotal(res.total);
      setData(
        res.items.map((p) => ({
          id: p.id,
          name: p.memberName,
          typology: p.typology,
          service: p.serviceName,
          insertDate: p.paymentDate ?? undefined,
          paid: p.paid,
          rest: p.balance,
          casual: p.description,
          operator: p.operatorName,
          edit: <EditRowButton onClick={() => requestPassword(() => setEditTarget(p))} />,
          delete: (
            <DeleteRowButton
              onClick={() =>
                requestPassword(async () => {
                  try {
                    await deletePayment(p.id);
                    load();
                  } catch (e) {
                    setError(e instanceof Error ? e.message : 'Delete failed');
                  }
                })
              }
            />
          ),
        }))
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [spId, page, requestPassword]);

  useEffect(() => {
    load();
  }, [load]);

  // Header identity: the record knows the member and the service, the payment rows only echo them.
  useEffect(() => {
    if (!spId) return;
    let cancelled = false;
    fetchPurchase(spId)
      .then((res) => {
        if (!cancelled) setPurchase(res.purchase);
      })
      .catch(() => {
        if (!cancelled) setPurchase(null);
      });
    return () => {
      cancelled = true;
    };
  }, [spId]);

  const serviceLabel =
    [purchase?.sectorName, purchase?.serviceName].filter(Boolean).join('-') ||
    String(data[0]?.service ?? '');
  const memberName = purchase?.memberName ?? String(data[0]?.name ?? '');

  return (
    <ProcedureArchiveShell
      title={serviceLabel ? `Payments for ${serviceLabel}` : 'Payments'}
      member={memberName ? { name: memberName, image: purchase?.memberImage } : undefined}
      activeTab="payments"
      tabs={getServiceSaleTabs('payments', spId)}
      error={error}
      footerHint="Edit and Delete ask for your password."
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
        columns={serviceSalePaymentDetailColumns}
        rows={data}
        loading={loading}
      />

      {passwordModal}

      {editTarget && (
        <EditPaymentModal
          isOpen
          onClose={() => setEditTarget(null)}
          onSaved={() => load()}
          payment={{
            id: editTarget.id,
            paymentDate: editTarget.paymentDate,
            description: editTarget.description,
            operatorId: editTarget.operatorId,
          }}
        />
      )}
    </ProcedureArchiveShell>
  );
}

'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ProcedureArchiveShell from '@/components/procedures/ProcedureArchiveShell';
import PaymentForm from '@/components/procedures/PaymentForm';
import { getServiceSaleTabs } from '@/components/procedures/configs/serviceSale';
import { formatDate, formatEuro } from '@/lib/club/servicePurchasesClient';
import { addPayment, fetchPurchase, type ServiceSalePurchase } from '@/lib/club/serviceSaleClient';

export default function PaymentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params?.id ?? '');

  const [purchase, setPurchase] = useState<ServiceSalePurchase | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await fetchPurchase(id);
      setPurchase(res.purchase);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSubmit(values: {
    amountPaid: number;
    paymentDate: string;
    notes: string;
    createReceipt: boolean;
    receiptNumber: string;
  }) {
    setError('');
    setSuccess('');

    if (purchase && values.amountPaid > purchase.rest) {
      setError('Payment exceeds remaining balance.');
      return;
    }

    setSaving(true);
    try {
      await addPayment(id, {
        amountPaid: values.amountPaid,
        paymentDate: values.paymentDate,
        notes: values.notes,
        createReceipt: values.createReceipt,
        receiptDocumentType: 'Invoice',
        receiptNumber: values.receiptNumber || undefined,
        receiptAnnotations: values.notes,
      });
      setSuccess('Payment saved successfully.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed');
    } finally {
      setSaving(false);
    }
  }

  if (!purchase && !error) {
    return <div className="p-6 text-gray-500">Loading...</div>;
  }

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <ProcedureArchiveShell
        title="Payment — Deadline"
        activeTab="deadline"
        tabs={getServiceSaleTabs('deadline', id)}
        error={!purchase ? error : undefined}
      >
        {purchase && (
          <>
            <div className="mb-6 p-4 bg-gray-50 rounded border text-sm space-y-1">
              <p><strong>Member:</strong> {purchase.memberName}</p>
              <p><strong>Typology:</strong> SERVICES</p>
              <p><strong>Service slot:</strong> {purchase.serviceName}</p>
              <p><strong>Section:</strong> {purchase.sectorName}</p>
              <p><strong>Date:</strong> {formatDate(purchase.paydate)}</p>
              <p><strong>Total cost:</strong> {formatEuro(purchase.value)}</p>
              <p><strong>Already paid:</strong> {formatEuro(purchase.pay)}</p>
              <p>
                <strong>Rest:</strong>{' '}
                <span className="text-red-600 font-semibold">{formatEuro(purchase.rest)}</span>
              </p>
            </div>

            <PaymentForm
              maxAmount={purchase.rest}
              disabled={purchase.rest <= 0}
              saving={saving}
              error={error}
              success={success}
              onSubmit={handleSubmit}
              onCancel={() => router.push('/clubs/dead_line')}
            />
          </>
        )}
      </ProcedureArchiveShell>
    </div>
  );
}

'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ServicePaymentForm, {
  type ServicePaymentSubmitValues,
} from '@/components/club/services/ServicePaymentForm';
import ProcedureArchiveShell from '@/components/procedures/ProcedureArchiveShell';
import { getServiceSaleTabs } from '@/components/procedures/configs/serviceSale';
import {
  addPayment,
  fetchFormOptions,
  fetchPaymentsForRecord,
  fetchPurchase,
  type ServiceSaleFormOptions,
  type ServiceSalePayment,
  type ServiceSalePurchase,
} from '@/lib/club/serviceSaleClient';

export default function PaymentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params?.id ?? '');

  const [purchase, setPurchase] = useState<ServiceSalePurchase | null>(null);
  const [payments, setPayments] = useState<ServiceSalePayment[]>([]);
  const [options, setOptions] = useState<ServiceSaleFormOptions | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = useCallback(async () => {
    try {
      const [purchaseRes, paymentsRes, formOptions] = await Promise.all([
        fetchPurchase(id),
        fetchPaymentsForRecord(id, { pageSize: 50 }),
        fetchFormOptions(),
      ]);
      setPurchase(purchaseRes.purchase);
      setPayments(paymentsRes.items);
      setOptions(formOptions);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSubmit(values: ServicePaymentSubmitValues) {
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
        description: values.description,
        payMode: values.payMode,
        paymentType: values.paymentType,
        taxDoc: values.taxDoc,
        operatorId: values.operatorId,
        operatorPassword: values.operatorPassword,
        debtTotal: values.debtTotal,
        debtExpire: values.debtExpire,
        payWith: values.payWith,
        taxDocument: values.taxDocument,
        createReceipt: values.createReceipt,
        receiptNumber: values.receiptNumber,
        receiptAnnotations: values.description,
      });
      setSuccess('Payment saved successfully.');
      await load();
      if (purchase && values.amountPaid >= purchase.rest) {
        setTimeout(() => router.push('/clubs/archive_service_list'), 1200);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed');
    } finally {
      setSaving(false);
    }
  }

  if ((!purchase || !options) && !error) {
    return <div className="p-6 text-gray-500">Loading...</div>;
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <ProcedureArchiveShell
        title="Payment — Deadline"
        activeTab="deadline"
        tabs={getServiceSaleTabs('deadline', id)}
        error={!purchase ? error : undefined}
      >
        {purchase && options && (
          <>
            <ServicePaymentForm
              purchase={purchase}
              payments={payments}
              options={options}
              procedureType="service_sale"
              saving={saving}
              error={error}
              success={success}
              onSubmit={handleSubmit}
              onCancel={() => router.push('/clubs/dead_line')}
            />

            {success && (
              <div className="mt-4 flex flex-wrap gap-3 text-sm">
                <button
                  type="button"
                  className="text-teal-700 underline"
                  onClick={() => router.push('/clubs/archive_service_list')}
                >
                  Services archive
                </button>
                <button
                  type="button"
                  className="text-teal-700 underline"
                  onClick={() => router.push('/clubs/dead_line')}
                >
                  Deadlines
                </button>
                <button
                  type="button"
                  className="text-teal-700 underline"
                  onClick={() => router.push('/clubs/service_payments')}
                >
                  Payments
                </button>
                <button
                  type="button"
                  className="text-teal-700 underline"
                  onClick={() => router.push('/clubs/service_receipts')}
                >
                  Receipts
                </button>
              </div>
            )}
          </>
        )}
      </ProcedureArchiveShell>
    </div>
  );
}

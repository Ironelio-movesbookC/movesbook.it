'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
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
  updatePurchase,
  type ServiceSaleFormOptions,
  type ServiceSalePayment,
  type ServiceSalePurchase,
} from '@/lib/club/serviceSaleClient';
import { updateInstallment } from '@/lib/club/archives/clubArchiveClient';
import { fetchOtherSettings } from '@/lib/club/otherSettingsClient';

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
  const [otherSettings, setOtherSettings] = useState<{ operatorPassStatus: string; calTaxStatus: boolean; notEnterCustData: boolean } | null>(null);
  const autoPaid = useRef(false);

  const load = useCallback(async () => {
    try {
      const [purchaseRes, paymentsRes, formOptions, settings] = await Promise.all([
        fetchPurchase(id),
        fetchPaymentsForRecord(id, { pageSize: 50 }),
        fetchFormOptions(),
        fetchOtherSettings().catch(() => ({ formPayDeadlineStatus: 'Yes', operatorPassStatus: 'Yes', calTaxStatus: false })),
      ]);
      setPurchase(purchaseRes.purchase);
      setPayments(paymentsRes.items);
      setOptions(formOptions);
      setOtherSettings({ operatorPassStatus: settings.operatorPassStatus, calTaxStatus: settings.calTaxStatus, notEnterCustData: settings.notEnterCustData });

      if (settings.formPayDeadlineStatus === 'No' && purchaseRes.purchase.rest > 0 && !autoPaid.current) {
        autoPaid.current = true;
        const defaultOperatorId = formOptions.currentOperatorId ?? formOptions.operators[0]?.id;
        if (defaultOperatorId) {
          await addPayment(id, {
            amountPaid: purchaseRes.purchase.rest,
            paymentDate: new Date().toISOString().slice(0, 10),
            description: 'Auto-payment (deadline form disabled)',
            payMode: 'cash',
            operatorId: defaultOperatorId,
            createReceipt: false,
          });
          const reloaded = await fetchPurchase(id);
          setPurchase(reloaded.purchase);
          setSuccess(`Payment fully auto-settled (€${purchaseRes.purchase.rest.toFixed(2)}). Debt set to €0.`);
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleAddToRecordTotal(additionalAmount: number): Promise<void> {
    if (!purchase) return;
    const newTotal = purchase.value + additionalAmount;
    await updatePurchase(id, { totalAmount: newTotal });
    setPurchase((prev) => prev ? { ...prev, value: newTotal, rest: prev.rest + additionalAmount } : prev);
  }

  async function handleSubmit(values: ServicePaymentSubmitValues) {
    setError('');
    setSuccess('');

    setSaving(true);
    try {
      const totalDistributed = values.distributions.reduce((s, d) => s + d.amount, 0);
      if (totalDistributed <= 0) {
        setError('No amount to distribute.');
        return;
      }

      for (const dist of values.distributions) {
        if (dist.amount <= 0) continue;
        await addPayment(id, {
          amountPaid: dist.amount,
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
        await updateInstallment('service_sale', id, dist.installmentId, {
          paid: dist.newPaid,
          balance: dist.newBalance,
        });
      }
      setSuccess('Payment saved successfully.');
      await load();
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
        onAddToRecordTotal={handleAddToRecordTotal}
        operatorPassStatus={otherSettings?.operatorPassStatus ?? 'Yes'}
        notEnterCustData={otherSettings?.notEnterCustData ?? false}
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

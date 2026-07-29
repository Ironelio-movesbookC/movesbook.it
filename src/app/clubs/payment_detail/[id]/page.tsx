'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
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

function PaymentDetailPageInner() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = String(params?.id ?? '');

  const extraIds = useMemo(() => {
    const raw = searchParams.get('ids') ?? '';
    return raw
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s && s !== id);
  }, [searchParams, id]);

  const [purchase, setPurchase] = useState<ServiceSalePurchase | null>(null);
  const [extraPurchases, setExtraPurchases] = useState<ServiceSalePurchase[]>([]);
  const [payments, setPayments] = useState<ServiceSalePayment[]>([]);
  const [options, setOptions] = useState<ServiceSaleFormOptions | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [otherSettings, setOtherSettings] = useState<{
    operatorPassStatus: string;
    calTaxStatus: boolean;
    notEnterCustData: boolean;
  } | null>(null);
  const autoPaid = useRef(false);

  const load = useCallback(async () => {
    try {
      const [purchaseRes, paymentsRes, formOptions, settings, extras] = await Promise.all([
        fetchPurchase(id),
        fetchPaymentsForRecord(id, { pageSize: 50 }),
        fetchFormOptions(),
        fetchOtherSettings().catch(() => ({
          formPayDeadlineStatus: 'Yes',
          operatorPassStatus: 'Yes',
          calTaxStatus: false,
          notEnterCustData: false,
        })),
        Promise.all(
          extraIds.map(async (extraId) => {
            const res = await fetchPurchase(extraId);
            return res.purchase;
          })
        ),
      ]);

      const primary = purchaseRes.purchase;
      const validExtras = extras.filter(
        (p) => p.userId === primary.userId && p.rest > 0 && p.id !== primary.id
      );

      setPurchase(primary);
      setExtraPurchases(validExtras);
      setPayments(paymentsRes.items);
      setOptions(formOptions);
      setOtherSettings({
        operatorPassStatus: settings.operatorPassStatus,
        calTaxStatus: settings.calTaxStatus,
        notEnterCustData: settings.notEnterCustData ?? false,
      });

      if (
        settings.formPayDeadlineStatus === 'No' &&
        primary.rest > 0 &&
        validExtras.length === 0 &&
        !autoPaid.current
      ) {
        autoPaid.current = true;
        const defaultOperatorId = formOptions.currentOperatorId ?? formOptions.operators[0]?.id;
        if (defaultOperatorId) {
          await addPayment(id, {
            amountPaid: primary.rest,
            paymentDate: new Date().toISOString().slice(0, 10),
            description: 'Auto-payment (deadline form disabled)',
            payMode: 'cash',
            operatorId: defaultOperatorId,
            createReceipt: false,
          });
          const reloaded = await fetchPurchase(id);
          setPurchase(reloaded.purchase);
          setSuccess(`Payment fully auto-settled (€${primary.rest.toFixed(2)}). Debt set to €0.`);
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    }
  }, [id, extraIds]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleAddToRecordTotal(additionalAmount: number): Promise<void> {
    if (!purchase) return;
    const newTotal = purchase.value + additionalAmount;
    await updatePurchase(id, { totalAmount: newTotal });
    setPurchase((prev) =>
      prev ? { ...prev, value: newTotal, rest: prev.rest + additionalAmount } : prev
    );
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

      if (values.multiRecord) {
        let receiptCreated = false;
        for (const dist of values.distributions) {
          if (dist.amount <= 0) continue;
          const recordId = dist.recordId ?? dist.installmentId;
          const makeReceipt = Boolean(values.createReceipt || values.taxDoc) && !receiptCreated;
          await addPayment(recordId, {
            amountPaid: dist.amount,
            paymentDate: values.paymentDate,
            description: values.description,
            payMode: values.payMode,
            paymentType: values.paymentType,
            taxDoc: makeReceipt ? values.taxDoc : false,
            operatorId: values.operatorId,
            operatorPassword: values.operatorPassword,
            debtTotal: values.debtTotal,
            debtExpire: values.debtExpire,
            payWith: values.payWith,
            taxDocument: makeReceipt ? values.taxDocument : undefined,
            createReceipt: makeReceipt,
            receiptNumber: makeReceipt ? values.receiptNumber : undefined,
            receiptAnnotations: makeReceipt ? values.description : undefined,
          });
          if (makeReceipt) receiptCreated = true;
        }
      } else {
        let receiptCreated = false;
        for (const dist of values.distributions) {
          if (dist.amount <= 0) continue;
          const makeReceipt = Boolean(values.createReceipt || values.taxDoc) && !receiptCreated;
          await addPayment(id, {
            amountPaid: dist.amount,
            paymentDate: values.paymentDate,
            description: values.description,
            payMode: values.payMode,
            paymentType: values.paymentType,
            taxDoc: makeReceipt ? values.taxDoc : false,
            operatorId: values.operatorId,
            operatorPassword: values.operatorPassword,
            debtTotal: values.debtTotal,
            debtExpire: values.debtExpire,
            payWith: values.payWith,
            taxDocument: makeReceipt ? values.taxDocument : undefined,
            createReceipt: makeReceipt,
            receiptNumber: makeReceipt ? values.receiptNumber : undefined,
            receiptAnnotations: makeReceipt ? values.description : undefined,
          });
          if (makeReceipt) receiptCreated = true;
          if (dist.installmentId !== 'current') {
            await updateInstallment('service_sale', id, dist.installmentId, {
              paid: dist.newPaid,
              balance: dist.newBalance,
            });
          }
        }
      }
      setSuccess(
        values.multiRecord
          ? 'Payments saved across selected deadlines.'
          : 'Payment saved successfully.'
      );
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
        title={
          extraPurchases.length > 0 ? 'Payment — More deadlines' : 'Payment — Deadline'
        }
        activeTab="deadline"
        tabs={getServiceSaleTabs('deadline', id)}
        error={!purchase ? error : undefined}
      >
        {purchase && options && (
          <>
            <ServicePaymentForm
              purchase={purchase}
              extraPurchases={extraPurchases}
              payments={payments}
              options={options}
              procedureType="service_sale"
              saving={saving}
              error={error}
              success={success}
              onSubmit={handleSubmit}
              onCancel={() => router.push('/clubs/dead_line')}
              onAddToRecordTotal={
                extraPurchases.length > 0 ? undefined : handleAddToRecordTotal
              }
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

export default function PaymentDetailPage() {
  return (
    <Suspense fallback={<div className="p-6 text-gray-500">Loading...</div>}>
      <PaymentDetailPageInner />
    </Suspense>
  );
}

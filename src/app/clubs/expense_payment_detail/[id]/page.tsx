'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ServicePaymentForm, {
  type ServicePaymentSubmitValues,
} from '@/components/club/services/ServicePaymentForm';
import ProcedureArchiveShell from '@/components/procedures/ProcedureArchiveShell';
import { createProcedureClient } from '@/lib/club/procedureClient';
import { getProcedureTabs } from '@/lib/procedures/registry';
import { PROCEDURE_TYPE_CODES } from '@/lib/procedures/types';
import type { ServiceSaleFormOptions, ServiceSalePayment, ServiceSalePurchase } from '@/lib/club/serviceSaleClient';

export default function ExpensePaymentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params?.id ?? '');
  const client = createProcedureClient(PROCEDURE_TYPE_CODES.EXPENSE);

  const [purchase, setPurchase] = useState<ServiceSalePurchase | null>(null);
  const [payments, setPayments] = useState<ServiceSalePayment[]>([]);
  const [options, setOptions] = useState<ServiceSaleFormOptions | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = useCallback(async () => {
    const [purchaseRes, paymentsRes, formOptions] = await Promise.all([
      client.fetchRecord(id),
      client.fetchPayments({ recordId: id, pageSize: 50 }),
      client.fetchFormOptions<ServiceSaleFormOptions>(),
    ]);
    const r = purchaseRes.record;
    setPurchase({
      id: r.id,
      userId: r.userId,
      memberName: r.memberName,
      memberImage: null,
      typology: r.typology,
      sectorName: r.secondaryLabel || '-',
      serviceName: r.primaryLabel,
      paydate: r.paydate,
      value: r.value,
      pay: r.pay,
      rest: r.rest,
      notes: r.notes,
      operatorId: r.operatorId,
      operatorName: r.operatorName,
      lastPaymentDate: r.lastPaymentDate,
    });
    setPayments(
      paymentsRes.items.map((p) => ({
        id: p.id,
        spId: p.recordId,
        memberName: p.memberName,
        typology: p.typology,
        serviceName: p.primaryLabel,
        paymentDate: p.paymentDate,
        paid: p.paid,
        balance: p.balance,
        originalDebt: p.originalDebt ?? 0,
        residualDebt: p.residualDebt ?? 0,
        description: p.description,
        operatorId: p.operatorId,
        operatorName: p.operatorName,
      }))
    );
    setOptions(formOptions);
  }, [client, id]);

  useEffect(() => {
    load().catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'));
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
      await client.addPayment(id, {
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
        serviceName: purchase?.serviceName,
      });
      setSuccess('Payment saved.');
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
        title="Payment — Expense"
        activeTab="deadlines"
        tabs={getProcedureTabs(PROCEDURE_TYPE_CODES.EXPENSE, 'deadlines', id)}
        error={!purchase ? error : undefined}
      >
        {purchase && options && (
          <ServicePaymentForm
            purchase={purchase}
            payments={payments}
            options={options}
            procedureType="expense"
            saving={saving}
            error={error}
            success={success}
            onSubmit={handleSubmit}
            onCancel={() => router.push('/clubs/expense_dead_line')}
          />
        )}
      </ProcedureArchiveShell>
    </div>
  );
}

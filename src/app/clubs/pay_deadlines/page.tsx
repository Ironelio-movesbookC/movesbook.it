'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ServicePaymentForm, {
  type ServicePaymentSubmitValues,
} from '@/components/club/services/ServicePaymentForm';
import ProcedureArchiveShell from '@/components/procedures/ProcedureArchiveShell';
import { createProcedureClient, type ProcedureRecordView } from '@/lib/club/procedureClient';
import type { ProcedureTypeCode } from '@/lib/procedures/types';
import type { ServiceSaleFormOptions, ServiceSalePurchase } from '@/lib/club/serviceSaleClient';
import { fetchOtherSettings } from '@/lib/club/otherSettingsClient';

function mapPurchase(r: ProcedureRecordView): ServiceSalePurchase {
  return {
    id: r.id,
    userId: r.userId,
    memberName: r.memberName,
    memberImage: r.memberImage,
    typology: r.typology,
    sectorName: r.secondaryLabel || r.typology,
    serviceName: r.primaryLabel,
    paydate: r.paydate,
    createdAt: null,
    value: r.value,
    pay: r.pay,
    rest: r.rest,
    notes: r.notes,
    operatorId: r.operatorId,
    operatorName: r.operatorName,
    lastPaymentDate: r.lastPaymentDate,
  };
}

function parseIdsAndTypes(
  idsParam: string | null,
  typesParam: string | null
): { id: string; type: ProcedureTypeCode }[] {
  const ids = (idsParam || '').split(',').map((s) => s.trim()).filter(Boolean);
  const types = (typesParam || '').split(',').map((s) => s.trim()).filter(Boolean);
  const rows: { id: string; type: ProcedureTypeCode }[] = [];
  const seen = new Set<string>();
  ids.forEach((id, i) => {
    const type = types[i] as ProcedureTypeCode | undefined;
    if (!id || !type || seen.has(id)) return;
    seen.add(id);
    rows.push({ id, type });
  });
  return rows;
}

function PayDeadlinesPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const entries = useMemo(
    () => parseIdsAndTypes(searchParams.get('ids'), searchParams.get('types')),
    [searchParams]
  );
  const typeById = useMemo(() => {
    const map = new Map<string, ProcedureTypeCode>();
    entries.forEach((e) => map.set(e.id, e.type));
    return map;
  }, [entries]);

  const [purchases, setPurchases] = useState<ServiceSalePurchase[]>([]);
  const [options, setOptions] = useState<ServiceSaleFormOptions | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [otherSettings, setOtherSettings] = useState<{ operatorPassStatus: string } | null>(null);

  const purchase = purchases[0] ?? null;
  const extraPurchases = purchases.slice(1);

  const load = useCallback(async () => {
    if (entries.length < 2) {
      throw new Error('Select at least two deadlines to pay together.');
    }
    const records = await Promise.all(
      entries.map(({ id, type }) => createProcedureClient(type).fetchRecord(id))
    );
    const mapped = records.map((res) => mapPurchase(res.record));

    const memberIds = new Set(mapped.map((p) => p.userId));
    if (memberIds.size > 1) {
      throw new Error('Selected deadlines belong to different members.');
    }

    setPurchases(mapped);

    const primaryType = entries[0].type;
    const [formOptions, settings] = await Promise.all([
      createProcedureClient(primaryType).fetchFormOptions<{
        members: { id: string; name: string }[];
        operators: { id: string; name: string }[];
        currentOperatorId: string | null;
      }>(),
      fetchOtherSettings().catch(() => ({
        formPayDeadlineStatus: 'Yes',
        operatorPassStatus: 'Yes',
        calTaxStatus: false,
        notEnterCustData: false,
      })),
    ]);
    setOptions({
      sectors: [],
      services: [],
      members: formOptions.members ?? [],
      operators: formOptions.operators ?? [],
      currentOperatorId: formOptions.currentOperatorId ?? null,
    });
    setOtherSettings({ operatorPassStatus: settings.operatorPassStatus });
  }, [entries]);

  useEffect(() => {
    load().catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'));
  }, [load]);

  async function handleSubmit(values: ServicePaymentSubmitValues) {
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      let receiptCreated = false;
      for (const dist of values.distributions) {
        if (dist.amount <= 0) continue;
        const recordId = dist.recordId ?? dist.installmentId;
        const type = typeById.get(recordId);
        if (!type) continue;
        const makeReceipt = Boolean(values.createReceipt) && !receiptCreated;
        await createProcedureClient(type).addPayment(recordId, {
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
          receiptDocumentType: makeReceipt ? values.receiptDocumentType : undefined,
          serviceName: purchases.find((p) => p.id === recordId)?.serviceName,
        });
        if (makeReceipt) receiptCreated = true;
      }
      setSuccess('Payments saved across selected deadlines.');
      router.push('/clubs/dead_line');
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
        title="Payment — Multiple deadlines"
        activeTab=""
        tabs={[]}
        error={!purchase ? error : undefined}
      >
        {purchase && options && (
          <ServicePaymentForm
            purchase={purchase}
            extraPurchases={extraPurchases}
            payments={[]}
            options={options}
            procedureType={entries[0]?.type ?? 'service_sale'}
            saving={saving}
            error={error}
            success={success}
            onSubmit={handleSubmit}
            onCancel={() => router.push('/clubs/dead_line')}
            operatorPassStatus={otherSettings?.operatorPassStatus ?? 'Yes'}
          />
        )}
      </ProcedureArchiveShell>
    </div>
  );
}

export default function PayDeadlinesPage() {
  return (
    <Suspense fallback={<div className="p-6 text-gray-500">Loading...</div>}>
      <PayDeadlinesPageInner />
    </Suspense>
  );
}

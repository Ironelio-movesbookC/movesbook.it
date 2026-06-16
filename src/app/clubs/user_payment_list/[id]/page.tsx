'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import ServiceArchiveTabs from '@/components/club/services/ServiceArchiveTabs';
import ServiceDataTable from '@/components/club/services/ServiceDataTable';
import { Member, Column } from '@/types/clubTable';
import { clubApiFetch, formatDate, formatEuro } from '@/lib/club/servicePurchasesClient';

type Payment = {
  id: string;
  spId: string;
  memberName: string;
  typology: string;
  serviceName: string;
  paymentDate: string | null;
  paid: number;
  balance: number;
  description: string;
  operatorName: string;
};

const columns: Column[] = [
  { key: 'name', header: 'Full Name' },
  { key: 'typology', header: 'Typology' },
  { key: 'service', header: 'Service slot' },
  { key: 'insertDate', header: 'Date', render: (v) => formatDate(v) },
  { key: 'paid', header: 'Payment IN', render: (v) => formatEuro(v) },
  { key: 'rest', header: 'Rest after', render: (v) => formatEuro(v) },
  { key: 'casual', header: 'Notes' },
  { key: 'operator', header: 'Operator' },
];

export default function UserPaymentListPage() {
  const params = useParams();
  const spId = String(params?.id ?? '');

  const [data, setData] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await clubApiFetch<{ payments: Payment[] }>(
        `/api/club/services/payments?spId=${spId}`
      );
      setData(
        res.payments.map((p) => ({
          id: p.id,
          name: p.memberName,
          typology: p.typology,
          service: p.serviceName,
          insertDate: p.paymentDate ?? undefined,
          paid: p.paid,
          rest: p.balance,
          casual: p.description,
          operator: p.operatorName,
        }))
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [spId]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="p-4">
      <div className="bg-teal-800 text-white px-4 py-3 rounded-t-lg">
        <h1 className="text-lg font-semibold">Payments for service #{spId}</h1>
      </div>
      <div className="bg-white border border-gray-200 rounded-b-lg p-4">
        <ServiceArchiveTabs active="payments" selectedPurchaseId={spId} />
        {error && <p className="text-red-600 text-sm mb-2">{error}</p>}
        <ServiceDataTable columns={columns} rows={data} loading={loading} />
      </div>
    </div>
  );
}

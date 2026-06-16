'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ServiceArchiveTabs from '@/components/club/services/ServiceArchiveTabs';
import ServiceDataTable from '@/components/club/services/ServiceDataTable';
import { Member, Column } from '@/types/clubTable';
import { clubApiFetch, formatDate, formatEuro } from '@/lib/club/servicePurchasesClient';

type Purchase = {
  id: string;
  memberName: string;
  typology: string;
  sectorName: string;
  serviceName: string;
  paydate: string | null;
  value: number;
  pay: number;
  rest: number;
  notes: string;
  operatorName: string;
  lastPaymentDate: string | null;
};

const columns: Column[] = [
  { key: 'name', header: 'Full Name' },
  { key: 'typology', header: 'Typology' },
  { key: 'service', header: 'Service slot' },
  { key: 'insertDate', header: 'Date', render: (v) => formatDate(v) },
  { key: 'value', header: 'Cost', render: (v) => formatEuro(v) },
  { key: 'paid', header: 'Paid', render: (v) => formatEuro(v) },
  { key: 'rest', header: 'Rest', render: (v) => formatEuro(v) },
  { key: 'dateEnd', header: 'Last payment', render: (v) => formatDate(v) },
  { key: 'casual', header: 'Notes' },
  { key: 'operator', header: 'Operator' },
];

export default function DeadLinePage() {
  const router = useRouter();
  const [data, setData] = useState<Member[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await clubApiFetch<{ purchases: Purchase[] }>(
        '/api/club/services/purchases?view=deadlines'
      );
      setData(
        res.purchases.map((p) => ({
          id: p.id,
          name: p.memberName,
          typology: p.typology,
          service: p.serviceName,
          course: p.sectorName,
          insertDate: p.paydate ?? undefined,
          value: p.value,
          paid: p.pay,
          rest: p.rest,
          casual: p.notes,
          operator: p.operatorName,
          dateEnd: p.lastPaymentDate ?? undefined,
        }))
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="p-4">
      <div className="bg-teal-800 text-white px-4 py-3 rounded-t-lg">
        <h1 className="text-lg font-semibold">Archive of Deadlines</h1>
      </div>
      <div className="bg-white border border-gray-200 rounded-b-lg p-4">
        <ServiceArchiveTabs active="deadline" selectedPurchaseId={selectedId} />
        {error && <p className="text-red-600 text-sm mb-2">{error}</p>}
        <ServiceDataTable
          columns={columns}
          rows={data}
          selectedId={selectedId}
          loading={loading}
          onRowClick={(row) => row.id && setSelectedId(row.id)}
          onRowDoubleClick={(row) => row.id && router.push(`/clubs/payment_detail/${row.id}`)}
        />
        <p className="text-xs text-gray-500 mt-2">
          Shows services with remaining balance. Double-click to record a payment.
        </p>
      </div>
    </div>
  );
}

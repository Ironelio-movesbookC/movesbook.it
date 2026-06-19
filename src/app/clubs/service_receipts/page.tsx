'use client';

import { useCallback, useEffect, useState } from 'react';
import ServiceArchiveTabs from '@/components/club/services/ServiceArchiveTabs';
import ServiceDataTable from '@/components/club/services/ServiceDataTable';
import { Member, Column } from '@/types/clubTable';
import { formatDate, formatEuro } from '@/lib/club/servicePurchasesClient';
import { fetchReceipts } from '@/lib/club/serviceSaleClient';

const columns: Column[] = [
  { key: 'name', header: 'Full Name' },
  { key: 'typology', header: 'Typology' },
  { key: 'service', header: 'Service slot' },
  { key: 'insertDate', header: 'Date', render: (v) => formatDate(v) },
  { key: 'category', header: 'Document' },
  { key: 'contract', header: 'No. of document' },
  { key: 'value', header: 'Cost', render: (v) => formatEuro(v) },
  { key: 'paid', header: 'Payment IN', render: (v) => formatEuro(v) },
  { key: 'casual', header: 'Annotations' },
  { key: 'operator', header: 'Operator' },
];

export default function ServiceReceiptsPage() {
  const [data, setData] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchReceipts();
      setData(
        res.receipts.map((r) => ({
          id: r.id,
          name: r.memberName,
          typology: r.typology,
          service: r.serviceName,
          insertDate: r.receiptDate ?? undefined,
          category: r.documentType,
          contract: r.documentNumber,
          value: r.cost,
          paid: r.paymentIn,
          casual: r.annotations,
          operator: r.operatorName,
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
        <h1 className="text-lg font-semibold">Archive of Receipts</h1>
      </div>
      <div className="bg-white border border-gray-200 rounded-b-lg p-4">
        <ServiceArchiveTabs active="receipts" />
        {error && <p className="text-red-600 text-sm mb-2">{error}</p>}
        <ServiceDataTable columns={columns} rows={data} loading={loading} />
      </div>
    </div>
  );
}

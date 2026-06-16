'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ServiceArchiveTabs from '@/components/club/services/ServiceArchiveTabs';
import ServiceDataTable from '@/components/club/services/ServiceDataTable';
import { Member, Column } from '@/types/clubTable';
import { clubApiFetch, formatDate, formatEuro } from '@/lib/club/servicePurchasesClient';
import { Trash2 } from 'lucide-react';

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

function mapPurchase(p: Purchase, i: number, onDelete: (id: string) => void): Member {
  return {
    id: p.id,
    number: i + 1,
    name: p.memberName,
    typology: p.typology,
    course: p.sectorName,
    service: p.serviceName,
    insertDate: p.paydate ?? undefined,
    value: p.value,
    paid: p.pay,
    rest: p.rest,
    casual: p.notes,
    operator: p.operatorName,
    dateEnd: p.lastPaymentDate ?? undefined,
    options: (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(p.id);
        }}
        className="text-red-500 hover:text-red-700"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    ),
  };
}

const columns: Column[] = [
  { key: 'number', header: 'N' },
  { key: 'name', header: 'Full Name' },
  { key: 'typology', header: 'Typology' },
  { key: 'service', header: 'Service slot' },
  { key: 'course', header: 'Section' },
  { key: 'insertDate', header: 'Date', render: (v) => formatDate(v) },
  { key: 'value', header: 'Cost', render: (v) => formatEuro(v) },
  { key: 'paid', header: 'Paid', render: (v) => formatEuro(v) },
  { key: 'dateEnd', header: 'Last payment', render: (v) => formatDate(v) },
  { key: 'casual', header: 'Notes' },
  { key: 'operator', header: 'Operator' },
  { key: 'options', header: 'Delete' },
];

export default function ArchiveServiceListPage() {
  const router = useRouter();
  const [data, setData] = useState<Member[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await clubApiFetch<{ purchases: Purchase[] }>('/api/club/services/purchases');
      setData(
        res.purchases.map((p, i) =>
          mapPurchase(p, i, async (id) => {
            if (!confirm('Delete this service record?')) return;
            try {
              await clubApiFetch(`/api/club/services/purchases?id=${id}`, { method: 'DELETE' });
              load();
            } catch (e) {
              alert(e instanceof Error ? e.message : 'Delete failed');
            }
          })
        )
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
      <div className="flex justify-between items-center bg-teal-800 text-white px-4 py-3 rounded-t-lg">
        <h1 className="text-lg font-semibold">Archive of Services</h1>
        <button
          type="button"
          onClick={() => router.push('/clubs/new_moment_cash')}
          className="text-sm bg-white text-teal-800 px-3 py-1 rounded hover:bg-teal-50"
        >
          + New service
        </button>
      </div>
      <div className="bg-white border border-gray-200 rounded-b-lg p-4">
        <ServiceArchiveTabs active="historical" selectedPurchaseId={selectedId} />
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
          Click to select · Double-click to open payment form for partial payments
        </p>
      </div>
    </div>
  );
}

'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import ProcedureArchiveShell from '@/components/procedures/ProcedureArchiveShell';
import ProcedureArchiveTable from '@/components/procedures/ProcedureArchiveTable';
import ProcedurePagination from '@/components/procedures/ProcedurePagination';
import {
  getServiceSaleTabs,
  SERVICE_SALE_PAGE_SIZE,
  serviceSaleRecordColumns,
} from '@/components/procedures/configs/serviceSale';
import { Member } from '@/types/clubTable';
import {
  deletePurchase,
  fetchPurchases,
  type ServiceSalePurchase,
} from '@/lib/club/serviceSaleClient';

function mapPurchase(p: ServiceSalePurchase, i: number, onDelete: (id: string) => void): Member {
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

export default function ArchiveServiceListPage() {
  const router = useRouter();
  const [data, setData] = useState<Member[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchPurchases({ page, pageSize: SERVICE_SALE_PAGE_SIZE });
      setTotal(res.total);
      setData(
        res.items.map((p, i) =>
          mapPurchase(p, (page - 1) * SERVICE_SALE_PAGE_SIZE + i, async (id) => {
            if (!confirm('Delete this service record?')) return;
            try {
              await deletePurchase(id);
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
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <ProcedureArchiveShell
      title="Archive of Services"
      activeTab="historical"
      tabs={getServiceSaleTabs('historical', selectedId)}
      headerAction={
        <button
          type="button"
          onClick={() => router.push('/clubs/new_moment_cash')}
          className="text-sm bg-white text-teal-800 px-3 py-1 rounded hover:bg-teal-50"
        >
          + New service
        </button>
      }
      error={error}
      footerHint="Click to select · Double-click to open payment form for partial payments"
      pagination={
        <ProcedurePagination
          page={page}
          pageSize={SERVICE_SALE_PAGE_SIZE}
          total={total}
          onPageChange={setPage}
        />
      }
    >
      <ProcedureArchiveTable
        columns={serviceSaleRecordColumns}
        rows={data}
        selectedId={selectedId}
        loading={loading}
        onRowClick={(row) => row.id && setSelectedId(row.id)}
        onRowDoubleClick={(row) => row.id && router.push(`/clubs/payment_detail/${row.id}`)}
      />
    </ProcedureArchiveShell>
  );
}

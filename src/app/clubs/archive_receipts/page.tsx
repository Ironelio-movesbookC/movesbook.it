'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import ProcedureArchiveShell from '@/components/procedures/ProcedureArchiveShell';
import ProcedureArchiveTable from '@/components/procedures/ProcedureArchiveTable';
import ProcedurePagination from '@/components/procedures/ProcedurePagination';
import TaxDocumentModal, {
  type TaxDocumentFormValues,
} from '@/components/procedures/TaxDocumentModal';
import type { ProcedureTab } from '@/components/procedures/types';
import { fetchClubArchive } from '@/lib/club/archives/clubArchiveClient';
import { clubApiFetch, formatDate, formatEuro } from '@/lib/club/servicePurchasesClient';
import type { Column, Member } from '@/types/clubTable';

const PAGE_SIZE = 25;

const columns: Column[] = [
  { key: 'name', header: 'Full Name' },
  { key: 'typology', header: 'Typology' },
  { key: 'service', header: 'Detail' },
  { key: 'insertDate', header: 'Date', render: (v) => formatDate(v) },
  { key: 'category', header: 'Document' },
  { key: 'contract', header: 'No. of document' },
  { key: 'value', header: 'Cost', render: (v) => formatEuro(v) },
  { key: 'paid', header: 'Payment IN', render: (v) => formatEuro(v) },
  { key: 'casual', header: 'Annotations' },
  { key: 'operator', header: 'Operator' },
];

const tabs: ProcedureTab[] = [
  { id: 'deadlines', label: 'Archive of Deadlines', href: '/clubs/archive_deadlines' },
  { id: 'payments', label: 'Archive of Payments', href: '/clubs/archive_payments' },
  { id: 'receipts', label: 'Archive of Receipts', href: '/clubs/archive_receipts' },
];

function ArchiveReceiptsPageInner() {
  const searchParams = useSearchParams();
  const memberId = searchParams.get('memberId');

  const [scope, setScope] = useState<'member' | 'all'>(memberId ? 'member' : 'all');
  const [data, setData] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [taxTarget, setTaxTarget] = useState<Member | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchClubArchive('receipts', {
        page,
        pageSize: PAGE_SIZE,
        memberId: scope === 'member' && memberId ? memberId : undefined,
      });
      setTotal(res.total);
      setData(res.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [page, scope, memberId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSaveTaxDocument = useCallback(
    async (values: TaxDocumentFormValues) => {
      if (!taxTarget?.id || !taxTarget.procedureType) {
        throw new Error('Receipt type is missing');
      }
      await clubApiFetch(
        `/api/club/procedures/${encodeURIComponent(taxTarget.procedureType)}/receipts/${encodeURIComponent(taxTarget.id)}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            documentType: values.documentType || undefined,
            documentNumber: values.documentNumber || undefined,
            annotations: values.causal || undefined,
          }),
        }
      );
      await load();
    },
    [taxTarget, load]
  );

  return (
    <ProcedureArchiveShell
      title="Archive of Receipts"
      activeTab="receipts"
      tabs={tabs}
      tabsTrailing={
        memberId ? (
          <div className="flex items-center gap-4 text-sm text-gray-700">
            <label className="inline-flex items-center gap-2 cursor-pointer select-none">
              <input
                type="radio"
                name="receiptsScope"
                checked={scope === 'member'}
                onChange={() => {
                  setScope('member');
                  setPage(1);
                }}
              />
              Member selected
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer select-none">
              <input
                type="radio"
                name="receiptsScope"
                checked={scope === 'all'}
                onChange={() => {
                  setScope('all');
                  setPage(1);
                }}
              />
              All members
            </label>
          </div>
        ) : undefined
      }
      error={error}
      footerHint="All typologies (Services, Products, Expenses, Member debts, …). Double-click a row to open the receipt."
      pagination={
        <ProcedurePagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
      }
    >
      <ProcedureArchiveTable
        columns={columns}
        rows={data}
        loading={loading}
        onRowDoubleClick={(row) => {
          if (row.id) setTaxTarget(row);
        }}
      />

      {taxTarget && (
        <TaxDocumentModal
          open
          memberName={String(taxTarget.name ?? '')}
          defaultCausal={String(taxTarget.casual ?? '')}
          defaultTotal={Number(taxTarget.paid ?? 0)}
          defaultResidual={Number(taxTarget.residualDebt ?? 0)}
          saveLabel="Save document"
          initial={{
            documentType: String(taxTarget.category ?? 'Tax receipt'),
            documentNumber: String(taxTarget.contract ?? ''),
            documentDate:
              typeof taxTarget.insertDate === 'string'
                ? taxTarget.insertDate
                : taxTarget.insertDate
                  ? new Date(taxTarget.insertDate).toISOString().slice(0, 10)
                  : undefined,
            causal: String(taxTarget.casual ?? ''),
            total: Number(taxTarget.paid ?? 0),
            residualTotal: Number(taxTarget.residualDebt ?? 0),
            memberDisplayName: String(taxTarget.name ?? ''),
            originalMemberName: String(taxTarget.name ?? ''),
            memberAlias: String(taxTarget.name ?? ''),
          }}
          onClose={() => setTaxTarget(null)}
          onSave={handleSaveTaxDocument}
        />
      )}
    </ProcedureArchiveShell>
  );
}

export default function ArchiveReceiptsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-gray-500">Loading...</div>}>
      <ArchiveReceiptsPageInner />
    </Suspense>
  );
}

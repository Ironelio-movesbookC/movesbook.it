'use client';

import ProcedureArchiveShell from '@/components/procedures/ProcedureArchiveShell';
import ProcedureArchiveTable from '@/components/procedures/ProcedureArchiveTable';

export default function MovementCashOutPage() {
  return (
    <ProcedureArchiveShell
      title="Cash Out"
      activeTab=""
      tabs={[]}
      footerHint="Cash out movements will appear here when expense and payout procedures are added."
    >
      <ProcedureArchiveTable
        columns={[
          { key: 'name', header: 'Full Name' },
          { key: 'insertDate', header: 'Date' },
          { key: 'paid', header: 'Value Out' },
          { key: 'operator', header: 'Operator' },
          { key: 'casual', header: 'Notes' },
        ]}
        rows={[]}
        emptyMessage="No cash out movements yet."
      />
    </ProcedureArchiveShell>
  );
}

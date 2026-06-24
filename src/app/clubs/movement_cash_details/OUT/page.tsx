'use client';

import ClubArchivePage from '@/components/club/archives/ClubArchivePage';
import type { Column } from '@/types/clubTable';

const columns: Column[] = [
  { key: 'name', header: 'Member' },
  { key: 'typology', header: 'Typology' },
  { key: 'service', header: 'Service / Expense' },
  { key: 'insertDate', header: 'Date' },
  { key: 'paid', header: 'Amount' },
  { key: 'direction', header: 'Direction' },
  { key: 'payMod', header: 'Pay mode' },
  { key: 'operator', header: 'Operator' },
  { key: 'casual', header: 'Notes' },
];

export default function MovementCashOutPage() {
  return (
    <div className="p-4">
      <ClubArchivePage
        title="Cash Out"
        archiveType="cash-movements"
        direction="OUT"
        columns={columns}
        footerHint="Outgoing payments from member expense procedures."
        emptyMessage="No cash out movements yet."
      />
    </div>
  );
}

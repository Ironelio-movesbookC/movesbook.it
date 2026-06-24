'use client';

import ClubArchivePage from '@/components/club/archives/ClubArchivePage';
import type { Column } from '@/types/clubTable';

const columns: Column[] = [
  { key: 'name', header: 'Member' },
  { key: 'typology', header: 'Typology' },
  { key: 'service', header: 'Service / Product' },
  { key: 'insertDate', header: 'Date' },
  { key: 'paid', header: 'Amount IN' },
  { key: 'payMod', header: 'Pay mode' },
  { key: 'operator', header: 'Operator' },
  { key: 'casual', header: 'Notes' },
];

export default function MovementCashInPage() {
  return (
    <div className="p-4">
      <ClubArchivePage
        title="Cash In"
        archiveType="cash-movements"
        direction="IN"
        columns={columns}
        footerHint="Incoming payments from service and product sales."
      />
    </div>
  );
}

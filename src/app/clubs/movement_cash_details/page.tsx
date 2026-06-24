'use client';

import ClubArchivePage from '@/components/club/archives/ClubArchivePage';
import type { Column } from '@/types/clubTable';

const columns: Column[] = [
  { key: 'name', header: 'Member' },
  { key: 'typology', header: 'Typology' },
  { key: 'service', header: 'Service / Product' },
  { key: 'insertDate', header: 'Date' },
  { key: 'paid', header: 'Amount' },
  { key: 'direction', header: 'Direction' },
  { key: 'payMod', header: 'Pay mode' },
  { key: 'operator', header: 'Operator' },
];

export default function MovementCashDetailsPage() {
  return (
    <div className="p-4">
      <ClubArchivePage
        title="Cash (all movements)"
        archiveType="cash-movements"
        direction="all"
        columns={columns}
        footerHint="Service/product cash in and expense cash out from procedure engine."
      />
    </div>
  );
}

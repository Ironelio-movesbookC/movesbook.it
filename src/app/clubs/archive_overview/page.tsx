'use client';

import ClubArchivePage from '@/components/club/archives/ClubArchivePage';
import type { Column } from '@/types/clubTable';

const columns: Column[] = [
  { key: 'name', header: 'Member' },
  { key: 'service', header: 'Subscription' },
  { key: 'insertDate', header: 'Start' },
  { key: 'dateEnd', header: 'End' },
  { key: 'value', header: 'Amount' },
];

export default function ArchiveOverviewPage() {
  return (
    <ClubArchivePage
      title="Archive — Overview"
      archiveType="subscriptions"
      columns={columns}
      footerHint="Club subscription overview from legacy subscriptions table."
    />
  );
}

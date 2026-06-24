'use client';

import ClubArchivePage from '@/components/club/archives/ClubArchivePage';
import { formatArchiveDate, statusBadgeColumn } from '@/components/club/archives/archiveColumns';
import type { Column } from '@/types/clubTable';

const columns: Column[] = [
  { key: 'name', header: 'Campaign' },
  { key: 'insertDate', header: 'Start', render: (v) => formatArchiveDate(v) },
  { key: 'dateEnd', header: 'End', render: (v) => formatArchiveDate(v) },
  statusBadgeColumn(),
];

export default function AdvertisingCampaignsPage() {
  return (
    <div className="p-4">
      <ClubArchivePage
        title="Archive — Advertising campaigns"
        archiveType="advertising-campaigns"
        columns={columns}
        footerHint="Advertising campaigns from legacy campaigns table."
      />
    </div>
  );
}

'use client';

import ClubArchivePage from '@/components/club/archives/ClubArchivePage';
import { archiveImageColumn, formatArchiveDate, statusBadgeColumn } from '@/components/club/archives/archiveColumns';
import type { Column } from '@/types/clubTable';

const columns: Column[] = [
  archiveImageColumn,
  { key: 'name', header: 'Full Name' },
  { key: 'typology', header: 'Typology' },
  { key: 'course', header: 'Section / Course' },
  { key: 'dateStart', header: 'Date Start', render: (v) => formatArchiveDate(v) },
  { key: 'dateEnd', header: 'Date End', render: (v) => formatArchiveDate(v) },
  { key: 'membershipEndDate', header: 'Membership End Date', render: (v) => formatArchiveDate(v) },
  { key: 'installments', header: 'Installments' },
  { key: 'value', header: 'Value', render: (v) => `€${Number(v ?? 0).toFixed(2)}` },
  statusBadgeColumn(),
];

export default function MembershipArchivePage() {
  return (
    <div className="p-4">
      <ClubArchivePage
        title="Archive — Affiliations / Membership"
        archiveType="affiliations"
        columns={columns}
        footerHint="Live data from club_member_subscriptions (affiliations and courses)."
      />
    </div>
  );
}

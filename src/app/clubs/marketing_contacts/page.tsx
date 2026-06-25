'use client';

import ClubArchivePage from '@/components/club/archives/ClubArchivePage';
import { formatArchiveDate } from '@/components/club/archives/archiveColumns';
import type { Column } from '@/types/clubTable';

const columns: Column[] = [
  { key: 'name', header: 'Contact' },
  { key: 'typology', header: 'Type' },
  { key: 'casual', header: 'Email / Phone' },
  { key: 'insertDate', header: 'Created', render: (v) => formatArchiveDate(v) },
];

export default function MarketingContactsPage() {
  return (
    <div className="p-4">
      <ClubArchivePage
        title="Archive — Contacts of marketing"
        archiveType="marketing-contacts"
        columns={columns}
        footerHint="Marketing contacts from club_setting_contacts."
      />
    </div>
  );
}

'use client';

import ClubArchivePage from '@/components/club/archives/ClubArchivePage';
import { archiveImageColumn, formatArchiveDate } from '@/components/club/archives/archiveColumns';
import type { Column } from '@/types/clubTable';

const columns: Column[] = [
  archiveImageColumn,
  { key: 'name', header: 'Member' },
  { key: 'typology', header: 'Card type' },
  { key: 'casual', header: 'Card number' },
  { key: 'insertDate', header: 'Assigned', render: (v) => formatArchiveDate(v) },
];

export default function CardsAssignmentsPage() {
  return (
    <div className="p-4">
      <ClubArchivePage
        title="Archive — Cards assignments"
        archiveType="cards-assignments"
        columns={columns}
        footerHint="RFID badge and bracelet pool allocations."
      />
    </div>
  );
}

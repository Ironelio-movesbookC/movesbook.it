'use client';

import ClubArchivePage from '@/components/club/archives/ClubArchivePage';
import { archiveImageColumn } from '@/components/club/archives/archiveColumns';
import type { Column } from '@/types/clubTable';

const columns: Column[] = [
  archiveImageColumn,
  { key: 'name', header: 'Member' },
  { key: 'outcome', header: 'Outcome / Code' },
  { key: 'insertDate', header: 'Date' },
  { key: 'hour', header: 'Hour' },
];

export default function AccessListPage() {
  return (
    <div className="p-4">
      <ClubArchivePage
        title="Archive — Accesses"
        archiveType="accesses"
        columns={columns}
        footerHint="Access control log from club_access_controls."
      />
    </div>
  );
}

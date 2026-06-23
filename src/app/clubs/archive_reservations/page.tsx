'use client';

import ClubArchivePage from '@/components/club/archives/ClubArchivePage';
import { archiveImageColumn, formatArchiveDate } from '@/components/club/archives/archiveColumns';
import type { Column } from '@/types/clubTable';

const columns: Column[] = [
  archiveImageColumn,
  { key: 'name', header: 'Member' },
  { key: 'course', header: 'Course / Section' },
  { key: 'insertDate', header: 'Date', render: (v) => formatArchiveDate(v) },
  { key: 'status', header: 'Status' },
];

export default function ReservationsArchivePage() {
  return (
    <div className="p-4">
      <ClubArchivePage
        title="Archive — Reservations"
        archiveType="reservations"
        columns={columns}
        footerHint="Reservations from legacy reservations table."
      />
    </div>
  );
}

'use client';

import ClubArchivePage from '@/components/club/archives/ClubArchivePage';
import { archiveImageColumn, formatArchiveDate, statusBadgeColumn } from '@/components/club/archives/archiveColumns';
import type { Column } from '@/types/clubTable';

const columns: Column[] = [
  archiveImageColumn,
  { key: 'name', header: 'From' },
  { key: 'casual', header: 'Subject / Message' },
  { key: 'insertDate', header: 'Date', render: (v) => formatArchiveDate(v) },
  statusBadgeColumn(),
];

export default function StaffQueriesPage() {
  return (
    <div className="p-4">
      <ClubArchivePage
        title="Archive — Queries to the staff"
        archiveType="staff-queries"
        columns={columns}
        footerHint="Support contact messages from supportcontactmails."
      />
    </div>
  );
}

'use client';

import ClubArchivePage from '@/components/club/archives/ClubArchivePage';
import { formatArchiveDate, statusBadgeColumn } from '@/components/club/archives/archiveColumns';
import type { Column } from '@/types/clubTable';

const columns: Column[] = [
  { key: 'name', header: 'Poll' },
  { key: 'insertDate', header: 'Created', render: (v) => formatArchiveDate(v) },
  statusBadgeColumn(),
];

export default function PollsArchivePage() {
  return (
    <div className="p-4">
      <ClubArchivePage
        title="Archive — Polls"
        archiveType="polls"
        columns={columns}
        footerHint="Polls from legacy polls table."
      />
    </div>
  );
}

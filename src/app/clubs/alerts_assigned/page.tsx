'use client';

import ClubArchivePage from '@/components/club/archives/ClubArchivePage';
import { archiveImageColumn, formatArchiveDate } from '@/components/club/archives/archiveColumns';
import type { Column } from '@/types/clubTable';

const columns: Column[] = [
  archiveImageColumn,
  { key: 'name', header: 'Member / Title' },
  { key: 'casual', header: 'Message / Type' },
  { key: 'insertDate', header: 'Date', render: (v) => formatArchiveDate(v) },
];

export default function AlertsAssignedPage() {
  return (
    <div className="p-4">
      <ClubArchivePage
        title="Archive — Alert assigned"
        archiveType="alerts-assigned"
        columns={columns}
        footerHint="Assigned alerts from member_alert_users and related tables."
      />
    </div>
  );
}

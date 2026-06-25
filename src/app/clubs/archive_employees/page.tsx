'use client';

import ClubArchivePage from '@/components/club/archives/ClubArchivePage';
import type { Column } from '@/types/clubTable';

const columns: Column[] = [
  { key: 'name', header: 'Employee / Operator' },
  { key: 'typology', header: 'Type' },
  { key: 'operator', header: 'Username' },
];

export default function ArchiveEmployeesPage() {
  return (
    <ClubArchivePage
      title="Archive — Employees"
      archiveType="operators"
      columns={columns}
      footerHint="Employee registry (operators list) until dedicated employees archive is migrated."
    />
  );
}

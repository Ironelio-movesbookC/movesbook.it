'use client';

import ClubArchivePage from '@/components/club/archives/ClubArchivePage';
import type { Column } from '@/types/clubTable';

const columns: Column[] = [
  {
    key: 'image',
    header: 'Image',
    render: (value) =>
      value ? (
        <img src={String(value)} alt="" className="w-10 h-10 rounded-full mx-auto object-cover" />
      ) : (
        <span className="text-gray-400">-</span>
      ),
  },
  { key: 'name', header: 'Full Name' },
  { key: 'memberType', header: 'Member Type' },
  { key: 'typology', header: 'Role' },
  { key: 'insertDate', header: 'Insert Date' },
  { key: 'operator', header: 'Operator' },
];

export default function MemberListPage() {
  return (
    <div className="p-4">
      <ClubArchivePage
        title="Archive — Members"
        archiveType="members"
        columns={columns}
        footerHint="Live data from club members in the database."
      />
    </div>
  );
}

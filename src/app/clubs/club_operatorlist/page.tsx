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
        <span>-</span>
      ),
  },
  { key: 'name', header: 'Operator' },
  { key: 'typology', header: 'Typology' },
  { key: 'operator', header: 'Username' },
  { key: 'insertDate', header: 'Date' },
];

export default function ClubOperatorListPage() {
  return (
    <div className="p-4">
      <ClubArchivePage
        title="Archive — Operators"
        archiveType="operators"
        columns={columns}
        footerHint="Staff operators from club_operators with employment occupation (Instructor, Personal Trainer, …)."
      />
    </div>
  );
}

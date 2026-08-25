'use client';
import Image from 'next/image';

import ClubArchivePage from '@/components/club/archives/ClubArchivePage';
import type { Column } from '@/types/clubTable';

const columns: Column[] = [
  {
    key: 'image',
    header: 'Image',
    render: (value) =>
      value ? (
        <Image src={String(value)} alt="" width={40} height={40} className="w-10 h-10 rounded-full mx-auto object-cover" unoptimized />
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
        footerHint="Club operators from legacy club_operators or club admin."
      />
    </div>
  );
}

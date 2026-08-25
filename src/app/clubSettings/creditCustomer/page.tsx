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
  { key: 'name', header: 'Member' },
  { key: 'value', header: 'Credit available' },
  { key: 'paid', header: 'Last credit' },
  { key: 'insertDate', header: 'Modified' },
  { key: 'operator', header: 'Operator' },
];

export default function CreditCustomerPage() {
  return (
    <div className="p-4">
      <ClubArchivePage
        title="Archive — Credit voucher"
        archiveType="credits"
        columns={columns}
        footerHint="Credit vouchers from insert_credits legacy table."
      />
    </div>
  );
}

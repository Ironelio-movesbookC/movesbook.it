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
  { key: 'name', header: 'Member' },
  { key: 'service', header: 'Subscription' },
  { key: 'insertDate', header: 'Start' },
  { key: 'dateEnd', header: 'End' },
  { key: 'value', header: 'Amount' },
  { key: 'installment', header: 'Installments' },
];

export default function SubscriptionArchivePage() {
  return (
    <div className="p-4">
      <ClubArchivePage
        title="Archive — Subscriptions to the club"
        archiveType="subscriptions"
        columns={columns}
        footerHint="Subscriptions from club_member_subscriptions legacy table."
      />
    </div>
  );
}

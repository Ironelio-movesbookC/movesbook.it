'use client';

import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import ClubEditSubscriptionPanel from '@/components/admin/subscriptions/ClubEditSubscriptionPanel';
import { getSubscriptionEditData } from '@/lib/admin/subscriptionSettingsMock';

function ClubEditSubscriptionContent() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? '';
  const subscriptionId = Number(id);
  const data = getSubscriptionEditData(subscriptionId, false);

  if (!data) {
    return (
      <div className="p-6 text-gray-600">
        Club subscription not found for id {id}.
      </div>
    );
  }

  return <ClubEditSubscriptionPanel id={subscriptionId} initialData={data} />;
}

export default function ClubEditSubscriptionPage() {
  return (
    <Suspense fallback={<div className="p-6 text-gray-600">Loading…</div>}>
      <ClubEditSubscriptionContent />
    </Suspense>
  );
}

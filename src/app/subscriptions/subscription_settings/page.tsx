'use client';

import { Suspense } from 'react';
import SubscriptionSettingsPanel from '@/components/admin/subscriptions/SubscriptionSettingsPanel';

export default function SubscriptionSettingsPage() {
  return (
    <Suspense fallback={null}>
      <SubscriptionSettingsPanel />
    </Suspense>
  );
}

'use client';

import { Suspense } from 'react';
import ClubTypologyPriceListPage from '@/components/club/settings/ClubTypologyPriceListPage';

export default function TypologyPriceListPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-gray-500">Loading list prices…</div>}>
      <ClubTypologyPriceListPage />
    </Suspense>
  );
}

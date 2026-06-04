'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import TypologyListpriceForm from '@/components/club/settings/TypologyListpriceForm';

function AddPageInner() {
  const searchParams = useSearchParams();
  return (
    <TypologyListpriceForm mode="add" initialTypologyId={searchParams?.get('typologyId') ?? ''} />
  );
}

export default function AddTypologyListpricePage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-gray-500">Loading…</div>}>
      <AddPageInner />
    </Suspense>
  );
}

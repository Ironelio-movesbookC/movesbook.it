'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { clubApiFetch } from '@/lib/club/servicePurchasesClient';

export default function LegacyDeadlineDetailPage() {
  const params = useParams();
  const router = useRouter();
  const segments = params?.segments;
  const segmentList = Array.isArray(segments) ? segments : segments ? [String(segments)] : [];

  const [error, setError] = useState('');

  useEffect(() => {
    if (segmentList.length === 0) {
      router.replace('/clubs/dead_line');
      return;
    }

    const qs = new URLSearchParams({ segments: segmentList.join('/') });
    clubApiFetch<{ recordId: string }>(
      `/api/club/procedures/service_sale/resolve-payment?${qs.toString()}`
    )
      .then((res) => router.replace(`/clubs/payment_detail/${res.recordId}`))
      .catch((e) => setError(e instanceof Error ? e.message : 'Unable to open payment form'));
  }, [router, segmentList]);

  if (error) {
    return (
      <div className="p-6 max-w-lg mx-auto">
        <p className="text-red-600">{error}</p>
        <button
          type="button"
          className="mt-4 text-teal-700 underline"
          onClick={() => router.push('/clubs/dead_line')}
        >
          Back to deadlines
        </button>
      </div>
    );
  }

  return <div className="p-6 text-gray-500">Opening payment form…</div>;
}

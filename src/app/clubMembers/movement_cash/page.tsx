'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** PHP alias: `/clubMembers/movement_cash` → service sale receipts archive. */
export default function ClubMembersMovementCashPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/clubs/service_receipts');
  }, [router]);

  return <div className="p-6 text-gray-500">Redirecting to receipts archive…</div>;
}

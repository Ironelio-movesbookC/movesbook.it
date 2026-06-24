'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Legacy component path → receipts archive. */
export default function ClubMembersMovementCashRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/clubs/service_receipts');
  }, [router]);
  return null;
}

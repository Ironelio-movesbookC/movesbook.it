'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';

/** Legacy URL — redirect to the current super-admin settings page for this operator. */
export default function OperatorCoadminSettingsRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const operatorId = params?.operatorId as string;

  useEffect(() => {
    if (operatorId) {
      router.replace(`/operators/super-admin-settings/${operatorId}`);
    }
  }, [operatorId, router]);

  return (
    <div className="min-h-[40vh] flex items-center justify-center text-gray-500">
      Redirecting…
    </div>
  );
}

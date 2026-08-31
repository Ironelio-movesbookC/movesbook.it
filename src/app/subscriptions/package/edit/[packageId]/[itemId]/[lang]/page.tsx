'use client';

import { useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
export default function LegacyPackageEditRedirectPage() {
  const router = useRouter();
  const params = useParams<{ packageId: string; itemId: string; lang: string }>();
  const searchParams = useSearchParams();

  useEffect(() => {
    const userType = searchParams?.get('userType') ?? params?.packageId ?? '5';
    router.replace(`/subscriptions/edit/${params?.itemId}/${params?.lang}?userType=${userType}`);
  }, [router, params, searchParams]);

  return null;
}

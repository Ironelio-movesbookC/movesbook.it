'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Legacy path — food database lives under System Dashboard global settings. */
export default function AdminFoodDatabaseRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/global-settings?panel=foods-and-dishes');
  }, [router]);

  return null;
}

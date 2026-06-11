'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Legacy route — Global Archive lives under Sport settings. */
export default function GlobalWorkoutArchivePage() {
  const router = useRouter();

  useEffect(() => {
    const adminData = localStorage.getItem('adminUser');
    const adminToken = localStorage.getItem('adminToken');
    if (!adminData && !adminToken) {
      router.replace('/admin/login');
      return;
    }
    router.replace('/settings?section=globalWorkoutArchive');
  }, [router]);

  return null;
}

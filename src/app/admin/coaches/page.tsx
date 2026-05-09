'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminRegisteredUsersList from '@/components/admin/AdminRegisteredUsersList';

export default function AdminCoachesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const adminData = localStorage.getItem('adminUser');
    if (!adminData) {
      router.push('/');
      return;
    }
    setLoading(false);
  }, [router]);

  if (loading) return null;

  return (
    <div className="min-h-full bg-[#ececec]">
      <AdminRegisteredUsersList
        segment="coaches"
        roleTitle="Coach"
        historicalSubtitle="Historical Coach's subscriptions to the Network"
      />
    </div>
  );
}

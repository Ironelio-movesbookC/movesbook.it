'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminRegisteredUsersList from '@/components/admin/AdminRegisteredUsersList';

export default function AdminGroupsPage() {
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
        segment="groups"
        roleTitle="Group"
        historicalSubtitle="Historical Group's subscriptions to the Network"
      />
    </div>
  );
}

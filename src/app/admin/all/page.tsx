'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminRegisteredUsersList from '@/components/admin/AdminRegisteredUsersList';

function AdminAllUsersContent() {
  return (
    <div className="min-h-full bg-[#ececec]">
      <AdminRegisteredUsersList
        segment="all"
        roleTitle="All Users"
        historicalSubtitle="All registered users across every modality in the Network"
      />
    </div>
  );
}

export default function AdminAllUsersPage() {
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
    <Suspense fallback={<div className="p-8 text-center text-[#666]">Loading…</div>}>
      <AdminAllUsersContent />
    </Suspense>
  );
}

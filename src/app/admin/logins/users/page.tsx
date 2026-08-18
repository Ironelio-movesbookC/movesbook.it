'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminLoginLogsPanel from '@/components/admin/AdminLoginLogsPanel';

function AdminUsersLoginsContent() {
  return (
    <AdminLoginLogsPanel
      variant="users"
      title="Logins about users"
      description="Login and logout history for Single Users, Coaches, Team admins, Club admins, and Group admins. Open a username to view the User Panel."
      apiPath="/api/admin/logins/users"
      listTitle="Users login list"
      emptyMessage="No login rows in this range. Adjust dates or wait for user logins."
    />
  );
}

export default function AdminUsersLoginsPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const adminData = localStorage.getItem('adminUser');
    if (!adminData) {
      router.push('/');
      return;
    }
    setAuthChecked(true);
  }, [router]);

  if (!authChecked) return null;

  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-500">Loading…</div>}>
      <AdminUsersLoginsContent />
    </Suspense>
  );
}

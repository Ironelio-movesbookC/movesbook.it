'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminLoginLogsPanel from '@/components/admin/AdminLoginLogsPanel';

function AdminLoggedUsersContent() {
  return (
    <AdminLoginLogsPanel
      variant="users"
      context="last-logged"
      title="Last Logged users"
      description="Users who logged in on the selected date from the Last Logged sidebar. Same login/logout grid as Logins about users. Check rows to mail several users, or use Send Mail on one row."
      apiPath="/api/admin/logins/users"
      listTitle="Last Logged users"
      emptyMessage="No logins for this date. Adjust filters in the sidebar or on this page."
    />
  );
}

export default function AdminLoggedUsersPage() {
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
      <AdminLoggedUsersContent />
    </Suspense>
  );
}

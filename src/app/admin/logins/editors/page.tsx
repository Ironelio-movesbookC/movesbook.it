'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminLoginLogsPanel from '@/components/admin/AdminLoginLogsPanel';

export default function AdminEditorsLoginsPage() {
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
    <AdminLoginLogsPanel
      variant="editors"
      title="Logins editors and developers"
      description="Login and logout history for staff accounts with the Translator or Web operator role."
      apiPath="/api/admin/logins/editors"
      listTitle="Editors login list"
      emptyMessage="No login rows in this range. Adjust dates or wait for editor logins."
    />
  );
}

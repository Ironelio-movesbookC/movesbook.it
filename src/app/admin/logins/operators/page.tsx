'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminLoginLogsPanel from '@/components/admin/AdminLoginLogsPanel';

export default function AdminOperatorLoginsPage() {
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
      variant="operators"
      title="Logins about operators"
      description="Login and logout history for Super Admins, Co-Admins, and Operators (Movesbook Staff). Externals are not included yet."
      apiPath="/api/admin/logins/operators"
      listTitle="Operators login list"
      emptyMessage="No login rows in this range. Adjust dates or wait for panel logins."
    />
  );
}

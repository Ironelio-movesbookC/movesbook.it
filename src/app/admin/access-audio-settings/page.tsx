'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminAccessAudioSettingsPanel from '@/components/admin/AdminAccessAudioSettingsPanel';

export default function AdminAccessAudioSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const adminData = localStorage.getItem('adminUser');
    const adminToken = localStorage.getItem('adminToken');
    if (!adminData || !adminToken) {
      router.push('/');
      return;
    }
    setLoading(false);
  }, [router]);

  if (loading) return null;

  return <AdminAccessAudioSettingsPanel />;
}

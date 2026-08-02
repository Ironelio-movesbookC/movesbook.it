'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AdminChatExperience from '@/components/chat/AdminChatExperience';

export default function AdminChatPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const adminData = localStorage.getItem('adminUser');
    const adminToken = localStorage.getItem('adminToken');
    if (!adminData || !adminToken) {
      router.push('/');
      return;
    }
    setReady(true);
  }, [router]);

  const getAuthHeaders = useCallback((): Record<string, string> => {
    const token = localStorage.getItem('adminToken');
    if (!token) return {};
    return { Authorization: `Bearer ${token}` };
  }, []);

  if (!ready) return null;

  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col">
      <AdminChatExperience getAuthHeaders={getAuthHeaders} />
    </div>
  );
}

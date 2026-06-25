'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import NotificationByPromocodeDashboardView from '@/components/promocodes/NotificationByPromocodeDashboard';

export default function NotificationByPromocodePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  if (loading || !user) return null;

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-xl font-semibold text-gray-800 mb-4">Suggest Movesbook to friends</h1>
      <NotificationByPromocodeDashboardView />
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminNavbar from '@/components/AdminNavbar';
import AdminRightSidebar from '@/components/admin/AdminRightSidebar';
import SystemDashboardSidebar from '@/components/admin/SystemDashboardSidebar';
import ModernFooter from '@/components/ModernFooter';

export default function SubscriptionsLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <AdminNavbar
        onToggleLeft={() => setLeftOpen(!leftOpen)}
        onToggleRight={() => setRightOpen(!rightOpen)}
      />

      <div className="flex-1 flex min-h-0 max-w-[1920px] mx-auto w-full">
        <SystemDashboardSidebar isOpen={leftOpen} onToggle={() => setLeftOpen(!leftOpen)} />

        <main className="flex-1 overflow-y-auto bg-gray-50">{children}</main>

        <AdminRightSidebar isOpen={rightOpen} onToggle={() => setRightOpen(!rightOpen)} />
      </div>

      <ModernFooter />
    </div>
  );
}

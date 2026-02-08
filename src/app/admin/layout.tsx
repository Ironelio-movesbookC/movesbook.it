'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import AdminNavbar from '@/components/AdminNavbar';
import AdminLeftSidebar from '@/components/admin/AdminLeftSidebar';
import AdminRightSidebar from '@/components/admin/AdminRightSidebar';
import SystemDashboardSidebar from '@/components/admin/SystemDashboardSidebar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);

  // Pages that need special layout handling
  const isGlobalSettings = pathname?.startsWith('/admin/global-settings');
  const isLogin = pathname?.startsWith('/admin/login');

  if (isLogin) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <AdminNavbar 
        onToggleLeft={() => setLeftOpen(!leftOpen)} 
        onToggleRight={() => setRightOpen(!rightOpen)} 
      />
      
      <div className="flex flex-1 max-w-[1920px] mx-auto w-full overflow-hidden h-[calc(100vh-64px)]">
        {isGlobalSettings ? (
          <SystemDashboardSidebar isOpen={leftOpen} onToggle={() => setLeftOpen(!leftOpen)} />
        ) : (
          <AdminLeftSidebar isOpen={leftOpen} onToggle={() => setLeftOpen(!leftOpen)} />
        )}

        <main className="flex-1 overflow-y-auto bg-gray-50">
          {children}
        </main>

        <AdminRightSidebar isOpen={rightOpen} onToggle={() => setRightOpen(!rightOpen)} />
      </div>
    </div>
  );
}

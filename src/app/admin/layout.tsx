'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import AdminNavbar from '@/components/AdminNavbar';
import AdminLeftSidebar from '@/components/admin/AdminLeftSidebar';
import AdminRightSidebar from '@/components/admin/AdminRightSidebar';
import SystemDashboardSidebar from '@/components/admin/SystemDashboardSidebar';
import ModernFooter from '@/components/ModernFooter';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);

  // Pages that need special layout handling
  const isGlobalSettings = pathname?.startsWith('/admin/global-settings');
  const isAccessAudioSettings = pathname?.startsWith('/admin/access-audio-settings');
  const useSystemSidebar = isGlobalSettings || isAccessAudioSettings;
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
      
      <div className="flex-1 flex min-h-0 max-w-[1920px] mx-auto w-full">
        {useSystemSidebar ? (
          <SystemDashboardSidebar isOpen={leftOpen} onToggle={() => setLeftOpen(!leftOpen)} />
        ) : (
          <AdminLeftSidebar isOpen={leftOpen} onToggle={() => setLeftOpen(!leftOpen)} />
        )}

        <main className="flex-1 overflow-y-auto bg-gray-50">
          {children}
        </main>

        <AdminRightSidebar isOpen={rightOpen} onToggle={() => setRightOpen(!rightOpen)} />
      </div>
      <ModernFooter />
    </div>
  );
}

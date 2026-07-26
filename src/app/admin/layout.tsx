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

  const isGlobalSettings = pathname?.startsWith('/admin/global-settings');
  const isAccessAudioSettings = pathname?.startsWith('/admin/access-audio-settings');
  const useSystemSidebar = isGlobalSettings || isAccessAudioSettings;
  const isChat = pathname?.startsWith('/admin/chat');
  const isLogin = pathname?.startsWith('/admin/login');

  if (isLogin) {
    return <>{children}</>;
  }

  return (
    <div className={`bg-gray-50 flex flex-col ${isChat ? 'h-dvh overflow-hidden' : 'min-h-screen'}`}>
      <AdminNavbar
        onToggleLeft={() => setLeftOpen(!leftOpen)}
        onToggleRight={() => setRightOpen(!rightOpen)}
      />

      <div className="flex min-h-0 w-full max-w-[1920px] flex-1 mx-auto">
        {useSystemSidebar ? (
          <SystemDashboardSidebar isOpen={leftOpen} onToggle={() => setLeftOpen(!leftOpen)} />
        ) : (
          <AdminLeftSidebar isOpen={leftOpen} onToggle={() => setLeftOpen(!leftOpen)} />
        )}

        <main
          className={`flex min-h-0 min-w-0 flex-1 flex-col bg-gray-50 ${
            isChat ? 'overflow-hidden' : 'overflow-y-auto'
          }`}
        >
          {children}
        </main>

        {!useSystemSidebar && (
          <AdminRightSidebar isOpen={rightOpen} onToggle={() => setRightOpen(!rightOpen)} />
        )}
      </div>

      {!isChat && <ModernFooter />}
    </div>
  );
}

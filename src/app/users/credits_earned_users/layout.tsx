'use client';

import '@/components/promocodes/promocodes.css';
import { useState } from 'react';
import AdminNavbar from '@/components/AdminNavbar';
import AdminLeftSidebar from '@/components/admin/AdminLeftSidebar';
import AdminRightSidebar from '@/components/admin/AdminRightSidebar';
import ModernFooter from '@/components/ModernFooter';

export default function CreditsEarnedUsersLayout({ children }: { children: React.ReactNode }) {
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <AdminNavbar
        onToggleLeft={() => setLeftOpen(!leftOpen)}
        onToggleRight={() => setRightOpen(!rightOpen)}
      />

      <div className="flex-1 flex min-h-0 max-w-[1920px] mx-auto w-full">
        <AdminLeftSidebar isOpen={leftOpen} onToggle={() => setLeftOpen(!leftOpen)} />
        <main className="flex-1 overflow-y-auto bg-[#ececec] p-4 md:p-6">{children}</main>
        <AdminRightSidebar isOpen={rightOpen} onToggle={() => setRightOpen(!rightOpen)} />
      </div>

      <ModernFooter />
    </div>
  );
}

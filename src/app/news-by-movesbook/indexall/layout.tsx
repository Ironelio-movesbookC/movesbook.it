'use client';

import { useState } from 'react';
import AdminNavbar from '@/components/AdminNavbar';
import AdminLeftSidebar from '@/components/admin/AdminLeftSidebar';
import AdminRightSidebar from '@/components/admin/AdminRightSidebar';

export default function NewsIndexAllLayout({ children }: { children: React.ReactNode }) {
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <AdminNavbar 
        onToggleLeft={() => setLeftOpen(!leftOpen)} 
        onToggleRight={() => setRightOpen(!rightOpen)} 
      />
      
      <div className="flex flex-1 w-full overflow-hidden h-[calc(100vh-64px)]">
        <AdminLeftSidebar isOpen={leftOpen} onToggle={() => setLeftOpen(!leftOpen)} />

        <main className="flex-1 overflow-y-auto bg-gray-50">
          {children}
        </main>

        <AdminRightSidebar isOpen={rightOpen} onToggle={() => setRightOpen(!rightOpen)} />
      </div>
    </div>
  );
}

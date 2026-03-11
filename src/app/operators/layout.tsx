'use client';

import AdminNavbar from '@/components/AdminNavbar';
import ModernFooter from '@/components/ModernFooter';

export default function OperatorsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <AdminNavbar />
      <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {children}
      </main>
      <ModernFooter />
    </div>
  );
}

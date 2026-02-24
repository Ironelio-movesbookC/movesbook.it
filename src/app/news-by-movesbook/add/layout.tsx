'use client';

import ModernNavbar from '@/components/ModernNavbar';

export default function AddNewsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <ModernNavbar />
      
      <main className="flex-1 overflow-y-auto bg-gray-50 w-full">
        {children}
      </main>
    </div>
  );
}

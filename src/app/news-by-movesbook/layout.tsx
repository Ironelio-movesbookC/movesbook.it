'use client';

import { useState, useEffect, Suspense } from 'react';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import ModernNavbar from '@/components/ModernNavbar';
import NewsLeftSidebar from '@/components/news/NewsLeftSidebar';

export default function NewsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [leftOpen, setLeftOpen] = useState(false);
  
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setLeftOpen(true);
      } else {
        setLeftOpen(false);
      }
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (pathname === '/news-by-movesbook/add' || pathname?.startsWith('/news-by-movesbook/edit/') || pathname === '/news-by-movesbook/indexall') {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <ModernNavbar />
      
      <div className="flex flex-1 w-full h-[calc(100vh-64px)] overflow-hidden relative">
        {leftOpen && (
          <div className="lg:hidden fixed inset-0 z-40 bg-black bg-opacity-50" onClick={() => setLeftOpen(false)}></div>
        )}
        
        <div className={`lg:relative fixed lg:static inset-y-0 left-0 z-50 transform ${leftOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 transition-transform duration-300 ease-in-out`}>
          <Suspense fallback={<div className="w-64 bg-white border-r border-gray-200 h-full" />}>
            <NewsLeftSidebar isOpen={leftOpen} onToggle={() => setLeftOpen(!leftOpen)} />
          </Suspense>
        </div>
        
        <main className="flex-1 overflow-y-auto bg-gray-50 w-full lg:ml-0">
          <div className="lg:hidden sticky top-0 z-30 bg-gray-50 border-b border-gray-200 px-3 sm:px-4 md:px-6 py-3">
            <button
              onClick={() => setLeftOpen(!leftOpen)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white rounded-lg shadow-sm border border-gray-200 hover:bg-gray-50 transition-colors"
              aria-label="Toggle sidebar"
            >
              {leftOpen ? (
                <>
                  <X className="w-5 h-5" />
                  <span>Close Menu</span>
                </>
              ) : (
                <>
                  <Menu className="w-5 h-5" />
                  <span>Menu</span>
                </>
              )}
            </button>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}

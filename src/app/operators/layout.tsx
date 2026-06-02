'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import AdminNavbar from '@/components/AdminNavbar';
import AdminLeftSidebar from '@/components/admin/AdminLeftSidebar';
import AdminRightSidebar from '@/components/admin/AdminRightSidebar';
import ModernFooter from '@/components/ModernFooter';
import { OperatorSubNavFromPath } from '@/components/operators/OperatorSubNavFromPath';
import { OperatorsRouteGuard } from '@/components/operators/OperatorsRouteGuard';
import { operatorsRouteUsesAdminChrome } from '@/lib/panelSession';
import { operatorsRouteHasSubNav } from '@/lib/operatorSubNav';

export default function OperatorsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showAdminSidebars = operatorsRouteUsesAdminChrome(pathname);
  const showOperatorSubNav = operatorsRouteHasSubNav(pathname);
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <AdminNavbar
        onToggleLeft={showAdminSidebars ? () => setLeftOpen(!leftOpen) : undefined}
        onToggleRight={showAdminSidebars ? () => setRightOpen(!rightOpen) : undefined}
      />
      <OperatorsRouteGuard>
        {showAdminSidebars ? (
          <div className="flex-1 flex min-h-0 max-w-[1920px] mx-auto w-full">
            <AdminLeftSidebar isOpen={leftOpen} onToggle={() => setLeftOpen(!leftOpen)} />
            <main className="flex-1 overflow-y-auto bg-gray-50 flex flex-col min-h-0">
              {showOperatorSubNav ? <OperatorSubNavFromPath /> : null}
              <div className="flex-1 min-h-0">{children}</div>
            </main>
            <AdminRightSidebar isOpen={rightOpen} onToggle={() => setRightOpen(!rightOpen)} />
          </div>
        ) : (
          <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
            {showOperatorSubNav ? <OperatorSubNavFromPath /> : null}
            {children}
          </main>
        )}
      </OperatorsRouteGuard>
      <ModernFooter />
    </div>
  );
}

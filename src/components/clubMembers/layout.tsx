'use client';
import ModernNavbar from '@/components/ModernNavbar';
import DarkSidebar from '@/components/DarkSidebar';
import SimpleFooter from '@/components/SimpleFooter';
import RightSidebar from '@/components/dashboard/RightSidebar';

export default function ClubLayout({ children }: { children: React.ReactNode }) {

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      <div className="bg-gray-50 flex flex-col" style={{ minHeight: '100vh' }}>
        <ModernNavbar />
        <div className='flex'>
          <DarkSidebar userType='' activeTab='my-entity' />
          <main className="flex-1 overflow-y-auto bg-gray-50">
            {children}
          </main>
          <RightSidebar
            context="my-club"
            onAddMember={() => (true)}
          />
        </div>
        <SimpleFooter />
      </div>
    </div>
  );
}

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import ModernNavbar from '@/components/ModernNavbar';
import SimpleFooter from '@/components/SimpleFooter';
import ChatPanel from '@/components/chat/ChatPanel';

export default function ChatPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return null;
  }

  return (
    <div className="bg-gray-50 flex flex-col h-screen">
      <div className="print:hidden flex-shrink-0">
        <ModernNavbar />
      </div>

      <div className="flex-1 flex min-h-0 overflow-hidden">
        <ChatPanel />
      </div>

      <div className="print:hidden flex-shrink-0">
        <SimpleFooter />
      </div>
    </div>
  );
}

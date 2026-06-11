'use client';

import { Suspense, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import PersonalWebsiteTopicsEditor from '@/components/club/PersonalWebsiteTopicsEditor';

function PersonalTopicsPageContent() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.push('/');
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-teal-700" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-100">
      <PersonalWebsiteTopicsEditor userId={user.id} />
    </div>
  );
}

export default function PersonalTopicsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
          <Loader2 className="h-8 w-8 animate-spin text-teal-700" />
        </div>
      }
    >
      <PersonalTopicsPageContent />
    </Suspense>
  );
}

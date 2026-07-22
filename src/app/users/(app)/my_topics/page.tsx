'use client';

import { Suspense, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import PersonalWebsiteTopicsEditor from '@/components/club/PersonalWebsiteTopicsEditor';
import {
  getDashboardPathForUserType,
  userOwnsMovesbookWebsite,
} from '@/utils/dashboardRouting';

function PersonalTopicsPageContent() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push('/');
      return;
    }
    // Single users (ID5 / ATHLETE) do not own a Movesbook website page.
    if (!userOwnsMovesbookWebsite(user.userType)) {
      router.replace(getDashboardPathForUserType(user.userType));
    }
  }, [loading, user, router]);

  if (loading || !user || !userOwnsMovesbookWebsite(user.userType)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-teal-700" />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-gray-100">
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

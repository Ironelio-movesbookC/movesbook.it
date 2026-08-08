'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ModernNavbar from '@/components/ModernNavbar';
import SimpleFooter from '@/components/SimpleFooter';
import StaffMessagesExperience, { type MainTab } from '@/components/messages/StaffMessagesExperience';
import { parseFeedbackSearchParams } from '@/lib/messages/feedbackRoutes';
import { getAuthToken } from '@/utils/auth.utils';

function AssistanceFeedbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!getAuthToken()) {
      router.replace('/');
      return;
    }
    setReady(true);
  }, [router]);

  const parsed = parseFeedbackSearchParams(searchParams ?? new URLSearchParams());

  if (!ready) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center text-slate-500">Loading…</div>
    );
  }

  return (
    <div className="bg-slate-100 min-h-screen flex flex-col">
      <ModernNavbar />
      <main className="flex-1">
        <StaffMessagesExperience
          variant="page"
          initialMainTab={parsed.tab as MainTab}
          initialCategory={parsed.category}
          initialMineOnly={parsed.mine}
          initialRecentOnly={parsed.recent}
          initialScope={parsed.scope}
          initialSearchQuery={parsed.q}
          initialPage={parsed.page}
          initialPageSize={parsed.pageSize}
        />
      </main>
      <SimpleFooter />
    </div>
  );
}

export default function AssistanceFeedbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-slate-500">Loading…</div>
      }
    >
      <AssistanceFeedbackInner />
    </Suspense>
  );
}

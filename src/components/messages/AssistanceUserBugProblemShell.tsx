'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ModernNavbar from '@/components/ModernNavbar';
import SimpleFooter from '@/components/SimpleFooter';
import StaffMessagesExperience from '@/components/messages/StaffMessagesExperience';
import type { FeedbackPageParams } from '@/lib/messages/feedbackRoutes';
import { getAuthToken } from '@/utils/auth.utils';

type Props = {
  params: FeedbackPageParams;
  legacyUserId?: string;
};

function Inner({ params, legacyUserId }: Props) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!getAuthToken()) {
      router.replace('/');
      return;
    }
    setReady(true);
  }, [router]);

  if (!ready) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center text-slate-500">Loading…</div>
    );
  }

  return (
    <StaffMessagesExperience
      variant="page"
      initialMainTab="support"
      initialCategory={params.category || 'feedback'}
      initialMineOnly={params.mine}
      initialRecentOnly={params.recent}
      initialScope={params.scope ?? 'community'}
      initialSearchQuery={params.q}
      initialPage={params.page}
      initialPageSize={params.pageSize}
      hideMainTabs
      legacyMode
      legacyUserId={legacyUserId}
    />
  );
}

export default function AssistanceUserBugProblemShell({
  params,
  legacyUserId,
}: Props) {
  return (
    <div className="bg-slate-100 min-h-screen flex flex-col">
      <ModernNavbar />
      <main className="flex-1">
        <Suspense
          fallback={
            <div className="min-h-[40vh] flex items-center justify-center text-slate-500">
              Loading…
            </div>
          }
        >
          <Inner params={params} legacyUserId={legacyUserId} />
        </Suspense>
      </main>
      <SimpleFooter />
    </div>
  );
}

'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ModernNavbar from '@/components/ModernNavbar';
import SimpleFooter from '@/components/SimpleFooter';
import DarkSidebar from '@/components/DarkSidebar';
import RightSidebar from '@/app/my-page/components/RightSidebar';
import StaffMessagesExperience from '@/components/messages/StaffMessagesExperience';
import type { FeedbackPageParams } from '@/lib/messages/feedbackRoutes';
import { getAuthToken } from '@/utils/auth.utils';
import { useAuth } from '@/hooks/useAuth';

type Props = {
  params: FeedbackPageParams;
  legacyUserId?: string;
};

function Inner({ params, legacyUserId }: Props) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [ready, setReady] = useState(false);
  const [activeTab, setActiveTab] = useState<'my-page' | 'my-entity'>('my-page');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!getAuthToken()) {
      router.replace('/');
      return;
    }
    setReady(true);
  }, [router]);

  if (!ready || authLoading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center text-slate-500">Loading…</div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center text-slate-500">Loading…</div>
    );
  }

  return (
    <div className="flex-1 flex gap-0 w-full">
      <div className="w-80 flex-shrink-0 sticky top-0 self-start print:hidden">
        <DarkSidebar
          userType={user.userType || ''}
          entities={[]}
          selectedEntityId={null}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onMyPageClick={() => {
            setActiveTab('my-page');
            router.push('/my-page');
          }}
        />
      </div>

      <div className="flex-1 min-w-0 flex flex-col px-2 sm:px-3">
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
      </div>

      <div className="w-72 xl:w-80 flex-shrink-0 sticky top-0 self-start print:hidden">
        <RightSidebar user={user} onAddMemberClick={() => undefined} activeTab={activeTab} />
      </div>
    </div>
  );
}

export default function AssistanceUserBugProblemShell({
  params,
  legacyUserId,
}: Props) {
  return (
    <div className="bg-slate-100 min-h-screen flex flex-col">
      <ModernNavbar />
      <main className="flex-1 flex flex-col w-full py-4">
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

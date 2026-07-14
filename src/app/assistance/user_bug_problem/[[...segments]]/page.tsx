'use client';

import { useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AssistanceUserBugProblemShell from '@/components/messages/AssistanceUserBugProblemShell';
import { parseLegacyUserBugProblem } from '@/lib/messages/feedbackRoutes';
import { getUserInfo } from '@/utils/auth.utils';

export default function LegacyUserBugProblemPage() {
  const router = useRouter();
  const routeParams = useParams();
  const segments = useMemo(() => {
    const raw = routeParams.segments;
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'string') return [raw];
    return [];
  }, [routeParams.segments]);

  const parsed = parseLegacyUserBugProblem(segments);

  useEffect(() => {
    if (!segments.length) {
      const user = getUserInfo();
      const id = user?.id ? String(user.id) : '';
      if (id) {
        router.replace(`/assistance/user_bug_problem/all/feedback/${id}`);
      } else {
        router.replace('/');
      }
    }
  }, [router, segments.length]);

  if (!segments.length) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center text-slate-500">Loading…</div>
    );
  }

  return (
    <AssistanceUserBugProblemShell
      params={parsed}
      legacyUserId={parsed.legacyUserId}
    />
  );
}

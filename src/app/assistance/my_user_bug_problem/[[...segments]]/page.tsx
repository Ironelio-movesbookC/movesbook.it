'use client';

import { useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  feedbackPageUrl,
  parseLegacyMyUserBugProblem,
} from '@/lib/messages/feedbackRoutes';

export default function LegacyMyUserBugProblemPage() {
  const router = useRouter();
  const routeParams = useParams();
  const segments = useMemo(() => {
    const raw = routeParams.segments;
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'string') return [raw];
    return [];
  }, [routeParams.segments]);

  useEffect(() => {
    const parsed = parseLegacyMyUserBugProblem(segments);
    router.replace(feedbackPageUrl(parsed));
  }, [router, segments]);

  return (
    <div className="min-h-[40vh] flex items-center justify-center text-slate-500">Redirecting…</div>
  );
}

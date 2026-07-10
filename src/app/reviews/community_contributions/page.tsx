'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { feedbackPageUrl } from '@/lib/messages/feedbackRoutes';

export default function LegacyCommunityReviewsPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace(feedbackPageUrl({ tab: 'review', scope: 'community' }));
  }, [router]);
  return null;
}

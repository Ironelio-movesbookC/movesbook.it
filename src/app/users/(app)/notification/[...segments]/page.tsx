'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { isClubAccountUserType } from '@/utils/dashboardRouting';
import NotificationsInboxPanel from '@/components/notifications/NotificationsInboxPanel';

/**
 * Recipient inbox (PHP: /users/notification/all/all/movesbook|clubs).
 * Club Admin send UI lives at /users/clubnotification (PHP clubnotification).
 */
export default function UserNotificationPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();

  const segments = (params?.segments as string[] | undefined) ?? [];
  const last = segments[segments.length - 1] || 'movesbook';
  const first = segments[0] || 'all';

  useEffect(() => {
    if (!loading && !user) router.push('/');
  }, [user, loading, router]);

  // Legacy PHP: Club Admin + clubs tab → sender UI
  useEffect(() => {
    if (loading || !user) return;
    if (!isClubAccountUserType(user.userType)) return;
    if (last === 'clubs' || first === '8') {
      const selected =
        typeof window !== 'undefined' ? localStorage.getItem('selectedClub') : null;
      const qs = selected ? `?clubId=${encodeURIComponent(selected)}` : '';
      router.replace(`/users/clubnotification${qs}`);
    }
  }, [loading, user, last, first, router]);

  if (loading || !user) return null;

  if (isClubAccountUserType(user.userType) && (last === 'clubs' || first === '8')) {
    return null;
  }

  const source = last === 'clubs' ? 'clubs' : 'movesbook';
  return <NotificationsInboxPanel source={source} />;
}

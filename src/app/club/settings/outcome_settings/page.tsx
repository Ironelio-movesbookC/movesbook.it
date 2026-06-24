'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ClubAccessOutcomeSettingsPanel from '@/app/club/dashboard/components/ClubAccessOutcomeSettingsPanel';
import { useAuth } from '@/hooks/useAuth';
import { isClubAccountUserType } from '@/utils/dashboardRouting';

export default function ClubOutcomeSettingsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [clubId, setClubId] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user || !isClubAccountUserType(user.userType)) {
      router.replace('/club/dashboard');
      return;
    }
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get('clubId');
    if (fromUrl) {
      setClubId(fromUrl);
      return;
    }
    const saved = localStorage.getItem('selectedClub');
    setClubId(saved);
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-gray-600">
        Loading…
      </div>
    );
  }

  return (
    <div className="w-full p-2 md:p-4">
      <ClubAccessOutcomeSettingsPanel
        clubId={clubId}
        onBack={() => router.push('/club/dashboard')}
      />
    </div>
  );
}

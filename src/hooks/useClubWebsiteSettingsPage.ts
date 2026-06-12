'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  getClubMyPageDisplayName,
  getFormCreatedClubsSortedByCreatedAt,
  parseClubDescriptionMeta,
} from '@/lib/club/clubSidebarLabel';
import { useAuth } from '@/hooks/useAuth';
import { resolvePublicImageUrl } from '@/lib/profileImageUrl';
import type { AthleteLegacyBannerProfile } from '@/components/athlete/AthleteLegacyBanner';

export function useClubWebsiteSettingsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [showAdBanner, setShowAdBanner] = useState(true);
  const [showPersonalBanner, setShowPersonalBanner] = useState(true);
  const [clubs, setClubs] = useState<
    Array<{ id: string; name?: string; description?: string | null; location?: string | null }>
  >([]);
  const [selectedClubId, setSelectedClubId] = useState<string | null>(null);
  const [bannerProfile, setBannerProfile] = useState<AthleteLegacyBannerProfile | null>(null);
  const [clubsLoading, setClubsLoading] = useState(true);

  const formClubs = useMemo(() => getFormCreatedClubsSortedByCreatedAt(clubs), [clubs]);
  const activeClub = formClubs.find((c) => c.id === selectedClubId) ?? formClubs[0] ?? null;
  const clubMeta = useMemo(
    () => (activeClub?.description ? parseClubDescriptionMeta(activeClub.description) : null),
    [activeClub?.description]
  );

  const loadBannerProfile = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/user/profile', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setBannerProfile({
          image: data.image,
          profileBanner: data.profileBanner,
          profileBannerAlignment: data.profileBannerAlignment,
          profileBannerSequence: data.profileBannerSequence,
          profileBannerVideo: data.profileBannerVideo,
          name: data.name,
          firstName: data.firstName,
          surname: data.surname,
        });
      }
    } catch (e) {
      console.error('Error loading profile for banner:', e);
    }
  }, []);

  const loadClubs = useCallback(async () => {
    setClubsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/clubs/my-clubs', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setClubs(data.clubs || []);
      }
    } catch (error) {
      console.error('Error loading clubs:', error);
    } finally {
      setClubsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('selectedClub');
      if (saved) setSelectedClubId(saved);
    }
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      void loadClubs();
      void loadBannerProfile();
    }
  }, [user, loadClubs, loadBannerProfile]);

  const adminDisplayName = user?.name?.trim() || user?.username || '';
  const clubDisplayName = activeClub
    ? getClubMyPageDisplayName({ ...activeClub, name: activeClub.name ?? 'Club' })
    : adminDisplayName;

  const logoImageUrl = resolvePublicImageUrl(bannerProfile?.image ?? user?.image ?? null);

  return {
    user,
    loading,
    clubsLoading,
    showAdBanner,
    setShowAdBanner,
    showPersonalBanner,
    setShowPersonalBanner,
    activeClub,
    clubId: activeClub?.id,
    clubMeta,
    bannerProfile,
    adminDisplayName,
    clubDisplayName,
    logoImageUrl,
    clubType: clubMeta?.category ?? null,
    adminCountry: clubMeta?.country ?? user?.country ?? null,
    adminLocality: activeClub?.location ?? null,
  };
}

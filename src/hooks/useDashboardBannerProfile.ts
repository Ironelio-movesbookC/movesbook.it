'use client';

import { useState, useCallback, useEffect } from 'react';
import type { AthleteLegacyBannerProfile } from '@/components/athlete/AthleteLegacyBanner';

export function useDashboardBannerProfile(enabled: boolean) {
  const [bannerProfile, setBannerProfile] = useState<AthleteLegacyBannerProfile | null>(null);

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

  useEffect(() => {
    if (enabled) void loadBannerProfile();
  }, [enabled, loadBannerProfile]);

  return { bannerProfile, setBannerProfile, loadBannerProfile };
}

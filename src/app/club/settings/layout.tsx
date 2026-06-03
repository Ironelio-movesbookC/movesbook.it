'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdvertisementCarousel from '@/components/AdvertisementCarousel';
import ModernNavbar from '@/components/ModernNavbar';
import DarkSidebar from '@/components/DarkSidebar';
import RightSidebar from '@/components/dashboard/RightSidebar';
import SimpleFooter from '@/components/SimpleFooter';
import AthleteLegacyBanner from '@/components/athlete/AthleteLegacyBanner';
import DisplayOptionsToolbar from '@/app/my-page/components/DisplayOptionsToolbar';
import { useDisplayLayoutOptions } from '@/hooks/useDisplayLayoutOptions';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { useMyPageData } from '@/app/my-page/hooks/useMyPageData';
import { useMyPageHandlers } from '@/app/my-page/hooks/useMyPageHandlers';
import { isClubAccountUserType } from '@/utils/dashboardRouting';
import type { AthleteLegacyBannerProfile } from '@/components/athlete/AthleteLegacyBanner';
import { profileToBannerProfile } from '@/components/layout/StandardPageBanners';

export default function ClubSettingsLayout({ children }: { children: React.ReactNode }) {
  const [activeTab, setActiveTab] = useState<'my-page' | 'my-entity'>('my-page');
  const [bannerProfile, setBannerProfile] = useState<AthleteLegacyBannerProfile | null>(null);
  const {
    showAdBanner,
    showPersonalBanner,
    showLeftSidebar,
    showRightSidebar,
    setShowAdBanner,
    setShowPersonalBanner,
    setShowLeftSidebar,
    setShowRightSidebar,
  } = useDisplayLayoutOptions();
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();

  const {
    clubProfiles,
    hasClubProfile,
    groups,
    teams,
    coachingGroups
  } = useMyPageData(user);

  const {
    selectedClub,
    handleClubSelect,
    handleGroupSelect,
    handleTeamSelect,
    handleCoachingGroupSelect
  } = useMyPageHandlers();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user && !isClubAccountUserType(user.userType)) {
      router.push('/my-page');
    }
  }, [user, router]);

  useEffect(() => {
    if (hasClubProfile === false && activeTab === 'my-entity') {
      setActiveTab('my-page');
    }
  }, [hasClubProfile, activeTab]);

  const loadBannerProfile = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const res = await fetch('/api/user/profile', {
        cache: 'no-store',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setBannerProfile(profileToBannerProfile(data));
    } catch {
      /* optional */
    }
  }, []);

  useEffect(() => {
    if (user) void loadBannerProfile();
  }, [user, loadBannerProfile]);

  const userType = user?.userType || '';
  const isClubAccount = isClubAccountUserType(userType);

  if (loading || !user || !isClubAccount) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <ModernNavbar />
      <DisplayOptionsToolbar
        showAdBanner={showAdBanner}
        showPersonalBanner={showPersonalBanner}
        showLeftSidebar={showLeftSidebar}
        showRightSidebar={showRightSidebar}
        onToggleAdBanner={setShowAdBanner}
        onTogglePersonalBanner={setShowPersonalBanner}
        onToggleLeftSidebar={setShowLeftSidebar}
        onToggleRightSidebar={setShowRightSidebar}
      />
      {showAdBanner && (
        <div className="mb-6 flex-shrink-0 px-4">
          <AdvertisementCarousel />
        </div>
      )}
      {showPersonalBanner && (
        <div className="mb-6 flex-shrink-0 px-4">
          <AthleteLegacyBanner profile={bannerProfile} t={t} />
        </div>
      )}
      <div className="flex flex-1 min-h-0">
        {showLeftSidebar && (
          <aside className="w-80 flex-shrink-0 sticky top-0 self-start">
            <DarkSidebar
              userType={userType}
              entities={
                isClubAccount ? clubProfiles :
                userType === 'TEAM_MANAGER' ? teams :
                userType === 'GROUP_ADMIN' ? groups :
                userType === 'COACH' ? coachingGroups : []
              }
              selectedEntityId={
                isClubAccount ? selectedClub :
                userType === 'TEAM_MANAGER' ? null :
                userType === 'GROUP_ADMIN' ? null :
                userType === 'COACH' ? null : null
              }
              onEntitySelect={(id) => {
                if (isClubAccount) {
                  handleClubSelect(id);
                } else if (userType === 'TEAM_MANAGER') {
                  handleTeamSelect(id);
                } else if (userType === 'GROUP_ADMIN') {
                  handleGroupSelect(id);
                } else if (userType === 'COACH') {
                  handleCoachingGroupSelect(id);
                }
              }}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              onMyPageClick={() => {
                setActiveTab('my-page');
                router.push('/club/dashboard');
              }}
              onMyClubClick={() => {
                if (!hasClubProfile) return;
                setActiveTab('my-entity');
                if (selectedClub) {
                  router.push(`/my-club?clubId=${selectedClub}`);
                } else if (clubProfiles.length > 0) {
                  router.push(`/my-club?clubId=${clubProfiles[0].id}`);
                }
              }}
              onMyTeamClick={() => {
                setActiveTab('my-entity');
                if (teams.length > 0) {
                  window.location.href = `/my-team?teamId=${teams[0].id}`;
                }
              }}
              onMyGroupClick={() => {
                setActiveTab('my-entity');
                if (groups.length > 0) {
                  window.location.href = `/my-group?groupId=${groups[0].id}`;
                }
              }}
              onMyCoachingGroupClick={() => {
                setActiveTab('my-entity');
                if (coachingGroups.length > 0) {
                  window.location.href = `/my-coaching-group?groupId=${coachingGroups[0].id}`;
                }
              }}
            />
          </aside>
        )}
        <main className="flex-1 min-w-0 overflow-y-auto bg-gray-50">
          {children}
        </main>
        {showRightSidebar && (
          <RightSidebar
            context="my-page"
            activeTab="my-page"
            onAddMember={() => undefined}
            athleteMyPageRightSidebar={isClubAccount}
          />
        )}
      </div>
      <SimpleFooter />
    </div>
  );
}

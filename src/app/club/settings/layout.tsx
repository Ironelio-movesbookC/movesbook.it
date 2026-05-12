'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ModernNavbar from '@/components/ModernNavbar';
import DarkSidebar from '@/components/DarkSidebar';
import RightSidebar from '@/components/dashboard/RightSidebar';
import SimpleFooter from '@/components/SimpleFooter';
import { useAuth } from '@/hooks/useAuth';
import { useMyPageData } from '@/app/my-page/hooks/useMyPageData';
import { useMyPageHandlers } from '@/app/my-page/hooks/useMyPageHandlers';
import { isClubAccountUserType } from '@/utils/dashboardRouting';

export default function ClubSettingsLayout({ children }: { children: React.ReactNode }) {
  const [activeTab, setActiveTab] = useState<'my-page' | 'my-entity'>('my-entity');
  const { user, loading } = useAuth();
  const router = useRouter();

  const {
    clubs,
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

  const userType = user?.userType || '';
  const isClubAccount = isClubAccountUserType(userType);

  if (loading || !user || !isClubAccount) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <ModernNavbar />
      <div className="flex flex-1 min-h-0">
        <aside className="w-80 flex-shrink-0">
          <DarkSidebar
            userType={userType}
            entities={
              isClubAccount ? clubs :
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
            onMyPageClick={() => setActiveTab('my-page')}
            onMyClubClick={() => {
              setActiveTab('my-entity');
              if (userType === 'CLUB') {
                return;
              }
              if (selectedClub) {
                window.location.href = `/my-club?clubId=${selectedClub}`;
              } else if (clubs.length > 0) {
                window.location.href = `/my-club?clubId=${clubs[0].id}`;
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
        <main className="flex-1 min-w-0 overflow-y-auto bg-gray-50">
          {children}
        </main>
        <RightSidebar
          context="my-page"
          activeTab="my-page"
          onAddMember={() => undefined}
          athleteMyPageRightSidebar={isClubAccount}
        />
      </div>
      <SimpleFooter />
    </div>
  );
}

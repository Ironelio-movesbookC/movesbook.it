'use client';

import ModernNavbar from '@/components/ModernNavbar';
import DarkSidebar from '@/components/DarkSidebar';
import SimpleFooter from '@/components/SimpleFooter';
import RightSidebar from '@/components/dashboard/RightSidebar';
import { SearchResultVisitorWallRightColumn } from '@/components/searchresults/SearchResultVisitorWallRightColumn';
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter, usePathname } from 'next/navigation';
import { useMyPageData } from '../../my-page/hooks/useMyPageData';
import { useMyPageHandlers } from '../../my-page/hooks/useMyPageHandlers';
import { isClubAccountUserType } from '@/utils/dashboardRouting';

export default function UsersAppLayout({ children }: { children: React.ReactNode }) {
  const [activeTab, setActiveTab] = useState<'my-page' | 'my-entity'>('my-entity');
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isNetworkSearchList = pathname?.includes('/users/searchList') ?? false;
  const isSelfContainedDeskRoute =
    pathname === '/users/my_desk' ||
    pathname === '/users/my_desk_list' ||
    pathname === '/users/add_new_mydesk';

  const { clubs, groups, teams, coachingGroups } = useMyPageData(user);
  const {
    selectedClub,
    handleClubSelect,
    handleGroupSelect,
    handleTeamSelect,
    handleCoachingGroupSelect,
  } = useMyPageHandlers();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  if (isSelfContainedDeskRoute) {
    return <>{children}</>;
  }

  if (loading || !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-gray-50 flex flex-col" style={{ minHeight: '100vh' }}>
        <ModernNavbar />
        <div className="flex">
          <DarkSidebar
            userType={user?.userType || ''}
            entities={
              isClubAccountUserType(user?.userType || '')
                ? clubs
                : user?.userType === 'TEAM_MANAGER'
                  ? teams
                  : user?.userType === 'GROUP_ADMIN'
                    ? groups
                    : user?.userType === 'COACH'
                      ? coachingGroups
                      : []
            }
            selectedEntityId={
              isClubAccountUserType(user?.userType || '')
                ? selectedClub
                : user?.userType === 'TEAM_MANAGER'
                  ? null
                  : user?.userType === 'GROUP_ADMIN'
                    ? null
                    : user?.userType === 'COACH'
                      ? null
                      : null
            }
            onEntitySelect={(id) => {
              if (isClubAccountUserType(user?.userType || '')) {
                handleClubSelect(id);
              } else if (user?.userType === 'TEAM_MANAGER') {
                handleTeamSelect(id);
              } else if (user?.userType === 'GROUP_ADMIN') {
                handleGroupSelect(id);
              } else if (user?.userType === 'COACH') {
                handleCoachingGroupSelect(id);
              }
            }}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onMyPageClick={() => setActiveTab('my-page')}
            onMyClubClick={() => {
              setActiveTab('my-entity');
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
          <main className="flex-1 overflow-y-auto bg-gray-50">{children}</main>
          {isNetworkSearchList ? (
            <SearchResultVisitorWallRightColumn
              mode="flex"
              variant={isClubAccountUserType(user?.userType || '') ? 'club' : 'user'}
            />
          ) : (
            <RightSidebar context="my-club" onAddMember={() => true} />
          )}
        </div>
        <SimpleFooter />
      </div>
    </div>
  );
}

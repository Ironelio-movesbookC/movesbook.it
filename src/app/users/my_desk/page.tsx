'use client';

import { useEffect, useState } from 'react';
import AdvertisementCarousel from '@/components/AdvertisementCarousel';
import ModernNavbar from '@/components/ModernNavbar';
import DarkSidebar from '@/components/DarkSidebar';
import SimpleFooter from '@/components/SimpleFooter';
import MyDeskSettingsTree from '@/components/desk/MyDeskSettingsTree';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useMyPageData } from '@/app/my-page/hooks/useMyPageData';
import { useMyPageHandlers } from '@/app/my-page/hooks/useMyPageHandlers';
import { getEntityType } from '@/app/my-page/utils/myPageUtils';
import { isClubAccountUserType } from '@/utils/dashboardRouting';
import DisplayOptionsToolbar from '@/app/my-page/components/DisplayOptionsToolbar';
import PersonalBanner from '@/app/my-page/components/PersonalBanner';
import RightSidebar from '@/app/my-page/components/RightSidebar';
import AddMemberModal from '@/components/AddMemberModal';
import { useDisplayLayoutOptions } from '@/hooks/useDisplayLayoutOptions';

/**
 * Legacy route parity: `/users/my_desk` — manage desk tree (gear next to “My Desk” in sidebar).
 * Data is demo-only until a Prisma model and API exist.
 */
export default function MyDeskPage() {
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
  const [activeTab, setActiveTab] = useState<'my-page' | 'my-entity'>('my-page');
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);

  const { user, loading } = useAuth();
  const router = useRouter();

  const { clubs, groups, teams, coachingGroups, myClubs } = useMyPageData(user);

  const {
    selectedClub,
    handleClubSelect,
    handleGroupSelect,
    handleTeamSelect,
    handleCoachingGroupSelect,
    handleMyClubSelect
  } = useMyPageHandlers();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return null;
  }

  return (
    <div className="flex flex-col bg-gray-50" style={{ minHeight: '100vh' }}>
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

      <div className="flex w-full flex-1 flex-col py-6">
        {showAdBanner ? (
          <div className="mb-6 flex-shrink-0 px-4">
            <AdvertisementCarousel />
          </div>
        ) : null}

        {showPersonalBanner ? <PersonalBanner user={user} currentTab={activeTab} /> : null}

        <div className="flex flex-1 gap-0">
          {showLeftSidebar ? (
            <div className="sticky top-0 w-80 flex-shrink-0 self-start">
              <DarkSidebar
                userType={user?.userType || ''}
                entities={
                  isClubAccountUserType(user?.userType || '')
                    ? clubs
                    : user?.userType === 'ATHLETE'
                      ? myClubs
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
                    : user?.userType === 'ATHLETE'
                      ? (selectedClub ?? myClubs[0]?.id ?? null)
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
                  } else if (user?.userType === 'ATHLETE') {
                    handleMyClubSelect(id);
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
            </div>
          ) : null}

          <div className="min-w-0 flex-1 flex-col px-4 py-2">
            <MyDeskSettingsTree />
          </div>

          {showRightSidebar ? (
            <RightSidebar
              user={user}
              onAddMemberClick={() => setShowAddMemberModal(true)}
              activeTab={activeTab}
            />
          ) : null}
        </div>

        <AddMemberModal
          isOpen={showAddMemberModal}
          onClose={() => setShowAddMemberModal(false)}
          onAddNewUser={(data) => {
            console.log('Add new user with password:', data);
            setShowAddMemberModal(false);
          }}
          onAddExistingUser={(data) => {
            console.log('Add existing user:', data);
            setShowAddMemberModal(false);
          }}
          entityType={getEntityType(user?.userType)}
        />
        <SimpleFooter />
      </div>
    </div>
  );
}

'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AdvertisementCarousel from '@/components/AdvertisementCarousel';
import ModernNavbar from '@/components/ModernNavbar';
import DarkSidebar from '@/components/DarkSidebar';
import SimpleFooter from '@/components/SimpleFooter';
import DeskUtilityList from '@/components/desk/DeskUtilityList';
import { useAuth } from '@/hooks/useAuth';
import { useMyPageData } from '@/app/my-page/hooks/useMyPageData';
import { useMyPageHandlers } from '@/app/my-page/hooks/useMyPageHandlers';
import { getEntityType } from '@/app/my-page/utils/myPageUtils';
import { isClubAccountUserType } from '@/utils/dashboardRouting';
import DisplayOptionsToolbar from '@/app/my-page/components/DisplayOptionsToolbar';
import PersonalBanner from '@/app/my-page/components/PersonalBanner';
import RightSidebar from '@/app/my-page/components/RightSidebar';
import AddMemberModal from '@/components/AddMemberModal';
import { useDisplayLayoutOptions } from '@/hooks/useDisplayLayoutOptions';
import { writeClubWorkspaceTab } from '@/lib/club/clubWorkspaceTab';

function ClubDeskListInner() {
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
  const [activeTab, setActiveTab] = useState<'my-page' | 'my-entity'>('my-entity');
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);

  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const clubIdFromQuery = searchParams?.get('clubId')?.trim() || null;

  const { clubs, groups, teams, coachingGroups, myClubs } = useMyPageData(user);

  const {
    selectedClub,
    handleClubSelect,
    handleGroupSelect,
    handleTeamSelect,
    handleCoachingGroupSelect,
    handleMyClubSelect,
  } = useMyPageHandlers();

  const clubId = clubIdFromQuery || selectedClub || null;

  useEffect(() => {
    writeClubWorkspaceTab('my-entity');
    setActiveTab('my-entity');
    if (clubId && typeof window !== 'undefined') {
      localStorage.setItem('selectedClub', clubId);
    }
  }, [clubId]);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return null;
  }

  const entities = isClubAccountUserType(user.userType || '')
    ? clubs
    : user.userType === 'ATHLETE'
      ? myClubs
      : user.userType === 'TEAM' || user.userType === 'TEAM_MANAGER'
        ? teams
        : user.userType === 'GROUP' || user.userType === 'GROUP_ADMIN'
          ? groups
          : user.userType === 'COACH'
            ? coachingGroups
            : clubs;

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

      <div className="flex w-full flex-1 flex-col py-2">
        {showAdBanner ? (
          <div className="mb-6 flex-shrink-0">
            <AdvertisementCarousel />
          </div>
        ) : null}

        {showPersonalBanner ? <PersonalBanner user={user} currentTab={activeTab} /> : null}

        <div className="flex flex-1 gap-0">
          {showLeftSidebar ? (
            <div className="sticky top-0 w-80 flex-shrink-0 self-start">
              <DarkSidebar
                userType={user?.userType || ''}
                entities={entities}
                selectedEntityId={
                  clubId ||
                  (isClubAccountUserType(user?.userType || '')
                    ? selectedClub
                    : user?.userType === 'ATHLETE'
                      ? (selectedClub ?? myClubs[0]?.id ?? null)
                      : null)
                }
                onEntitySelect={(id) => {
                  if (isClubAccountUserType(user?.userType || '')) {
                    handleClubSelect(id);
                  } else if (user?.userType === 'ATHLETE') {
                    handleMyClubSelect(id);
                  } else if (user?.userType === 'TEAM' || user?.userType === 'TEAM_MANAGER') {
                    handleTeamSelect(id);
                  } else if (user?.userType === 'GROUP' || user?.userType === 'GROUP_ADMIN') {
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
                  writeClubWorkspaceTab('my-entity');
                  const id = clubId || selectedClub || clubs[0]?.id;
                  if (id) {
                    window.location.href = `/my-club?clubId=${id}`;
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

          <div className="min-w-0 flex-1 flex-col py-2">
            {clubId ? (
              <DeskUtilityList clubId={clubId} titleKey="sidebar_club_desk" />
            ) : (
              <div className="px-4 py-8 text-center text-sm text-zinc-600">
                Select a club to open Club Desk.
              </div>
            )}
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
          onAddNewUser={() => setShowAddMemberModal(false)}
          onAddExistingUser={() => setShowAddMemberModal(false)}
          entityType={getEntityType(user?.userType)}
        />
        <SimpleFooter />
      </div>
    </div>
  );
}

/** Club Desk list — available to club admins including ID5–ID9. */
export default function ClubDeskListPage() {
  return (
    <Suspense fallback={null}>
      <ClubDeskListInner />
    </Suspense>
  );
}

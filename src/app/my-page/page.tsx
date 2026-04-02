'use client';

import { useState, useEffect } from 'react';
import AdvertisementCarousel from '@/components/AdvertisementCarousel';
import ModernNavbar from '@/components/ModernNavbar';
import DarkSidebar from '@/components/DarkSidebar';
import SimpleFooter from '@/components/SimpleFooter';
import AddMemberModal from '@/components/AddMemberModal';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useMyPageData } from './hooks/useMyPageData';
import { useMyPageHandlers } from './hooks/useMyPageHandlers';
import { getEntityType } from './utils/myPageUtils';
import { isClubAccountUserType } from '@/utils/dashboardRouting';
import WorkoutsSection from './components/WorkoutsSection';
import ProgressSection from './components/ProgressSection';
import SettingsSection from './components/SettingsSection';
import DisplayOptionsToolbar from './components/DisplayOptionsToolbar';
import PersonalBanner from './components/PersonalBanner';
import RightSidebar from './components/RightSidebar';

export default function MyPage() {
  const [activeSection, setActiveSection] = useState<'workouts' | 'progress' | 'settings'>('workouts');
  const [showAdBanner, setShowAdBanner] = useState(true);
  const [showPersonalBanner, setShowPersonalBanner] = useState(true);
  const [showLeftSidebar, setShowLeftSidebar] = useState(true);
  const [showRightSidebar, setShowRightSidebar] = useState(true);
  const [showToolbar, setShowToolbar] = useState(true);
  const [activeTab, setActiveTab] = useState<'my-page' | 'my-entity'>('my-page');
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);

  const { user, loading } = useAuth();
  const router = useRouter();

  // All hooks must be called before any conditional returns
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

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  // Don't render if not authenticated (after all hooks are called)
  if (loading || !user) {
    return null;
  }

  return (
    <div className="bg-gray-50 flex flex-col" style={{ minHeight: '100vh' }}>
      {/* Modern Navbar */}
      <ModernNavbar />

      {/* Display Options Toolbar - Always visible but can be collapsed */}
      <DisplayOptionsToolbar
        showAdBanner={showAdBanner}
        showPersonalBanner={showPersonalBanner}
        showLeftSidebar={showLeftSidebar}
        showRightSidebar={showRightSidebar}
        showToolbar={showToolbar}
        onToggleAdBanner={setShowAdBanner}
        onTogglePersonalBanner={setShowPersonalBanner}
        onToggleLeftSidebar={setShowLeftSidebar}
        onToggleRightSidebar={setShowRightSidebar}
        onToggleToolbar={setShowToolbar}
      />

      <div className="flex-1 flex flex-col w-full py-6">
        {/* Advertisement Carousel - Top Section */}
        {showAdBanner && (
          <div className="mb-6 flex-shrink-0 px-4">
            <AdvertisementCarousel />
          </div>
        )}

        {/* Personal Banner - Horizontal Navigation Bar */}
        {showPersonalBanner ? (
          <PersonalBanner user={user} />
        ) : null}

        {/* Main Content Area - Fills remaining space */}
        <div className="flex-1 flex gap-0">
          {/* Left Sidebar */}
          {showLeftSidebar && (
            <div className="w-80 flex-shrink-0 sticky top-0 self-start">
              <DarkSidebar
                userType={user?.userType || ''}
                entities={
                  isClubAccountUserType(user?.userType || '') ? clubs :
                  user?.userType === 'TEAM_MANAGER' ? teams :
                  user?.userType === 'GROUP_ADMIN' ? groups :
                  user?.userType === 'COACH' ? coachingGroups : []
                }
                selectedEntityId={
                  isClubAccountUserType(user?.userType || '') ? selectedClub :
                  user?.userType === 'TEAM_MANAGER' ? null :
                  user?.userType === 'GROUP_ADMIN' ? null :
                  user?.userType === 'COACH' ? null : null
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
            </div>
          )}

          {/* Main Content - Stretched to fill remaining space */}
          <div className="flex-1 min-w-0 flex flex-col px-4">
            {activeSection === 'workouts' && <WorkoutsSection />}
            {activeSection === 'progress' && <ProgressSection />}
            {activeSection === 'settings' && <SettingsSection />}
          </div>

          {/* Right Sidebar */}
          {showRightSidebar && (
            <RightSidebar
              user={user}
              onAddMemberClick={() => setShowAddMemberModal(true)}
              activeTab={activeTab}
            />
          )}
        </div>

        {/* Add Member Modal */}
        <AddMemberModal
          isOpen={showAddMemberModal}
          onClose={() => setShowAddMemberModal(false)}
          onAddNewUser={(data) => {
            // Handle adding a new user (never registered)
            console.log('Add new user with password:', data);
            // TODO: Call API to add new user with password
            setShowAddMemberModal(false);
          }}
          onAddExistingUser={(data) => {
            // Handle adding existing Movesbook user
            console.log('Add existing user:', data);
            // TODO: Call API to add existing user with username and password
            setShowAddMemberModal(false);
          }}
          entityType={getEntityType(user?.userType)}
        />
        <SimpleFooter />
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { 
  Users, 
  Dumbbell,
  BarChart3,
  Calendar,
  Settings,
  UserCircle,
  Plus,
  Target,
  TrendingUp,
  ChevronDown,
  Building2,
  Menu,
  CalendarDays,
  CalendarCheck,
  CheckSquare,
  Save,
  Archive,
  FolderOpen,
  CalendarRange,
  Mail,
  Filter,
  Loader2
} from 'lucide-react';
import AdvertisementCarousel from '@/components/AdvertisementCarousel';
import ModernNavbar from '@/components/ModernNavbar';
import DarkSidebar from '@/components/DarkSidebar';
import NewsOGPPanel from '@/components/news/NewsOGPPanel';
import SimpleFooter from '@/components/SimpleFooter';
import AddMemberModal from '@/components/AddMemberModal';
import AdminPasswordConfirmModal from '@/components/club/AdminPasswordConfirmModal';
import CreateClubModal, { type CreateClubFormPayload } from '@/components/club/CreateClubModal';
import { clubProfilePayloadForApi } from '@/lib/club/clubProfilePayload';
import { applyEntityLogoOnSave } from '@/lib/entity/applyEntityLogoOnSave';
import DisplayOptionsToolbar from '@/app/my-page/components/DisplayOptionsToolbar';
import { useDisplayLayoutOptions } from '@/hooks/useDisplayLayoutOptions';
import {
  getClubMyPageDisplayName,
  getFormCreatedClubsSortedByCreatedAt,
  parseClubDescriptionMeta,
  formatMyClubsSidebarLabel,
} from '@/lib/club/clubSidebarLabel';
import RightSidebar from '@/components/dashboard/RightSidebar';
import { useAuth } from '@/hooks/useAuth';
import { usePcuAlert } from '@/contexts/PcuAlertContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { isClubAccountUserType } from '@/utils/dashboardRouting';
import ClubDashboardMyPageBanner from './components/ClubDashboardMyPageBanner';
import ClubIdentificationDevicesPanel from './components/ClubIdentificationDevicesPanel';
import ClubAccessOutcomeSettingsPanel from './components/ClubAccessOutcomeSettingsPanel';
import type { AthleteLegacyBannerProfile } from '@/components/athlete/AthleteLegacyBanner';
import ChangeBannerModal, { type BannerAlignment } from '@/components/athlete/ChangeBannerModal';
import { getHeroBannerDisplayUrl } from '@/lib/profileBannerSequence';
import {
  useEntityDirectAccessGuard,
  useEntityDirectAccessLockedForKind,
} from '@/hooks/useEntityDirectAccessGuard';
import { clearEntityCompanyLoginSession, isEntityWorkspaceSession } from '@/lib/entity/entityDirectAccessSession';
import { fetchPcuAlert } from '@/lib/user/pcuAlertClient';
import { useEntityWorkspaceDashboardNav } from '@/hooks/useEntityWorkspaceDashboardNav';

function ClubDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();
  const { showAlert } = usePcuAlert();
  const { t } = useLanguage();
  const clubDirectAccessLocked = useEntityDirectAccessLockedForKind('club');
  useEntityDirectAccessGuard(!loading && !!user);

  // All useState hooks must be declared before any early returns
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
  const [clubs, setClubs] = useState<any[]>([]);
  const [selectedClubId, setSelectedClubId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'my-page' | 'my-entity'>('my-page');
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [activeRightTab, setActiveRightTab] = useState<'actions-planner' | 'chat-panel'>('actions-planner');
  const [expandedActionsPlanner, setExpandedActionsPlanner] = useState(true);
  const [showWorkoutSection, setShowWorkoutSection] = useState(false);
  const [clubAddSongsOgpOpen, setClubAddSongsOgpOpen] = useState(false);
  const [clubAddSongsOgpExpanded, setClubAddSongsOgpExpanded] = useState(false);
  const [bannerProfile, setBannerProfile] = useState<AthleteLegacyBannerProfile | null>(null);
  const [showChangeBannerModal, setShowChangeBannerModal] = useState(false);
  const [showAdminPasswordConfirm, setShowAdminPasswordConfirm] = useState(false);
  const [showCreateClubModal, setShowCreateClubModal] = useState(false);
  const [createClubModalKey, setCreateClubModalKey] = useState(0);
  const [createClubSaving, setCreateClubSaving] = useState(false);
  /** My Club tab is visible only after opening a club from the sidebar list. */
  const [myClubTabVisible, setMyClubTabVisible] = useState(false);

  const showMyClubTab = useCallback(() => {
    setMyClubTabVisible(true);
  }, []);

  const hideMyClubTab = useCallback(() => {
    setMyClubTabVisible(false);
  }, []);

  const [clubMainPanel, setClubMainPanel] = useState<
    'default' | 'identification-devices' | 'outcome-settings'
  >('default');

  useEntityWorkspaceDashboardNav({
    kind: 'club',
    searchParams,
    router,
    entityDirectAccessLocked: clubDirectAccessLocked,
    activeTab,
    setActiveTab,
    setSelectedEntityId: setSelectedClubId,
    setMyEntityTabVisible: setMyClubTabVisible,
  });

  const formClubs = useMemo(
    () => getFormCreatedClubsSortedByCreatedAt(clubs),
    [clubs]
  );

  const openCreateClubFlow = () => setShowAdminPasswordConfirm(true);

  const handleAdminPasswordVerified = () => {
    setShowAdminPasswordConfirm(false);
    setCreateClubModalKey((k) => k + 1);
    setShowCreateClubModal(true);
  };
  const hasFormClub = formClubs.length > 0;
  const activeClub = selectedClubId
    ? formClubs.find((c) => c.id === selectedClubId) ?? null
    : null;

  // All function definitions and useEffect hooks must also be before any early returns
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

  const loadClubs = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/clubs/my-clubs', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setClubs(data.clubs || []);
      }
    } catch (error) {
      console.error('Error loading clubs:', error);
    }
  };

  const handleClubSelect = useCallback(
    async (clubId: string) => {
      const openMyClub = () => {
        localStorage.setItem('selectedClub', clubId);
        setSelectedClubId(clubId);
        showMyClubTab();
        setActiveTab('my-entity');
      };

      if (!isEntityWorkspaceSession('club')) {
        const alert = await fetchPcuAlert('login', user?.language || 'en', clubId);
        if (alert) {
          showAlert(alert, openMyClub);
          return;
        }
      }

      openMyClub();
    },
    [showAlert, showMyClubTab, user?.language],
  );

  const handleMyPageTabClick = useCallback(() => {
    clearEntityCompanyLoginSession();
    hideMyClubTab();
    setActiveTab('my-page');
  }, [hideMyClubTab]);

  const handleTabChange = useCallback(
    (tab: 'my-page' | 'my-entity') => {
      if (tab === 'my-page') {
        clearEntityCompanyLoginSession();
        hideMyClubTab();
      }
      setActiveTab(tab);
    },
    [hideMyClubTab],
  );

  const handleCreateClubSave = async (payload: CreateClubFormPayload) => {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('Not signed in');

    setCreateClubSaving(true);
    try {
      const response = await fetch('/api/clubs', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ create: true, ...clubProfilePayloadForApi(payload) }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create club');
      }
      const clubId = data.club?.id as string | undefined;
      if (clubId && (payload.logoFile || payload.removeLogo)) {
        await applyEntityLogoOnSave('club', clubId, payload);
      }
      await loadClubs();
      if (clubId) {
        setSelectedClubId(clubId);
        localStorage.setItem('selectedClub', clubId);
      }
      setShowCreateClubModal(false);
    } finally {
      setCreateClubSaving(false);
    }
  };

  useEffect(() => {
    if (activeTab !== 'my-entity') {
      setClubAddSongsOgpOpen(false);
      setClubAddSongsOgpExpanded(false);
      setClubMainPanel('default');
    }
  }, [activeTab]);

  // After tab cleanup effect: open normal-user OGP/News (same `NewsOGPPanel` / `useNewsData` as athletes; not super-admin).
  useEffect(() => {
    if (searchParams != null && searchParams.get('open') === 'news' && formClubs.length > 0) {
      const clubId = selectedClubId ?? formClubs[0]?.id;
      if (clubId && !selectedClubId) {
        setSelectedClubId(clubId);
        localStorage.setItem('selectedClub', clubId);
      }
      showMyClubTab();
      setActiveTab('my-entity');
      setShowWorkoutSection(false);
      setClubAddSongsOgpOpen(true);
      router.replace('/club/dashboard', { scroll: false });
    }
  }, [searchParams, router, formClubs, selectedClubId]);

  useEffect(() => {
    if (isEntityWorkspaceSession('club')) return;
    if (!selectedClubId && activeTab === 'my-entity') {
      setActiveTab('my-page');
    }
  }, [selectedClubId, activeTab]);

  // Deep-link support (used by legacy settings tabs).
  useEffect(() => {
    const panel = searchParams?.get('panel');
    if (panel === 'identification-devices') {
      setActiveTab('my-entity');
      setShowWorkoutSection(false);
      setClubAddSongsOgpOpen(false);
      setClubAddSongsOgpExpanded(false);
      setClubMainPanel('identification-devices');
      router.replace('/club/dashboard', { scroll: false });
    }
    if (panel === 'outcome-settings') {
      setActiveTab('my-entity');
      setShowWorkoutSection(false);
      setClubAddSongsOgpOpen(false);
      setClubAddSongsOgpExpanded(false);
      setClubMainPanel('outcome-settings');
      router.replace('/club/dashboard', { scroll: false });
    }
  }, [searchParams, router]);

  useEffect(() => {
    if (user && !isClubAccountUserType(user.userType)) {
      router.push('/my-page');
    }
  }, [user, router]);

  useEffect(() => {
    if (user && isClubAccountUserType(user.userType)) {
      loadClubs();
      loadBannerProfile();
    }
  }, [user, loadBannerProfile]);

  // Reset workout section when switching to my-page; hide My Club tab on My Page
  useEffect(() => {
    if (activeTab === 'my-page') {
      setShowWorkoutSection(false);
      if (!isEntityWorkspaceSession('club')) {
        setMyClubTabVisible(false);
      }
    }
  }, [activeTab]);

  useEffect(() => {
    if (isEntityWorkspaceSession('club')) return;
    if (!hasFormClub && activeTab === 'my-entity') {
      setActiveTab('my-page');
    }
  }, [hasFormClub, activeTab]);

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  // Don't render if not authenticated
  if (loading || !user) {
    return null;
  }

  const dashboardShellActiveTab: 'my-page' | 'my-entity' =
    activeTab === 'my-entity' &&
    selectedClubId &&
    (myClubTabVisible || clubDirectAccessLocked)
      ? 'my-entity'
      : selectedClubId && hasFormClub
        ? activeTab
        : 'my-page';
  const bannerClub = activeClub ?? formClubs[0] ?? null;

  return (
    <div className="bg-gray-50 flex flex-col" style={{ minHeight: '100vh' }}>
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

      <div className="flex-1 flex flex-col w-full py-2">
        {showAdBanner && (
          <div className="flex-shrink-0 px-4">
            <AdvertisementCarousel />
          </div>
        )}

        {/* My Page: cover + SPONSORED + strip; My Club: same cover + strip without SPONSORED */}
        {showPersonalBanner && hasFormClub && bannerClub && (
          <ClubDashboardMyPageBanner
            clubName={getClubMyPageDisplayName(bannerClub)}
            clubId={bannerClub.id}
            onClubProfileClick={() => {
              router.push(`/my-club?clubId=${encodeURIComponent(bannerClub.id)}`);
            }}
            coverImageUrl={getHeroBannerDisplayUrl(bannerProfile)}
            coverBannerAlignment={
              bannerProfile?.profileBannerAlignment === 'center' ? 'center' : 'default'
            }
            onCoverCameraClick={() => setShowChangeBannerModal(true)}
            showSponsored={dashboardShellActiveTab === 'my-page'}
          />
        )}

        <div className="flex-1 flex gap-0">
          {showLeftSidebar && (
            <div className="w-80 flex-shrink-0 sticky top-0 self-start">
              <DarkSidebar
                userType={user?.userType || ''}
                entities={formClubs}
                selectedEntityId={selectedClubId}
                clubMyClubTabVisible={myClubTabVisible || clubDirectAccessLocked}
                hideMyPageTab={clubDirectAccessLocked}
                onEntitySelect={handleClubSelect}
                activeTab={activeTab}
                onTabChange={handleTabChange}
                onMyPageClick={handleMyPageTabClick}
                onMyClubClick={() => {
                  if (!myClubTabVisible || !selectedClubId) return;
                  setActiveTab('my-entity');
                }}
                onClubAddSongsPlaylistsClick={() => {
                  if (!hasFormClub || !myClubTabVisible) return;
                  if (!selectedClubId && formClubs[0]?.id) {
                    setSelectedClubId(formClubs[0].id);
                    localStorage.setItem('selectedClub', formClubs[0].id);
                  }
                  setActiveTab('my-entity');
                  setShowWorkoutSection(false);
                  setClubMainPanel('default');
                  setClubAddSongsOgpOpen(true);
                }}
                onIdentificationDevicesClick={() => {
                  if (!hasFormClub) return;
                  setActiveTab('my-entity');
                  setShowWorkoutSection(false);
                  setClubAddSongsOgpOpen(false);
                  setClubMainPanel('identification-devices');
                }}
                onAccessOutcomeSettingsClick={() => {
                  if (!hasFormClub) return;
                  setActiveTab('my-entity');
                  setShowWorkoutSection(false);
                  setClubAddSongsOgpOpen(false);
                  setClubMainPanel('outcome-settings');
                }}
                onCreateClubClick={openCreateClubFlow}
              />
            </div>
          )}

          <div className="flex-1 min-w-0 flex flex-col px-4">
            {!clubAddSongsOgpOpen && !showWorkoutSection && clubMainPanel === 'identification-devices' ? (
              <div className="bg-white rounded-lg shadow-sm border p-6 flex-1 flex flex-col">
                <ClubIdentificationDevicesPanel clubId={selectedClubId} />
              </div>
            ) : !clubAddSongsOgpOpen && !showWorkoutSection && clubMainPanel === 'outcome-settings' ? (
              <div className="bg-white rounded-lg shadow-sm border p-6 flex-1 flex flex-col">
                <ClubAccessOutcomeSettingsPanel
                  clubId={selectedClubId}
                  onBack={() => setClubMainPanel('default')}
                />
              </div>
            ) : !clubAddSongsOgpOpen && !showWorkoutSection ? (
              <div className="bg-white rounded-lg shadow-sm border p-6 flex-1 flex flex-col">
                {!hasFormClub ? (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center text-gray-500">
                      <Building2 className="w-20 h-20 mx-auto mb-6 opacity-60" />
                      <p className="text-2xl font-bold mb-2">Set up your club</p>
                      <p className="text-lg mb-4 max-w-md">
                        Expand <strong>My clubs</strong> in the sidebar, click <strong>Create a club</strong>,
                        and save your club username, direct access, and other details.
                      </p>
                      <button
                        type="button"
                        onClick={openCreateClubFlow}
                        className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700"
                      >
                        Create a club
                      </button>
                    </div>
                  </div>
                ) : dashboardShellActiveTab === 'my-page' ? (
                  <div>
                    <h2 className="mb-6 text-2xl font-bold text-gray-900">My Page</h2>
                    <div className="max-w-2xl space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-6">
                      <p className="text-gray-700">
                        Your personal club owner page. Use the left sidebar to manage your profile,
                        visitors, and club settings.
                      </p>
                      {hasFormClub && (
                        <p className="text-sm text-gray-600">
                          To open a club workspace, expand <strong>My clubs</strong> and click your club
                          (e.g. <strong>{formatMyClubsSidebarLabel(formClubs[0]!)}</strong>). That opens{' '}
                          <strong>My Club</strong>, where you can switch back here with{' '}
                          <strong>My Page</strong>.
                        </p>
                      )}
                    </div>
                  </div>
                ) : dashboardShellActiveTab === 'my-entity' && activeClub ? (
                  <div>
                    <h2 className="mb-6 text-2xl font-bold text-gray-900">My Club</h2>
                    <div className="max-w-2xl space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-6">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Official club name
                        </p>
                        <p className="text-lg font-semibold text-gray-900">
                          {getClubMyPageDisplayName(activeClub)}
                        </p>
                      </div>
                      {(() => {
                        const meta = parseClubDescriptionMeta(activeClub.description);
                        const rows = [
                          ['Club username', meta.username],
                          ['Direct access', meta.directAccess],
                          ['Category', meta.category],
                          ['Country', meta.country],
                          ['Region', meta.region],
                          ['Location', activeClub.location],
                          ['Club mail', meta.mail],
                        ].filter(([, v]) => v && String(v).trim());
                        return rows.length > 0 ? (
                          <dl className="grid gap-3 sm:grid-cols-2">
                            {rows.map(([label, value]) => (
                              <div key={String(label)}>
                                <dt className="text-xs font-medium text-gray-500">{label}</dt>
                                <dd className="text-sm text-gray-900">{value}</dd>
                              </div>
                            ))}
                          </dl>
                        ) : null;
                      })()}
                      <p className="text-sm text-gray-600">
                        Sidebar:{' '}
                        <span className="font-medium text-gray-800">
                          {formatMyClubsSidebarLabel(activeClub)}
                        </span>
                      </p>
                      <p className="text-sm text-gray-500">
                        Use the left sidebar for club tools, members, music, and management.
                      </p>
                    </div>
                  </div>
                ) : dashboardShellActiveTab === 'my-entity' ? (
                  <div>
                    <h2 className="mb-2 text-2xl font-bold text-gray-900">My Club</h2>
                    <p className="text-gray-600">
                      Click a club under <strong>My clubs</strong> in the sidebar to open it here.
                    </p>
                  </div>
                ) : null}
              </div>
            ) : clubAddSongsOgpOpen ? (
              <div className="flex-1 flex flex-col min-h-0 py-4">
                <NewsOGPPanel
                  onClose={() => {
                    setClubAddSongsOgpOpen(false);
                    setClubAddSongsOgpExpanded(false);
                  }}
                  embedded
                  isExpanded={clubAddSongsOgpExpanded}
                  onExpandReduce={() => setClubAddSongsOgpExpanded((prev) => !prev)}
                />
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border p-6 flex-1 flex flex-col">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Workouts Section</h2>
                <p className="text-gray-600">Workout management content goes here.</p>
              </div>
            )}
          </div>

          {showRightSidebar && (
            <RightSidebar 
              context="my-club" 
              activeTab={dashboardShellActiveTab}
              onAddMember={() => setShowAddMemberModal(true)}
              athleteMyPageRightSidebar={
                isClubAccountUserType(user?.userType ?? '') && dashboardShellActiveTab === 'my-page'
              }
              athleteMyClubRightSidebar={
                isClubAccountUserType(user?.userType ?? '') && dashboardShellActiveTab === 'my-entity'
              }
            />
          )}
          
          {/* Add Member Modal */}
          <AddMemberModal
            isOpen={showAddMemberModal}
            onClose={() => setShowAddMemberModal(false)}
            onAddNewUser={(data) => {
              console.log('Add new user with password:', data);
              // TODO: Call API to add new user with password
              setShowAddMemberModal(false);
            }}
            onAddExistingUser={(data) => {
              console.log('Add existing user:', data);
              // TODO: Call API to add existing user with username and password
              setShowAddMemberModal(false);
            }}
            entityType="club"
          />

          <AdminPasswordConfirmModal
            isOpen={showAdminPasswordConfirm}
            onClose={() => setShowAdminPasswordConfirm(false)}
            onVerified={handleAdminPasswordVerified}
            adminUsername={user?.username ?? user?.name ?? 'username'}
          />

          <CreateClubModal
            key={createClubModalKey}
            isOpen={showCreateClubModal}
            onClose={() => setShowCreateClubModal(false)}
            adminUsername={user?.username ?? user?.name ?? 'username'}
            saving={createClubSaving}
            onSave={handleCreateClubSave}
          />
        </div>
      </div>
      <ChangeBannerModal
        isOpen={showChangeBannerModal}
        onClose={() => setShowChangeBannerModal(false)}
        onSaved={(patch) => {
          setBannerProfile((prev) => {
            const next = { ...(prev ?? {}) };
            if (patch.profileBanner !== undefined) next.profileBanner = patch.profileBanner;
            if (patch.profileBannerAlignment !== undefined) {
              next.profileBannerAlignment = patch.profileBannerAlignment;
            }
            if (patch.profileBannerSequence !== undefined) {
              next.profileBannerSequence = patch.profileBannerSequence;
            }
            if (patch.profileBannerVideo !== undefined) {
              next.profileBannerVideo = patch.profileBannerVideo;
            }
            return next;
          });
        }}
        currentBannerPath={bannerProfile?.profileBanner}
        currentAlignment={
          (bannerProfile?.profileBannerAlignment as BannerAlignment | null | undefined) ?? 'default'
        }
        currentBannerSequenceJson={bannerProfile?.profileBannerSequence}
        currentBannerVideoPath={bannerProfile?.profileBannerVideo}
        t={t}
      />

      <SimpleFooter />
    </div>
  );
}

export default function ClubDashboard() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      }
    >
      <ClubDashboardContent />
    </Suspense>
  );
}

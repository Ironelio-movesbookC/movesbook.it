'use client';

import { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { 
  Users, 
  Dumbbell,
  BarChart3,
  Calendar,
  Settings,
  Eye,
  EyeOff,
  UserCircle,
  Plus,
  Target,
  TrendingUp,
  ChevronRight,
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
import {
  getClubMyPageDisplayName,
  getFormCreatedClubsSortedByCreatedAt,
  parseClubDescriptionMeta,
  formatMyClubsSidebarLabel,
} from '@/lib/club/clubSidebarLabel';
import RightSidebar from '@/components/dashboard/RightSidebar';
import { useAuth } from '@/hooks/useAuth';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { isClubAccountUserType } from '@/utils/dashboardRouting';
import ClubDashboardMyPageBanner from './components/ClubDashboardMyPageBanner';
import ClubIdentificationDevicesPanel from './components/ClubIdentificationDevicesPanel';
import ClubAccessOutcomeSettingsPanel from './components/ClubAccessOutcomeSettingsPanel';
import type { AthleteLegacyBannerProfile } from '@/components/athlete/AthleteLegacyBanner';
import ChangeBannerModal, { type BannerAlignment } from '@/components/athlete/ChangeBannerModal';
import { getHeroBannerDisplayUrl } from '@/lib/profileBannerSequence';

function ClubDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();
  const { t } = useLanguage();

  // All useState hooks must be declared before any early returns
  const [showAdBanner, setShowAdBanner] = useState(true);
  const [showPersonalBanner, setShowPersonalBanner] = useState(true);
  const [showLeftSidebar, setShowLeftSidebar] = useState(true);
  const [showRightSidebar, setShowRightSidebar] = useState(true);
  const [showToolbar, setShowToolbar] = useState(true);
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
  const [clubMainPanel, setClubMainPanel] = useState<
    'default' | 'identification-devices' | 'outcome-settings'
  >('default');

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
  const activeClub =
    formClubs.find((c) => c.id === selectedClubId) ?? formClubs[0] ?? null;

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

  const handleClubSelect = (clubId: string) => {
    localStorage.setItem('selectedClub', clubId);
    setSelectedClubId(clubId);
    setActiveTab('my-entity');
  };

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
        body: JSON.stringify({ create: true, ...payload }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create club');
      }
      await loadClubs();
      if (data.club?.id) {
        setSelectedClubId(data.club.id);
        localStorage.setItem('selectedClub', data.club.id);
      }
      setShowCreateClubModal(false);
      setActiveTab('my-entity');
    } finally {
      setCreateClubSaving(false);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('selectedClub');
      if (saved) setSelectedClubId(saved);
    }
  }, []);

  useEffect(() => {
    if (activeTab !== 'my-entity') {
      setClubAddSongsOgpOpen(false);
      setClubAddSongsOgpExpanded(false);
      setClubMainPanel('default');
    }
  }, [activeTab]);

  // After tab cleanup effect: open normal-user OGP/News (same `NewsOGPPanel` / `useNewsData` as athletes; not super-admin).
  useEffect(() => {
    if (searchParams != null && searchParams.get('open') === 'news') {
      setActiveTab('my-entity');
      setShowWorkoutSection(false);
      setClubAddSongsOgpOpen(true);
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

  // Reset workout section when switching to my-page
  useEffect(() => {
    if (activeTab === 'my-page') {
      setShowWorkoutSection(false);
    }
  }, [activeTab]);

  useEffect(() => {
    if (!hasFormClub && activeTab === 'my-entity') {
      setActiveTab('my-page');
    }
  }, [hasFormClub, activeTab]);

  // Auto-hide left sidebar when workout section opens
  useEffect(() => {
    if (showWorkoutSection) {
      setShowLeftSidebar(false);
    } else {
      setShowLeftSidebar(true);
    }
  }, [showWorkoutSection]);

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

  const dashboardShellActiveTab: 'my-page' | 'my-entity' = hasFormClub
    ? activeTab
    : 'my-page';

  return (
    <div className="bg-gray-50 flex flex-col" style={{ minHeight: '100vh' }}>
      <ModernNavbar />

      {/* Display Options Toolbar */}
      <div className={`bg-white border-b px-4 py-1 transition-all duration-300 ${showToolbar ? '' : 'overflow-hidden'}`}>
        <div className={`flex items-center flex-wrap gap-4 transition-all duration-300 ${showToolbar ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={showAdBanner} onChange={(e) => setShowAdBanner(e.target.checked)} className="w-4 h-4" />
              <span className="flex items-center gap-1">
                {showAdBanner ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                Advertising Banner
              </span>
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={showPersonalBanner} onChange={(e) => setShowPersonalBanner(e.target.checked)} className="w-4 h-4" />
              <span className="flex items-center gap-1">
                {showPersonalBanner ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                Personal Banner & Picture
              </span>
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={showLeftSidebar} onChange={(e) => setShowLeftSidebar(e.target.checked)} className="w-4 h-4" />
              <span className="flex items-center gap-1">
                {showLeftSidebar ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                Left Sidebar
              </span>
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={showRightSidebar} onChange={(e) => setShowRightSidebar(e.target.checked)} className="w-4 h-4" />
              <span className="flex items-center gap-1">
                {showRightSidebar ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                Right Sidebar
              </span>
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer text-gray-600">
              <input type="checkbox" checked={showToolbar} onChange={(e) => setShowToolbar(e.target.checked)} className="w-4 h-4" />
              <span className="flex items-center gap-1">
                {showToolbar ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                <span className="font-medium">Display Options</span>
              </span>
            </label>
          </div>
      </div>

      <div className="flex-1 flex flex-col w-full py-2">
        {showAdBanner && (
          <div className="flex-shrink-0">
            <AdvertisementCarousel />
          </div>
        )}

        {/* My Page: cover + SPONSORED + strip; My Club: same cover + strip without SPONSORED */}
        {showPersonalBanner && hasFormClub && activeClub && (
          <ClubDashboardMyPageBanner
            clubName={getClubMyPageDisplayName(activeClub)}
            coverImageUrl={getHeroBannerDisplayUrl(bannerProfile)}
            coverBannerAlignment={
              bannerProfile?.profileBannerAlignment === 'center' ? 'center' : 'default'
            }
            onCoverCameraClick={() => setShowChangeBannerModal(true)}
            showSponsored={dashboardShellActiveTab === 'my-page'}
          />
        )}

        <div className="flex-1 flex gap-0">
          {showLeftSidebar && !clubAddSongsOgpExpanded && (
            <div className="w-80 flex-shrink-0 sticky top-0 self-start">
              <DarkSidebar
                userType={user?.userType || ''}
                entities={formClubs}
                selectedEntityId={selectedClubId}
                onEntitySelect={handleClubSelect}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                onMyPageClick={() => setActiveTab('my-page')}
                onMyClubClick={() => {
                  if (!hasFormClub) return;
                  setActiveTab('my-entity');
                }}
                onClubAddSongsPlaylistsClick={() => {
                  if (!hasFormClub) return;
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
                ) : dashboardShellActiveTab === 'my-page' && activeClub ? (
                  <div>
                    <h2 className="mb-6 text-2xl font-bold text-gray-900">My Page</h2>
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
                    </div>
                  </div>
                ) : dashboardShellActiveTab === 'my-entity' && activeClub ? (
                  <div>
                    <h2 className="mb-6 text-2xl font-bold text-gray-900">My Club</h2>
                    <div className="max-w-2xl space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-6">
                      <p className="text-lg font-semibold text-gray-900">
                        {getClubMyPageDisplayName(activeClub)}
                      </p>
                      <p className="text-sm text-gray-600">
                        {formatMyClubsSidebarLabel(activeClub)}
                      </p>
                      <p className="text-sm text-gray-500">
                        Use the left sidebar for club tools, members, music, and management.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {formClubs.map((club) => (
                      <div
                        key={club.id}
                        onClick={() => handleClubSelect(club.id)}
                        className="p-6 border-2 border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all duration-300 cursor-pointer"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-xl flex items-center justify-center">
                            <Building2 className="w-6 h-6 text-white" />
                          </div>
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        </div>
                        <h3 className="font-bold text-gray-900 text-lg mb-2">
                          {getClubMyPageDisplayName(club)}
                        </h3>
                        <p className="text-sm text-gray-600 mb-2">
                          {formatMyClubsSidebarLabel(club)}
                        </p>
                        {club.location && <p className="text-xs text-gray-500 mb-4">{club.location}</p>}
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-500">{club.memberCount || 0} members</span>
                          <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">Active</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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

          {showRightSidebar && !clubAddSongsOgpExpanded && (
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

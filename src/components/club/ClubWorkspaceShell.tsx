'use client';

import { useCallback, useEffect, useMemo, useState, Suspense } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import AdvertisementCarousel from '@/components/AdvertisementCarousel';
import ModernNavbar from '@/components/ModernNavbar';
import DarkSidebar from '@/components/DarkSidebar';
import RightSidebar from '@/components/dashboard/RightSidebar';
import SimpleFooter from '@/components/SimpleFooter';
import DisplayOptionsToolbar from '@/app/my-page/components/DisplayOptionsToolbar';
import { useDisplayLayoutOptions } from '@/hooks/useDisplayLayoutOptions';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { isClubAccountUserType } from '@/utils/dashboardRouting';
import {
  getClubMyPageDisplayName,
  getFormCreatedClubsSortedByCreatedAt,
  userHasClubProfile,
} from '@/lib/club/clubSidebarLabel';
import {
  readClubWorkspaceTab,
  readSelectedClubHint,
  writeClubWorkspaceTab,
  writeClubFormProfileHint,
  isClubWorkspacePath,
  type ClubWorkspaceTab,
} from '@/lib/club/clubWorkspaceTab';
import ClubDashboardMyPageBanner from '@/app/club/dashboard/components/ClubDashboardMyPageBanner';
import AdminPasswordConfirmModal from '@/components/club/AdminPasswordConfirmModal';
import CreateClubModal, { type CreateClubFormPayload } from '@/components/club/CreateClubModal';
import ChangeBannerModal, { type BannerAlignment } from '@/components/athlete/ChangeBannerModal';
import type { AthleteLegacyBannerProfile } from '@/components/athlete/AthleteLegacyBanner';
import { getHeroBannerDisplayUrl } from '@/lib/profileBannerSequence';
import { ClubWorkspaceContext } from '@/contexts/ClubWorkspaceContext';
import TopBar from '@/app/club/dashboard/components/topbar/TopBar';
import MyStaffFeedbacksPanel from '@/components/messages/MyStaffFeedbacksPanel';

function ClubWorkspaceShellInner({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const { t } = useLanguage();

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
  const [clubsLoaded, setClubsLoaded] = useState(false);
  const [selectedClubId, setSelectedClubId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ClubWorkspaceTab>('my-page');
  const [bannerProfile, setBannerProfile] = useState<AthleteLegacyBannerProfile | null>(null);
  const [showChangeBannerModal, setShowChangeBannerModal] = useState(false);
  const [showAdminPasswordConfirm, setShowAdminPasswordConfirm] = useState(false);
  const [showCreateClubModal, setShowCreateClubModal] = useState(false);
  const [createClubModalKey, setCreateClubModalKey] = useState(0);
  const [createClubSaving, setCreateClubSaving] = useState(false);
  const [showStaffFeedbacks, setShowStaffFeedbacks] = useState(false);

  const formClubs = useMemo(
    () => getFormCreatedClubsSortedByCreatedAt(clubs),
    [clubs],
  );
  const hasFormClub = formClubs.length > 0;
  const activeClub = selectedClubId
    ? formClubs.find((c) => c.id === selectedClubId) ?? null
    : null;
  const bannerClub = activeClub ?? formClubs[0] ?? null;
  const shellActiveTab: ClubWorkspaceTab = activeClub ? activeTab : 'my-page';

  const loadClubs = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/clubs/my-clubs', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        const list = data.clubs || [];
        setClubs(list);
        writeClubFormProfileHint(userHasClubProfile(list));
      }
    } catch (error) {
      console.error('Error loading clubs:', error);
    } finally {
      setClubsLoaded(true);
    }
  }, []);

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
    } catch {
      /* optional */
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const savedClubId = localStorage.getItem('selectedClub');
    if (savedClubId) setSelectedClubId(savedClubId);
    const savedTab = readClubWorkspaceTab();
    if (savedTab) setActiveTab(savedTab);
  }, []);

  useEffect(() => {
    if (pathname?.startsWith('/my-club')) {
      const clubFromUrl = new URLSearchParams(
        typeof window !== 'undefined' ? window.location.search : ''
      ).get('clubId');
      const clubId = clubFromUrl ?? selectedClubId ?? localStorage.getItem('selectedClub');
      if (clubId) {
        if (!selectedClubId) setSelectedClubId(clubId);
        localStorage.setItem('selectedClub', clubId);
        setActiveTab('my-entity');
        writeClubWorkspaceTab('my-entity');
      }
      return;
    }

    /** Website settings / display opened from My Club must keep My Club tab active. */
    if (pathname?.startsWith('/WebsiteSettings')) {
      setActiveTab('my-entity');
      writeClubWorkspaceTab('my-entity');
      return;
    }

    const savedTab = readClubWorkspaceTab();
    const hasClubContext = Boolean(selectedClubId) || readSelectedClubHint();

    if (isClubWorkspacePath(pathname) && hasClubContext && savedTab === 'my-entity') {
      setActiveTab('my-entity');
      return;
    }

    if (savedTab) setActiveTab(savedTab);
  }, [pathname, selectedClubId]);

  useEffect(() => {
    if (clubsLoaded && !hasFormClub && activeTab === 'my-entity') {
      setActiveTab('my-page');
      writeClubWorkspaceTab('my-page');
    }
  }, [clubsLoaded, hasFormClub, activeTab]);

  useEffect(() => {
    if (clubsLoaded && !selectedClubId && activeTab === 'my-entity') {
      setActiveTab('my-page');
      writeClubWorkspaceTab('my-page');
    }
  }, [clubsLoaded, selectedClubId, activeTab]);

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
    if (user && isClubAccountUserType(user.userType)) {
      void loadClubs();
      void loadBannerProfile();
    }
  }, [user, loadClubs, loadBannerProfile]);

  const handleTabChange = useCallback((tab: ClubWorkspaceTab) => {
    writeClubWorkspaceTab(tab);
    setActiveTab(tab);
  }, []);

  const handleClubSelect = useCallback((clubId: string) => {
    localStorage.setItem('selectedClub', clubId);
    setSelectedClubId(clubId);
    writeClubWorkspaceTab('my-entity');
    setActiveTab('my-entity');
  }, []);

  const handleMyPageTabClick = useCallback(() => {
    writeClubWorkspaceTab('my-page');
    setActiveTab('my-page');
    if (pathname !== '/club/dashboard') {
      router.push('/club/dashboard');
    }
  }, [pathname, router]);

  const handleMyClubTabClick = useCallback(() => {
    const clubId = selectedClubId ?? formClubs[0]?.id ?? null;
    if (!clubId) return;

    if (!selectedClubId) {
      localStorage.setItem('selectedClub', clubId);
      setSelectedClubId(clubId);
    }

    writeClubWorkspaceTab('my-entity');
    setActiveTab('my-entity');
    router.push(`/my-club?clubId=${encodeURIComponent(clubId)}`);
  }, [selectedClubId, formClubs, router]);

  const openCreateClubFlow = () => setShowAdminPasswordConfirm(true);

  const handleAdminPasswordVerified = () => {
    setShowAdminPasswordConfirm(false);
    setCreateClubModalKey((k) => k + 1);
    setShowCreateClubModal(true);
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
        writeClubFormProfileHint(true);
        writeClubWorkspaceTab('my-entity');
        setActiveTab('my-entity');
      }
      setShowCreateClubModal(false);
    } finally {
      setCreateClubSaving(false);
    }
  };

  const goToDashboardPanel = useCallback(
    (
      panel:
        | 'identification-devices'
        | 'outcome-settings'
        | 'news'
        | 'suggest-movesbook'
        | 'chat'
        | 'club-news'
        | 'club-news-ogp'
        | 'club-global-news'
    ) => {
      if (!hasFormClub) return;
      const clubId = selectedClubId ?? formClubs[0]?.id ?? null;
      if (!selectedClubId && clubId) {
        setSelectedClubId(clubId);
        localStorage.setItem('selectedClub', clubId);
      }
      writeClubWorkspaceTab('my-entity');
      setActiveTab('my-entity');

      if (panel === 'outcome-settings') {
        const qs = clubId ? `?clubId=${encodeURIComponent(clubId)}` : '';
        router.push(`/club/settings/outcome_settings${qs}`);
        return;
      }

      const query = panel === 'news' ? 'open=news' : `panel=${panel}`;
      router.push(`/club/dashboard?${query}`);
    },
    [formClubs, hasFormClub, router, selectedClubId],
  );

  if (loading || !user || !isClubAccountUserType(user.userType)) {
    return null;
  }

  return (
    <ClubWorkspaceContext.Provider
      value={{ activeTab: shellActiveTab, selectedClubId }}
    >
    <div className="bg-gray-50 flex flex-col min-h-screen">
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
            onSuggestMovesbookClick={() => goToDashboardPanel('suggest-movesbook')}
            showSponsored={shellActiveTab === 'my-page'}
          />
        )}

        <div className="flex-1 flex gap-0 min-h-0 py-2 px-4">
          {showLeftSidebar && (
            <aside className="w-80 flex-shrink-0 sticky top-0 self-start">
              <DarkSidebar
                userType={user.userType}
                entities={formClubs}
                selectedEntityId={selectedClubId}
                clubProfileLoaded={clubsLoaded}
                onEntitySelect={handleClubSelect}
                activeTab={activeTab}
                onTabChange={handleTabChange}
                onMyPageClick={handleMyPageTabClick}
                onMyClubClick={handleMyClubTabClick}
                onClubAddSongsPlaylistsClick={() => goToDashboardPanel('news')}
                onIdentificationDevicesClick={() => goToDashboardPanel('identification-devices')}
                onAccessOutcomeSettingsClick={() => goToDashboardPanel('outcome-settings')}
                onSuggestMovesbookClick={() => goToDashboardPanel('suggest-movesbook')}
                onClubChatClick={() => goToDashboardPanel('chat')}
                onClubNewsSectionClick={() => goToDashboardPanel('club-news')}
                onClubOgpNewsSectionClick={() => goToDashboardPanel('club-news-ogp')}
                onClubGlobalNewsSectionClick={() => goToDashboardPanel('club-global-news')}
                onCreateClubClick={openCreateClubFlow}
                onMyFeedbacksStaffClick={() => {
                  setActiveTab('my-page');
                  setShowStaffFeedbacks(true);
                }}
              />
            </aside>
          )}

          <main className="flex-1 min-w-0 flex flex-col px-4 overflow-y-auto">
            <TopBar/>
            {showStaffFeedbacks ? (
              <MyStaffFeedbacksPanel onClose={() => setShowStaffFeedbacks(false)} />
            ) : (
              children
            )}
          </main>

          {showRightSidebar && (
            <RightSidebar
              context={shellActiveTab === 'my-entity' ? 'my-club' : 'my-page'}
              activeTab={shellActiveTab}
              onAddMember={() => undefined}
              isClubAccount
              athleteMyPageRightSidebar={shellActiveTab === 'my-page'}
              athleteMyClubRightSidebar={shellActiveTab === 'my-entity'}
            />
          )}
        </div>
      </div>

      <AdminPasswordConfirmModal
        isOpen={showAdminPasswordConfirm}
        onClose={() => setShowAdminPasswordConfirm(false)}
        onVerified={handleAdminPasswordVerified}
        adminUsername={user.username ?? user.name ?? 'username'}
      />

      <CreateClubModal
        key={createClubModalKey}
        isOpen={showCreateClubModal}
        onClose={() => setShowCreateClubModal(false)}
        adminUsername={user.username ?? user.name ?? 'username'}
        saving={createClubSaving}
        onSave={handleCreateClubSave}
      />

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
    </ClubWorkspaceContext.Provider>
  );
}

export default function ClubWorkspaceShell({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      }
    >
      <ClubWorkspaceShellInner>{children}</ClubWorkspaceShellInner>
    </Suspense>
  );
}

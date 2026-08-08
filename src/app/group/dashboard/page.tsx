'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Image from 'next/image';
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
  Home,
  Menu,
  HelpCircle,
  CalendarDays,
  CalendarCheck,
  CheckSquare,
  Save,
  Archive,
  FolderOpen,
  CalendarRange,
  Mail,
  Filter
} from 'lucide-react';
import AdvertisementCarousel from '@/components/AdvertisementCarousel';
import ModernNavbar from '@/components/ModernNavbar';
import DarkSidebar from '@/components/DarkSidebar';
import SimpleFooter from '@/components/SimpleFooter';
import AddMemberModal from '@/components/AddMemberModal';
import AdminPasswordConfirmModal from '@/components/club/AdminPasswordConfirmModal';
import CreateEntityModal from '@/components/entity/CreateEntityModal';
import RightSidebar from '@/components/dashboard/RightSidebar';
import { useAuth } from '@/hooks/useAuth';
import {
  filterFormCreatedEntities,
  useManagedEntityCreation,
} from '@/hooks/useManagedEntityCreation';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { getDashboardPathForUserType, isGroupAccountUserType } from '@/utils/dashboardRouting';

export default function GroupDashboard() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  
  // All hooks must be called before any conditional returns
  const [showAdBanner, setShowAdBanner] = useState(true);
  const [showPersonalBanner, setShowPersonalBanner] = useState(true);
  const [showLeftSidebar, setShowLeftSidebar] = useState(true);
  const [showRightSidebar, setShowRightSidebar] = useState(true);
  const [showToolbar, setShowToolbar] = useState(true);
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'my-page' | 'my-entity'>('my-page');
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [activeRightTab, setActiveRightTab] = useState<'actions-planner' | 'chat-panel'>('actions-planner');
  const [expandedActionsPlanner, setExpandedActionsPlanner] = useState(true);
  const [showWorkoutSection, setShowWorkoutSection] = useState(false);
  /** My Group tab visible only after opening a group from the sidebar (hidden on My Page). */
  const [myEntityTabVisible, setMyEntityTabVisible] = useState(false);

  const loadGroups = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/groups/my-groups', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setGroups(data.groups || []);
      }
    } catch (error) {
      console.error('Error loading groups:', error);
    }
  }, []);

  const entityCreation = useManagedEntityCreation({
    createApiPath: '/api/groups',
    responseEntityKey: 'group',
    onReload: loadGroups,
    storageKey: 'selectedGroup',
    onEntityCreated: (id) => {
      setSelectedGroupId(id);
      setMyEntityTabVisible(true);
      setActiveTab('my-entity');
    },
  });

  const hideMyEntityTab = useCallback(() => setMyEntityTabVisible(false), []);

  useEffect(() => {
    setActiveTab('my-page');
    setMyEntityTabVisible(false);
  }, []);

  const handleMyPageTabClick = useCallback(() => {
    hideMyEntityTab();
    setActiveTab('my-page');
  }, [hideMyEntityTab]);

  const handleTabChange = useCallback(
    (tab: 'my-page' | 'my-entity') => {
      if (tab === 'my-page') hideMyEntityTab();
      setActiveTab(tab);
    },
    [hideMyEntityTab],
  );

  const formCreatedGroups = useMemo(
    () => filterFormCreatedEntities(groups),
    [groups],
  );
  const hasFormGroup = formCreatedGroups.length > 0;

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('selectedGroup');
      if (saved) setSelectedGroupId(saved);
    }
  }, []);

  useEffect(() => {
    if (user && !isGroupAccountUserType(user.userType)) {
      router.replace(getDashboardPathForUserType(user.userType));
    }
  }, [user, router]);

  useEffect(() => {
    if (user && isGroupAccountUserType(user.userType)) {
      void loadGroups();
    }
  }, [user, loadGroups]);

  useEffect(() => {
    if (activeTab === 'my-page') {
      setShowWorkoutSection(false);
      setMyEntityTabVisible(false);
    }
  }, [activeTab]);

  useEffect(() => {
    if (!hasFormGroup && activeTab === 'my-entity') {
      setActiveTab('my-page');
    }
  }, [hasFormGroup, activeTab]);

  useEffect(() => {
    if (showWorkoutSection) {
      setShowLeftSidebar(false);
    } else {
      setShowLeftSidebar(true);
    }
  }, [showWorkoutSection]);

  if (loading || !user) {
    return null;
  }

  const handleGroupSelect = (groupId: string) => {
    localStorage.setItem('selectedGroup', groupId);
    setSelectedGroupId(groupId);
    setMyEntityTabVisible(true);
    setActiveTab('my-entity');
  };

  return (
    <div className="bg-gray-50 flex flex-col" style={{ minHeight: '100vh' }}>
      <ModernNavbar />

      {/* Display Options Toolbar */}
      <div className={`bg-white border-b px-4 py-1 transition-all duration-300 ${showToolbar ? '' : 'overflow-hidden'}`}>
        <div className={`flex items-center justify-between flex-wrap gap-2 transition-all duration-300 ${showToolbar ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="flex items-center gap-4 flex-wrap">
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
          </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer ml-auto">
              <input type="checkbox" checked={showToolbar} onChange={(e) => setShowToolbar(e.target.checked)} className="w-4 h-4" />
              <span className="flex items-center gap-1 text-gray-600">
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

        {/* Video/Image Banner with Info Cards */}
        {showPersonalBanner && (
          <div className="flex-shrink-0">
            <div className="relative overflow-hidden shadow-lg" style={{ height: '300px' }}>
              <div
                className="absolute inset-0 bg-gradient-to-br from-gray-900 to-gray-800 relative"
                style={{
                  backgroundImage: 'linear-gradient(135deg, #111827, #1f2937), url(/images/banner.jpg)',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat'
                }}
              >
                <Image 
                  src="/images/banner.jpg" 
                  alt="Group Background"
                  fill
                  sizes="100vw"
                  className="object-cover opacity-60"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-20 h-14 bg-red-600 rounded-lg flex items-center justify-center cursor-pointer hover:bg-red-700 transition">
                    <div className="w-0 h-0 border-t-8 border-t-transparent border-l-12 border-l-white border-b-8 border-b-transparent ml-1"></div>
                  </div>
                </div>
              </div>

              <div className="absolute top-4 right-4 flex gap-3">
                <div className="bg-gray-800/90 backdrop-blur-sm rounded-lg p-3 text-white min-w-[120px]">
                  <p className="text-xs text-gray-400 uppercase mb-1">Active Season</p>
                  <p className="font-semibold">2025 Indoor</p>
                  <p className="text-sm">Championship</p>
                </div>
                <div className="bg-teal-600/90 backdrop-blur-sm rounded-lg p-3 text-white min-w-[120px]">
                  <p className="text-xs text-gray-200 uppercase mb-1">Period</p>
                  <p className="font-semibold">Base</p>
                  <p className="text-sm">Conditioning</p>
                </div>
                <div className="bg-blue-600/90 backdrop-blur-sm rounded-lg p-3 text-white min-w-[100px]">
                  <p className="text-xs text-gray-200 uppercase mb-1">Week</p>
                  <p className="text-2xl font-bold">14</p>
                </div>
                <div className="bg-green-700/90 backdrop-blur-sm rounded-lg p-3 text-white min-w-[140px]">
                  <p className="text-xs text-gray-200 uppercase mb-1">Next Event</p>
                  <p className="font-semibold">Continental Cup 21 Jul</p>
                </div>
              </div>

              <div className="absolute bottom-4 left-4 flex gap-2">
                <span className="bg-blue-600/90 backdrop-blur-sm text-white px-3 py-1 rounded text-sm">CURRENT 2 WEEKS</span>
                <span className="bg-gray-700/90 backdrop-blur-sm text-white px-3 py-1 rounded text-sm">REST OF THE YEAR</span>
                <span className="bg-gray-700/90 backdrop-blur-sm text-white px-3 py-1 rounded text-sm">COMPLETED SESSIONS</span>
              </div>

              <div className="absolute bottom-4 left-4 mt-12">
                <div className="bg-blue-800/90 backdrop-blur-sm text-white px-4 py-2 rounded-lg font-medium">
                  {groups[0]?.name || 'Club Magliw Awellino Club'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Personal Banner - Horizontal Navigation Bar */}
        {showPersonalBanner && (
          <div className="flex-shrink-0">
            <div className="bg-gray-800 overflow-hidden shadow-lg relative" style={{ height: '52px' }}>
              {/* Background image with subtle overlay */}
              <div 
                className="absolute inset-0 bg-cover bg-center opacity-20"
                style={{
                  backgroundImage: 'url(/images/banner.jpg)',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}
              ></div>
              
              <div className="flex items-center justify-between px-4 text-sm h-full relative z-10">
                {/* Left side - Navigation items */}
                <div className="flex items-center gap-4 overflow-x-auto">
                  <button className="text-gray-300 hover:text-white transition-colors flex items-center gap-2 whitespace-nowrap">
                    <Home className="w-4 h-4" />
                    <span>Home</span>
                  </button>
                  <button className="text-gray-300 hover:text-white transition-colors whitespace-nowrap">
                    <span>FAQ</span>
                  </button>
                  <button className="text-gray-300 hover:text-white transition-colors whitespace-nowrap">
                    <span>My Clubs</span>
                  </button>
                  <button className="text-lime-400 hover:text-lime-300 transition-colors whitespace-nowrap font-semibold">
                    <span>Club Magiw Avellino</span>
                  </button>
                  {activeTab === 'my-entity' && (
                    <button 
                      onClick={() => setShowWorkoutSection(!showWorkoutSection)}
                      className={`transition-colors whitespace-nowrap ${
                        showWorkoutSection 
                          ? 'text-lime-400 hover:text-lime-300 font-semibold' 
                          : 'text-gray-300 hover:text-white'
                      }`}
                    >
                      <span>Workouts section</span>
                    </button>
                  )}
                  <button className="text-gray-300 hover:text-white transition-colors whitespace-nowrap">
                    <span>FunClub</span>
                  </button>
                  <button className="text-gray-300 hover:text-white transition-colors whitespace-nowrap">
                    <span>My Shared Clubs</span>
                  </button>
                  <button className="text-gray-300 hover:text-white transition-colors whitespace-nowrap">
                    <span>Other Clubs</span>
                  </button>
                  <button className="text-gray-300 hover:text-white transition-colors whitespace-nowrap">
                    <span>Populars</span>
                  </button>
                </div>

                {/* Right side - Action buttons (only for My Page) */}
                {activeTab === 'my-page' && (
                  <div className="flex items-center gap-3 ml-4">
                    <button className="bg-white hover:bg-gray-100 text-gray-800 px-4 py-2 rounded transition-colors whitespace-nowrap text-sm font-medium">
                      Upgrade informations
                    </button>
                    <button className="bg-white hover:bg-gray-100 text-gray-800 px-4 py-2 rounded transition-colors whitespace-nowrap text-sm font-medium">
                      Logger of activities
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 flex gap-0">
          {showLeftSidebar && (
            <div className="w-80 flex-shrink-0 sticky top-0 self-start">
              <DarkSidebar
                userType={user?.userType || ''}
                entities={groups}
                selectedEntityId={selectedGroupId}
                clubMyClubTabVisible={myEntityTabVisible}
                onEntitySelect={handleGroupSelect}
                activeTab={activeTab}
                onTabChange={handleTabChange}
                onMyPageClick={handleMyPageTabClick}
                onMyGroupClick={() => {
                  if (!myEntityTabVisible) return;
                  setActiveTab('my-entity');
                  if (selectedGroupId) {
                    window.location.href = `/my-group?groupId=${selectedGroupId}`;
                  } else if (formCreatedGroups.length > 0) {
                    window.location.href = `/my-group?groupId=${formCreatedGroups[0].id}`;
                  }
                }}
                onCreateGroupClick={entityCreation.openCreateFlow}
                onSuggestMovesbookClick={() => router.push('/users/notification_by_promocode')}
              />
            </div>
          )}

          <div className="flex-1 min-w-0 flex flex-col px-4">
            {activeTab === 'my-page' && (
              <div className="bg-white rounded-lg shadow-sm border p-6 flex-1 flex flex-col">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">My Page</h2>
                {!hasFormGroup ? (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center text-gray-500">
                      <Users className="w-20 h-20 mx-auto mb-6 opacity-60" />
                      <p className="text-2xl font-bold mb-2">Set up your group</p>
                      <p className="text-lg mb-4 max-w-md">
                        Expand <strong>My group</strong> in the sidebar, click <strong>Create a group</strong>,
                        and save your group profile.
                      </p>
                      <button
                        type="button"
                        onClick={entityCreation.openCreateFlow}
                        className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700"
                      >
                        Create a group
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="max-w-2xl space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-6">
                    <p className="text-gray-700">
                      Your personal group admin page. Use the sidebar to open a group or manage
                      workouts.
                    </p>
                  </div>
                )}
              </div>
            )}
            
            {activeTab === 'my-entity' && !showWorkoutSection && (
              <div className="bg-white rounded-lg shadow-sm border p-8 flex-1 flex items-center justify-center">
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Welcome to Your Group</h2>
                  <p className="text-gray-600 mb-6">Click on "Workouts section" in the navigation bar above to view and manage workouts.</p>
                  <button 
                    onClick={() => setShowWorkoutSection(true)}
                    className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition"
                  >
                    Go to Workouts Section
                  </button>
                </div>
              </div>
            )}
            
            {activeTab === 'my-entity' && showWorkoutSection && (
              <div className="bg-white rounded-lg shadow-sm border p-6 flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Workouts Section</h2>
                  <button
                    type="button"
                    onClick={entityCreation.openCreateFlow}
                    className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-all duration-200"
                  >
                    Create a group
                  </button>
                </div>

                {formCreatedGroups.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center text-gray-500">
                      <Users className="w-20 h-20 mx-auto mb-6 opacity-60" />
                      <p className="text-2xl font-bold mb-2">No groups yet</p>
                      <p className="text-lg mb-4">Create your first group to start managing users</p>
                      <button
                        type="button"
                        onClick={entityCreation.openCreateFlow}
                        className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700"
                      >
                        Create a group
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {formCreatedGroups.map((group) => (
                      <div
                        key={group.id}
                        onClick={() => handleGroupSelect(group.id)}
                        className="p-6 border-2 border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all duration-300 cursor-pointer"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-xl flex items-center justify-center">
                            <Users className="w-6 h-6 text-white" />
                          </div>
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        </div>
                        <h3 className="font-bold text-gray-900 text-lg mb-2">{group.name}</h3>
                        <p className="text-sm text-gray-600 mb-2">{group.description || 'Group'}</p>
                        {group.groupType && <p className="text-xs text-gray-500 mb-4">{group.groupType}</p>}
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-500">{group.memberCount || 0} members</span>
                          <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">Active</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {showRightSidebar && (
            <RightSidebar 
              context="my-club" 
              activeTab={activeTab}
              onAddMember={() => setShowAddMemberModal(true)}
            />
          )}
        </div>
      </div>
      
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
        entityType="group"
      />

      <AdminPasswordConfirmModal
        isOpen={entityCreation.showAdminPasswordConfirm}
        onClose={() => entityCreation.setShowAdminPasswordConfirm(false)}
        onVerified={entityCreation.handleAdminPasswordVerified}
        adminUsername={user?.username ?? user?.name ?? 'username'}
        entityKind="group"
      />

      <CreateEntityModal
        key={entityCreation.createModalKey}
        entityKind="group"
        isOpen={entityCreation.showCreateModal}
        onClose={() => entityCreation.setShowCreateModal(false)}
        adminUsername={user?.username ?? user?.name ?? 'username'}
        saving={entityCreation.createSaving}
        onSave={entityCreation.handleCreateSave}
      />
      <SimpleFooter />
    </div>
  );
}


'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

// Force dynamic rendering for authenticated pages
export const dynamic = 'force-dynamic';
import { 
  Calendar, 
  BarChart3, 
  Settings, 
  Dumbbell,
  Target,
  Award,
  Plus,
  CheckCircle,
  Eye,
  EyeOff,
  Users,
  Building2,
  ChevronRight,
  ChevronDown,
  UserCircle,
  Activity,
  TrendingUp,
  Home,
  Menu,
  HelpCircle,
  CalendarCheck,
  CalendarDays,
  CheckSquare,
  User,
  Save,
  Mail,
  Filter,
  Palette,
  ExternalLink,
  Star,
  Trophy,
  Grid,
  Download,
  MessageSquare
} from 'lucide-react';
import AdvertisementCarousel from '@/components/AdvertisementCarousel';
import ModernNavbar from '@/components/ModernNavbar';
import DarkSidebar from '@/components/DarkSidebar';
import SimpleFooter from '@/components/SimpleFooter';
import AddMemberModal from '@/components/AddMemberModal';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import WorkoutSection from '@/components/workouts/WorkoutSection';
import BackgroundsColorsSettings from '@/components/settings/BackgroundsColorsSettings';
import ToolsSettings from '@/components/settings/ToolsSettings';
import FavouritesSettings from '@/components/settings/FavouritesSettings';
import MyBestSettings from '@/components/settings/MyBestSettings';
import GridDisplaySettings from '@/components/settings/GridDisplaySettings';

// 2026-01-22 13:30 UTC - Placeholder component for avatar images (replaces Unsplash timeout issues)
const AvatarPlaceholder = ({ size = 'w-10 h-10' }: { size?: string }) => (
  <div className={`${size} rounded bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold flex-shrink-0`}>
    <User size={size.includes('12') ? 24 : 20} />
  </div>
);

export default function AthleteDashboard() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  
  // All hooks must be called before any conditional returns
  const [activeSection, setActiveSection] = useState<'overview' | 'workouts' | 'progress' | 'settings' | 'personal-settings'>('overview');
  const [showAdBanner, setShowAdBanner] = useState(true);
  const [showPersonalBanner, setShowPersonalBanner] = useState(true);
  const [showLeftSidebar, setShowLeftSidebar] = useState(true);
  const [showRightSidebar, setShowRightSidebar] = useState(true);
  const [showToolbar, setShowToolbar] = useState(true);
  const showLegacyButtonBars = false;
  const [activeRightTab, setActiveRightTab] = useState<'actions-planner' | 'chat-panel'>('actions-planner');
  const [expandedActionsPlanner, setExpandedActionsPlanner] = useState(true);
  const [activeTab, setActiveTab] = useState<'my-page' | 'my-entity'>('my-page');
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [telegramAccount, setTelegramAccount] = useState('');
  const [userTelegramAccount, setUserTelegramAccount] = useState<string | null>(null);
  const [isLoadingTelegram, setIsLoadingTelegram] = useState(false);
  
  // Entities athlete belongs to
  const [myCoaches, setMyCoaches] = useState<any[]>([]);
  const [myTeams, setMyTeams] = useState<any[]>([]);
  const [myClubs, setMyClubs] = useState<any[]>([]);
  const [myGroups, setMyGroups] = useState<any[]>([]);
  
  // Current period and week data
  const [currentPeriod, setCurrentPeriod] = useState<{ name: string; color: string } | null>(null);
  const [currentWeek, setCurrentWeek] = useState<number>(1);

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  // Redirect if not athlete
  useEffect(() => {
    if (user && !['ATHLETE', 'ADMIN'].includes(user.userType)) {
      router.push('/my-page');
    }
  }, [user, router]);

  // Load entities the athlete belongs to
  useEffect(() => {
    if (user && user.userType === 'ATHLETE') {
      loadMyCoaches();
      loadMyTeams();
      loadMyClubs();
      loadMyGroups();
      loadCurrentWeekAndPeriod();
      loadTelegramAccount();
    }
  }, [user]);

  const loadTelegramAccount = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/user/telegram-account', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setUserTelegramAccount(data.telegramAccount);
      }
    } catch (error) {
      console.error('Error loading Telegram account:', error);
    }
  };

  const handleChatPanelClick = () => {
    if (userTelegramAccount) {
      // User already joined, navigate to chat page
      router.push('/athlete/chat');
    } else {
      // User hasn't joined, show join modal
      setShowJoinModal(true);
    }
  };

  const handleJoinChat = async () => {
    if (!telegramAccount.trim()) {
      alert('Please enter your Telegram account');
      return;
    }

    // Ensure it starts with @
    const formattedAccount = telegramAccount.startsWith('@') 
      ? telegramAccount 
      : `@${telegramAccount}`;

    setIsLoadingTelegram(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/user/telegram-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ telegramAccount: formattedAccount })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setUserTelegramAccount(formattedAccount);
          setShowJoinModal(false);
          setTelegramAccount('');
          // Navigate to chat page
          router.push('/athlete/chat');
        } else {
          alert(data.error || 'Failed to save Telegram account');
        }
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to save Telegram account');
      }
    } catch (error) {
      console.error('Error saving Telegram account:', error);
      alert('Error saving Telegram account. Please try again.');
    } finally {
      setIsLoadingTelegram(false);
    }
  };

  // Hide right sidebar when workout section or personal settings opens
  useEffect(() => {
    if (activeTab === 'my-page' && (activeSection === 'workouts' || activeSection === 'personal-settings')) {
      setShowRightSidebar(false);
    } else {
      setShowRightSidebar(true);
    }
  }, [activeTab, activeSection]);

  // Don't render if not authenticated (after all hooks are called)
  if (loading || !user) {
    return null;
  }

  const loadMyCoaches = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/athletes/my-coaching-groups', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setMyCoaches(data.coachingGroups || []);
      }
    } catch (error) {
      console.error('Error loading my coaches:', error);
    }
  };

  const loadMyTeams = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/athletes/my-teams', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setMyTeams(data.teams || []);
      }
    } catch (error) {
      console.error('Error loading my teams:', error);
    }
  };

  const loadMyClubs = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/athletes/my-clubs', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setMyClubs(data.clubs || []);
      }
    } catch (error) {
      console.error('Error loading my clubs:', error);
    }
  };

  const loadMyGroups = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/athletes/my-groups', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setMyGroups(data.groups || []);
      }
    } catch (error) {
      console.error('Error loading my groups:', error);
    }
  };

  const loadCurrentWeekAndPeriod = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/workouts/plan?type=CURRENT_WEEKS', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        if (data.plan?.weeks && data.plan.weeks.length > 0) {
          // Find the current week (week 2 in Section A)
          const currentWeekData = data.plan.weeks.find((w: any) => w.weekNumber === 2);
          if (currentWeekData) {
            setCurrentWeek(currentWeekData.originalWeekNumber || currentWeekData.weekNumber);
            
            // Get period from the current week's first day or week itself
            if (currentWeekData.period) {
              setCurrentPeriod({
                name: currentWeekData.period.name || 'Base',
                color: currentWeekData.period.color || '#14b8a6'
              });
            } else if (currentWeekData.days && currentWeekData.days.length > 0) {
              const firstDay = currentWeekData.days[0];
              if (firstDay.periodName && firstDay.periodColor) {
                setCurrentPeriod({
                  name: firstDay.periodName,
                  color: firstDay.periodColor
                });
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error loading current week and period:', error);
    }
  };

  const storeSelectedEntity = (entityType: string, entityId: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`selected${entityType}`, entityId);
    }
  };

  const handleMyCoachingGroupSelect = (groupId: string) => {
    storeSelectedEntity('CoachingGroup', groupId);
    window.location.href = `/my-coaching-group?groupId=${groupId}`;
  };

  const handleMyTeamSelect = (teamId: string) => {
    storeSelectedEntity('Team', teamId);
    window.location.href = `/my-team?teamId=${teamId}`;
  };

  const handleMyClubSelect = (clubId: string) => {
    storeSelectedEntity('Club', clubId);
    window.location.href = `/my-club?clubId=${clubId}`;
  };

  const handleMyGroupSelect = (groupId: string) => {
    storeSelectedEntity('Group', groupId);
    window.location.href = `/my-group?groupId=${groupId}`;
  };

  return (
    <div className="bg-gray-50 flex flex-col" style={{ minHeight: '100vh' }}>
      <div className="print:hidden">
        <ModernNavbar />
      </div>
      
      {/* Display Options Toolbar */}
      <div className={`bg-white border-b px-4 py-1 transition-all duration-300 print:hidden ${showToolbar ? '' : 'overflow-hidden'}`}>
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
            {showLegacyButtonBars && (
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => {
                    setActiveTab('my-page');
                    setActiveSection('overview');
                  }}
                  className="bg-blue-800/90 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-blue-700/90 transition-colors cursor-pointer text-sm"
                >
                  Activity Overview
                </button>
                <button
                  onClick={() => {
                    setActiveTab('my-page');
                    setActiveSection('workouts');
                  }}
                  className="bg-blue-800/90 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-blue-700/90 transition-colors cursor-pointer text-sm"
                >
                  My Workouts
                </button>
              </div>
            )}
            <label className="flex items-center gap-2 text-sm cursor-pointer ml-auto">
              <input type="checkbox" checked={showToolbar} onChange={(e) => setShowToolbar(e.target.checked)} className="w-4 h-4" />
              <span className="flex items-center gap-1 text-gray-600">
                {showToolbar ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                <span className="font-medium">Display Options</span>
              </span>
            </label>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col w-full py-2">
        {showAdBanner && (
          <div className="flex-shrink-0">
            <AdvertisementCarousel />
          </div>
        )}
        {showLegacyButtonBars && (
          <div className="flex-shrink-0">
            <div className="bg-slate-900/90 backdrop-blur-sm border-b border-slate-700 px-4 py-3">
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  onClick={() => {
                    setActiveTab('my-page');
                    setActiveSection('overview');
                  }}
                  className="bg-blue-800/90 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700/90 transition-colors cursor-pointer"
                >
                  Activity Overview
                </button>
                <button
                  onClick={() => {
                    setActiveTab('my-page');
                    setActiveSection('workouts');
                  }}
                  className="bg-blue-800/90 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700/90 transition-colors cursor-pointer"
                >
                  My Workouts
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Video/Image Banner with Info Cards */}
        {showPersonalBanner && (
          <div className="flex-shrink-0">
            <div className="relative overflow-hidden shadow-lg" style={{ height: '300px' }}>
              <Image 
                src="/images/banner.jpg" 
                alt="Athlete Background"
                fill
                sizes="100vw"
                className="object-cover opacity-60"
              />
              <div className="absolute inset-0 bg-gradient-to-br from-gray-900/60 to-gray-800/60" />

              <div className="absolute top-4 right-4 flex gap-3">
                <div className="bg-gray-800/90 backdrop-blur-sm rounded-lg p-3 text-white min-w-[120px]">
                  <p className="text-xs text-gray-400 uppercase mb-1">Active Season</p>
                  <p className="font-semibold">2025 Indoor</p>
                  <p className="text-sm">Championship</p>
                </div>
                <div 
                  className="backdrop-blur-sm rounded-lg p-3 text-white min-w-[120px]"
                  style={{ backgroundColor: currentPeriod?.color ? `${currentPeriod.color}e6` : '#14b8a6e6' }}
                >
                  <p className="text-xs text-gray-200 uppercase mb-1">Period</p>
                  <p className="font-semibold">{currentPeriod?.name || 'Base'}</p>
                  <p className="text-sm">Conditioning</p>
                </div>
                <div className="bg-blue-600/90 backdrop-blur-sm rounded-lg p-3 text-white min-w-[100px]">
                  <p className="text-xs text-gray-200 uppercase mb-1">Week</p>
                  <p className="text-2xl font-bold">{currentWeek}</p>
                </div>
                <div className="bg-green-700/90 backdrop-blur-sm rounded-lg p-3 text-white min-w-[140px]">
                  <p className="text-xs text-gray-200 uppercase mb-1">Next Event</p>
                  <p className="font-semibold">Continental Cup 21 Jul</p>
                </div>
              </div>

              <div className="absolute bottom-4 left-4 flex gap-3">
                <button
                  onClick={() => {
                    setActiveTab('my-page');
                    setActiveSection('overview');
                  }}
                  className="bg-blue-800/90 backdrop-blur-sm text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700/90 transition-colors cursor-pointer"
                >
                  Activity Overview
                </button>
                <button
                  onClick={() => {
                    setActiveTab('my-page');
                    setActiveSection('workouts');
                  }}
                  className="bg-blue-800/90 backdrop-blur-sm text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700/90 transition-colors cursor-pointer"
                >
                  My Workouts
                </button>
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

        {!showPersonalBanner && (
          <div className="flex-shrink-0">
            <div className="bg-slate-900/90 backdrop-blur-sm border-b border-slate-700 px-4 py-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setActiveTab('my-page');
                    setActiveSection('overview');
                  }}
                  className="bg-blue-800/90 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700/90 transition-colors cursor-pointer"
                >
                  Activity Overview
                </button>
                <button
                  onClick={() => {
                    setActiveTab('my-page');
                    setActiveSection('workouts');
                  }}
                  className="bg-blue-800/90 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700/90 transition-colors cursor-pointer"
                >
                  My Workouts
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 flex gap-0">
          {/* Left Sidebar - Always Visible */}
          {showLeftSidebar && (
            <div className="w-80 flex-shrink-0 sticky top-0 self-start print:hidden">
              <DarkSidebar
                userType={user?.userType || ''}
                entities={myClubs}
                selectedEntityId={null}
                onEntitySelect={(id) => {}}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                onMyPageClick={() => {
                  setActiveTab('my-page');
                  setActiveSection('overview');
                }}
                onMyClubClick={() => setActiveTab('my-entity')}
              />
            </div>
          )}

          {/* Main Content Area */}
          <div className={`flex-1 min-w-0 flex flex-col ${activeTab === 'my-page' && activeSection === 'personal-settings' ? '' : 'px-4'}`}>
            {activeTab === 'my-page' && (
              <div className="flex-1">
                {activeSection === 'overview' && <AthleteOverview t={t} />}
                {activeSection === 'workouts' && <WorkoutSection onClose={() => setActiveSection('overview')} />}
                {activeSection === 'progress' && <AthleteProgress t={t} />}
                {activeSection === 'settings' && <AthleteSettings t={t} />}
                {activeSection === 'personal-settings' && <PersonalSettingsContent t={t} user={user} />}
              </div>
            )}
            
            {activeTab === 'my-entity' && (
              <div className="bg-white rounded-lg shadow-sm border p-8 pt-12 flex-1 flex items-start justify-center">
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">My Club Page</h2>
                  <p className="text-gray-600 mb-6">Club-related content will be displayed here.</p>
                </div>
              </div>
            )}
          </div>

          {/* Right Sidebar - Hidden when Personal Settings is active */}
          {!(activeTab === 'my-page' && activeSection === 'personal-settings') && showRightSidebar && (
            <div className="w-80 flex-shrink-0 print:hidden">
              <div className="bg-white rounded-lg shadow-sm border p-4 h-full flex flex-col overflow-y-auto">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('sidebar_quick_actions')}</h3>
                <div className="space-y-2">
                  {/* Personal Settings Button - FIRST button in Quick Actions */}
                  <button
                    onClick={() => setActiveSection('personal-settings')}
                    className="w-full flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 group"
                  >
                    <Settings className="w-5 h-5 text-gray-400 group-hover:text-blue-500 flex-shrink-0" />
                    <span className="text-sm font-medium text-gray-700 group-hover:text-blue-700 text-left">Personal settings</span>
                  </button>
                  
                  {/* Quick Actions for My Page (Athlete) */}
                  <button className="w-full flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 group">
                    <Calendar className="w-5 h-5 text-gray-400 group-hover:text-blue-500 flex-shrink-0" />
                    <span className="text-sm font-medium text-gray-700 group-hover:text-blue-700 text-left">{t('sidebar_plan_new_workout')}</span>
                  </button>
                  
                  <button className="w-full flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 group">
                    <CalendarDays className="w-5 h-5 text-gray-400 group-hover:text-blue-500 flex-shrink-0" />
                    <span className="text-sm font-medium text-gray-700 group-hover:text-blue-700 text-left">{t('sidebar_plan_3_weeks')}</span>
                  </button>
                  
                  <button className="w-full flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 group">
                    <CalendarCheck className="w-5 h-5 text-gray-400 group-hover:text-blue-500 flex-shrink-0" />
                    <span className="text-sm font-medium text-gray-700 group-hover:text-blue-700 text-left">{t('sidebar_plan_of_year')}</span>
                  </button>
                  
                  <button className="w-full flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 group">
                    <CheckSquare className="w-5 h-5 text-gray-400 group-hover:text-blue-500 flex-shrink-0" />
                    <span className="text-sm font-medium text-gray-700 group-hover:text-blue-700 text-left">{t('sidebar_log_completed')}</span>
                  </button>
                  
                  <button className="w-full flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 group">
                    <Save className="w-5 h-5 text-gray-400 group-hover:text-blue-500 flex-shrink-0" />
                    <span className="text-sm font-medium text-gray-700 group-hover:text-blue-700 text-left">{t('sidebar_save_session')}</span>
                  </button>
                  
                  {/* Chat Panel Button */}
                  <button 
                    onClick={handleChatPanelClick}
                    className="w-full flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 group"
                  >
                    <MessageSquare className="w-5 h-5 text-gray-400 group-hover:text-blue-500 flex-shrink-0" />
                    <span className="text-sm font-medium text-gray-700 group-hover:text-blue-700 text-left">Chat panel</span>
                  </button>
                </div>

                {/* Next Event Section - For "My Page" */}
                <div className="mt-6 border-t pt-4">
                  <div className="bg-gray-800 text-white px-3 py-2 rounded-t-lg flex items-center justify-between">
                    <h4 className="text-sm font-semibold">{t('sidebar_next_event')}</h4>
                    <button className="text-xs text-gray-300 hover:text-white">{t('sidebar_see_all')}</button>
                  </div>
                  
                  <div className="bg-gray-100 px-3 py-2 space-y-2">
                    <button className="w-full text-left text-xs text-gray-700 hover:text-gray-900 py-1">
                      {t('sidebar_events_my_sports')}
                    </button>
                    <button className="w-full text-left text-xs text-gray-700 hover:text-gray-900 py-1">
                      {t('sidebar_my_friends_events')}
                    </button>
                    <button className="w-full text-left text-xs text-gray-700 hover:text-gray-900 py-1">
                      {t('sidebar_event_other_sport')}
                    </button>
                  </div>
                </div>

                {/* News by My Friends Section - For "My Page" */}
                <div className="mt-6 border-t pt-4">
                  <div className="bg-gray-800 text-white px-3 py-2 rounded-t-lg flex items-center justify-between">
                    <h4 className="text-sm font-semibold">{t('sidebar_news_my_friends')}</h4>
                    <button className="text-xs text-gray-300 hover:text-white">{t('sidebar_see_all')}</button>
                  </div>
                  
                  <div className="mt-2 space-y-3 px-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-start gap-2 py-2 hover:bg-gray-50 rounded-lg transition-colors">
                        <AvatarPlaceholder size="w-10 h-10" />
                        <div className="flex-1">
                          <p className="text-xs font-medium text-gray-800">Friend {i}</p>
                          <p className="text-xs text-gray-600 line-clamp-2">
                            Lorem ipsum dolor sit amet...
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Newest Members Section - For "My Page" */}
                <div className="mt-6 border-t pt-4">
                  <div className="bg-gray-800 text-white px-3 py-2 rounded-t-lg">
                    <h4 className="text-sm font-semibold">{t('sidebar_newest_members')}</h4>
                  </div>
                  
                  {/* Filter Button */}
                  <button className="w-full bg-teal-600 hover:bg-teal-700 text-white py-2 px-3 text-sm font-medium transition-colors flex items-center justify-center gap-2">
                    <Filter className="w-4 h-4" />
                    {t('sidebar_filter_option')}
                  </button>
                  
                  {/* Members List - 3 members */}
                  <div className="mt-3 space-y-2 px-3">
                    {[
                      { name: 'John Smith', img: 'photo-1500648767791-00dcc994a43e' },
                      { name: 'Sarah Johnson', img: 'photo-1494790108377-be9c29b29330' },
                      { name: 'Mike Davis', img: 'photo-1507003211169-0a1dd7228f2d' }
                    ].map((member, i) => (
                      <div key={i} className="flex items-start gap-3 py-2 hover:bg-gray-50 rounded-lg transition-colors">
                        <AvatarPlaceholder size="w-12 h-12" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-800">{member.name}</p>
                          <button className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-800 mt-1">
                            <Mail className="w-3 h-3" />
                            {t('sidebar_send_message')}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Members Last Logged In Section - For "My Page" */}
                <div className="mt-6 border-t pt-4">
                  <div className="bg-gray-800 text-white px-3 py-2 rounded-t-lg flex items-center justify-between">
                    <h4 className="text-sm font-semibold">{t('sidebar_members_last_logged')}</h4>
                    <button className="text-xs text-gray-300 hover:text-white">{t('sidebar_see_all')}</button>
                  </div>
                  
                  {/* Filter Button */}
                  <button className="w-full bg-teal-600 hover:bg-teal-700 text-white py-2 px-3 text-sm font-medium transition-colors flex items-center justify-center gap-2">
                    <Filter className="w-4 h-4" />
                    {t('sidebar_filter_option')}
                  </button>
                  
                  {/* Members List - 3 members */}
                  <div className="mt-3 space-y-2 px-3">
                    {[
                      { name: 'Freiwildplayer', img: 'photo-1566492031773-4f4e44671857' },
                      { name: 'Alex Runner', img: 'photo-1534528741775-53994a69daeb' },
                      { name: 'Emma Swift', img: 'photo-1438761681033-6461ffad8d80' }
                    ].map((member, i) => (
                      <div key={i} className="flex items-start gap-3 py-2 hover:bg-gray-50 rounded-lg transition-colors">
                        <AvatarPlaceholder size="w-12 h-12" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-800">{member.name}</p>
                          <button className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-800 mt-1">
                            <Mail className="w-3 h-3" />
                            {t('sidebar_send_message')}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions Planner and Chat Panel Tabs */}
                <div className="mt-6">
                  <div className="flex border-b border-gray-200 mb-4">
                    <button
                      onClick={() => setActiveRightTab('actions-planner')}
                      className={`flex-1 py-2 px-4 text-sm font-medium transition-colors ${
                        activeRightTab === 'actions-planner'
                          ? 'bg-gray-100 text-gray-900 border-b-2 border-blue-600'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Actions planner
                    </button>
                    <button
                      onClick={() => setActiveRightTab('chat-panel')}
                      className={`flex-1 py-2 px-4 text-sm font-medium transition-colors ${
                        activeRightTab === 'chat-panel'
                          ? 'bg-gray-100 text-gray-900 border-b-2 border-blue-600'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Chat panel
                    </button>
                  </div>

                  {/* Actions Planner Content */}
                  {activeRightTab === 'actions-planner' && (
                    <div className="space-y-1">
                      <button className="w-full flex items-center justify-between py-2 px-3 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
                        <span>Timeline of all users</span>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </button>
                      <button className="w-full flex items-center justify-between py-2 px-3 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
                        <span>Timeline of an user</span>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </button>
                      <button className="w-full flex items-center justify-between py-2 px-3 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
                        <span>Actions planned</span>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </button>
                      <button className="w-full flex items-center justify-between py-2 px-3 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
                        <span>Users of the action planner</span>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </button>
                      <button 
                        onClick={() => setExpandedActionsPlanner(!expandedActionsPlanner)}
                        className="w-full flex items-center justify-between py-2 px-3 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                      >
                        <span>Settings</span>
                        {expandedActionsPlanner ? (
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                        )}
                      </button>
                      {expandedActionsPlanner && (
                        <div className="ml-4 space-y-1">
                          <button className="w-full flex items-center justify-between py-2 px-3 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
                            <span>Preset timelines</span>
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                          </button>
                          <button className="w-full flex items-center justify-between py-2 px-3 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
                            <span>Actions settings</span>
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                          </button>
                          <button className="w-full flex items-center justify-between py-2 px-3 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
                            <span>Action settings by MB</span>
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Chat Panel Content */}
                  {activeRightTab === 'chat-panel' && (
                    <div className="text-sm text-gray-600 py-4">
                      Chat panel content will be displayed here.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="print:hidden">
        <SimpleFooter />
      </div>

      {/* Join Chat Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Provide 'I've joined' confirmation button
              </h2>
              
              <div className="mb-6">
                <p className="text-sm text-gray-600 mb-4">
                  Let them confirm inside Movesbook chat page UI
                </p>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Telegram Account
                  </label>
                  <input
                    type="text"
                    value={telegramAccount}
                    onChange={(e) => setTelegramAccount(e.target.value)}
                    placeholder="@username"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Enter your Telegram username (e.g., @username)
                  </p>
                </div>

                {!telegramAccount && (
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-gray-700 mb-2">
                      Don't have a Telegram account?
                    </p>
                    <a
                      href="https://telegram.org/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1"
                    >
                      Create a Telegram account
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowJoinModal(false);
                    setTelegramAccount('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleJoinChat}
                  disabled={isLoadingTelegram || !telegramAccount.trim()}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoadingTelegram ? 'Saving...' : "I've joined"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AthleteOverview({ t }: { t: (key: string) => string }) {
  const [stats, setStats] = useState({
    thisWeekWorkouts: 0,
    thisMonthWorkouts: 0,
    totalMoveframes: 0,
    completionRate: 0
  });
  const [recentWorkouts, setRecentWorkouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWorkoutStats();
  }, []);

  const loadWorkoutStats = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Load current weeks plan to get workout data
      const response = await fetch('/api/workouts/plan?type=CURRENT_WEEKS', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        const weeks = data.plan?.weeks || [];
        const storageZone = data.plan?.storageZone;
        
        // Calculate statistics
        let thisWeekCount = 0;
        let totalWorkouts = 0;
        let totalMoveframes = 0;
        const recentWorkoutsList: any[] = [];
        
        weeks.forEach((week: any) => {
          week.days?.forEach((day: any) => {
            day.workouts?.forEach((workout: any) => {
              totalWorkouts++;
              if (week.weekNumber === 2) { // Current week in Section A
                thisWeekCount++;
              }
              totalMoveframes += workout.moveframes?.length || 0;
              
              // Collect recent workouts
              if (recentWorkoutsList.length < 5) {
                recentWorkoutsList.push({
                  id: workout.id,
                  name: workout.name,
                  date: day.date,
                  weekNumber: week.weekNumber,
                  dayNumber: day.dayNumber,
                  storageZone: storageZone,
                  moveframeCount: workout.moveframes?.length || 0
                });
              }
            });
          });
        });
        
        setStats({
          thisWeekWorkouts: thisWeekCount,
          thisMonthWorkouts: totalWorkouts,
          totalMoveframes: totalMoveframes,
          completionRate: totalWorkouts > 0 ? Math.round((totalMoveframes / (totalWorkouts * 5)) * 100) : 0
        });
        
        setRecentWorkouts(recentWorkoutsList);
      }
    } catch (error) {
      console.error('Error loading workout stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6 flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading workout data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6 flex-1 flex flex-col print-content activity-overview">
      {/* Print Header - Only visible when printing */}
      <div className="hidden print:block mb-6 pb-4 border-b-2 border-gray-300">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">{t('dashboard_activity_overview')}</h1>
        <p className="text-sm text-gray-600">Generated on {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      {/* Screen Header */}
      <div className="flex items-center justify-between mb-6 print:hidden">
        <h2 className="text-2xl font-bold text-gray-900">{t('dashboard_activity_overview')}</h2>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-8 page-break-avoid">
        <div className="stat-card bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-xl text-white shadow-lg">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium opacity-90">{t('dashboard_this_week')}</h3>
            <Calendar className="w-5 h-5 opacity-90 print:hidden" />
          </div>
          <p className="text-3xl font-bold mt-3">{stats.thisWeekWorkouts} {t('dashboard_workouts_count')}</p>
        </div>
        <div className="stat-card bg-gradient-to-br from-green-500 to-green-600 p-6 rounded-xl text-white shadow-lg">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium opacity-90">Total Workouts</h3>
            <Target className="w-5 h-5 opacity-90 print:hidden" />
          </div>
          <p className="text-3xl font-bold mt-3">{stats.thisMonthWorkouts}</p>
        </div>
        <div className="stat-card bg-gradient-to-br from-purple-500 to-purple-600 p-6 rounded-xl text-white shadow-lg">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium opacity-90">Total Moveframes</h3>
            <Award className="w-5 h-5 opacity-90 print:hidden" />
          </div>
          <p className="text-3xl font-bold mt-3">{stats.totalMoveframes}</p>
        </div>
      </div>
      <div className="flex-1 page-break-avoid">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('dashboard_recent_activity_feed')}</h3>
        {recentWorkouts.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Calendar className="w-16 h-16 mx-auto mb-4 opacity-50 print:hidden" />
            <p className="text-lg">No workouts planned yet</p>
            <p className="text-sm mt-2 print:hidden">Click "My Workouts" to start planning</p>
          </div>
        ) : (
          <div className="space-y-4">
            {recentWorkouts.map((workout) => {
              // For Section A (storage zones A, B, C), display week/day numbers instead of dates
              const isTemplateSection = workout.storageZone === 'A' || workout.storageZone === 'B' || workout.storageZone === 'C';
              const dateInfo = isTemplateSection 
                ? `Week ${workout.weekNumber}, Day ${workout.dayNumber}`
                : new Date(workout.date).toLocaleDateString();
              
              return (
                <div key={workout.id} className="p-4 border-2 border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 page-break-avoid">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-gray-900">{workout.name || 'Workout Session'}</h4>
                      <p className="text-sm text-gray-500">
                        {dateInfo} • {workout.moveframeCount} moveframes
                      </p>
                    </div>
                    <Activity className="w-6 h-6 text-blue-500 print:hidden" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function AthleteWorkouts({ t }: { t: (key: string) => string }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border p-6 flex-1 flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">{t('dashboard_my_workouts')}</h2>
        <button className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-all duration-200 shadow-md hover:shadow-lg">
          {t('dashboard_add_workout')}
        </button>
      </div>
      <div className="flex-1">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('dashboard_personal_workout_plans')}</h3>
        <div className="space-y-4">
          {[1, 2, 3].map((item) => (
            <div key={item} className="flex items-center justify-between p-4 border-2 border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all duration-200">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Dumbbell className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Training Plan #{item}</h4>
                  <p className="text-sm text-gray-500">Active • 5 workouts scheduled</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">Progress: 60%</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AthleteProgress({ t }: { t: (key: string) => string }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border p-6 flex-1 flex flex-col">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('dashboard_progress_analytics')}</h2>
      <div className="grid grid-cols-2 gap-6 flex-1">
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center p-8">
          <div className="text-center text-gray-500">
            <BarChart3 className="w-16 h-16 mx-auto mb-4 opacity-60" />
            <p className="text-lg font-medium">Progress Chart</p>
            <p className="text-sm mt-2">Your workout progress over time</p>
          </div>
        </div>
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center p-8">
          <div className="text-center text-gray-500">
            <TrendingUp className="w-16 h-16 mx-auto mb-4 opacity-60" />
            <p className="text-lg font-medium">Performance Trends</p>
            <p className="text-sm mt-2">Track your improvements</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function AthleteSettings({ t }: { t: (key: string) => string }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border p-6 flex-1 flex flex-col">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('sidebar_settings')}</h2>
      <div className="space-y-4 flex-1">
        <div className="p-6 border-2 border-gray-200 rounded-xl hover:border-blue-300 transition-all duration-200">
          <h3 className="font-semibold text-gray-900 mb-3 text-lg">Profile Settings</h3>
          <p className="text-gray-600">Manage your personal information and preferences</p>
        </div>
        <div className="p-6 border-2 border-gray-200 rounded-xl hover:border-green-300 transition-all duration-200">
          <h3 className="font-semibold text-gray-900 mb-3 text-lg">Workout Preferences</h3>
          <p className="text-gray-600">Customize your workout experience and default settings</p>
        </div>
      </div>
      <SimpleFooter />
    </div>
  );
}

function PersonalSettingsContent({ t, user }: { t: (key: string) => string; user: any }) {
  const [activeSettingsTab, setActiveSettingsTab] = useState<'backgrounds' | 'tools' | 'favourites' | 'mybest' | 'grid'>('backgrounds');
  const [loading, setLoading] = useState(false);
  const userLanguage = user?.language || 'en';

  const loadDefaultSettings = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/user/settings/load-defaults?language=${userLanguage}`);
      if (response.ok) {
        const data = await response.json();
        
        if (data.success) {
          const token = localStorage.getItem('token');
          if (token) {
            await fetch('/api/user/settings/save', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify(data.settings)
            });
          }
          
          alert(`✅ Default settings for ${data.language.toUpperCase()} loaded and applied successfully!`);
        } else {
          alert('Failed to load default settings. Please try again.');
        }
      } else {
        alert('Failed to load default settings. Please try again.');
      }
    } catch (error) {
      console.error('Error loading default settings:', error);
      alert('Error loading default settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const settingsSections = [
    { id: 'backgrounds' as const, label: 'Backgrounds & Colors', icon: Palette },
    { id: 'tools' as const, label: 'Tools', icon: Settings },
    { id: 'favourites' as const, label: 'Favourites', icon: Star },
    { id: 'mybest' as const, label: 'My Best', icon: Trophy },
    { id: 'grid' as const, label: 'Grid Display Mode', icon: Grid },
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-gray-800 text-white px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Settings size={24} />
            <span>Personal Settings</span>
          </h2>
          <p className="text-sm text-gray-300 mt-1">
            Language: <span className="font-semibold">{userLanguage.toUpperCase()}</span> - Configure your personal preferences
          </p>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-gray-50 border-b border-gray-200 px-6 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex-1">
          <p className="text-sm text-gray-800">
            <strong>Your Personal Settings</strong> - Configure your own preferences
          </p>
          <p className="text-xs text-gray-600 mt-1">
            Optional: Load {userLanguage.toUpperCase()} defaults created by admins as a starting template
          </p>
        </div>
        <button
          onClick={loadDefaultSettings}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
        >
          <Download size={16} />
          <span>{loading ? 'Loading...' : 'Load Admin Defaults'}</span>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Navigation */}
        <div className="w-64 bg-gray-50 border-r border-gray-200 overflow-y-auto flex-shrink-0">
          <nav className="p-4 space-y-2">
            {settingsSections.map((section) => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSettingsTab(section.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all ${
                    activeSettingsTab === section.id
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon size={20} />
                  <span className="font-medium">{section.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Settings Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-white">
          {activeSettingsTab === 'backgrounds' && <BackgroundsColorsSettings />}
          {activeSettingsTab === 'tools' && <ToolsSettings isAdmin={false} userType="ATHLETE" />}
          {activeSettingsTab === 'favourites' && <FavouritesSettings />}
          {activeSettingsTab === 'mybest' && <MyBestSettings />}
          {activeSettingsTab === 'grid' && <GridDisplaySettings />}
        </div>
      </div>

      {/* Footer - Auto-save enabled, no manual save button needed */}
      <div className="border-t bg-gray-50 px-6 py-4 flex items-center justify-end flex-shrink-0">
        <p className="text-sm text-gray-600 italic">
          ✓ All changes are saved automatically
        </p>
      </div>
    </div>
  );
}


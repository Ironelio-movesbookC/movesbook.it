'use client';

import { useState } from 'react';
import { 
  Home,
  Users,
  Building2,
  Trophy,
  Settings,
  Bell,
  Mail,
  Clock,
  Music,
  CalendarDays,
  LayoutDashboard,
  ChevronDown,
  Plus,
  UserCircle,
  Eye,
  EyeOff,
  Twitter,
  Facebook,
  MessageSquare,
  ArrowLeft,
  ArrowRight,
  Newspaper,
  Link as LinkIcon,
  BookOpen,
  SlidersHorizontal,
  PenSquare,
  List,
  Search,
  X,
  Coins,
  Heart
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';

interface DarkSidebarProps {
  userType: string;
  entities?: any[];
  selectedEntityId?: string | null;
  onEntitySelect?: (id: string) => void;
  onMyPageClick?: () => void;
  onMyClubClick?: () => void;
  onMyTeamClick?: () => void;
  onMyGroupClick?: () => void;
  onMyCoachingGroupClick?: () => void;
  onPostsClick?: () => void;
  activeTab?: 'my-page' | 'my-entity';
  onTabChange?: (tab: 'my-page' | 'my-entity') => void;
}

export default function DarkSidebar({
  userType,
  entities = [],
  selectedEntityId,
  onEntitySelect,
  onMyPageClick,
  onMyClubClick,
  onMyTeamClick,
  onMyGroupClick,
  onMyCoachingGroupClick,
  onPostsClick,
  activeTab = 'my-page',
  onTabChange
}: DarkSidebarProps) {
  const { user } = useAuth();
  const router = useRouter();
  const { t } = useLanguage();
  const [allowVisiting, setAllowVisiting] = useState(true);
  const [internalActiveTab, setInternalActiveTab] = useState<'my-page' | 'my-entity'>(activeTab);
  const [communitiesOpen, setCommunitiesOpen] = useState(false);
  const [currentClubMembersOpen, setCurrentClubMembersOpen] = useState(false);
  const [friendsOpen, setFriendsOpen] = useState(false);
  const [friendsGroupsOpen, setFriendsGroupsOpen] = useState(false);
  const [friendsOnlineOpen, setFriendsOnlineOpen] = useState(true);
  const [friendsFindOpen, setFriendsFindOpen] = useState(true);

  const friendCount = 234;
  const lastPostsCount = 11;
  const messagesCount = 0;
  const onlineCount = 0;

  // Sync internal state with prop
  const currentTab = onTabChange ? activeTab : internalActiveTab;
  const setCurrentTab = onTabChange ? onTabChange : setInternalActiveTab;

  const handleMyPage = () => {
    router.push('/privacy');
  };

  const handleMyClub = () => {
    router.push('/privacy');
  };

  const handleMyTeam = () => {
    if (onMyTeamClick) {
      onMyTeamClick();
    } else if (selectedEntityId) {
      router.push(`/my-team?teamId=${selectedEntityId}`);
    } else if (entities.length > 0) {
      router.push(`/my-team?teamId=${entities[0].id}`);
    } else {
      router.push('/my-page');
    }
  };

  const handleMyGroup = () => {
    if (onMyGroupClick) {
      onMyGroupClick();
    } else if (selectedEntityId) {
      router.push(`/my-group?groupId=${selectedEntityId}`);
    } else if (entities.length > 0) {
      router.push(`/my-group?groupId=${entities[0].id}`);
    } else {
      router.push('/my-page');
    }
  };

  const handleMyCoachingGroup = () => {
    if (onMyCoachingGroupClick) {
      onMyCoachingGroupClick();
    } else if (selectedEntityId) {
      router.push(`/my-coaching-group?groupId=${selectedEntityId}`);
    } else if (entities.length > 0) {
      router.push(`/my-coaching-group?groupId=${entities[0].id}`);
    } else {
      router.push('/my-page');
    }
  };

  const handleMyPageTab = () => {
    setCurrentTab('my-page');
    if (onMyPageClick) {
      onMyPageClick();
    } else {
      router.push('/my-page');
    }
  };

  const handleMyEntityTab = () => {
    setCurrentTab('my-entity');
    if (userType === 'CLUB_TRAINER' && onMyClubClick) {
      onMyClubClick();
    } else if (userType === 'TEAM_MANAGER' && onMyTeamClick) {
      onMyTeamClick();
    } else if (userType === 'GROUP_ADMIN' && onMyGroupClick) {
      onMyGroupClick();
    } else if (userType === 'COACH' && onMyCoachingGroupClick) {
      onMyCoachingGroupClick();
    } else if (userType === 'ATHLETE' && onMyClubClick) {
      onMyClubClick();
    } else {
      // Default behavior - just change tab without navigation
      // The tab change is already handled by setCurrentTab above
    }
  };

  const getEntityLabel = () => {
    if (userType === 'CLUB_TRAINER') return t('sidebar_my_club');
    if (userType === 'TEAM_MANAGER') return t('sidebar_my_team');
    if (userType === 'GROUP_ADMIN') return t('sidebar_my_group');
    if (userType === 'COACH') return t('sidebar_my_coaching_group');
    // For athletes and other users, show "My Club" as default
    return t('sidebar_my_club');
  };

  const renderFriendsAndCommunitiesMenus = ({ showEvents = false }: { showEvents?: boolean } = {}) => (
    <>
      <div className="border-b border-teal-700">
        <div className="flex w-full items-stretch bg-teal-800 text-white">
          <button
            type="button"
            onClick={() => setFriendsOpen((v) => !v)}
            aria-expanded={friendsOpen}
            className="flex flex-1 items-center gap-3 min-w-0 py-3 pl-4 pr-2 text-left hover:bg-teal-700 transition-colors"
          >
            <Users className="w-5 h-5 shrink-0" />
            <span className="font-semibold tracking-wide truncate">{t('sidebar_friends_title')}</span>
          </button>
          {friendsOpen && (
            <button
              type="button"
              className="shrink-0 self-stretch px-2 text-xs font-normal text-white/95 hover:bg-teal-700 hover:underline flex items-center"
            >
              {t('sidebar_friends_view_all')}
            </button>
          )}
          <button
            type="button"
            onClick={() => setFriendsOpen((v) => !v)}
            aria-label={friendsOpen ? t('collapse') : t('expand')}
            className="shrink-0 px-4 flex items-center hover:bg-teal-700 transition-colors border-l border-teal-700/40"
          >
            <ChevronDown
              className={`w-4 h-4 opacity-80 transition-transform duration-200 ${friendsOpen ? 'rotate-180' : ''}`}
            />
          </button>
        </div>

        {friendsOpen && (
          <div className="bg-[#e5e7eb] text-gray-800 max-h-[min(70vh,520px)] overflow-y-auto border-t border-teal-900/40">
            <div className="px-3 pt-3 pb-2 text-xs text-gray-700">
              {t('sidebar_friends_has_friends')
                .replace('{name}', user?.name || 'User')
                .replace('{count}', String(friendCount))}
            </div>

            <div className="px-3 pb-3">
              <div className="relative flex items-center bg-white rounded border border-gray-300 shadow-sm">
                <input
                  type="search"
                  placeholder={t('sidebar_friends_search_placeholder')}
                  className="w-full pl-2 pr-9 py-2 text-xs text-gray-800 placeholder:text-gray-400 rounded border-0 bg-transparent focus:ring-0 focus:outline-none"
                  aria-label={t('sidebar_friends_search_placeholder')}
                />
                <Search className="absolute right-2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>

            <div className="px-3 space-y-0 border-t border-gray-300/80">
              <div className="flex items-center justify-between py-2.5 border-b border-gray-300/90 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <Newspaper className="w-4 h-4 text-gray-600 shrink-0" />
                  <span className="truncate">{t('sidebar_friends_last_posts')}</span>
                </div>
                <span className="shrink-0 ml-2 min-w-[1.5rem] h-5 flex items-center justify-center rounded-sm bg-sky-300 text-white text-[11px] font-semibold px-1">
                  {lastPostsCount}
                </span>
              </div>
              <div className="flex items-center justify-between py-2.5 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <MessageSquare className="w-4 h-4 text-gray-600 shrink-0" />
                  <span className="truncate">{t('sidebar_friends_messages_from')}</span>
                </div>
                <span className="shrink-0 ml-2 min-w-[1.5rem] h-5 flex items-center justify-center rounded-sm bg-sky-300 text-white text-[11px] font-semibold px-1">
                  {messagesCount}
                </span>
              </div>
            </div>

            <div className="mt-1 border-t border-gray-400/50">
              <button
                type="button"
                onClick={() => setFriendsGroupsOpen((v) => !v)}
                className="w-full flex items-center justify-between bg-[#4b5563] hover:bg-[#3f4654] text-white text-[11px] font-semibold tracking-wide px-3 py-2"
              >
                <span>{t('sidebar_friends_groups_of_friends')}</span>
                <span className="text-[10px] font-normal">{t('sidebar_friends_view_all')}</span>
              </button>
              {friendsGroupsOpen && (
                <div className="bg-[#e5e7eb] px-3 py-3 text-xs text-gray-600 border-b border-gray-400/40">
                  {t('sidebar_friends_groups_empty')}
                </div>
              )}

              <button
                type="button"
                onClick={() => setFriendsOnlineOpen((v) => !v)}
                className="w-full flex items-center justify-between bg-[#4b5563] hover:bg-[#3f4654] text-white text-[11px] font-semibold tracking-wide px-3 py-2 border-t border-gray-500/30"
              >
                <span className="flex items-center gap-2">
                  {t('sidebar_friends_online_friends')}
                  <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 rounded-full bg-emerald-500 text-[10px] font-bold px-1">
                    {onlineCount}
                  </span>
                </span>
                <span className="text-[10px] font-normal">{t('sidebar_friends_view_all_caps')}</span>
              </button>
              {friendsOnlineOpen && (
                <div className="bg-[#e5e7eb] px-3 py-6 text-center text-xs text-gray-600 border-b border-gray-400/40">
                  {t('sidebar_friends_no_users_online')}
                </div>
              )}

              <div className="border-t border-gray-500/30">
                <button
                  type="button"
                  onClick={() => setFriendsFindOpen((v) => !v)}
                  className="w-full flex items-center justify-between bg-[#4b5563] hover:bg-[#3f4654] text-white text-[11px] font-semibold tracking-wide px-3 py-2"
                >
                  <span>{t('sidebar_friends_find_new')}</span>
                  <X className="w-4 h-4 text-white/90" />
                </button>
                {friendsFindOpen && (
                  <div className="bg-[#e5e7eb] px-3 pb-10 pt-2 text-xs relative border-b border-gray-400/40">
                    <p className="text-gray-700 mb-2 text-center">
                      {t('sidebar_friends_find_greeting').replace(
                        '{name}',
                        (user?.name || 'User').split(/\\s+/)[0] || 'User'
                      )}
                    </p>
                    <p className="text-red-600 font-medium leading-snug mb-3 text-center">
                      {t('sidebar_friends_find_line1')}
                      <br />
                      {t('sidebar_friends_find_line2')}
                    </p>
                    <input
                      type="text"
                      className="w-full mb-2 px-2 py-2 text-xs border border-gray-300 rounded bg-white text-gray-800 shadow-sm"
                      aria-label={t('sidebar_filter_option')}
                    />
                    <button
                      type="button"
                      className="w-full py-2.5 rounded text-xs font-semibold text-white bg-teal-700 hover:bg-teal-600 transition-colors"
                    >
                      {t('sidebar_filter_option')}
                    </button>
                    <button type="button" className="mt-2 w-full text-center text-red-600 hover:underline text-[11px]">
                      {t('sidebar_friends_see_invites_credits')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="border-b border-teal-700">
        <button
          type="button"
          onClick={() => setCommunitiesOpen((v) => !v)}
          aria-expanded={communitiesOpen}
          className="w-full bg-teal-800 hover:bg-teal-700 text-white py-3 px-4 flex items-center justify-between transition-colors"
        >
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5" />
            <span>Communities</span>
          </div>
          <ChevronDown className={`w-4 h-4 opacity-80 transition-transform ${communitiesOpen ? 'rotate-180' : ''}`} />
        </button>

        {communitiesOpen && (
          <div className="bg-gray-800 text-white">
            <button
              type="button"
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-750 transition-colors border-t border-gray-700"
            >
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-gray-300" />
                <span className="text-sm">Sharing friends</span>
              </div>
              <ChevronDown className="w-4 h-4 opacity-60 rotate-[-90deg]" />
            </button>

            <button
              type="button"
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-750 transition-colors border-t border-gray-700"
            >
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-gray-300" />
                <span className="text-sm">My Coaches</span>
              </div>
              <ChevronDown className="w-4 h-4 opacity-60 rotate-[-90deg]" />
            </button>

            <button
              type="button"
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-750 transition-colors border-t border-gray-700"
            >
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-gray-300" />
                <span className="text-sm">My teams</span>
              </div>
              <ChevronDown className="w-4 h-4 opacity-60 rotate-[-90deg]" />
            </button>

            <button
              type="button"
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-750 transition-colors border-t border-gray-700"
            >
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-gray-300" />
                <span className="text-sm">My Groups</span>
              </div>
              <ChevronDown className="w-4 h-4 opacity-60 rotate-[-90deg]" />
            </button>

            <div className="border-t border-gray-700">
              <button
                type="button"
                onClick={() => setCurrentClubMembersOpen((v) => !v)}
                aria-expanded={currentClubMembersOpen}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-750 transition-colors"
              >
                <span className="text-sm text-gray-200">Current Club&apos;s member list</span>
                <ChevronDown
                  className={`w-4 h-4 opacity-70 transition-transform ${currentClubMembersOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {currentClubMembersOpen && (
                <div className="bg-[#e5e7eb] px-3 py-6 text-center text-xs text-gray-600 border-t border-gray-400/40">
                  Member list UI
                </div>
              )}
            </div>

            <div className="py-3 bg-gray-850 border-t border-gray-700">
              <button
                type="button"
                className="w-full bg-red-600 hover:bg-red-700 text-white py-2.5 px-4 rounded text-sm font-medium transition-colors"
              >
                Suggest Movesbook to your friends
              </button>
            </div>
          </div>
        )}
      </div>

      {showEvents && (
        <div className="border-b border-teal-700">
          <div className="bg-[#374151] text-white px-3 py-2 text-xs font-bold tracking-wide flex items-center gap-2 border-t border-black/20">
            <CalendarDays className="w-4 h-4" />
            <span>EVENTS</span>
          </div>
          <div className="bg-[#2f3640] border-t border-black/20 px-3 py-3">
            <div className="w-full bg-teal-600 text-white text-xs font-bold py-1.5 px-2 flex items-center justify-between">
              <span className="opacity-90">◀</span>
              <span>August 2014</span>
              <span className="opacity-90">▶</span>
            </div>
            <div className="bg-white text-gray-700 text-[10px]">
              <div className="grid grid-cols-7 border-b border-gray-300">
                {['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map((d) => (
                  <div key={d} className="py-1 text-center border-r border-gray-200 last:border-r-0">
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {[
                  '', '', '', '', '1', '2', '3',
                  '4', '5', '6', '7', '8', '9', '10',
                  '11', '12', '13', '14', '15', '16', '17',
                  '18', '19', '20', '21', '22', '23', '24',
                  '25', '26', '27', '28', '29', '30', '31',
                ].map((v, idx) => (
                  <div
                    key={idx}
                    className={`h-7 flex items-center justify-center border-r border-b border-gray-200 last:border-r-0 ${
                      v === '20' ? 'bg-teal-600 text-white font-semibold' : ''
                    }`}
                  >
                    {v}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );

  return (
    <div className="w-full h-full bg-gray-900 text-white flex flex-col overflow-hidden" style={{ width: '320px' }}>
      {/* Tab Navigation - Always show both buttons */}
      <div className="flex bg-gray-900 border-b border-gray-700 flex-shrink-0">
        <button
          onClick={handleMyPageTab}
          className={`flex-1 py-3 px-4 text-center font-medium transition-colors ${
            currentTab === 'my-page'
              ? 'bg-gray-700 text-white border-b-2 border-yellow-400'
              : 'bg-gray-800 text-gray-300 hover:bg-gray-750 hover:text-white'
          }`}
        >
          {t('sidebar_my_page')}
        </button>
        <button
          onClick={handleMyEntityTab}
          className={`flex-1 py-3 px-4 text-center font-medium transition-colors ${
            currentTab === 'my-entity'
              ? 'bg-gray-700 text-white border-b-2 border-yellow-400'
              : 'bg-gray-800 text-gray-300 hover:bg-gray-750 hover:text-white'
          }`}
        >
          {getEntityLabel()}
        </button>
      </div>

      {/* Top Section - User Profile - No Scroll, Optimized */}
      <div className="bg-gray-800 p-3 flex-shrink-0">
        {/* Header Bar - Compact */}
        <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-700">
          <button className="text-white hover:text-yellow-400 transition-colors">
            <Plus className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-1.5">
            <span className="text-xs">{t('sidebar_status')}</span>
            <span className="text-xs text-green-400">{t('sidebar_online')}</span>
            <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
          </div>
          <button className="text-gray-400 hover:text-white transition-colors">
            <Settings className="w-4 h-4" />
          </button>
        </div>

        {/* Profile Identity - Compact */}
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0">
            <UserCircle className="w-5 h-5 text-gray-400" />
          </div>
          <span className="text-white text-sm font-medium truncate">{user?.name || 'User'}</span>
        </div>

        {/* Profile Picture - Smaller */}
        <div className="mb-2">
          <div className="w-20 h-20 bg-gray-700 rounded-lg mb-1 flex items-center justify-center">
            <UserCircle className="w-12 h-12 text-gray-500" />
          </div>
          <button className="text-white text-xs hover:text-yellow-400 transition-colors">
            {t('sidebar_change_photo')}
          </button>
        </div>

        {/* User Details - Compact Single Line */}
        <div className="space-y-1 mb-2 text-xs">
          <div className="flex items-center gap-1">
            <span className="text-gray-300">{t('sidebar_username')}:</span>
            <span className="text-yellow-400">{user?.username || 'N/A'}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-gray-300">{t('sidebar_age')}:</span>
            <span className="text-yellow-400">32</span>
            <span className="text-gray-300 ml-1">•</span>
            <span className="text-gray-300">American football</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-gray-300">{t('sidebar_city')}:</span>
            <span className="text-yellow-400">Turku</span>
            <span className="text-gray-300 ml-1">•</span>
            <span className="text-gray-300">Finland</span>
          </div>
        </div>

        {/* Privacy Setting - Compact */}
        <div className="flex items-center gap-1.5 mb-2">
          <input
            type="checkbox"
            checked={allowVisiting}
            onChange={(e) => setAllowVisiting(e.target.checked)}
            className="w-3 h-3 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
          />
          <span className="text-white text-xs">{t('sidebar_allow_visiting')}</span>
        </div>

        {/* Most used buttons - Compact */}
        <button className="w-full bg-red-600 hover:bg-red-700 text-white py-1.5 px-2 rounded mb-2 flex items-center justify-between transition-colors text-xs">
          <span>{t('sidebar_most_used_buttons')}</span>
          <Settings className="w-3 h-3" />
        </button>

        {/* Visitor Tracking - Compact */}
        <div className="space-y-1 mb-2">
          <div className="flex items-center gap-1.5 text-white text-xs">
            <UserCircle className="w-3 h-3 text-gray-400" />
            <ArrowLeft className="w-3 h-3 text-gray-400" />
            <span className="truncate">{t('sidebar_users_visited_my_pages')}</span>
          </div>
          <div className="flex items-center gap-1.5 text-white text-xs">
            <span>{t('sidebar_users_visited')}</span>
            <ArrowRight className="w-3 h-3 text-gray-400" />
            <UserCircle className="w-3 h-3 text-gray-400" />
          </div>
        </div>

        {/* Social Network Integration - Compact */}
        <div className="mb-2">
          <span className="text-white text-xs block mb-1">{t('sidebar_social_networks')}</span>
          <div className="flex items-center gap-2">
            <button className="text-blue-400 hover:text-blue-300 transition-colors">
              <Twitter className="w-4 h-4" />
            </button>
            <button className="text-blue-500 hover:text-blue-400 transition-colors">
              <Facebook className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Comments Section - Compact */}
        <div className="text-gray-500 text-xs">{t('sidebar_comments')}</div>
      </div>

      {/* Bottom Section - Navigation Menu */}
      <div className="bg-teal-900 flex-1 min-h-0" style={{ overflowY: 'visible', maxHeight: 'none' }}>
        {/* Conditional Menu Based on Active Tab */}
        {currentTab === 'my-page' ? (
          <>
            {/* My Page menu (legacy-style) */}
            <button
              className="w-full bg-teal-800 hover:bg-teal-700 text-white py-3 px-4 flex items-center justify-between transition-colors border-b border-teal-700"
            >
              <div className="flex items-center gap-3">
                <Building2 className="w-5 h-5" />
                <span>My clubs</span>
              </div>
              <ChevronDown className="w-4 h-4 opacity-80" />
            </button>

            <button className="w-full bg-teal-800 hover:bg-teal-700 text-white py-3 px-4 flex items-center justify-between transition-colors border-b border-teal-700">
              <div className="flex items-center gap-3">
                <SlidersHorizontal className="w-5 h-5" />
                <span>Main Toolbar</span>
              </div>
              <ChevronDown className="w-4 h-4 opacity-80" />
            </button>

            <button className="w-full bg-teal-800 hover:bg-teal-700 text-white py-3 px-4 flex items-center justify-between transition-colors border-b border-teal-700">
              <div className="flex items-center gap-3">
                <UserCircle className="w-5 h-5" />
                <span>Member info</span>
              </div>
              <ChevronDown className="w-4 h-4 opacity-80" />
            </button>

            <button className="w-full bg-teal-800 hover:bg-teal-700 text-white py-3 px-4 flex items-center justify-between transition-colors border-b border-teal-700">
              <div className="flex items-center gap-3">
                <Eye className="w-5 h-5" />
                <span>My page for visitors</span>
              </div>
              <div className="flex items-center gap-2">
                <ChevronDown className="w-4 h-4 opacity-80" />
                <Settings className="w-4 h-4 text-gray-300" />
              </div>
            </button>

            <button
              className="w-full bg-teal-800 hover:bg-teal-700 text-white py-3 px-4 flex items-center justify-between transition-colors border-b border-teal-700"
            >
              <div className="flex items-center gap-3">
                <LayoutDashboard className="w-5 h-5" />
                <span>My Dashboard</span>
              </div>
              <ChevronDown className="w-4 h-4 opacity-80" />
            </button>

            <button className="w-full bg-teal-800 hover:bg-teal-700 text-white py-3 px-4 flex items-center justify-between transition-colors border-b border-teal-700">
              <div className="flex items-center gap-3">
                <List className="w-5 h-5" />
                <span>My Lists</span>
              </div>
              <ChevronDown className="w-4 h-4 opacity-80" />
            </button>

            <button className="w-full bg-teal-800 hover:bg-teal-700 text-white py-3 px-4 flex items-center justify-between transition-colors border-b border-teal-700">
              <div className="flex items-center gap-3">
                <Music className="w-5 h-5" />
                <span>My Music</span>
              </div>
              <ChevronDown className="w-4 h-4 opacity-80" />
            </button>

            <button
              className="w-full bg-teal-800 hover:bg-teal-700 text-white py-3 px-4 flex items-center justify-between transition-colors border-b border-teal-700"
            >
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5" />
                <span>Notifications(0)</span>
              </div>
              <ChevronDown className="w-4 h-4 opacity-80" />
            </button>

            <button
              className="w-full bg-teal-800 hover:bg-teal-700 text-white py-3 px-4 flex items-center justify-between transition-colors border-b border-teal-700"
            >
              <div className="flex items-center gap-3">
                <MessageSquare className="w-5 h-5" />
                <span>Messages</span>
              </div>
              <ChevronDown className="w-4 h-4 opacity-80" />
            </button>

            <button
              className="w-full bg-teal-800 hover:bg-teal-700 text-white py-3 px-4 flex items-center justify-between transition-colors border-b border-teal-700"
            >
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5" />
                <span>{t('sidebar_my_bookings')}</span>
              </div>
              <ChevronDown className="w-4 h-4 opacity-80" />
            </button>

            <button
              className="w-full bg-teal-800 hover:bg-teal-700 text-white py-3 px-4 flex items-center justify-between transition-colors border-b border-teal-700"
            >
              <div className="flex items-center gap-3">
                <PenSquare className="w-5 h-5" />
                <span>Posts</span>
              </div>
              <ChevronDown className="w-4 h-4 opacity-80" />
            </button>

            <button className="w-full bg-teal-800 hover:bg-teal-700 text-white py-3 px-4 flex items-center justify-between transition-colors border-b border-teal-700">
              <div className="flex items-center gap-3">
                <Newspaper className="w-5 h-5" />
                <span>{t('sidebar_news')}</span>
              </div>
              <ChevronDown className="w-4 h-4 opacity-80" />
            </button>

            <button className="w-full bg-teal-800 hover:bg-teal-700 text-white py-3 px-4 flex items-center justify-between transition-colors border-b border-teal-700">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5" />
                <span>Other Item</span>
              </div>
              <ChevronDown className="w-4 h-4 opacity-80" />
            </button>

            <button className="w-full bg-teal-800 hover:bg-teal-700 text-white py-3 px-4 flex items-center justify-between transition-colors border-b border-teal-700">
              <div className="flex items-center gap-3">
                <LinkIcon className="w-5 h-5" />
                <span>{t('sidebar_internet_links')}</span>
              </div>
              <div className="flex items-center gap-2">
                <ChevronDown className="w-4 h-4 opacity-80" />
                <Settings className="w-4 h-4 text-gray-300" />
              </div>
            </button>

            <div className="border-b border-teal-700">
              <div className="flex w-full items-stretch bg-teal-800 text-white">
                <button
                  type="button"
                  onClick={() => setFriendsOpen((v) => !v)}
                  aria-expanded={friendsOpen}
                  className="flex flex-1 items-center gap-3 min-w-0 py-3 pl-4 pr-2 text-left hover:bg-teal-700 transition-colors"
                >
                  <Users className="w-5 h-5 shrink-0" />
                  <span className="font-semibold tracking-wide truncate">{t('sidebar_friends_title')}</span>
                </button>
                {friendsOpen && (
                  <button
                    type="button"
                    className="shrink-0 self-stretch px-2 text-xs font-normal text-white/95 hover:bg-teal-700 hover:underline flex items-center"
                  >
                    {t('sidebar_friends_view_all')}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setFriendsOpen((v) => !v)}
                  aria-label={friendsOpen ? t('collapse') : t('expand')}
                  className="shrink-0 px-4 flex items-center hover:bg-teal-700 transition-colors border-l border-teal-700/40"
                >
                  <ChevronDown
                    className={`w-4 h-4 opacity-80 transition-transform duration-200 ${friendsOpen ? 'rotate-180' : ''}`}
                  />
                </button>
              </div>

              {friendsOpen && (
                <div className="bg-[#e5e7eb] text-gray-800 max-h-[min(70vh,520px)] overflow-y-auto border-t border-teal-900/40">
                  <div className="px-3 pt-3 pb-2 text-xs text-gray-700">
                    {t('sidebar_friends_has_friends')
                      .replace('{name}', user?.name || 'User')
                      .replace('{count}', String(friendCount))}
                  </div>

                  <div className="px-3 pb-3">
                    <div className="relative flex items-center bg-white rounded border border-gray-300 shadow-sm">
                      <input
                        type="search"
                        placeholder={t('sidebar_friends_search_placeholder')}
                        className="w-full pl-2 pr-9 py-2 text-xs text-gray-800 placeholder:text-gray-400 rounded border-0 bg-transparent focus:ring-0 focus:outline-none"
                        aria-label={t('sidebar_friends_search_placeholder')}
                      />
                      <Search className="absolute right-2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  <div className="px-3 space-y-0 border-t border-gray-300/80">
                    <div className="flex items-center justify-between py-2.5 border-b border-gray-300/90 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <Newspaper className="w-4 h-4 text-gray-600 shrink-0" />
                        <span className="truncate">{t('sidebar_friends_last_posts')}</span>
                      </div>
                      <span className="shrink-0 ml-2 min-w-[1.5rem] h-5 flex items-center justify-center rounded-sm bg-sky-300 text-white text-[11px] font-semibold px-1">
                        {lastPostsCount}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2.5 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <MessageSquare className="w-4 h-4 text-gray-600 shrink-0" />
                        <span className="truncate">{t('sidebar_friends_messages_from')}</span>
                      </div>
                      <span className="shrink-0 ml-2 min-w-[1.5rem] h-5 flex items-center justify-center rounded-sm bg-sky-300 text-white text-[11px] font-semibold px-1">
                        {messagesCount}
                      </span>
                    </div>
                  </div>

                  <div className="mt-1 border-t border-gray-400/50">
                    <button
                      type="button"
                      onClick={() => setFriendsGroupsOpen((v) => !v)}
                      className="w-full flex items-center justify-between bg-[#4b5563] hover:bg-[#3f4654] text-white text-[11px] font-semibold tracking-wide px-3 py-2"
                    >
                      <span>{t('sidebar_friends_groups_of_friends')}</span>
                      <span className="text-[10px] font-normal">{t('sidebar_friends_view_all')}</span>
                    </button>
                    {friendsGroupsOpen && (
                      <div className="bg-[#e5e7eb] px-3 py-3 text-xs text-gray-600 border-b border-gray-400/40">
                        {t('sidebar_friends_groups_empty')}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => setFriendsOnlineOpen((v) => !v)}
                      className="w-full flex items-center justify-between bg-[#4b5563] hover:bg-[#3f4654] text-white text-[11px] font-semibold tracking-wide px-3 py-2 border-t border-gray-500/30"
                    >
                      <span className="flex items-center gap-2">
                        {t('sidebar_friends_online_friends')}
                        <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 rounded-full bg-emerald-500 text-[10px] font-bold px-1">
                          {onlineCount}
                        </span>
                      </span>
                      <span className="text-[10px] font-normal">{t('sidebar_friends_view_all_caps')}</span>
                    </button>
                    {friendsOnlineOpen && (
                      <div className="bg-[#e5e7eb] px-3 py-6 text-center text-xs text-gray-600 border-b border-gray-400/40">
                        {t('sidebar_friends_no_users_online')}
                      </div>
                    )}

                    <div className="border-t border-gray-500/30">
                      <button
                        type="button"
                        onClick={() => setFriendsFindOpen((v) => !v)}
                        className="w-full flex items-center justify-between bg-[#4b5563] hover:bg-[#3f4654] text-white text-[11px] font-semibold tracking-wide px-3 py-2"
                      >
                        <span>{t('sidebar_friends_find_new')}</span>
                        <X className="w-4 h-4 text-white/90" />
                      </button>
                      {friendsFindOpen && (
                        <div className="bg-[#e5e7eb] px-3 pb-10 pt-2 text-xs relative border-b border-gray-400/40">
                          <p className="text-gray-700 mb-2 text-center">
                            {t('sidebar_friends_find_greeting').replace(
                              '{name}',
                              (user?.name || 'User').split(/\s+/)[0] || 'User'
                            )}
                          </p>
                          <p className="text-red-600 font-medium leading-snug mb-3 text-center">
                            {t('sidebar_friends_find_line1')}
                            <br />
                            {t('sidebar_friends_find_line2')}
                          </p>
                          <input
                            type="text"
                            className="w-full mb-2 px-2 py-2 text-xs border border-gray-300 rounded bg-white text-gray-800 shadow-sm"
                            aria-label={t('sidebar_filter_option')}
                          />
                          <button
                            type="button"
                            className="w-full py-2.5 rounded text-xs font-semibold text-white bg-teal-700 hover:bg-teal-600 transition-colors"
                          >
                            {t('sidebar_filter_option')}
                          </button>
                          <button
                            type="button"
                            className="mt-2 w-full text-center text-red-600 hover:underline text-[11px]"
                          >
                            {t('sidebar_friends_see_invites_credits')}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="border-b border-teal-700">
              <button
                type="button"
                onClick={() => setCommunitiesOpen((v) => !v)}
                aria-expanded={communitiesOpen}
                className="w-full bg-teal-800 hover:bg-teal-700 text-white py-3 px-4 flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5" />
                  <span>Communities</span>
                </div>
                <ChevronDown
                  className={`w-4 h-4 opacity-80 transition-transform ${communitiesOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {communitiesOpen && (
                <div className="bg-gray-800 text-white">
                  <button
                    type="button"
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-750 transition-colors border-t border-gray-700"
                  >
                    <div className="flex items-center gap-2">
                      <Plus className="w-4 h-4 text-gray-300" />
                      <span className="text-sm">Sharing friends</span>
                    </div>
                    <ChevronDown className="w-4 h-4 opacity-60 rotate-[-90deg]" />
                  </button>

                  <button
                    type="button"
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-750 transition-colors border-t border-gray-700"
                  >
                    <div className="flex items-center gap-2">
                      <Plus className="w-4 h-4 text-gray-300" />
                      <span className="text-sm">My Coaches</span>
                    </div>
                    <ChevronDown className="w-4 h-4 opacity-60 rotate-[-90deg]" />
                  </button>

                  <button
                    type="button"
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-750 transition-colors border-t border-gray-700"
                  >
                    <div className="flex items-center gap-2">
                      <Plus className="w-4 h-4 text-gray-300" />
                      <span className="text-sm">My teams</span>
                    </div>
                    <ChevronDown className="w-4 h-4 opacity-60 rotate-[-90deg]" />
                  </button>

                  <button
                    type="button"
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-750 transition-colors border-t border-gray-700"
                  >
                    <div className="flex items-center gap-2">
                      <Plus className="w-4 h-4 text-gray-300" />
                      <span className="text-sm">My Groups</span>
                    </div>
                    <ChevronDown className="w-4 h-4 opacity-60 rotate-[-90deg]" />
                  </button>

                  <div className="border-t border-gray-700">
                    <button
                      type="button"
                      onClick={() => setCurrentClubMembersOpen((v) => !v)}
                      aria-expanded={currentClubMembersOpen}
                      className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-750 transition-colors"
                    >
                      <span className="text-sm text-gray-200">Current Club&apos;s member list</span>
                      <ChevronDown
                        className={`w-4 h-4 opacity-70 transition-transform ${currentClubMembersOpen ? 'rotate-180' : ''}`}
                      />
                    </button>

                    {currentClubMembersOpen && (
                      <div className="bg-[#e5e7eb] px-3 py-6 text-center text-xs text-gray-600 border-t border-gray-400/40">
                        Member list UI
                      </div>
                    )}
                  </div>

                  <div className="py-3 bg-gray-850 border-t border-gray-700">
                    <button
                      type="button"
                      className="w-full bg-red-600 hover:bg-red-700 text-white py-2.5 px-4 rounded text-sm font-medium transition-colors"
                    >
                      Suggest Movesbook to your friends
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            {/* Entity tab menu (UI only). When "My Club" is selected, match legacy UI. */}
            {(userType === 'ATHLETE' || userType === 'CLUB_TRAINER') ? (
              <div className="select-none">
                {/* User guides (top row) */}
                <div className="w-full bg-teal-800 text-white border-b border-teal-700">
                  <div className="flex items-center justify-between py-2.5 px-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <BookOpen className="w-5 h-5 shrink-0" />
                      <span className="font-semibold tracking-wide truncate">{t('sidebar_user_guides')}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <ChevronDown className="w-4 h-4 opacity-90" />
                      <Settings className="w-4 h-4 opacity-90" />
                    </div>
                  </div>
                </div>

                {/* SOCIAL section header */}
                <div className="w-full bg-[#7a0d1c] text-white border-b border-teal-700">
                  <div className="flex items-center justify-between py-2 px-3">
                    <div className="flex items-center gap-2.5">
                      <Bell className="w-5 h-5" />
                      <span className="font-bold tracking-wide text-sm">SOCIAL</span>
                    </div>
                    <ChevronDown className="w-4 h-4 opacity-90" />
                  </div>
                </div>

                {/* Club info / pages */}
                <button
                  type="button"
                  className="w-full bg-teal-800 hover:bg-teal-700 text-white py-2.5 px-3 flex items-center justify-between transition-colors border-b border-teal-700"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Building2 className="w-5 h-5 shrink-0" />
                    <span className="font-semibold tracking-wide truncate">Club Info</span>
                  </div>
                  <ChevronDown className="w-4 h-4 opacity-90" />
                </button>

                <button
                  type="button"
                  className="w-full bg-teal-800 hover:bg-teal-700 text-white py-2.5 px-3 flex items-center justify-between transition-colors border-b border-teal-700"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Eye className="w-5 h-5 shrink-0" />
                    <span className="font-semibold tracking-wide truncate">Club page for visitors</span>
                  </div>
                  <ChevronDown className="w-4 h-4 opacity-90" />
                </button>

                <button
                  type="button"
                  className="w-full bg-teal-800 hover:bg-teal-700 text-white py-2.5 px-3 flex items-center justify-between transition-colors border-b border-teal-700"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <LayoutDashboard className="w-5 h-5 shrink-0" />
                    <span className="font-semibold tracking-wide truncate">Dashboard for the members</span>
                  </div>
                  <ChevronDown className="w-4 h-4 opacity-90" />
                </button>

                <button
                  type="button"
                  className="w-full bg-teal-800 hover:bg-teal-700 text-white py-2.5 px-3 flex items-center justify-between transition-colors border-b border-teal-700"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <List className="w-5 h-5 shrink-0" />
                    <span className="font-semibold tracking-wide truncate">Club Lists</span>
                  </div>
                  <ChevronDown className="w-4 h-4 opacity-90" />
                </button>

                {/* Favourite Page */}
                <div className="w-full bg-[#4b4b4b] text-white border-b border-teal-700">
                  <div className="flex items-center justify-between py-2.5 px-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Heart className="w-5 h-5 shrink-0 opacity-90" />
                      <span className="font-semibold tracking-wide truncate">Favourite Page</span>
                    </div>
                    <ChevronDown className="w-4 h-4 opacity-90" />
                  </div>
                </div>
                <div className="w-full bg-[#4b4b4b] text-white border-b border-teal-700">
                  <div className="flex items-center justify-between py-2.5 px-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Heart className="w-5 h-5 shrink-0 opacity-90" />
                      <span className="font-semibold tracking-wide truncate">My List</span>
                    </div>
                    <ChevronDown className="w-4 h-4 opacity-90" />
                  </div>
                </div>

                {/* Music / notifications / messages / bookings */}
                <button
                  type="button"
                  className="w-full bg-teal-800 hover:bg-teal-700 text-white py-2.5 px-3 flex items-center justify-between transition-colors border-b border-teal-700"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Music className="w-5 h-5 shrink-0" />
                    <span className="font-semibold tracking-wide truncate">Music for the club</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <ChevronDown className="w-4 h-4 opacity-90" />
                    <Settings className="w-4 h-4 opacity-90" />
                  </div>
                </button>

                <button
                  type="button"
                  className="w-full bg-teal-800 hover:bg-teal-700 text-white py-2.5 px-3 flex items-center justify-between transition-colors border-b border-teal-700"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Mail className="w-5 h-5 shrink-0" />
                    <span className="font-semibold tracking-wide truncate">Notifications(0)</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <ChevronDown className="w-4 h-4 opacity-90" />
                    <Settings className="w-4 h-4 opacity-90" />
                  </div>
                </button>

                <button
                  type="button"
                  className="w-full bg-teal-800 hover:bg-teal-700 text-white py-2.5 px-3 flex items-center justify-between transition-colors border-b border-teal-700"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <MessageSquare className="w-5 h-5 shrink-0" />
                    <span className="font-semibold tracking-wide truncate">Messages</span>
                  </div>
                  <ChevronDown className="w-4 h-4 opacity-90" />
                </button>

                <button
                  type="button"
                  className="w-full bg-teal-800 hover:bg-teal-700 text-white py-2.5 px-3 flex items-center justify-between transition-colors border-b border-teal-700"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Clock className="w-5 h-5 shrink-0" />
                    <span className="font-semibold tracking-wide truncate">Bookings</span>
                  </div>
                  <ChevronDown className="w-4 h-4 opacity-90" />
                </button>

                {/* Posts / news / options / links */}
                <button
                  type="button"
                  className="w-full bg-teal-800 hover:bg-teal-700 text-white py-2.5 px-3 flex items-center justify-between transition-colors border-b border-teal-700"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <PenSquare className="w-5 h-5 shrink-0" />
                    <span className="font-semibold tracking-wide truncate">Club Posts</span>
                  </div>
                  <ChevronDown className="w-4 h-4 opacity-90" />
                </button>

                <button
                  type="button"
                  className="w-full bg-teal-800 hover:bg-teal-700 text-white py-2.5 px-3 flex items-center justify-between transition-colors border-b border-teal-700"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Newspaper className="w-5 h-5 shrink-0" />
                    <span className="font-semibold tracking-wide truncate">Club News</span>
                  </div>
                  <ChevronDown className="w-4 h-4 opacity-90" />
                </button>

                <button
                  type="button"
                  className="w-full bg-teal-800 hover:bg-teal-700 text-white py-2.5 px-3 flex items-center justify-between transition-colors border-b border-teal-700"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <SlidersHorizontal className="w-5 h-5 shrink-0" />
                    <span className="font-semibold tracking-wide truncate">Options</span>
                  </div>
                  <ChevronDown className="w-4 h-4 opacity-90" />
                </button>

                <button
                  type="button"
                  className="w-full bg-teal-800 hover:bg-teal-700 text-white py-2.5 px-3 flex items-center justify-between transition-colors border-b border-teal-700"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <LinkIcon className="w-5 h-5 shrink-0" />
                    <span className="font-semibold tracking-wide truncate">Internet links</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <ChevronDown className="w-4 h-4 opacity-90" />
                    <Settings className="w-4 h-4 opacity-90" />
                  </div>
                </button>

                {/* TRAINING section header */}
                <div className="w-full bg-[#7a0d1c] text-white border-b border-teal-700">
                  <div className="flex items-center justify-between py-2 px-3">
                    <div className="flex items-center gap-2.5">
                      <BookOpen className="w-5 h-5" />
                      <span className="font-bold tracking-wide text-sm">TRAINING</span>
                    </div>
                    <ChevronDown className="w-4 h-4 opacity-90" />
                  </div>                
                </div>

                {/* CLUB'S MANAGEMENT (UI only) */}
                <div className="w-full bg-[#0f3f3a] border-b border-teal-700 py-2">
                  
                    <div className="w-full bg-fuchsia-800 text-white border border-fuchsia-600/40">
                      <div className="flex items-center justify-between px-3 py-2">
                        <span className="text-[12px] font-extrabold tracking-wide uppercase">CLUB&apos;S MANAGEMENT</span>
                        <ChevronDown className="w-4 h-4 opacity-90" />
                      </div>
                    </div>
                  <div className="mx-3">
                    <button
                      type="button"
                      className="w-full mt-2 bg-blue-700 hover:bg-blue-600 text-white border border-white/25 transition-colors mx-3"
                    >
                      <div className="flex items-center justify-between px-3 py-2">
                        <span className="text-[12px] font-semibold">Services at my club</span>
                        <ChevronDown className="w-4 h-4 opacity-90" />
                      </div>
                    </button>

                    <button
                      type="button"
                      className="w-full mt-2 bg-blue-400 hover:bg-blue-300 text-white border border-white/25 transition-colors mx-3"
                    >
                      <div className="flex items-center justify-between px-3 py-2">
                        <span className="text-[12px] font-semibold">My administrative data</span>
                        <ChevronDown className="w-4 h-4 opacity-90" />
                      </div>
                    </button>
                  </div>
                </div>

                {renderFriendsAndCommunitiesMenus({ showEvents: true })}
              </div>
            ) : (
              <>
                {/* Non-club entity types keep existing simple menu UI */}
                <button className="w-full bg-teal-800 hover:bg-teal-700 text-white py-3 px-4 flex items-center justify-between transition-colors border-b border-teal-700">
                  <div className="flex items-center gap-3">
                    <BookOpen className="w-5 h-5" />
                    <span>{t('sidebar_user_guides')}</span>
                  </div>
                </button>

                {userType === 'TEAM_MANAGER' && (
                  <>
                    <button className="w-full bg-teal-800 hover:bg-teal-700 text-white py-3 px-4 flex items-center justify-between transition-colors border-b border-teal-700">
                      <div className="flex items-center gap-3">
                        <Trophy className="w-5 h-5" />
                        <span>Team Management</span>
                      </div>
                    </button>
                    <button className="w-full bg-teal-800 hover:bg-teal-700 text-white py-3 px-4 flex items-center justify-between transition-colors border-b border-teal-700">
                      <div className="flex items-center gap-3">
                        <Users className="w-5 h-5" />
                        <span>Athletes</span>
                      </div>
                    </button>
                  </>
                )}

                {userType === 'GROUP_ADMIN' && (
                  <>
                    <button className="w-full bg-teal-800 hover:bg-teal-700 text-white py-3 px-4 flex items-center justify-between transition-colors border-b border-teal-700">
                      <div className="flex items-center gap-3">
                        <Users className="w-5 h-5" />
                        <span>Group Management</span>
                      </div>
                    </button>
                    <button className="w-full bg-teal-800 hover:bg-teal-700 text-white py-3 px-4 flex items-center justify-between transition-colors border-b border-teal-700">
                      <div className="flex items-center gap-3">
                        <Users className="w-5 h-5" />
                        <span>Members</span>
                      </div>
                    </button>
                  </>
                )}

                {userType === 'COACH' && (
                  <>
                    <button className="w-full bg-teal-800 hover:bg-teal-700 text-white py-3 px-4 flex items-center justify-between transition-colors border-b border-teal-700">
                      <div className="flex items-center gap-3">
                        <Users className="w-5 h-5" />
                        <span>Athlete Management</span>
                      </div>
                    </button>
                    <button className="w-full bg-teal-800 hover:bg-teal-700 text-white py-3 px-4 flex items-center justify-between transition-colors border-b border-teal-700">
                      <div className="flex items-center gap-3">
                        <Users className="w-5 h-5" />
                        <span>Athletes</span>
                      </div>
                    </button>
                  </>
                )}
              </>
            )}
          </>
        )}

        {/* Club admin info */}
        {userType === 'CLUB_TRAINER' && (
          <button className="w-full bg-teal-800 hover:bg-teal-700 text-white py-3 px-4 flex items-center justify-between transition-colors border-b border-teal-700">
            <span>Club admin info</span>
            <ChevronDown className="w-4 h-4 opacity-80" />
          </button>
        )}
      </div>
    </div>
  );
}


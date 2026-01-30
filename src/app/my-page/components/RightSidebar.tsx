import { 
  Users, 
  Plus, 
  CheckCircle,
  Calendar,
  CalendarCheck,
  CalendarDays,
  CheckSquare,
  Save,
  ChevronRight,
  ChevronDown,
  Archive,
  FolderOpen,
  CalendarRange,
  Mail,
  Filter,
  Settings,
  User
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useState } from 'react';
import PersonalSettingsModal from '@/components/workouts/PersonalSettingsModal';

// 2026-01-22 13:30 UTC - Placeholder component for avatar images (replaces Unsplash timeout issues)
const AvatarPlaceholder = ({ size = 'w-10 h-10', name = 'U' }: { size?: string, name?: string }) => (
  <div className={`${size} rounded bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold flex-shrink-0`}>
    <User size={size.includes('12') ? 24 : 20} />
  </div>
);

interface RightSidebarProps {
  user: any;
  onAddMemberClick: () => void;
  activeTab?: 'my-page' | 'my-entity';
}

export default function RightSidebar({ user, onAddMemberClick, activeTab = 'my-page' }: RightSidebarProps) {
  const { t } = useLanguage();
  const [activeRightTab, setActiveRightTab] = useState<'actions-planner' | 'chat-panel'>('actions-planner');
  const [expandedActionsPlanner, setExpandedActionsPlanner] = useState(true);
  const [showPersonalSettings, setShowPersonalSettings] = useState(false);
  
  const isAthlete = user?.userType === 'ATHLETE';
  const isAdmin = user?.userType === 'CLUB_TRAINER' || user?.userType === 'TEAM_MANAGER' || user?.userType === 'GROUP_ADMIN' || user?.userType === 'COACH';
  
  return (
    <div className="w-80 flex-shrink-0">
      <div className="bg-white rounded-lg shadow-sm border p-4 h-full flex flex-col">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {t('sidebar_quick_actions')}
        </h3>
        
        <div className="space-y-2">
          {/* Add Member Button - Only for admin users and not on My Page tab */}
          {isAdmin && !isAthlete && (
            <button 
              onClick={onAddMemberClick}
              className="w-full flex items-center gap-3 p-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 group"
            >
              <Users className="w-5 h-5 text-gray-400 group-hover:text-blue-500 flex-shrink-0" />
              <span className="text-sm font-medium text-gray-700 group-hover:text-blue-700 text-left">{t('sidebar_add_member')}</span>
            </button>
          )}
          
          {/* Quick Actions for My Page */}
          {activeTab === 'my-page' && (
            <>
              {/* Personal Settings Button - FIRST button in Quick Actions */}
              <button
                onClick={() => setShowPersonalSettings(true)}
                className="w-full flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 group"
              >
                <Settings className="w-5 h-5 text-gray-400 group-hover:text-blue-500 flex-shrink-0" />
                <span className="text-sm font-medium text-gray-700 group-hover:text-blue-700 text-left">Personal settings</span>
              </button>
              
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
            </>
          )}
          
          {/* Quick Actions for My Club/Team/Group */}
          {activeTab === 'my-entity' && (
            <>
              {/* Personal Settings Button - FIRST button in Quick Actions */}
              <button
                onClick={() => setShowPersonalSettings(true)}
                className="w-full flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-all duration-200 group"
              >
                <Settings className="w-5 h-5 text-gray-400 group-hover:text-green-500 flex-shrink-0" />
                <span className="text-sm font-medium text-gray-700 group-hover:text-green-700 text-left">Personal settings</span>
              </button>
              
              <button className="w-full flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-all duration-200 group">
                <Calendar className="w-5 h-5 text-gray-400 group-hover:text-green-500 flex-shrink-0" />
                <span className="text-sm font-medium text-gray-700 group-hover:text-green-700 text-left">{t('sidebar_plan_new_workout')}</span>
              </button>
              
              <button className="w-full flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-all duration-200 group">
                <Archive className="w-5 h-5 text-gray-400 group-hover:text-green-500 flex-shrink-0" />
                <span className="text-sm font-medium text-gray-700 group-hover:text-green-700 text-left">{t('sidebar_archive_workouts')}</span>
              </button>
              
              <button className="w-full flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-all duration-200 group">
                <CalendarDays className="w-5 h-5 text-gray-400 group-hover:text-green-500 flex-shrink-0" />
                <span className="text-sm font-medium text-gray-700 group-hover:text-green-700 text-left">{t('sidebar_plan_microcycles')}</span>
              </button>
              
              <button className="w-full flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-all duration-200 group">
                <FolderOpen className="w-5 h-5 text-gray-400 group-hover:text-green-500 flex-shrink-0" />
                <span className="text-sm font-medium text-gray-700 group-hover:text-green-700 text-left">{t('sidebar_open_workout_plans')}</span>
              </button>
              
              <button className="w-full flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-all duration-200 group">
                <CheckSquare className="w-5 h-5 text-gray-400 group-hover:text-green-500 flex-shrink-0" />
                <span className="text-sm font-medium text-gray-700 group-hover:text-green-700 text-left">{t('sidebar_open_completed_sessions')}</span>
              </button>
            </>
          )}
        </div>

        {/* Next Event Section - Only for My Page */}
        {activeTab === 'my-page' && (
          <div className="mt-6 border-t pt-4">
            <div className="bg-gray-800 text-white px-3 py-2 rounded-t-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarRange className="w-4 h-4" />
                <h4 className="text-sm font-semibold">{t('sidebar_next_event')}</h4>
              </div>
              <button className="text-xs text-red-400 hover:text-red-300">{t('sidebar_see_all')}</button>
            </div>
            
            <div className="space-y-3 mt-3">
              {/* Events of my sports */}
              <div>
                <h5 className="text-xs font-semibold text-red-700 bg-gray-100 px-3 py-1 mb-2 flex items-center justify-between">
                  <span>{t('sidebar_events_my_sports')}</span>
                  <button className="text-red-600 hover:text-red-700">{t('sidebar_see_all')}</button>
                </h5>
                <div className="space-y-1 px-3">
                  <p className="text-xs text-gray-700">Triathlon of Rome July 20</p>
                  <p className="text-xs text-gray-700">Ironman at Elba</p>
                </div>
              </div>
              
              {/* My friends events */}
              <div>
                <h5 className="text-xs font-semibold text-red-700 bg-gray-100 px-3 py-1 mb-2 flex items-center justify-between">
                  <span>{t('sidebar_my_friends_events')}</span>
                  <button className="text-red-600 hover:text-red-700">{t('sidebar_see_all')}</button>
                </h5>
                <div className="space-y-1 px-3">
                  <p className="text-xs text-gray-700">Triathlon of Rome July 20</p>
                  <p className="text-xs text-gray-700">Ironman at Elba</p>
                </div>
              </div>
              
              {/* Event of other sport */}
              <div>
                <h5 className="text-xs font-semibold text-red-700 bg-gray-100 px-3 py-1 mb-2 flex items-center justify-between">
                  <span>{t('sidebar_event_other_sport')}</span>
                  <button className="text-red-600 hover:text-red-700">{t('sidebar_see_all')}</button>
                </h5>
                <div className="space-y-1 px-3">
                  <p className="text-xs text-gray-700">Triathlon of Rome July 20</p>
                  <p className="text-xs text-gray-700">Ironman at Elba</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* News by My Friends Section - Only for My Page */}
        {activeTab === 'my-page' && (
          <div className="mt-6 border-t pt-4">
            <div className="bg-gray-800 text-white px-3 py-2 rounded-t-lg">
              <h4 className="text-sm font-semibold">{t('sidebar_news_by_friends')}</h4>
            </div>
            
            <div className="space-y-4 mt-3">
              {/* Post 1 */}
              <div className="px-3 py-2 border-b">
                <div className="flex items-start gap-3 mb-2">
                  <AvatarPlaceholder size="w-10 h-10" />
                  <div className="flex-1">
                    <h6 className="text-sm font-semibold text-red-700">Trail Running</h6>
                    <p className="text-xs text-gray-500">27.4.2010</p>
                  </div>
                </div>
                <p className="text-xs text-gray-700 mb-2">For all the runners who just love to run where there is no path...</p>
                <p className="text-xs text-gray-500">1392 {t('sidebar_members_count')}, 205049 {t('sidebar_movers_count')}</p>
              </div>

              {/* Post 2 */}
              <div className="px-3 py-2 border-b">
                <div className="flex items-start gap-3 mb-2">
                  <AvatarPlaceholder size="w-10 h-10" />
                  <div className="flex-1">
                    <h6 className="text-sm font-semibold text-red-700">Where is the limit</h6>
                    <p className="text-xs text-gray-500">18.5.2010</p>
                  </div>
                </div>
                <p className="text-xs text-gray-700 mb-2">We don't know where the limit is, but we know where...</p>
                <p className="text-xs text-gray-500">1017 {t('sidebar_members_count')}, 138718 {t('sidebar_movers_count')}</p>
              </div>

              {/* Post 3 */}
              <div className="px-3 py-2">
                <div className="flex items-start gap-3 mb-2">
                  <AvatarPlaceholder size="w-10 h-10" />
                  <div className="flex-1">
                    <h6 className="text-sm font-semibold text-red-700">Run for Japan</h6>
                    <p className="text-xs text-gray-500">18.3.2011</p>
                  </div>
                </div>
                <p className="text-xs text-gray-700 mb-2">Now, if even, every Move counts! with a death toll in t thousands.....</p>
                <p className="text-xs text-gray-500">90 {t('sidebar_members_count')}, 24258 {t('sidebar_movers_count')}</p>
              </div>
            </div>
          </div>
        )}

        {/* Newest Members Section - Only for My Page */}
        {activeTab === 'my-page' && (
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
            <div className="space-y-3 mt-3">
              <div className="flex items-start gap-3 px-3 py-2 hover:bg-gray-50 rounded-lg transition-colors">
                <AvatarPlaceholder size="w-12 h-12" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">Freiwildplayer</p>
                  <button className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-800 mt-1">
                    <Mail className="w-3 h-3" />
                    {t('sidebar_send_message')}
                  </button>
                </div>
              </div>

              <div className="flex items-start gap-3 px-3 py-2 hover:bg-gray-50 rounded-lg transition-colors">
                <img
                  alt="Freewildplayer"
                  className="w-12 h-12 rounded object-cover hidden"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">Freewildplayer</p>
                  <button className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-800 mt-1">
                    <Mail className="w-3 h-3" />
                    {t('sidebar_send_message')}
                  </button>
                </div>
              </div>

              <div className="flex items-start gap-3 px-3 py-2 hover:bg-gray-50 rounded-lg transition-colors">
                <AvatarPlaceholder size="w-12 h-12" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">lemonWonderland</p>
                  <button className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-800 mt-1">
                    <Mail className="w-3 h-3" />
                    {t('sidebar_send_message')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Members Last Logged In Section - Only for My Page */}
        {activeTab === 'my-page' && (
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
            <div className="space-y-3 mt-3">
              <div className="flex items-start gap-3 px-3 py-2 hover:bg-gray-50 rounded-lg transition-colors">
                <AvatarPlaceholder size="w-12 h-12" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">Freiwildplayer</p>
                  <button className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-800 mt-1">
                    <Mail className="w-3 h-3" />
                    {t('sidebar_send_message')}
                  </button>
                </div>
              </div>

              <div className="flex items-start gap-3 px-3 py-2 hover:bg-gray-50 rounded-lg transition-colors">
                <img
                  alt="Freewildplayer"
                  className="w-12 h-12 rounded object-cover hidden"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">Freewildplayer</p>
                  <button className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-800 mt-1">
                    <Mail className="w-3 h-3" />
                    {t('sidebar_send_message')}
                  </button>
                </div>
              </div>

              <div className="flex items-start gap-3 px-3 py-2 hover:bg-gray-50 rounded-lg transition-colors">
                <AvatarPlaceholder size="w-12 h-12" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">lemonWonderland</p>
                  <button className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-800 mt-1">
                    <Mail className="w-3 h-3" />
                    {t('sidebar_send_message')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Events Section - Only for My Entity */}
        {activeTab === 'my-entity' && (
          <div className="mt-6 border-t pt-4">
            <div className="bg-gray-800 text-white px-3 py-2 rounded-t-lg">
              <h4 className="text-sm font-semibold">{t('sidebar_events')}</h4>
            </div>
            
            <div className="mt-3 px-3 space-y-2">
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-sm text-gray-700">Today is the birthday of</span>
                <button className="text-xs text-gray-500">Month ▼</button>
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-sm text-gray-700">Events about club's member</span>
                <button className="text-xs text-gray-500">Month ▼</button>
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-sm text-gray-700">Events about this club</span>
                <button className="text-xs text-gray-500">Month ▼</button>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-gray-700">Events about shared club</span>
                <button className="text-xs text-gray-500">Month ▼</button>
              </div>
            </div>
          </div>
        )}

        {/* Next Event Section - Only for My Entity */}
        {activeTab === 'my-entity' && (
          <div className="mt-6 border-t pt-4">
            <div className="bg-gray-800 text-white px-3 py-2 rounded-t-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarRange className="w-4 h-4" />
                <h4 className="text-sm font-semibold">{t('sidebar_next_event')}</h4>
              </div>
              <button className="text-xs text-red-400 hover:text-red-300">{t('sidebar_see_all')}</button>
            </div>
            
            <div className="space-y-3 mt-3">
              {/* Events of my sports */}
              <div>
                <h5 className="text-xs font-semibold text-red-700 bg-gray-100 px-3 py-1 mb-2 flex items-center justify-between">
                  <span>{t('sidebar_events_my_sports')}</span>
                  <button className="text-red-600 hover:text-red-700">{t('sidebar_see_all')}</button>
                </h5>
                <div className="space-y-1 px-3">
                  <p className="text-xs text-gray-700">Triathlon of Rome July 20</p>
                  <p className="text-xs text-gray-700">Ironman at Elba</p>
                </div>
              </div>
              
              {/* My friends events */}
              <div>
                <h5 className="text-xs font-semibold text-red-700 bg-gray-100 px-3 py-1 mb-2 flex items-center justify-between">
                  <span>{t('sidebar_my_friends_events')}</span>
                  <button className="text-red-600 hover:text-red-700">{t('sidebar_see_all')}</button>
                </h5>
                <div className="space-y-1 px-3">
                  <p className="text-xs text-gray-700">Triathlon of Rome July 20</p>
                  <p className="text-xs text-gray-700">Ironman at Elba</p>
                </div>
              </div>
              
              {/* Event of other sport */}
              <div>
                <h5 className="text-xs font-semibold text-red-700 bg-gray-100 px-3 py-1 mb-2 flex items-center justify-between">
                  <span>{t('sidebar_event_other_sport')}</span>
                  <button className="text-red-600 hover:text-red-700">{t('sidebar_see_all')}</button>
                </h5>
                <div className="space-y-1 px-3">
                  <p className="text-xs text-gray-700">Triathlon of Rome July 20</p>
                  <p className="text-xs text-gray-700">Ironman at Elba</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Members Last Logged In Section - Only for My Entity */}
        {activeTab === 'my-entity' && (
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
            <div className="space-y-3 mt-3">
              <div className="flex items-start gap-3 px-3 py-2 hover:bg-gray-50 rounded-lg transition-colors">
                <AvatarPlaceholder size="w-12 h-12" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">Freiwildplayer</p>
                  <button className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-800 mt-1">
                    <Mail className="w-3 h-3" />
                    {t('sidebar_send_message')}
                  </button>
                </div>
              </div>

              <div className="flex items-start gap-3 px-3 py-2 hover:bg-gray-50 rounded-lg transition-colors">
                <img
                  alt="Freewildplayer"
                  className="w-12 h-12 rounded object-cover hidden"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">Freewildplayer</p>
                  <button className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-800 mt-1">
                    <Mail className="w-3 h-3" />
                    {t('sidebar_send_message')}
                  </button>
                </div>
              </div>

              <div className="flex items-start gap-3 px-3 py-2 hover:bg-gray-50 rounded-lg transition-colors">
                <AvatarPlaceholder size="w-12 h-12" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">lemonWonderland</p>
                  <button className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-800 mt-1">
                    <Mail className="w-3 h-3" />
                    {t('sidebar_send_message')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Recent Posts Section - Only for My Entity */}
        {activeTab === 'my-entity' && (
          <div className="mt-6 border-t pt-4">
            <div className="bg-gray-800 text-white px-3 py-2 rounded-t-lg flex items-center justify-between">
              <h4 className="text-sm font-semibold">{t('sidebar_recent_posts')}</h4>
              <button className="text-xs text-gray-300 hover:text-white">{t('sidebar_shared_clubs')}</button>
            </div>
            
            <div className="space-y-4 mt-3">
              {/* Post 1 */}
              <div className="px-3 py-2 border-b">
                <div className="flex items-start gap-3 mb-2">
                  <AvatarPlaceholder size="w-10 h-10" />
                  <div className="flex-1">
                    <h6 className="text-sm font-semibold text-red-700">Trail Running</h6>
                    <p className="text-xs text-gray-500">27.4.2010</p>
                  </div>
                </div>
                <p className="text-xs text-gray-700 mb-2">For all the runners who just love to run where there is no path...</p>
                <p className="text-xs text-gray-500">1392 {t('sidebar_members_count')}, 205049 {t('sidebar_movers_count')}</p>
              </div>

              {/* Post 2 */}
              <div className="px-3 py-2 border-b">
                <div className="flex items-start gap-3 mb-2">
                  <AvatarPlaceholder size="w-10 h-10" />
                  <div className="flex-1">
                    <h6 className="text-sm font-semibold text-red-700">Where is the limit</h6>
                    <p className="text-xs text-gray-500">18.5.2010</p>
                  </div>
                </div>
                <p className="text-xs text-gray-700 mb-2">We don't know where the limit is, but we know where it's not!!</p>
                <p className="text-xs text-gray-500">1017 {t('sidebar_members_count')}, 138718 {t('sidebar_movers_count')}</p>
              </div>

              {/* Post 3 */}
              <div className="px-3 py-2">
                <div className="flex items-start gap-3 mb-2">
                  <AvatarPlaceholder size="w-10 h-10" />
                  <div className="flex-1">
                    <h6 className="text-sm font-semibold text-red-700">Run for Japan</h6>
                    <p className="text-xs text-gray-500">18.3.2011</p>
                  </div>
                </div>
                <p className="text-xs text-gray-700 mb-2">Now, if even, every Move counts! with a death toll in the thousands.....</p>
                <p className="text-xs text-gray-500">90 {t('sidebar_members_count')}, 24258 {t('sidebar_movers_count')}</p>
              </div>
            </div>

            <button className="w-full text-center text-sm text-red-600 hover:text-red-700 font-medium py-2">+ More</button>
          </div>
        )}

        {/* Recommended Pages Section - Only for My Entity */}
        {activeTab === 'my-entity' && (
          <div className="mt-6 border-t pt-4">
            <div className="bg-gray-800 text-white px-3 py-2 rounded-t-lg flex items-center justify-between">
              <h4 className="text-sm font-semibold">{t('sidebar_recommended_pages')}</h4>
              <button className="text-xs text-gray-300 hover:text-white">{t('sidebar_see_all')}</button>
            </div>
            
            {/* Filter Button */}
            <button className="w-full bg-teal-600 hover:bg-teal-700 text-white py-2 px-3 text-sm font-medium transition-colors flex items-center justify-center gap-2">
              <Filter className="w-4 h-4" />
              {t('sidebar_filter_option')}
            </button>
            
            {/* Pages List */}
            <div className="space-y-3 mt-3">
              <div className="px-3 py-2 border-b">
                <div className="flex items-start gap-3 mb-2">
                  <AvatarPlaceholder size="w-10 h-10" />
                  <div className="flex-1">
                    <h6 className="text-sm font-semibold text-gray-800">Correre</h6>
                    <p className="text-xs text-gray-600 mb-1">Place a Giusi Cricri e ad altri 36 amici.</p>
                    <button className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-800">
                      👍 {t('sidebar_mi_piace')}
                    </button>
                  </div>
                </div>
              </div>

              <div className="px-3 py-2 border-b">
                <div className="flex items-start gap-3 mb-2">
                  <img
                    alt="Page"
                    className="w-10 h-10 rounded object-cover hidden"
                  />
                  <div className="flex-1">
                    <h6 className="text-sm font-semibold text-gray-800">Papa Benedetto XVI</h6>
                    <p className="text-xs text-gray-600 mb-1">Place a Chiara Di Palma</p>
                    <button className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-800">
                      👍 {t('sidebar_mi_piace')}
                    </button>
                  </div>
                </div>
              </div>

              <div className="px-3 py-2 border-b">
                <div className="flex items-start gap-3 mb-2">
                  <img
                    src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop"
                    alt="Page"
                    className="w-10 h-10 rounded object-cover"
                  />
                  <div className="flex-1">
                    <h6 className="text-sm font-semibold text-gray-800">Il Mattino</h6>
                    <p className="text-xs text-gray-600 mb-1">Place a Fabio Manzi e ad altri 27 amici.</p>
                    <button className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-800">
                      👍 {t('sidebar_mi_piace')}
                    </button>
                  </div>
                </div>
              </div>

              <div className="px-3 py-2">
                <div className="flex items-start gap-3 mb-2">
                  <AvatarPlaceholder size="w-10 h-10" />
                  <div className="flex-1">
                    <h6 className="text-sm font-semibold text-gray-800">L'uomo senza sonno</h6>
                    <p className="text-xs text-gray-600 mb-1">Place a Luca Borsacchi.</p>
                    <button className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-800">
                      👍 {t('sidebar_mi_piace')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Sponsored Section - Only for My Entity */}
        {activeTab === 'my-entity' && (
          <div className="mt-6 border-t pt-4">
            <div className="bg-gray-800 text-white px-3 py-2 rounded-t-lg">
              <h4 className="text-sm font-semibold">{t('sidebar_sponsored')}</h4>
            </div>
            
            <div className="mt-3 px-3">
              {/* Sponsored Content */}
              <div className="flex items-start gap-3 py-2">
                <AvatarPlaceholder size="w-12 h-12" />
                <div className="flex-1">
                  <p className="text-xs text-gray-700 leading-relaxed">
                    Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text
                  </p>
                </div>
              </div>
              
              {/* Footer Text */}
              <div className="mt-2 pt-2 border-t">
                <p className="text-xs text-gray-800 font-medium">
                  Lorem Ipsum is simply dummy text of the printing and b
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  {t('sidebar_section_sponsors')} <span className="font-semibold">MY CLUB</span>
                  <span className="float-right text-gray-400">12:06 PM</span>
                </p>
              </div>
            </div>
          </div>
        )}

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
              {t('sidebar_actions_planner')}
            </button>
            <button
              onClick={() => setActiveRightTab('chat-panel')}
              className={`flex-1 py-2 px-4 text-sm font-medium transition-colors ${
                activeRightTab === 'chat-panel'
                  ? 'bg-gray-100 text-gray-900 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {t('sidebar_chat_panel')}
            </button>
          </div>

          {/* Actions Planner Content */}
          {activeRightTab === 'actions-planner' && (
            <div className="space-y-1">
              <button className="w-full flex items-center justify-between py-2 px-3 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
                <span>{t('sidebar_timeline_all_users')}</span>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </button>
              <button className="w-full flex items-center justify-between py-2 px-3 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
                <span>{t('sidebar_timeline_user')}</span>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </button>
              <button className="w-full flex items-center justify-between py-2 px-3 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
                <span>{t('sidebar_actions_planned')}</span>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </button>
              <button className="w-full flex items-center justify-between py-2 px-3 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
                <span>{t('sidebar_users_action_planner')}</span>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </button>
              <button 
                onClick={() => setExpandedActionsPlanner(!expandedActionsPlanner)}
                className="w-full flex items-center justify-between py-2 px-3 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <span>{t('sidebar_settings')}</span>
                {expandedActionsPlanner ? (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                )}
              </button>
              {expandedActionsPlanner && (
                <div className="ml-4 space-y-1">
                  <button className="w-full flex items-center justify-between py-2 px-3 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
                    <span>{t('sidebar_preset_timelines')}</span>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </button>
                  <button className="w-full flex items-center justify-between py-2 px-3 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
                    <span>{t('sidebar_actions_settings')}</span>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </button>
                  <button className="w-full flex items-center justify-between py-2 px-3 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
                    <span>{t('sidebar_action_settings_mb')}</span>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Chat Panel Content */}
          {activeRightTab === 'chat-panel' && (
            <div className="text-sm text-gray-600 py-4">
              {t('sidebar_chat_content')}
            </div>
          )}
        </div>
      </div>
      
      {/* Personal Settings Modal */}
      <PersonalSettingsModal
        isOpen={showPersonalSettings}
        onClose={() => setShowPersonalSettings(false)}
        userLanguage={user?.language || 'en'}
      />
    </div>
  );
}


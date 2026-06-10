'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ModernNavbar from '@/components/ModernNavbar';
import AdminNavbar from '@/components/AdminNavbar';
import ModernFooter from '@/components/ModernFooter';
import BackgroundsColorsSettings from '@/components/settings/BackgroundsColorsSettings';
import ToolsSettings from '@/components/settings/ToolsSettings';
import FavouritesSettings from '@/components/settings/FavouritesSettings';
import MyBestSettings from '@/components/settings/MyBestSettings';
import GridDisplaySettings from '@/components/settings/GridDisplaySettings';
import WorkoutsParametersSettings from '@/components/settings/WorkoutsParametersSettings';
import { useAuth } from '@/hooks/useAuth';
import {
  isFullAdminPanelSession,
  isStaffPanelSession,
  readPanelSession,
  staffHomePath,
} from '@/lib/panelSession';
import { useLanguage } from '@/contexts/LanguageContext';
import { 
  Palette,
  Settings as SettingsIcon,
  Wrench,
  SlidersHorizontal,
  Star,
  Trophy,
  Grid,
  Save,
} from 'lucide-react';

type SettingsSection =
  | 'backgrounds'
  | 'tools'
  | 'technical'
  | 'workoutParameters'
  | 'favourites'
  | 'mybest'
  | 'grid';

export default function SettingsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeSection, setActiveSection] = useState<SettingsSection>(() => {
    if (typeof window === 'undefined') return 'grid';
    const raw = localStorage.getItem('settings_active_section');
    if (raw === 'periodization') {
      localStorage.setItem('settings_active_section', 'tools');
      localStorage.setItem('settings_tools_tab_tools', 'periodizationPlan');
      return 'tools';
    }
    const valid: SettingsSection[] = [
      'backgrounds',
      'tools',
      'technical',
      'workoutParameters',
      'favourites',
      'mybest',
      'grid',
    ];
    return raw && valid.includes(raw as SettingsSection) ? (raw as SettingsSection) : 'grid';
  });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [queryParams, setQueryParams] = useState<URLSearchParams | null>(null);

  // Check for admin authentication and auto-cleanup invalid tokens
  useEffect(() => {
    // Try to detect if we have an invalid/old token by checking the adminUser format
    const adminData = localStorage.getItem('adminUser');
    const adminToken = localStorage.getItem('adminToken');
    
    const session = readPanelSession();
    if (isStaffPanelSession(session) && session?.id) {
      router.replace(staffHomePath(session.id));
      return;
    }

    if (adminData && adminToken && isFullAdminPanelSession(session)) {
      try {
        JSON.parse(adminData);
        setIsAdmin(true);
      } catch (e) {
        // Invalid adminUser data, clear everything
        console.log('🔧 Auto-cleaning invalid admin data...');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('adminUser');
        localStorage.removeItem('adminToken');
        router.push('/');
      }
    }
  }, [router]);

  // Redirect to home if not authenticated (neither user nor admin)
  useEffect(() => {
    if (!loading && !user && !isAdmin) {
      router.push('/');
    }
  }, [user, loading, isAdmin, router]);

  useEffect(() => {
    const updateParams = () => {
      setQueryParams(new URLSearchParams(window.location.search));
    };
    updateParams();
    window.addEventListener('popstate', updateParams);
    return () => window.removeEventListener('popstate', updateParams);
  }, []);

  // Persist active section across refreshes
  useEffect(() => {
    localStorage.setItem('settings_active_section', activeSection);
  }, [activeSection]);

  useEffect(() => {
    if (!queryParams) return;
    const sectionParam = queryParams.get('section');
    if (!sectionParam) return;
    if (sectionParam === 'periodization') {
      setActiveSection('tools');
      localStorage.setItem('settings_tools_tab_tools', 'periodizationPlan');
      return;
    }
    const allowedAdminSections: SettingsSection[] = [
      'backgrounds',
      'tools',
      'technical',
      'workoutParameters',
      'favourites',
      'grid',
    ];
    const allowedUserSections: SettingsSection[] = [
      'backgrounds',
      'tools',
      'favourites',
      'mybest',
      'grid',
    ];
    const allowed = isAdmin ? allowedAdminSections : allowedUserSections;
    if (allowed.includes(sectionParam as SettingsSection)) {
      setActiveSection(sectionParam as SettingsSection);
    }
  }, [queryParams, isAdmin]);

  // Don't render if not authenticated
  if (loading || (!user && !isAdmin)) {
    return null;
  }

  const settingsSections = isAdmin
    ? [
        { id: 'grid' as SettingsSection, label: t('settings_display_mode'), icon: Grid },
        { id: 'backgrounds' as SettingsSection, label: t('settings_backgrounds'), icon: Palette },
        { id: 'tools' as SettingsSection, label: 'Tools Settings', icon: SettingsIcon },
        { id: 'technical' as SettingsSection, label: 'Technical Settings', icon: Wrench },
        { id: 'workoutParameters' as SettingsSection, label: 'Workouts parameters settings', icon: SlidersHorizontal },
        { id: 'favourites' as SettingsSection, label: t('settings_favourites'), icon: Star },
      ]
    : [
        { id: 'grid' as SettingsSection, label: t('settings_display_mode'), icon: Grid },
        { id: 'backgrounds' as SettingsSection, label: t('settings_backgrounds'), icon: Palette },
        { id: 'tools' as SettingsSection, label: t('settings_tools'), icon: SettingsIcon },
        { id: 'favourites' as SettingsSection, label: t('settings_favourites'), icon: Star },
        { id: 'mybest' as SettingsSection, label: t('settings_my_best'), icon: Trophy }
      ];

  const requestedTab = queryParams?.get('tab') || undefined;
  const requestedWorkoutTabRaw = queryParams?.get('workoutTab');
  const requestedWorkoutTab =
    requestedWorkoutTabRaw === 'changesVolumesSeries' ||
    requestedWorkoutTabRaw === 'parametersByObjective' ||
    requestedWorkoutTabRaw === 'formulaParameters'
      ? requestedWorkoutTabRaw
      : undefined;

  const handleSaveAll = () => {
    // Save all settings logic
    setHasUnsavedChanges(false);
    // Show success message
    alert(t('settings_saved_success'));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 transition-colors">
      {isAdmin ? <AdminNavbar /> : <ModernNavbar />}
      
      <div className="w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-1 sm:mb-2 transition-colors">
              {t('settings_title')}
            </h1>
            
          </div>
          
          {hasUnsavedChanges && (
            <button
              onClick={handleSaveAll}
              className="flex items-center justify-center space-x-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-2xl font-semibold hover:from-green-600 hover:to-emerald-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 text-sm sm:text-base"
            >
              <Save className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>{t('settings_save_all')}</span>
            </button>
          )}
        </div>

        {/* Mobile Horizontal Scroll Navigation */}
        <div className="lg:hidden mb-6 -mx-4 px-4 overflow-x-auto">
          <div className="flex gap-2 min-w-max pb-2">
            {settingsSections.map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;
              
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white shadow-lg'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{section.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          {/* Settings Sidebar - Desktop Only */}
          <div className="hidden lg:block w-64 xl:w-80 flex-shrink-0">
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-700 p-6 sticky top-6 transition-colors">
              <nav className="space-y-2">
                {settingsSections.map((section) => {
                  const Icon = section.icon;
                  const isActive = activeSection === section.id;
                  
                  return (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={`w-full flex items-center px-4 py-4 rounded-2xl text-left transition-all duration-300 ${
                        isActive
                          ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white shadow-lg'
                          : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                      }`}
                    >
                      <Icon className="w-5 h-5 mr-3" />
                      <span className="font-semibold text-sm xl:text-base">{section.label}</span>
                    </button>
                  );
                })}
              </nav>

              {/* Quick Stats */}
              <div className="mt-8 p-4 bg-gradient-to-br from-cyan-50 to-purple-50 dark:from-cyan-900/20 dark:to-purple-900/20 rounded-2xl border border-cyan-200 dark:border-cyan-800/50 transition-colors">
                <h3 className="text-sm font-semibold text-cyan-800 dark:text-cyan-300 mb-3">Settings Status</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-cyan-700 dark:text-cyan-400">Customized</span>
                    <span className="font-semibold text-cyan-600 dark:text-cyan-300">12/24</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Settings Content */}
          <div className="flex-1 min-w-0">
            <div className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4 sm:p-6 lg:p-8 transition-colors">
            {activeSection === 'backgrounds' && <BackgroundsColorsSettings isAdmin={isAdmin} />}
            {activeSection === 'tools' && <ToolsSettings isAdmin={isAdmin} userType={user?.userType} mode="tools" initialTab={requestedTab as any} />}
            {activeSection === 'technical' && <ToolsSettings isAdmin={isAdmin} userType={user?.userType} mode="technical" initialTab={requestedTab as any} />}
            {activeSection === 'workoutParameters' && <WorkoutsParametersSettings initialTab={requestedWorkoutTab} />}
            {activeSection === 'favourites' && <FavouritesSettings />}
              {activeSection === 'mybest' && <MyBestSettings />}
              {activeSection === 'grid' && <GridDisplaySettings />}
            </div>
          </div>
        </div>
      </div>

      <ModernFooter />
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { Grid, Layout, Eye, Palette, Zap, Monitor, Smartphone, Tablet, Sun, Moon, Type, Image as ImageIcon, Play, Pause, Clock, Save, CheckCircle } from 'lucide-react';
import NextImage from 'next/image';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/hooks/useAuth';
import { useUserSettings } from '@/hooks/useUserSettings';

interface DisplaySettings {
  // Layout Configuration
  gridSize: 'compact' | 'comfortable' | 'spacious';
  columnCount: number;
  rowHeight: 'small' | 'medium' | 'large';
  defaultView: 'list' | 'grid' | 'table';
  
  // Sidebar & Panel Preferences
  leftSidebarVisible: boolean;
  rightSidebarVisible: boolean;
  leftSidebarWidth: number; // percentage
  rightSidebarWidth: number; // percentage
  sidebarPosition: 'fixed' | 'floating';
  
  // Display Options
  theme: 'light' | 'dark' | 'auto' | 'time-based';
  fontSize: number; // base font size in px
  iconSize: 'small' | 'medium' | 'large';
  enableAnimations: boolean;
  reducedMotion: boolean;
  highContrast: boolean;
  
  // Performance
  performanceMode: boolean;
  imageQuality: 'low' | 'medium' | 'high';
  lazyLoading: boolean;
  
  // Dashboard Layout
  dashboardLayout: 'default' | 'compact' | 'expanded';
  widgetArrangement: string[]; // IDs of widgets in order
}

export default function GridDisplaySettings() {
  const { t } = useLanguage();
  const { theme, setTheme, resolvedTheme, currentTimeInfo } = useTheme();
  const { user } = useAuth();
  const { settings: dbSettings, updateSetting: updateDbSetting, loading } = useUserSettings(user?.id);
  
  const [activeTab, setActiveTab] = useState<'layout' | 'view' | 'display' | 'performance'>('layout');
  const [showPreview, setShowPreview] = useState(true);
  const [previewPage, setPreviewPage] = useState<'dashboard' | 'workouts' | 'analytics'>('dashboard');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  
  // Settings State (synced with database)
  const [settings, setSettings] = useState<DisplaySettings>({
    gridSize: 'comfortable',
    columnCount: 3,
    rowHeight: 'medium',
    defaultView: 'grid',
    leftSidebarVisible: true,
    rightSidebarVisible: true,
    leftSidebarWidth: 20,
    rightSidebarWidth: 25,
    sidebarPosition: 'fixed',
    theme: 'light',
    fontSize: 16,
    iconSize: 'medium',
    enableAnimations: true,
    reducedMotion: false,
    highContrast: false,
    performanceMode: false,
    imageQuality: 'high',
    lazyLoading: true,
    dashboardLayout: 'default',
    widgetArrangement: ['stats', 'calendar', 'workouts', 'activity']
  });

  // Load settings from database or localStorage
  useEffect(() => {
    if (dbSettings && !loading) {
      setSettings({
        gridSize: dbSettings.gridSize,
        columnCount: dbSettings.columnCount,
        rowHeight: dbSettings.rowHeight,
        defaultView: dbSettings.defaultView,
        leftSidebarVisible: dbSettings.leftSidebarVisible,
        rightSidebarVisible: dbSettings.rightSidebarVisible,
        leftSidebarWidth: dbSettings.leftSidebarWidth,
        rightSidebarWidth: dbSettings.rightSidebarWidth,
        sidebarPosition: dbSettings.sidebarPosition,
        theme: dbSettings.theme as any,
        fontSize: dbSettings.fontSize,
        iconSize: dbSettings.iconSize,
        enableAnimations: dbSettings.enableAnimations,
        reducedMotion: dbSettings.reducedMotion,
        highContrast: dbSettings.highContrast,
        performanceMode: dbSettings.performanceMode,
        imageQuality: dbSettings.imageQuality,
        lazyLoading: dbSettings.lazyLoading,
        dashboardLayout: dbSettings.dashboardLayout,
        widgetArrangement: dbSettings.widgetArrangement
      });
    }
  }, [dbSettings, loading]);

  const updateSetting = async <K extends keyof DisplaySettings>(key: K, value: DisplaySettings[K]) => {
    // Handle theme separately with ThemeContext
    if (key === 'theme') {
      setTheme(value as 'light' | 'dark' | 'auto' | 'time-based');
    }
    
    // Update local state immediately for responsive UI
    setSettings(prev => ({ ...prev, [key]: value }));
    
    // Save to database (and localStorage as fallback)
    try {
      setSaveStatus('saving');
      await updateDbSetting(key as any, value);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Error saving setting:', error);
      // Still update localStorage as fallback
      localStorage.setItem('displaySettings', JSON.stringify({ ...settings, [key]: value }));
    }
  };

  const resetToDefaults = async () => {
    if (confirm('Reset all display settings to defaults? This will reset all your customizations.')) {
      // Reset theme via context
      setTheme('light');
      
      const defaults = {
        gridSize: 'comfortable' as const,
        columnCount: 3,
        rowHeight: 'medium' as const,
        defaultView: 'grid' as const,
        leftSidebarVisible: true,
        rightSidebarVisible: true,
        leftSidebarWidth: 20,
        rightSidebarWidth: 25,
        sidebarPosition: 'fixed' as const,
        theme: 'light' as const,
        fontSize: 16,
        iconSize: 'medium' as const,
        enableAnimations: true,
        reducedMotion: false,
        highContrast: false,
        performanceMode: false,
        imageQuality: 'high' as const,
        lazyLoading: true,
        dashboardLayout: 'default' as const,
        widgetArrangement: ['stats', 'calendar', 'workouts', 'activity']
      };
      
      // Reset local settings
      setSettings(defaults);
      
      // Save to database
      try {
        setSaveStatus('saving');
        if (user?.id && updateDbSetting) {
          for (const [key, value] of Object.entries(defaults)) {
            await updateDbSetting(key as any, value);
          }
        }
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch (error) {
        console.error('Error resetting settings:', error);
        localStorage.setItem('displaySettings', JSON.stringify(defaults));
      }
    }
  };

  const getGridSizeClass = () => {
    switch (settings.gridSize) {
      case 'compact': return 'gap-2 p-3';
      case 'comfortable': return 'gap-4 p-4';
      case 'spacious': return 'gap-6 p-6';
    }
  };

  const getRowHeightClass = () => {
    switch (settings.rowHeight) {
      case 'small': return 'h-12';
      case 'medium': return 'h-16';
      case 'large': return 'h-20';
    }
  };

  const getIconSizeClass = () => {
    switch (settings.iconSize) {
      case 'small': return 'w-4 h-4';
      case 'medium': return 'w-5 h-5';
      case 'large': return 'w-6 h-6';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Grid & Display</h2>
          <p className="text-gray-600">Customize your workspace layout and visual preferences</p>
          
          {/* Save Status Indicator */}
          {saveStatus !== 'idle' && (
            <div className="flex items-center gap-2 mt-2">
              {saveStatus === 'saving' && (
                <>
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-sm text-blue-600 font-medium">Saving to database...</span>
                </>
              )}
              {saveStatus === 'saved' && (
                <>
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-green-600 font-medium">✓ Settings saved to database!</span>
                </>
              )}
            </div>
          )}
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-semibold flex items-center gap-2"
          >
            <Eye className="w-4 h-4" />
            {showPreview ? 'Hide' : 'Show'} Preview
          </button>
          <button
            onClick={resetToDefaults}
            className="px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-semibold"
          >
            Reset to Defaults
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('layout')}
          className={`px-6 py-3 font-semibold transition ${
            activeTab === 'layout'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Layout className="w-4 h-4 inline mr-2" />
          Layout Configuration
        </button>
        <button
          onClick={() => setActiveTab('view')}
          className={`px-6 py-3 font-semibold transition ${
            activeTab === 'view'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Grid className="w-4 h-4 inline mr-2" />
          View Preferences
        </button>
        <button
          onClick={() => setActiveTab('display')}
          className={`px-6 py-3 font-semibold transition ${
            activeTab === 'display'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Palette className="w-4 h-4 inline mr-2" />
          Display Options
        </button>
        <button
          onClick={() => setActiveTab('performance')}
          className={`px-6 py-3 font-semibold transition ${
            activeTab === 'performance'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Zap className="w-4 h-4 inline mr-2" />
          Performance
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Settings Panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* Layout Configuration Tab */}
          {activeTab === 'layout' && (
            <div className="space-y-6">
              {/* Grid Size */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Grid Density</h3>
                <div className="grid grid-cols-3 gap-3">
                  {(['compact', 'comfortable', 'spacious'] as const).map((size) => (
                    <button
                      key={size}
                      onClick={() => updateSetting('gridSize', size)}
                      className={`p-4 rounded-lg border-2 transition ${
                        settings.gridSize === size
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-center">
                        <div className="font-semibold text-gray-900 capitalize mb-2">{size}</div>
                        <div className={`grid grid-cols-3 ${size === 'compact' ? 'gap-0.5' : size === 'comfortable' ? 'gap-1' : 'gap-2'} mb-2`}>
                          {[...Array(9)].map((_, i) => (
                            <div key={i} className="bg-gray-300 aspect-square rounded-sm"></div>
                          ))}
                        </div>
                        <div className="text-xs text-gray-500">
                          {size === 'compact' ? 'More items' : size === 'comfortable' ? 'Balanced' : 'More space'}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Column Count */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Column Count</h3>
                <div className="flex items-center gap-4 mb-3">
                  <input
                    type="range"
                    min="1"
                    max="6"
                    value={settings.columnCount}
                    onChange={(e) => updateSetting('columnCount', parseInt(e.target.value))}
                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="w-12 text-center font-bold text-gray-900">{settings.columnCount}</div>
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>1 column</span>
                  <span>6 columns</span>
                </div>
              </div>

              {/* Row Height */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Row Height</h3>
                <div className="grid grid-cols-3 gap-3">
                  {(['small', 'medium', 'large'] as const).map((height) => (
                    <button
                      key={height}
                      onClick={() => updateSetting('rowHeight', height)}
                      className={`p-4 rounded-lg border-2 transition ${
                        settings.rowHeight === height
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-center">
                        <div className="font-semibold text-gray-900 capitalize mb-2">{height}</div>
                        <div className={`bg-gray-300 rounded ${height === 'small' ? 'h-8' : height === 'medium' ? 'h-12' : 'h-16'} mb-2`}></div>
                        <div className="text-xs text-gray-500">
                          {height === 'small' ? '48px' : height === 'medium' ? '64px' : '80px'}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Dashboard Layout */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Dashboard Layout</h3>
                <div className="grid grid-cols-3 gap-3">
                  {(['default', 'compact', 'expanded'] as const).map((layout) => (
                    <button
                      key={layout}
                      onClick={() => updateSetting('dashboardLayout', layout)}
                      className={`p-4 rounded-lg border-2 transition ${
                        settings.dashboardLayout === layout
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-center">
                        <div className="font-semibold text-gray-900 capitalize">{layout}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* View Preferences Tab */}
          {activeTab === 'view' && (
            <div className="space-y-6">
              {/* Default View Mode */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Default View Mode</h3>
                <div className="grid grid-cols-3 gap-3">
                  {(['list', 'grid', 'table'] as const).map((view) => (
                    <button
                      key={view}
                      onClick={() => updateSetting('defaultView', view)}
                      className={`p-4 rounded-lg border-2 transition ${
                        settings.defaultView === view
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-center">
                        <div className="font-semibold text-gray-900 capitalize mb-2">{view}</div>
                        {view === 'list' && (
                          <div className="space-y-1">
                            {[...Array(4)].map((_, i) => (
                              <div key={i} className="bg-gray-300 h-2 rounded"></div>
                            ))}
                          </div>
                        )}
                        {view === 'grid' && (
                          <div className="grid grid-cols-2 gap-1">
                            {[...Array(4)].map((_, i) => (
                              <div key={i} className="bg-gray-300 aspect-square rounded"></div>
                            ))}
                          </div>
                        )}
                        {view === 'table' && (
                          <div className="space-y-1">
                            <div className="bg-gray-400 h-2 rounded"></div>
                            {[...Array(3)].map((_, i) => (
                              <div key={i} className="bg-gray-300 h-2 rounded"></div>
                            ))}
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Sidebar Configuration */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Sidebar Visibility</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-gray-900">Left Sidebar</div>
                      <div className="text-sm text-gray-500">Navigation and main menu</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.leftSidebarVisible}
                        onChange={(e) => updateSetting('leftSidebarVisible', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  
                  {settings.leftSidebarVisible && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Left Sidebar Width: {settings.leftSidebarWidth}%
                      </label>
                      <input
                        type="range"
                        min="15"
                        max="30"
                        value={settings.leftSidebarWidth}
                        onChange={(e) => updateSetting('leftSidebarWidth', parseInt(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-4 border-t">
                    <div>
                      <div className="font-semibold text-gray-900">Right Sidebar</div>
                      <div className="text-sm text-gray-500">Actions and quick access</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.rightSidebarVisible}
                        onChange={(e) => updateSetting('rightSidebarVisible', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  
                  {settings.rightSidebarVisible && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Right Sidebar Width: {settings.rightSidebarWidth}%
                      </label>
                      <input
                        type="range"
                        min="20"
                        max="35"
                        value={settings.rightSidebarWidth}
                        onChange={(e) => updateSetting('rightSidebarWidth', parseInt(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Sidebar Position with Visual Preview */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Sidebar Position: Visual Preview</h3>
                <p className="text-sm text-gray-600 mb-4">
                  See how sidebars interact with your content
                </p>
                
                <div className="grid grid-cols-2 gap-4">
                  {(['fixed', 'floating'] as const).map((position) => (
                    <button
                      key={position}
                      onClick={() => updateSetting('sidebarPosition', position)}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        settings.sidebarPosition === position
                          ? 'border-blue-600 bg-blue-50 shadow-lg'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {/* Visual Example */}
                      <div className="mb-3 h-20 bg-gray-100 rounded-lg relative overflow-hidden">
                        {position === 'fixed' ? (
                          // Fixed layout
                          <div className="h-full flex gap-1 p-1">
                            <div className="w-1/4 bg-gray-700 rounded"></div>
                            <div className="flex-1 bg-white rounded border border-gray-300"></div>
                            <div className="w-1/4 bg-gray-300 rounded"></div>
                          </div>
                        ) : (
                          // Floating layout
                          <div className="h-full p-1 bg-white relative">
                            <div className="absolute top-2 left-2 w-1/4 h-3/4 bg-gray-700 rounded shadow-lg z-10 opacity-90"></div>
                            <div className="absolute top-2 right-2 w-1/4 h-3/4 bg-gray-300 rounded shadow-lg z-10 opacity-90"></div>
                            <div className="w-full h-full bg-blue-50 rounded border-2 border-gray-300"></div>
                          </div>
                        )}
                        
                        {settings.sidebarPosition === position && (
                          <div className="absolute bottom-1 right-1 bg-blue-500 text-white px-1.5 py-0.5 rounded text-xs font-bold">
                            ✓
                          </div>
                        )}
                      </div>
                      
                      {/* Description */}
                      <div className="text-center">
                        <div className="font-semibold text-gray-900 capitalize mb-1">{position}</div>
                        <div className="text-xs text-gray-600 leading-tight">
                          {position === 'fixed' 
                            ? 'Sidebars are always visible, content adjusts to fit' 
                            : 'Sidebars overlay content, can be hidden/shown'}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
                
                <div className={`mt-4 p-3 rounded-lg border ${
                  settings.sidebarPosition === 'fixed' 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-purple-50 border-purple-200'
                }`}>
                  <div className="text-xs font-semibold mb-1">
                    {settings.sidebarPosition === 'fixed' ? '✓ Fixed Position' : '✓ Floating Position'}
                  </div>
                  <div className="text-xs text-gray-700">
                    {settings.sidebarPosition === 'fixed' 
                      ? 'Good for: Desktop users, wide screens, constant sidebar access'
                      : 'Good for: Mobile users, narrow screens, more content space'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Display Options Tab */}
          {activeTab === 'display' && (
            <div className="space-y-6">
              {/* Theme */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Theme</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {(['light', 'dark', 'auto', 'time-based'] as const).map((themeOption) => (
                    <button
                      key={themeOption}
                      onClick={() => updateSetting('theme', themeOption)}
                      className={`p-4 rounded-lg border-2 transition ${
                        theme === themeOption
                          ? 'border-blue-600 bg-blue-50 shadow-lg'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-center">
                        {themeOption === 'light' && <Sun className="w-8 h-8 mx-auto mb-2 text-yellow-500" />}
                        {themeOption === 'dark' && <Moon className="w-8 h-8 mx-auto mb-2 text-indigo-500" />}
                        {themeOption === 'auto' && <Monitor className="w-8 h-8 mx-auto mb-2 text-blue-500" />}
                        {themeOption === 'time-based' && <Clock className="w-8 h-8 mx-auto mb-2 text-purple-500" />}
                        <div className="font-semibold text-gray-900 capitalize">
                          {themeOption === 'time-based' ? 'Time Based' : themeOption}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {themeOption === 'auto' && 'System preference'}
                          {themeOption === 'light' && 'Always light'}
                          {themeOption === 'dark' && 'Always dark'}
                          {themeOption === 'time-based' && '6 AM - 6 PM'}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
                
                {/* Time-Based Info */}
                {theme === 'time-based' && (
                  <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-4 h-4 text-purple-600" />
                      <span className="font-semibold text-purple-900 text-sm">Time-Based Mode Active</span>
                    </div>
                    <div className="text-xs text-purple-800 space-y-1">
                      <p>☀️ <strong>Light Mode:</strong> 6:00 AM - 6:00 PM</p>
                      <p>🌙 <strong>Dark Mode:</strong> 6:00 PM - 6:00 AM</p>
                      {currentTimeInfo && (
                        <p className="mt-2 pt-2 border-t border-purple-200">
                          ⏰ Current Time: <strong>{currentTimeInfo}</strong> → Currently showing <strong>{resolvedTheme}</strong> mode
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Font Size */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Font Size</h3>
                <div className="flex items-center gap-4 mb-3">
                  <Type className="w-4 h-4 text-gray-400" />
                  <input
                    type="range"
                    min="12"
                    max="20"
                    value={settings.fontSize}
                    onChange={(e) => updateSetting('fontSize', parseInt(e.target.value))}
                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="w-16 text-center font-bold text-gray-900">{settings.fontSize}px</div>
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Smaller</span>
                  <span>Larger</span>
                </div>
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <p style={{ fontSize: `${settings.fontSize}px` }} className="text-gray-700">
                    The quick brown fox jumps over the lazy dog
                  </p>
                </div>
              </div>

              {/* Icon Size */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Icon Size</h3>
                <div className="grid grid-cols-3 gap-3">
                  {(['small', 'medium', 'large'] as const).map((size) => (
                    <button
                      key={size}
                      onClick={() => updateSetting('iconSize', size)}
                      className={`p-4 rounded-lg border-2 transition ${
                        settings.iconSize === size
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-center">
                        <Grid className={`mx-auto mb-2 ${size === 'small' ? 'w-4 h-4' : size === 'medium' ? 'w-6 h-6' : 'w-8 h-8'}`} />
                        <div className="font-semibold text-gray-900 capitalize">{size}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Accessibility Options */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Accessibility</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-gray-900">Enable Animations</div>
                      <div className="text-sm text-gray-500">Smooth transitions and effects</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.enableAnimations}
                        onChange={(e) => updateSetting('enableAnimations', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t">
                    <div>
                      <div className="font-semibold text-gray-900">Reduced Motion</div>
                      <div className="text-sm text-gray-500">Minimize animations for accessibility</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.reducedMotion}
                        onChange={(e) => updateSetting('reducedMotion', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t">
                    <div>
                      <div className="font-semibold text-gray-900">High Contrast Mode</div>
                      <div className="text-sm text-gray-500">Enhanced visibility for text and elements</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.highContrast}
                        onChange={(e) => updateSetting('highContrast', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Performance Tab */}
          {activeTab === 'performance' && (
            <div className="space-y-6">
              {/* Performance Mode */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Performance Mode</h3>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="font-semibold text-gray-900">Enable Performance Mode</div>
                    <div className="text-sm text-gray-500">Reduce visual effects for better performance</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.performanceMode}
                      onChange={(e) => updateSetting('performanceMode', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                {settings.performanceMode && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                    ⚡ Performance mode is active. Some visual effects are disabled.
                  </div>
                )}
              </div>

              {/* Image Quality - Visual Comparison with REAL IMAGE */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <ImageIcon className="w-5 h-5" />
                  Image Quality: Real Example Comparison
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Compare quality levels with a real swimming photo. See the difference before choosing!
                </p>
                
                <div className="grid grid-cols-3 gap-4 mb-4">
                  {(['low', 'medium', 'high'] as const).map((quality) => (
                    <button
                      key={quality}
                      onClick={() => updateSetting('imageQuality', quality)}
                      className={`group relative rounded-lg border-3 transition-all overflow-hidden ${
                        settings.imageQuality === quality
                          ? 'border-green-500 bg-green-50 shadow-lg ring-2 ring-green-300'
                          : 'border-gray-300 hover:border-gray-400 hover:shadow-md'
                      }`}
                    >
                      {/* REAL Image at different qualities */}
                      <div className="aspect-video bg-gray-100 relative overflow-hidden">
                        <NextImage
                          src="/images/swimming.png"
                          alt="Swimming example"
                          fill
                          sizes="33vw"
                          className={`object-cover transition-all ${
                            quality === 'low' ? 'blur-sm scale-110 opacity-70' : 
                            quality === 'medium' ? 'blur-[1px] scale-105 opacity-90' : 
                            'blur-none scale-100 opacity-100'
                          }`}
                          style={{
                            imageRendering: quality === 'low' ? 'pixelated' : 'auto',
                            filter: quality === 'low' ? 'brightness(0.9) contrast(0.8)' : 
                                   quality === 'medium' ? 'brightness(0.95) contrast(0.9)' : 
                                   'brightness(1) contrast(1)'
                          }}
                        />
                        {settings.imageQuality === quality && (
                          <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-lg">
                            ✓ Active
                          </div>
                        )}
                      </div>
                      
                      {/* Quality Info */}
                      <div className="p-3 text-center bg-white">
                        <div className="font-bold text-gray-900 capitalize mb-1">{quality}</div>
                        <div className="text-xs text-gray-600 mb-2">
                          {quality === 'low' && '📦 ~50 KB'}
                          {quality === 'medium' && '📦 ~150 KB'}
                          {quality === 'high' && '📦 ~400 KB'}
                        </div>
                        <div className="flex items-center justify-center gap-1 text-xs">
                          <Zap className="w-3 h-3" />
                          <span className={`font-semibold ${quality === 'low' ? 'text-green-600' : quality === 'medium' ? 'text-yellow-600' : 'text-orange-600'}`}>
                            {quality === 'low' && 'Fastest'}
                            {quality === 'medium' && 'Balanced'}
                            {quality === 'high' && 'Best Quality'}
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Quality Explanation */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 text-sm mb-2">💡 Current Selection</h4>
                  <div className="text-xs text-blue-800 space-y-1">
                    {settings.imageQuality === 'low' && (
                      <>
                        <p>⚡ <strong>Low Quality</strong> - Faster loading, uses less data</p>
                        <p>✓ Best for: Mobile data, slow connections, limited bandwidth</p>
                        <p>⚠ Trade-off: Images appear less sharp and detailed</p>
                      </>
                    )}
                    {settings.imageQuality === 'medium' && (
                      <>
                        <p>✅ <strong>Medium Quality</strong> - Recommended for most users</p>
                        <p>✓ Best for: Normal WiFi, balanced performance and quality</p>
                        <p>✓ Good balance of clarity and file size</p>
                      </>
                    )}
                    {settings.imageQuality === 'high' && (
                      <>
                        <p>🌟 <strong>High Quality</strong> - Maximum detail and clarity</p>
                        <p>✓ Best for: Fast internet, professional use, photo analysis</p>
                        <p>⚠ Trade-off: Larger files, slower loading on slow connections</p>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Lazy Loading */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Loading Optimization</h3>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-gray-900">Lazy Loading</div>
                    <div className="text-sm text-gray-500">Load images and content as you scroll</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.lazyLoading}
                      onChange={(e) => updateSetting('lazyLoading', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>

              {/* Performance Tips */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-blue-600" />
                  Performance Tips
                </h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600">•</span>
                    <span>Enable performance mode on slower devices</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600">•</span>
                    <span>Lower image quality for faster loading</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600">•</span>
                    <span>Use reduced motion if animations cause issues</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600">•</span>
                    <span>Keep lazy loading enabled for better performance</span>
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Enhanced Live Preview Panel - Shows REAL Pages */}
        {showPreview && (
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden sticky top-6">
              {/* Preview Header */}
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  Live Preview
                </h3>
                <p className="text-xs text-blue-100 mt-1">Real page preview - See your actual current page!</p>
              </div>

              {/* Preview Page Tabs */}
              <div className="bg-gray-50 border-b-2 border-gray-200 px-2 py-2 flex gap-1">
                <button
                  onClick={() => setPreviewPage('dashboard')}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                    previewPage === 'dashboard'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:bg-white/50'
                  }`}
                >
                  📊 Dashboard
                </button>
                <button
                  onClick={() => setPreviewPage('workouts')}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                    previewPage === 'workouts'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:bg-white/50'
                  }`}
                >
                  🏋️ Workouts
                </button>
                <button
                  onClick={() => setPreviewPage('analytics')}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                    previewPage === 'analytics'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:bg-white/50'
                  }`}
                >
                  📈 Current
                </button>
              </div>
              
              <div className="p-6 space-y-4">
                {/* REAL PAGE PREVIEW - Shows actual application content */}
                <div className={`border-2 border-dashed rounded-lg overflow-hidden transition-all ${
                  resolvedTheme === 'dark' ? 'border-gray-600 bg-gray-900' : 'border-blue-300 bg-white'
                }`}>
                  {/* Preview Label */}
                  <div className={`px-3 py-2 text-xs font-semibold ${
                    resolvedTheme === 'dark' ? 'bg-gray-800 text-gray-300' : 'bg-blue-50 text-blue-900'
                  }`}>
                    {previewPage === 'dashboard' && '📊 Your Dashboard Preview'}
                    {previewPage === 'workouts' && '🏋️ Workouts Page Preview'}
                    {previewPage === 'analytics' && '📄 Current Settings Page Preview'}
                  </div>

                  {/* Scaled Preview Frame - Shows current page miniature */}
                  <div className="relative" style={{ 
                    height: '400px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      transform: 'scale(0.33)',
                      transformOrigin: 'top left',
                      width: '300%',
                      height: '300%'
                    }}>
                      {/* DASHBOARD PREVIEW - Real miniature */}
                      {previewPage === 'dashboard' && (
                        <div className={`p-6 min-h-screen ${
                          resolvedTheme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'
                        }`} style={{ fontSize: `${settings.fontSize}px` }}>
                          <div className="flex gap-4">
                            {/* Left Sidebar */}
                            {settings.leftSidebarVisible && (
                              <div className={`rounded-lg p-4 ${
                                resolvedTheme === 'dark' ? 'bg-gray-800' : 'bg-white'
                              } shadow-lg ${
                                settings.sidebarPosition === 'floating' ? 'absolute z-50' : 'relative'
                              }`} style={{ width: `${settings.leftSidebarWidth}%` }}>
                                <div className={`text-sm font-bold mb-4 ${resolvedTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                  Navigation
                                </div>
                                <div className="space-y-2">
                                  {['🏠 Dashboard', '🏋️ Workouts', '📊 Analytics', '⚙️ Settings'].map((item, i) => (
                                    <div key={i} className={`px-3 py-2 rounded ${
                                      i === 0 
                                        ? resolvedTheme === 'dark' ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white'
                                        : resolvedTheme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
                                    }`} style={{ fontSize: `${settings.fontSize * 0.9}px` }}>
                                      {item}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {/* Main Content */}
                            <div className="flex-1 space-y-4">
                              {/* Dashboard Header */}
                              <div className={`p-6 rounded-lg shadow-md ${
                                resolvedTheme === 'dark' ? 'bg-gray-800' : 'bg-white'
                              }`}>
                                <h2 className={`text-2xl font-bold mb-2 ${resolvedTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                  My Dashboard
                                </h2>
                                <p className={`text-sm ${resolvedTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                  Welcome back! Here's your training overview
                                </p>
                              </div>
                              
                              {/* Widgets based on layout */}
                              {settings.dashboardLayout === 'default' && (
                                <>
                                  <div className="grid grid-cols-3 gap-3">
                                    {[
                                      { icon: '📊', label: 'Total Workouts', value: '48', color: resolvedTheme === 'dark' ? 'bg-blue-900' : 'bg-blue-50' },
                                      { icon: '⏱️', label: 'This Week', value: '5', color: resolvedTheme === 'dark' ? 'bg-green-900' : 'bg-green-50' },
                                      { icon: '🔥', label: 'Streak', value: '12 days', color: resolvedTheme === 'dark' ? 'bg-orange-900' : 'bg-orange-50' }
                                    ].map((stat, i) => (
                                      <div key={i} className={`p-4 rounded-lg ${stat.color} ${resolvedTheme === 'dark' ? '' : 'border'}`}>
                                        <div className="text-2xl mb-1">{stat.icon}</div>
                                        <div className={`text-xs ${resolvedTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>{stat.label}</div>
                                        <div className={`text-xl font-bold ${resolvedTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{stat.value}</div>
                                      </div>
                                    ))}
                                  </div>
                                  
                                  <div className={`p-6 rounded-lg shadow-md ${resolvedTheme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
                                    <h3 className={`font-bold mb-3 ${resolvedTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Upcoming Workouts</h3>
                                    <div className="space-y-2">
                                      {[
                                        { sport: '🏊', name: 'Swimming Practice', time: '6:00 AM' },
                                        { sport: '🏃', name: 'Morning Run', time: '7:30 AM' },
                                      ].map((workout, i) => (
                                        <div key={i} className={`flex items-center gap-3 p-3 rounded ${
                                          resolvedTheme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'
                                        }`}>
                                          <div className="text-xl">{workout.sport}</div>
                                          <div className="flex-1">
                                            <div className={`font-semibold ${resolvedTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{workout.name}</div>
                                            <div className={`text-xs ${resolvedTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>{workout.time}</div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </>
                              )}
                              
                              {settings.dashboardLayout === 'compact' && (
                                <div className="grid grid-cols-2 gap-3">
                                  {['📊 Stats', '📅 Calendar', '🏋️ Workouts', '📈 Progress'].map((widget, i) => (
                                    <div key={i} className={`p-6 rounded-lg ${resolvedTheme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow-md`}>
                                      <div className={`font-bold ${resolvedTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{widget}</div>
                                    </div>
                                  ))}
                                </div>
                              )}
                              
                              {settings.dashboardLayout === 'expanded' && (
                                <div className="space-y-3">
                                  {['📊 Statistics Overview', '📅 Weekly Calendar', '🏋️ Training Plan'].map((widget, i) => (
                                    <div key={i} className={`p-6 rounded-lg ${resolvedTheme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow-md h-24`}>
                                      <div className={`font-bold ${resolvedTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{widget}</div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                            
                            {/* Right Sidebar */}
                            {settings.rightSidebarVisible && (
                              <div className={`rounded-lg p-4 ${
                                resolvedTheme === 'dark' ? 'bg-gray-800' : 'bg-white'
                              } shadow-lg ${
                                settings.sidebarPosition === 'floating' ? 'absolute right-0 z-50' : 'relative'
                              }`} style={{ width: `${settings.rightSidebarWidth}%` }}>
                                <div className={`text-sm font-bold mb-4 ${resolvedTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                  Quick Actions
                                </div>
                                <div className="space-y-2">
                                  <button className="w-full px-3 py-2 bg-blue-500 text-white rounded text-sm font-semibold">
                                    + New Workout
                                  </button>
                                  <button className={`w-full px-3 py-2 rounded text-sm ${
                                    resolvedTheme === 'dark' ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-700'
                                  }`}>
                                    📊 View Stats
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* WORKOUTS PREVIEW - Real workout cards */}
                      {previewPage === 'workouts' && (
                        <div className={`p-4 min-h-screen ${
                          resolvedTheme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'
                        }`} style={{ fontSize: `${settings.fontSize}px` }}>
                          <h2 className={`text-2xl font-bold mb-4 px-2 ${resolvedTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                            My Workouts
                          </h2>
                          
                          {settings.defaultView === 'grid' && (
                            <div className={`grid grid-cols-${Math.min(settings.columnCount, 3)} ${getGridSizeClass()}`}>
                              {['Swimming', 'Running', 'Cycling', 'Gym', 'Yoga', 'Recovery'].slice(0, settings.columnCount * 2).map((sport, i) => (
                                <div key={i} className={`rounded-lg overflow-hidden shadow-md ${
                                  resolvedTheme === 'dark' ? 'bg-gray-800' : 'bg-white'
                                } ${getRowHeightClass()}`}>
                                  <div className="relative w-full h-2/3">
                                    <NextImage
                                      src="/images/swimming.png" 
                                      alt={sport}
                                      fill
                                      sizes="33vw"
                                      className={`object-cover ${
                                        settings.imageQuality === 'low' ? 'blur-sm opacity-70' :
                                        settings.imageQuality === 'medium' ? 'blur-[0.5px] opacity-90' :
                                        'blur-none opacity-100'
                                      }`}
                                    />
                                  </div>
                                  <div className="p-2">
                                    <div className={`font-semibold text-xs ${resolvedTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{sport}</div>
                                    <div className={`text-xs ${resolvedTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>45 min</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {settings.defaultView === 'list' && (
                            <div className="space-y-2">
                              {['Swimming', 'Running', 'Cycling', 'Gym'].map((sport, i) => (
                                <div key={i} className={`flex items-center gap-4 p-4 rounded-lg shadow-sm ${
                                  resolvedTheme === 'dark' ? 'bg-gray-800' : 'bg-white'
                                }`}>
                                  <NextImage 
                                    src="/images/swimming.png" 
                                    alt={sport}
                                    width={64}
                                    height={64}
                                    className={`w-16 h-16 rounded-lg object-cover ${
                                      settings.imageQuality === 'low' ? 'blur-sm' :
                                      settings.imageQuality === 'medium' ? 'blur-[0.5px]' :
                                      'blur-none'
                                    }`}
                                  />
                                  <div className="flex-1">
                                    <div className={`font-semibold ${resolvedTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{sport} Training</div>
                                    <div className={`text-sm ${resolvedTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Today at 6:00 AM</div>
                                  </div>
                                  <div className={`px-3 py-1 rounded text-sm font-semibold ${
                                    resolvedTheme === 'dark' ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-700'
                                  }`}>
                                    45 min
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {settings.defaultView === 'table' && (
                            <div className={`rounded-lg overflow-hidden shadow-md ${
                              resolvedTheme === 'dark' ? 'bg-gray-800' : 'bg-white'
                            }`}>
                              <table className="w-full">
                                <thead className={resolvedTheme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'}>
                                  <tr>
                                    <th className={`px-4 py-3 text-left text-xs font-bold ${resolvedTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Sport</th>
                                    <th className={`px-4 py-3 text-left text-xs font-bold ${resolvedTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Time</th>
                                    <th className={`px-4 py-3 text-left text-xs font-bold ${resolvedTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Duration</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {['🏊 Swimming', '🏃 Running', '🚴 Cycling'].map((sport, i) => (
                                    <tr key={i} className={`border-t ${resolvedTheme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                                      <td className={`px-4 py-3 text-sm ${resolvedTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{sport}</td>
                                      <td className={`px-4 py-3 text-sm ${resolvedTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>6:00 AM</td>
                                      <td className={`px-4 py-3 text-sm ${resolvedTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>45 min</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )}

                      {/* ANALYTICS/CURRENT PAGE - Shows this settings page! */}
                      {previewPage === 'analytics' && (
                        <div className={`p-6 min-h-screen ${
                          resolvedTheme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'
                        }`} style={{ fontSize: `${settings.fontSize}px` }}>
                          <div className={`p-6 rounded-lg shadow-md mb-4 ${
                            resolvedTheme === 'dark' ? 'bg-gray-800' : 'bg-white'
                          }`}>
                            <h2 className={`text-2xl font-bold ${resolvedTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                              Grid & Display Settings
                            </h2>
                            <p className={`text-sm mt-2 ${resolvedTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                              This is how the current page looks with your settings!
                            </p>
                          </div>
                          
                          <div className="grid grid-cols-4 gap-3 mb-4">
                            {['Layout', 'View', 'Display', 'Performance'].map((tab, i) => (
                              <div key={i} className={`p-3 rounded-lg text-center ${
                                i === 0
                                  ? resolvedTheme === 'dark' ? 'bg-blue-900 text-white' : 'bg-blue-100 text-blue-700'
                                  : resolvedTheme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
                              }`}>
                                <div className="text-xs font-semibold">{tab}</div>
                              </div>
                            ))}
                          </div>
                          
                          <div className={`p-6 rounded-lg shadow-md ${
                            resolvedTheme === 'dark' ? 'bg-gray-800' : 'bg-white'
                          }`}>
                            <div className="space-y-3">
                              {['Theme', 'Font Size', 'Grid Density'].map((setting, i) => (
                                <div key={i} className="flex items-center justify-between">
                                  <span className={`text-sm ${resolvedTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{setting}</span>
                                  <span className={`text-sm font-semibold ${resolvedTheme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>
                                    {i === 0 && theme}
                                    {i === 1 && `${settings.fontSize}px`}
                                    {i === 2 && settings.gridSize}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Current Settings Summary */}
                <div className="pt-4 border-t space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Theme:</span>
                    <span className="font-semibold text-gray-900 capitalize">{theme}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Grid Size:</span>
                    <span className="font-semibold text-gray-900 capitalize">{settings.gridSize}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Layout:</span>
                    <span className="font-semibold text-gray-900 capitalize">{settings.dashboardLayout}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Image Quality:</span>
                    <span className="font-semibold text-gray-900 capitalize">{settings.imageQuality}</span>
                  </div>
                  {settings.performanceMode && (
                    <div className="flex items-center gap-1 text-yellow-600 font-semibold">
                      <Zap className="w-3 h-3" />
                      Performance Mode Active
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

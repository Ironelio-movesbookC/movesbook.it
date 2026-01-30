'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Download, Palette, Settings as SettingsIcon, Star, Trophy, Grid } from 'lucide-react';
import BackgroundsColorsSettings from '@/components/settings/BackgroundsColorsSettings';
import ToolsSettings from '@/components/settings/ToolsSettings';
import FavouritesSettings from '@/components/settings/FavouritesSettings';
import MyBestSettings from '@/components/settings/MyBestSettings';
import GridDisplaySettings from '@/components/settings/GridDisplaySettings';

type SettingsSection = 'backgrounds' | 'tools' | 'favourites' | 'mybest' | 'grid';

export default function PersonalSettingsPage() {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<SettingsSection>('backgrounds');
  const [loading, setLoading] = useState(false);
  const [userSettings, setUserSettings] = useState<any>(null);
  const [userLanguage, setUserLanguage] = useState('en');
  
  // Load user's current settings when page mounts
  useEffect(() => {
    loadUserSettings();
  }, []);

  const loadUserSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('No token found');
        return;
      }

      const response = await fetch('/api/user/settings/get', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      console.log('Load settings response:', data);
      
      if (response.ok) {
        setUserSettings(data.settings);
        // Try to get user language from settings or localStorage
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const userData = JSON.parse(storedUser);
          setUserLanguage(userData.language || 'en');
        }
      } else {
        console.error('Failed to load settings:', data);
        alert(`Error loading settings: ${data.details || data.error}`);
      }
    } catch (error) {
      console.error('Error loading user settings:', error);
      alert(`Error: ${error}`);
    }
  };

  const loadDefaultSettings = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/user/settings/load-defaults?language=${userLanguage}`);
      if (response.ok) {
        const data = await response.json();
        
        if (data.success) {
          // Apply default settings to current user settings
          setUserSettings(data.settings);
          
          // Save the default settings to user's account
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

  const savePersonalSettings = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Please login to save settings.');
        setLoading(false);
        return;
      }

      console.log('Saving settings:', userSettings);

      const response = await fetch('/api/user/settings/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(userSettings)
      });
      
      const data = await response.json();
      console.log('Save response:', data);
      
      if (response.ok) {
        alert('✅ Personal settings saved successfully!');
      } else {
        alert(`Failed to save settings: ${data.details || data.error}`);
      }
    } catch (error: any) {
      console.error('Error saving personal settings:', error);
      alert(`Error saving settings: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const settingsSections = [
    { id: 'backgrounds' as SettingsSection, label: 'Backgrounds & Colors', icon: Palette },
    { id: 'tools' as SettingsSection, label: 'Tools', icon: SettingsIcon },
    { id: 'favourites' as SettingsSection, label: 'Favourites', icon: Star },
    { id: 'mybest' as SettingsSection, label: 'My Best', icon: Trophy },
    { id: 'grid' as SettingsSection, label: 'Grid Display Mode', icon: Grid },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-cyan-500 to-purple-500 text-white px-6 py-6 shadow-lg">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                title="Go Back"
              >
                <ArrowLeft size={24} />
              </button>
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <SettingsIcon size={28} />
                  <span>Personal Settings</span>
                </h1>
                <p className="text-sm text-white/90 mt-1">
                  Language: <span className="font-semibold">{userLanguage.toUpperCase()}</span> - Configure your personal preferences
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border-b border-blue-200 px-6 py-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm text-blue-800">
              <strong>Your Personal Settings</strong> - Configure your own preferences
            </p>
            <p className="text-xs text-blue-600 mt-1">
              Optional: Load {userLanguage.toUpperCase()} defaults created by admins as a starting template
            </p>
          </div>
          <button
            onClick={loadDefaultSettings}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shadow-md"
          >
            <Download size={16} />
            <span>{loading ? 'Loading...' : 'Load Admin Defaults'}</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-6 px-6">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="flex">
            {/* Sidebar Navigation */}
            <div className="w-64 bg-gray-50 border-r border-gray-200 flex-shrink-0">
              <nav className="p-4 space-y-2">
                {settingsSections.map((section) => {
                  const Icon = section.icon;
                  return (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all ${
                        activeSection === section.id
                          ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white shadow-md'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <Icon size={20} />
                      <span className="font-medium">{section.label}</span>
                    </button>
                  );
                })}
              </nav>

              {/* Language Info Panel */}
              <div className="p-4 mx-4 mt-4 bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-300 rounded-lg shadow-sm">
                <h3 className="text-sm font-semibold text-yellow-900 mb-2 flex items-center gap-2">
                  <span>ℹ️</span> Your Settings
                </h3>
                <p className="text-xs text-yellow-800 leading-relaxed">
                  These are <strong>your personal settings</strong>. 
                  <br/><br/>
                  You can load <strong>{userLanguage.toUpperCase()} defaults</strong> as a template, then customize and save.
                  <br/><br/>
                  <em>Only admins can edit language defaults.</em>
                </p>
              </div>
            </div>

            {/* Settings Content */}
            <div className="flex-1 p-8 bg-white overflow-y-auto" style={{ maxHeight: 'calc(100vh - 280px)' }}>
              {activeSection === 'backgrounds' && <BackgroundsColorsSettings />}
              {activeSection === 'tools' && <ToolsSettings isAdmin={false} userType="ATHLETE" />}
              {activeSection === 'favourites' && <FavouritesSettings />}
              {activeSection === 'mybest' && <MyBestSettings />}
              {activeSection === 'grid' && <GridDisplaySettings />}
            </div>
          </div>

          {/* Footer */}
          <div className="border-t bg-gray-50 px-8 py-4 flex items-center justify-between">
            <button
              onClick={() => router.back()}
              className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Go Back
            </button>
            <p className="text-sm text-gray-600 italic">
              ✓ All changes are saved automatically
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}


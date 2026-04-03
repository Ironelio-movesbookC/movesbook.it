import { useState, useEffect, useCallback } from 'react';

export interface UserSettings {
  // Color & Background Settings
  colorSettings: Record<string, any>;
  
  // Display Settings
  gridSize: 'compact' | 'comfortable' | 'spacious';
  columnCount: number;
  rowHeight: 'small' | 'medium' | 'large';
  defaultView: 'list' | 'grid' | 'table';
  
  // Sidebar Settings
  leftSidebarVisible: boolean;
  rightSidebarVisible: boolean;
  leftSidebarWidth: number;
  rightSidebarWidth: number;
  sidebarPosition: 'fixed' | 'floating';
  
  // Theme & Display
  theme: 'light' | 'dark' | 'auto' | 'time-based';
  fontSize: number;
  iconSize: 'small' | 'medium' | 'large';
  sportIconType: 'emoji' | 'icon';
  
  // Accessibility
  enableAnimations: boolean;
  reducedMotion: boolean;
  highContrast: boolean;
  
  // Performance
  performanceMode: boolean;
  imageQuality: 'low' | 'medium' | 'high';
  lazyLoading: boolean;
  
  // Dashboard
  dashboardLayout: 'default' | 'compact' | 'expanded';
  widgetArrangement: string[];
  
  // Language
  language: string;

  /** Weekly workout structure (Plans A–E); parsed from DB JSON */
  weeklyStructureV1?: Record<string, unknown> | null;
}

export function useUserSettings(userId?: string) {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load settings from API
  const loadSettings = useCallback(async () => {
    if (!userId) {
      // If no userId, load from localStorage as fallback
      const localSettings = localStorage.getItem('displaySettings');
      if (localSettings) {
        try {
          const parsed = JSON.parse(localSettings);
          setSettings(parsed);
        } catch (e) {
          console.error('Error parsing local settings:', e);
        }
      }
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        // No token - user not logged in, this is expected
        setSettings(null);
        setError(null);
        setLoading(false);
        return;
      }

      const response = await fetch('/api/user/settings', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.status === 401) {
        // Token invalid/expired - clear auth and silently fail
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setSettings(null);
        setError(null);
        setLoading(false);
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to load settings');
      }

      const data = await response.json();
      setSettings(data);
      setError(null);
    } catch (err) {
      // Only log real errors, not auth issues
      if (err instanceof Error && !err.message.includes('token') && !err.message.includes('401')) {
        console.error('Error loading settings:', err);
      }
      setError(err instanceof Error ? err.message : 'Unknown error');
      
      // Fallback to localStorage
      const localSettings = localStorage.getItem('displaySettings');
      if (localSettings) {
        try {
          setSettings(JSON.parse(localSettings));
        } catch (e) {
          console.error('Error parsing local settings:', e);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Save settings to API
  const saveSettings = useCallback(async (newSettings: Partial<UserSettings>) => {
    if (!userId) {
      // If no userId, save to localStorage only
      localStorage.setItem('displaySettings', JSON.stringify({
        ...settings,
        ...newSettings
      }));
      setSettings(prev => ({ ...prev as UserSettings, ...newSettings }));
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch('/api/user/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newSettings)
      });

      if (!response.ok) {
        throw new Error('Failed to save settings');
      }

      const data = await response.json();
      setSettings(data);
      
      // Also save to localStorage for immediate access
      localStorage.setItem('displaySettings', JSON.stringify(data));
      
      setError(null);
      return data;
    } catch (err) {
      console.error('Error saving settings:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    }
  }, [userId, settings]);

  // Update a single setting
  const updateSetting = useCallback(async <K extends keyof UserSettings>(
    key: K,
    value: UserSettings[K]
  ) => {
    return saveSettings({ [key]: value } as Partial<UserSettings>);
  }, [saveSettings]);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  return {
    settings,
    loading,
    error,
    saveSettings,
    updateSetting,
    reload: loadSettings
  };
}


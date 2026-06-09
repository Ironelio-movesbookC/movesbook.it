import { useState, useEffect, useCallback } from 'react';

export interface WorkoutSettings {
  // View & Display Settings
  viewMode: 'table' | 'calendar';
  expandedWeeks: string[];
  expandedDays: string[];
  expandedWorkouts: string[];
  expandedNutritionFoods: string[];
  
  // Table Settings
  tableColumns: {
    workout: string[];
    nutritionFood: string[];
    nutritionComponent: string[];
  };
  
  // Section & Period
  activeSection: string;
  activePeriod: string | null;
  
  // Display Preferences
  showDayInfo: boolean;
  showWeeklyStats: boolean;
  compactMode: boolean;
  
  // Auto-expand preferences
  autoExpandNewWorkout: boolean;
  autoExpandNewNutritionFood: boolean;
  autoExpandNewNutritionComponent: boolean;
}

const DEFAULT_SETTINGS: WorkoutSettings = {
  viewMode: 'table',
  expandedWeeks: [],
  expandedDays: [],
  expandedWorkouts: [],
  expandedNutritionFoods: [],
  tableColumns: {
    workout: [],
    nutritionFood: [],
    nutritionComponent: []
  },
  activeSection: 'A',
  activePeriod: null,
  showDayInfo: false,
  showWeeklyStats: true,
  compactMode: false,
  autoExpandNewWorkout: true,
  autoExpandNewNutritionFood: true,
  autoExpandNewNutritionComponent: true
};

export function useNutritionSettings() {
  const [settings, setSettings] = useState<WorkoutSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load settings from API
  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        // Use default settings if not authenticated
        setSettings(DEFAULT_SETTINGS);
        setLoading(false);
        return;
      }

      const response = await fetch('/api/user/settings', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load settings');
      }

      const data = await response.json();
      const workoutPrefs = data.nutritionPreferences 
        ? (typeof data.nutritionPreferences === 'string' 
          ? JSON.parse(data.nutritionPreferences) 
          : data.nutritionPreferences)
        : {};
      
      setSettings({
        ...DEFAULT_SETTINGS,
        ...workoutPrefs
      });
      setError(null);
    } catch (err) {
      console.error('Error loading workout settings:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      
      // Fallback to localStorage
      try {
        const localSettings = localStorage.getItem('workoutSettings');
        if (localSettings) {
          setSettings({
            ...DEFAULT_SETTINGS,
            ...JSON.parse(localSettings)
          });
        }
      } catch (e) {
        setSettings(DEFAULT_SETTINGS);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Save settings to API
  const saveSettings = useCallback(async (newSettings: Partial<WorkoutSettings>) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        // Save to localStorage only if not authenticated
        const updated = { ...settings, ...newSettings };
        localStorage.setItem('workoutSettings', JSON.stringify(updated));
        setSettings(updated);
        return;
      }

      const updated = { ...settings, ...newSettings };

      const response = await fetch('/api/user/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          nutritionPreferences: JSON.stringify(updated)
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save settings');
      }

      setSettings(updated);
      
      // Also cache in localStorage for immediate access
      localStorage.setItem('workoutSettings', JSON.stringify(updated));
      
      setError(null);
      return updated;
    } catch (err) {
      console.error('Error saving workout settings:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    }
  }, [settings]);

  // Update a single setting
  const updateSetting = useCallback(async <K extends keyof WorkoutSettings>(
    key: K,
    value: WorkoutSettings[K]
  ) => {
    return saveSettings({ [key]: value } as Partial<WorkoutSettings>);
  }, [saveSettings]);

  // Toggle expanded state helpers
  const toggleExpanded = useCallback(async (
    type: 'weeks' | 'days' | 'meals' | 'nutrition_foods',
    id: string
  ) => {
    const key = `expanded${type.charAt(0).toUpperCase() + type.slice(1)}` as keyof WorkoutSettings;
    const current = settings[key] as string[];
    const updated = current.includes(id)
      ? current.filter(item => item !== id)
      : [...current, id];
    
    return updateSetting(key, updated as any);
  }, [settings, updateSetting]);

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
    toggleExpanded,
    reload: loadSettings
  };
}


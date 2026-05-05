'use client';

import { useState, useEffect, useRef } from 'react';
import { Star, Plus, Edit2, Trash2, Calendar, Dumbbell, Target, Clock, Search, Copy, Eye, Download, Globe } from 'lucide-react';
import { SPORTS_LIST } from '@/constants/moveframe.constants';
import { getSportIcon } from '@/utils/sportIcons';
import Image from 'next/image';
import FavoriteWorkoutCard from '@/components/workouts/FavoriteWorkoutCard';
import WorkoutOverviewModal from '@/components/workouts/WorkoutOverviewModal';
import UseInPlannerModal from '@/components/workouts/UseInPlannerModal';

interface WeeklyPlan {
  id: string;
  name: string;
  description: string;
  weekStart: string;
  daysCount: number;
  workoutsCount: number;
  lastUsed: string;
  tags: string[];
}

interface Workout {
  id: string;
  name: string;
  description: string;
  duration: number; // in minutes
  intensity: 'Low' | 'Medium' | 'High';
  moveframesCount: number;
  sport: string;
  sportIcon?: string; // Icon path from public/icons
  lastUsed: string;
  tags: string[];
}

interface Moveframe {
  id: string;
  name: string;
  description: string;
  sets: number;
  reps: string;
  restTime: number; // in seconds
  equipment: string[];
  muscleGroups: string[];
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  lastUsed: string;
  usageCount: number;
}

export default function FavouritesSettings() {
  const [activeTab, setActiveTab] = useState<'plans' | 'workouts' | 'moveframes' | 'sports'>('sports');
  
  // Favorite Sports State
  const [selectedSports, setSelectedSports] = useState<string[]>([]);
  const [showIconType, setShowIconType] = useState<'emoji' | 'icon'>('emoji'); // Toggle between emoji and icon display
  
  // Weekly Plans State
  const [weeklyPlans, setWeeklyPlans] = useState<WeeklyPlan[]>([]);
  const [showPlanDialog, setShowPlanDialog] = useState(false);
  const [editingPlan, setEditingPlan] = useState<WeeklyPlan | null>(null);
  
  // Workouts State
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [showWorkoutDialog, setShowWorkoutDialog] = useState(false);
  const [editingWorkout, setEditingWorkout] = useState<Workout | null>(null);
  const [showOverviewModal, setShowOverviewModal] = useState(false);
  const [overviewWorkout, setOverviewWorkout] = useState<any>(null);
  const [showUsePlannerModal, setShowUsePlannerModal] = useState(false);
  const [plannerWorkout, setPlannerWorkout] = useState<any>(null);
  
  // Moveframes State
  const [moveframes, setMoveframes] = useState<Moveframe[]>([]);
  const [showMoveframeDialog, setShowMoveframeDialog] = useState(false);
  const [editingMoveframe, setEditingMoveframe] = useState<Moveframe | null>(null);
  
  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTag, setFilterTag] = useState('all');
  const [sortBy, setSortBy] = useState<'name' | 'lastUsed' | 'popular'>('lastUsed');
  
  // Language-specific defaults state (Load defaults / admin merges)
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  /** Preview language for sport names in the grid (default English). */
  const [sportDisplayLanguage, setSportDisplayLanguage] = useState('en');
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [superAdminPassword, setSuperAdminPassword] = useState('');
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const hasLoadedFavoriteSportsRef = useRef(false);
  const [sportTranslations, setSportTranslations] = useState<Record<string, Record<string, string>>>({});
  const [showSportTranslationDialog, setShowSportTranslationDialog] = useState(false);
  const [editingSportKey, setEditingSportKey] = useState<string>('');
  const [sportTranslationsDraft, setSportTranslationsDraft] = useState<Record<string, string>>({});
  
  
  const supportedLanguages = [
    { code: 'en', name: 'English' },
    { code: 'fr', name: 'Français' },
    { code: 'it', name: 'Italiano' },
    { code: 'de', name: 'Deutsch' },
    { code: 'es', name: 'Español' },
    { code: 'pt', name: 'Português' },
    { code: 'ru', name: 'Русский' },
    { code: 'hi', name: 'हिन्दी' },
    { code: 'ja', name: '日本語' },
    { code: 'id', name: 'Indonesia' },
    { code: 'zh', name: '中文' },
    { code: 'ar', name: 'العربية' },
  ];

  // Load data from database APIs
  useEffect(() => {
    loadFavoriteWeeklyPlans();
    loadFavoriteWorkouts();
    loadFavoriteMoveframes();
  }, []);

  // Data is now saved to database via API endpoints
  // No need for localStorage sync

  // Load favorite sports from API
  useEffect(() => {
    loadFavoriteSports();
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('favorite_sports_translations');
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        setSportTranslations(parsed);
      }
    } catch (error) {
      console.error('❌ Error loading sport translations:', error);
    }
  }, []);

  useEffect(() => {
    const loadServerTranslations = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const res = await fetch('/api/user/settings', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) return;
        const data = await res.json();
        const server = data.favouritesSettings?.sportTranslations;
        if (server && typeof server === 'object' && Object.keys(server).length > 0) {
          setSportTranslations(server);
          localStorage.setItem('favorite_sports_translations', JSON.stringify(server));
        }
      } catch (e) {
        console.error('❌ Error loading sport translations from server:', e);
      }
    };
    void loadServerTranslations();
  }, []);

  const loadFavoriteSports = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('🔒 No token for loading favorites');
        return;
      }

      console.log('📥 Loading favorite sports...');
      const response = await fetch('/api/user/favorite-sports', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Loaded favorites:', data.sports);
        setSelectedSports(data.sports || []);
        hasLoadedFavoriteSportsRef.current = true;
      } else {
        console.log('⚠️ No favorites found or error');
        setSelectedSports([]);
        hasLoadedFavoriteSportsRef.current = true;
      }
    } catch (error) {
      console.error('❌ Error loading favorite sports:', error);
      setSelectedSports([]);
      hasLoadedFavoriteSportsRef.current = true;
    }
  };

  const loadFavoriteWeeklyPlans = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('🔒 No token for loading favorite weekly plans');
        return;
      }

      console.log('📥 Loading favorite weekly plans...');
      const response = await fetch('/api/workouts/plans/favorites', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Loaded favorite plans:', data.plans);
        // Transform to match the WeeklyPlan interface
        const transformed = Array.isArray(data.plans) ? data.plans.map((plan: any) => ({
          id: plan.id,
          name: plan.name,
          description: plan.description,
          weekStart: 'Monday',
          daysCount: plan.daysCount || 0,
          workoutsCount: plan.workoutsCount || 0,
          lastUsed: new Date(plan.lastUsed).toLocaleDateString(),
          tags: []
        })) : [];
        setWeeklyPlans(transformed);
      } else {
        console.log('⚠️ No favorite plans found');
        setWeeklyPlans([]);
      }
    } catch (error) {
      console.error('❌ Error loading favorite weekly plans:', error);
      setWeeklyPlans([]);
    }
  };

  const loadFavoriteWorkouts = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('🔒 No token for loading favorite workouts');
        return;
      }

      console.log('📥 Loading favorite workouts...');
      const response = await fetch('/api/workouts/favorites', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const favorites = await response.json(); // API returns array directly
        console.log('✅ Loaded favorite workouts:', favorites);
        
        // Filter out corrupted favorites
        const validFavorites: any[] = [];
        const corruptedFavorites: any[] = [];
        
        if (Array.isArray(favorites)) {
          favorites.forEach((fav: any) => {
            try {
              // Test if workoutData is valid JSON
              if (fav.workoutData) {
                JSON.parse(fav.workoutData);
              }
              validFavorites.push(fav);
            } catch (error) {
              console.error(`❌ CORRUPTED FAVORITE DETECTED:`, {
                id: fav.id,
                name: fav.name,
                error: error instanceof Error ? error.message : String(error)
              });
              corruptedFavorites.push(fav);
            }
          });
        }
        
        // Show warning if corrupted data found
        if (corruptedFavorites.length > 0) {
          console.warn(`⚠️ Found ${corruptedFavorites.length} corrupted favorites. IDs:`, corruptedFavorites.map(f => f.id));
          alert(`Warning: ${corruptedFavorites.length} favorite workout(s) have corrupted data and will be hidden.\n\nCorrupted IDs: ${corruptedFavorites.map(f => f.id).join(', ')}\n\nYou may need to delete these from the database manually.`);
        }
        
        // Transform valid favorites to match the Workout interface
        const transformed = validFavorites.map((fav: any) => {
          // Parse workoutData to get intensity and tags
          let parsedData = null;
          let workoutIntensity = 'Medium';
          let workoutTags = [];
          
          try {
            parsedData = fav.workoutData ? JSON.parse(fav.workoutData) : null;
            workoutIntensity = parsedData?.workout?.intensity || 'Medium';
            workoutTags = parsedData?.workout?.tags ? parsedData.workout.tags.split(',').map((t: string) => t.trim()) : [];
          } catch (e) {
            console.error('Error parsing workoutData:', e);
          }
          
          return {
            id: fav.id,
            name: fav.name,
            description: fav.description || '',
            duration: Math.round((fav.totalDuration || 0) / 60), // Convert seconds to minutes
            intensity: workoutIntensity as any,
            moveframesCount: 0, // Not stored in FavoriteWorkout
            sport: fav.sports?.split(',')[0] || 'Unknown',
            sportIcon: undefined,
            lastUsed: new Date(fav.createdAt).toLocaleDateString(),
            tags: workoutTags.length > 0 ? workoutTags : (fav.sports?.split(',') || []),
            workoutData: fav.workoutData, // Pass through the raw workoutData for FavoriteWorkoutCard
            totalDistance: fav.totalDistance,
            totalDuration: fav.totalDuration
          };
        });
        
        console.log('📦 Transformed favorites with intensity/tags:', transformed.map(w => ({
          id: w.id,
          name: w.name,
          intensity: w.intensity,
          tags: w.tags
        })));
        
        setWorkouts(transformed);
      } else {
        console.log('⚠️ No favorite workouts found');
        setWorkouts([]);
      }
    } catch (error) {
      console.error('❌ Error loading favorite workouts:', error);
      setWorkouts([]);
    }
  };

  const loadFavoriteMoveframes = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('🔒 No token for loading favorite moveframes');
        return;
      }

      console.log('📥 Loading favorite moveframes...');
      const response = await fetch('/api/workouts/moveframes/favorites', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Loaded favorite moveframes:', data.moveframes);
        // Transform to match the Moveframe interface
        const transformed = Array.isArray(data.moveframes) ? data.moveframes.map((mf: any) => ({
          id: mf.id,
          name: mf.name,
          description: mf.description || '',
          sets: mf.lapsCount || 0,
          reps: `${mf.totalDistance}m` || '-',
          restTime: 0,
          equipment: [],
          muscleGroups: [mf.sport],
          difficulty: 'Intermediate' as const,
          lastUsed: new Date(mf.lastUsed).toLocaleDateString(),
          usageCount: 0
        })) : [];
        setMoveframes(transformed);
      } else {
        console.log('⚠️ No favorite moveframes found');
        setMoveframes([]);
      }
    } catch (error) {
      console.error('❌ Error loading favorite moveframes:', error);
      setMoveframes([]);
    }
  };

  const saveFavoriteSportsSilently = async (sportsToSave: string[]) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      await fetch('/api/user/favorite-sports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ sports: sportsToSave })
      });
    } catch (error) {
      console.error('❌ Error saving favorite sports silently:', error);
    }
  };

  const toggleSport = (sport: string) => {
    setSelectedSports(prev => {
      if (prev.includes(sport)) {
        return prev.filter(s => s !== sport);
      } else {
        if (prev.length >= 5) {
          alert('⚠️ You can only select up to 5 favorite sports');
          return prev;
        }
        return [...prev, sport];
      }
    });
  };

  const moveSportUp = (index: number) => {
    if (index === 0) return;
    setSelectedSports(prev => {
      const newSports = [...prev];
      [newSports[index - 1], newSports[index]] = [newSports[index], newSports[index - 1]];
      return newSports;
    });
  };

  const moveSportDown = (index: number) => {
    if (index === selectedSports.length - 1) return;
    setSelectedSports(prev => {
      const newSports = [...prev];
      [newSports[index], newSports[index + 1]] = [newSports[index + 1], newSports[index]];
      return newSports;
    });
  };

  const getDefaultSportLabel = (sport: string) => sport.replace(/_/g, ' ');

  const getEnglishSportLabel = (sport: string) => {
    const en = sportTranslations[sport]?.en?.trim();
    if (en) return en;
    return getDefaultSportLabel(sport);
  };

  /** Label for the current preview language; red when falling back to English. */
  const getSportDisplay = (sport: string): { text: string; isRed: boolean } => {
    const lang = (sportDisplayLanguage || 'en').toLowerCase().split('-')[0];
    const english = getEnglishSportLabel(sport);
    if (lang === 'en') {
      return { text: english, isRed: false };
    }
    const loc = sportTranslations[sport]?.[lang]?.trim();
    if (loc) {
      return { text: loc, isRed: false };
    }
    return { text: english, isRed: true };
  };

  const persistSportTranslationsServer = async (
    next: Record<string, Record<string, string>>
  ) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const res = await fetch('/api/user/settings', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) return;
      const data = await res.json();
      const fav =
        data.favouritesSettings && typeof data.favouritesSettings === 'object'
          ? data.favouritesSettings
          : {};
      await fetch('/api/user/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          favouritesSettings: {
            weeklyPlans: fav.weeklyPlans ?? [],
            workouts: fav.workouts ?? [],
            moveframes: fav.moveframes ?? [],
            ...fav,
            sportTranslations: next
          }
        })
      });
    } catch (e) {
      console.error('❌ Failed to persist sport translations:', e);
    }
  };

  const handleOpenSportTranslationDialog = (sport: string) => {
    const draft: Record<string, string> = {};
    supportedLanguages.forEach((lang) => {
      draft[lang.code] = sportTranslations[sport]?.[lang.code] || '';
    });
    if (!draft.en?.trim()) draft.en = getEnglishSportLabel(sport);
    setEditingSportKey(sport);
    setSportTranslationsDraft(draft);
    setShowSportTranslationDialog(true);
  };

  const handleSaveSportTranslations = async () => {
    if (!editingSportKey) return;
    const en = (sportTranslationsDraft.en || '').trim();
    if (!en) {
      alert('English name is required.');
      return;
    }
    const cleaned: Record<string, string> = {};
    supportedLanguages.forEach(({ code }) => {
      const v = (sportTranslationsDraft[code] || '').trim();
      if (v) cleaned[code] = v;
    });
    cleaned.en = en;

    const next = {
      ...sportTranslations,
      [editingSportKey]: cleaned
    };
    setSportTranslations(next);
    localStorage.setItem('favorite_sports_translations', JSON.stringify(next));
    await persistSportTranslationsServer(next);
    setShowSportTranslationDialog(false);
    setEditingSportKey('');
    setSportTranslationsDraft({});
  };

  const loadSportsVersionForLanguage = (languageCode: string): boolean => {
    try {
      const storageKey = `tools_sports_${languageCode}`;
      const raw = localStorage.getItem(storageKey);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed) || parsed.length === 0) return false;

      const knownSports = new Set(SPORTS_LIST);
      const next = { ...sportTranslations };

      parsed.forEach((item: any) => {
        const sportKey =
          (typeof item?.id === 'string' && knownSports.has(item.id) ? item.id : null) ||
          (typeof item?.name === 'string' && knownSports.has(item.name) ? item.name : null);
        if (!sportKey) return;
        const translatedLabel = typeof item?.name === 'string' ? item.name : '';
        if (!translatedLabel.trim()) return;

        next[sportKey] = {
          ...(next[sportKey] || {}),
          [languageCode]: translatedLabel,
        };
      });

      setSportTranslations(next);
      localStorage.setItem('favorite_sports_translations', JSON.stringify(next));
      return true;
    } catch (error) {
      console.error('❌ Error loading sports version for language:', error);
      return false;
    }
  };

  useEffect(() => {
    if (!hasLoadedFavoriteSportsRef.current) return;
    const timeout = setTimeout(() => {
      void saveFavoriteSportsSilently(selectedSports);
    }, 350);
    return () => clearTimeout(timeout);
  }, [selectedSports]);

  // Language-specific defaults handlers
  const saveLanguageDefaults = async () => {
    setShowPasswordDialog(true);
  };

  const loadLanguageDefaults = async () => {
    setShowLoadDialog(true);
  };

  const handlePasswordSubmit = async () => {
    if (!superAdminPassword.trim()) {
      alert('❌ Please enter your password');
      return;
    }

    try {
      // Verify user password
      const token = localStorage.getItem('token');
      
      if (!token) {
        alert('❌ Please login to save settings');
        return;
      }
      
      const verifyResponse = await fetch('/api/user/verify-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ password: superAdminPassword })
      });

      const verifyData = await verifyResponse.json();
      
      if (!verifyData.valid) {
        alert(`❌ Invalid password`);
        return;
      }

      const favouritesData = {
        weeklyPlans,
        workouts,
        moveframes,
        sportTranslations
      };

      // Save to user's personal settings
      const response = await fetch('/api/user/settings/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          favouritesSettings: favouritesData
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        alert('✅ Personal favourites saved successfully!');
        setShowPasswordDialog(false);
        setSuperAdminPassword('');
      } else {
        alert(`❌ ${data.error || 'Failed to save settings'}`);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('❌ Error saving settings');
    }
  };

  const handleLoadConfirm = async () => {
    try {
      const response = await fetch(`/api/admin/favourites-defaults/load?language=${selectedLanguage}`);
      const data = await response.json();
      const sportsLoaded = loadSportsVersionForLanguage(selectedLanguage);

      if (response.ok && data.favouritesData) {
        // Merge loaded settings with current settings
        if (data.favouritesData.weeklyPlans) {
          setWeeklyPlans(prev => [...prev, ...data.favouritesData.weeklyPlans.filter((p: WeeklyPlan) => 
            !prev.some(existing => existing.id === p.id)
          )]);
        }
        if (data.favouritesData.workouts) {
          setWorkouts(prev => [...prev, ...data.favouritesData.workouts.filter((w: Workout) => 
            !prev.some(existing => existing.id === w.id)
          )]);
        }
        if (data.favouritesData.moveframes) {
          setMoveframes(prev => [...prev, ...data.favouritesData.moveframes.filter((m: Moveframe) => 
            !prev.some(existing => existing.id === m.id)
          )]);
        }
        
        alert(`✅ Default favourites for ${supportedLanguages.find(l => l.code === selectedLanguage)?.name} loaded!\n\n${sportsLoaded ? 'Sports labels for this language were loaded.' : 'No sports labels found for this language.'}\n\nNote: Your existing items have been preserved.`);
        setShowLoadDialog(false);
      } else {
        if (sportsLoaded) {
          alert(`✅ Sports labels for ${supportedLanguages.find(l => l.code === selectedLanguage)?.name} loaded.`);
        } else {
          alert(`ℹ️ No default favourites found for ${supportedLanguages.find(l => l.code === selectedLanguage)?.name}.`);
        }
        setShowLoadDialog(false);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('❌ Error loading defaults');
    }
  };

  // Helper functions
  const getAllTags = () => {
    if (activeTab === 'plans') {
      return Array.from(new Set(weeklyPlans.flatMap(p => p.tags)));
    } else if (activeTab === 'workouts') {
      return Array.from(new Set(workouts.flatMap(w => w.tags)));
    }
    return [];
  };

  // Handler functions for workout cards
  const handleDeleteWorkout = async (workoutId: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Please log in');
        return;
      }

      const response = await fetch(`/api/workouts/favorites/${workoutId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setWorkouts(workouts.filter(w => w.id !== workoutId));
        alert('Workout removed from favorites');
      } else {
        alert('Failed to remove workout');
      }
    } catch (error) {
      console.error('Error deleting workout:', error);
      alert('Failed to remove workout');
    }
  };

  const handleOverviewWorkout = (workout: any) => {
    setOverviewWorkout(workout);
    setShowOverviewModal(true);
  };

  const handleUseInPlanner = (workout: any) => {
    setPlannerWorkout(workout);
    setShowUsePlannerModal(true);
  };

  const handleAddToPlanner = async (weekId: string, dayId: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Please log in');
        return;
      }

      // Parse the workout data
      const workoutData = plannerWorkout.workoutData ? JSON.parse(plannerWorkout.workoutData) : null;
      
      if (!workoutData) {
        alert('Invalid workout data');
        return;
      }

      // Create a new workout session from the favorite
      const response = await fetch('/api/workouts/sessions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          dayId,
          name: workoutData.workout.name,
          code: workoutData.workout.code,
          notes: workoutData.workout.notes,
          mainSport: workoutData.workout.mainSport || null,
          mainGoal: workoutData.workout.mainGoal || null,
          intensity: workoutData.workout.intensity || 'Medium',
          tags: workoutData.workout.tags || null,
          sports: workoutData.sports,
          moveframes: workoutData.moveframes
        })
      });

      if (response.ok) {
        alert('Workout added to your planner successfully!');
        setShowUsePlannerModal(false);
        setPlannerWorkout(null);
      } else {
        const error = await response.json();
        alert(`Failed to add workout: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error adding workout to planner:', error);
      alert('Failed to add workout to planner');
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Favourites</h2>
        <p className="text-gray-600">Manage your favourite plans, workouts, and moveframes</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('plans')}
          className={`px-6 py-3 font-semibold transition ${
            activeTab === 'plans'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Calendar className="w-4 h-4 inline mr-2" />
          Weekly Plans ({weeklyPlans.length})
        </button>
        <button
          onClick={() => setActiveTab('workouts')}
          className={`px-6 py-3 font-semibold transition ${
            activeTab === 'workouts'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Dumbbell className="w-4 h-4 inline mr-2" />
          Workouts ({workouts.length})
        </button>
        <button
          onClick={() => setActiveTab('moveframes')}
          className={`px-6 py-3 font-semibold transition ${
            activeTab === 'moveframes'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Target className="w-4 h-4 inline mr-2" />
          Moveframes ({moveframes.length})
        </button>
        <button
          onClick={() => setActiveTab('sports')}
          className={`px-6 py-3 font-semibold transition ${
            activeTab === 'sports'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Star className="w-4 h-4 inline mr-2 fill-yellow-400 text-yellow-600" />
          Favorite Sports ({selectedSports.length}/5)
        </button>
      </div>

      {/* Language-Specific Defaults - Compact Single Line */}
      <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
        <div className="flex items-center gap-3">
          <Globe className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Language Defaults:</span>
          <select
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
            className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            title="Pick a language, then Load — merges admin favourites and sport label hints for that language"
          >
            {supportedLanguages.map(lang => (
              <option key={lang.code} value={lang.code}>{lang.name}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadLanguageDefaults}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 transition"
            title="Load language-specific default favourites (merges with current)"
          >
            <Download className="w-3.5 h-3.5" />
            Load
          </button>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex justify-between items-center">
        <div className="flex gap-3">
          {/* Only show Add button for plans and moveframes, not for workouts */}
          {activeTab !== 'workouts' && activeTab !== 'sports' && (
            <button
              onClick={() => {
                if (activeTab === 'plans') {
                  setEditingPlan({
                    id: '',
                    name: '',
                    description: '',
                    weekStart: 'Monday',
                    daysCount: 3,
                    workoutsCount: 0,
                    lastUsed: new Date().toISOString().split('T')[0],
                    tags: []
                  });
                  setShowPlanDialog(true);
                } else {
                  setEditingMoveframe({
                    id: '',
                    name: '',
                    description: '',
                    sets: 3,
                    reps: '10',
                    restTime: 60,
                    equipment: [],
                    muscleGroups: [],
                    difficulty: 'Beginner',
                    lastUsed: new Date().toISOString().split('T')[0],
                    usageCount: 0
                  });
                  setShowMoveframeDialog(true);
                }
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              <Plus className="w-4 h-4" />
              Add {activeTab === 'plans' ? 'Plan' : 'Moveframe'}
            </button>
          )}
        </div>
        {activeTab !== 'sports' && (
          <div className="flex gap-3 items-center">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {activeTab !== 'moveframes' && (
              <select
                value={filterTag}
                onChange={(e) => setFilterTag(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Tags</option>
                {getAllTags().map(tag => (
                  <option key={tag} value={tag}>{tag}</option>
                ))}
              </select>
            )}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="name">Name</option>
              <option value="lastUsed">Recently Used</option>
              {activeTab === 'moveframes' && <option value="popular">Most Popular</option>}
            </select>
          </div>
        )}
      </div>

      {/* Weekly Plans Tab */}
      {activeTab === 'plans' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {weeklyPlans
            .filter(plan => 
              (searchQuery === '' || plan.name.toLowerCase().includes(searchQuery.toLowerCase())) &&
              (filterTag === 'all' || plan.tags.includes(filterTag))
            )
            .sort((a, b) => {
              if (sortBy === 'name') return a.name.localeCompare(b.name);
              if (sortBy === 'lastUsed') return new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime();
              return 0;
            })
            .map((plan) => (
              <div
                key={plan.id}
                className="bg-white rounded-xl border-2 border-gray-200 p-6 hover:border-blue-300 hover:shadow-lg transition"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                    <h3 className="font-bold text-gray-900">{plan.name}</h3>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditingPlan(plan);
                        setShowPlanDialog(true);
                      }}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Remove from favourites?')) {
                          setWeeklyPlans(weeklyPlans.filter(p => p.id !== plan.id));
                        }
                      }}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">{plan.description}</p>
                
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Week starts:</span>
                    <span className="font-semibold text-gray-900">{plan.weekStart}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Training days:</span>
                    <span className="font-semibold text-gray-900">{plan.daysCount} days</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Workouts:</span>
                    <span className="font-semibold text-gray-900">{plan.workoutsCount}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Last used:</span>
                    <span className="font-semibold text-gray-900">{formatDate(plan.lastUsed)}</span>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2 mb-4">
                  {plan.tags.map((tag, idx) => (
                    <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded">
                      {tag}
                    </span>
                  ))}
                </div>
                
                <div className="flex gap-2">
                  <button className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition">
                    Use Plan
                  </button>
                  <button className="px-4 py-2 border-2 border-gray-300 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-50 transition">
                    <Copy className="w-4 h-4" />
                  </button>
                  <button className="px-4 py-2 border-2 border-gray-300 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-50 transition">
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Workouts Tab */}
      {activeTab === 'workouts' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {workouts
            .filter(workout => 
              (searchQuery === '' || workout.name.toLowerCase().includes(searchQuery.toLowerCase())) &&
              (filterTag === 'all' || workout.tags?.includes(filterTag))
            )
            .sort((a, b) => {
              if (sortBy === 'name') return a.name.localeCompare(b.name);
              if (sortBy === 'lastUsed') return new Date(b.lastUsed || 0).getTime() - new Date(a.lastUsed || 0).getTime();
              return 0;
            })
            .map((workout) => (
              <FavoriteWorkoutCard
                key={workout.id}
                workout={workout}
                onDelete={handleDeleteWorkout}
                onOverview={handleOverviewWorkout}
                onUseInPlanner={handleUseInPlanner}
                onUpdate={loadFavoriteWorkouts}
              />
            ))}
        </div>
      )}

      {/* Moveframes Tab */}
      {activeTab === 'moveframes' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Exercise</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Sets × Reps</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Rest</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Equipment</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Difficulty</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Usage</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Last Used</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {moveframes
                .filter(mf => searchQuery === '' || mf.name.toLowerCase().includes(searchQuery.toLowerCase()))
                .sort((a, b) => {
                  if (sortBy === 'name') return a.name.localeCompare(b.name);
                  if (sortBy === 'lastUsed') return new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime();
                  if (sortBy === 'popular') return b.usageCount - a.usageCount;
                  return 0;
                })
                .map((mf) => (
                  <tr key={mf.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                        <div>
                          <div className="font-semibold text-gray-900">{mf.name}</div>
                          <div className="text-xs text-gray-500 line-clamp-1">{mf.description}</div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {mf.muscleGroups.map((muscle, idx) => (
                              <span key={idx} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                                {muscle}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900">{mf.sets} × {mf.reps}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-600">{mf.restTime}s</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-600">
                        {mf.equipment.length > 0 ? mf.equipment.join(', ') : 'None'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${
                        mf.difficulty === 'Beginner' ? 'bg-green-100 text-green-700' :
                        mf.difficulty === 'Intermediate' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {mf.difficulty}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-semibold text-gray-900">{mf.usageCount}×</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-600">{formatDate(mf.lastUsed)}</div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => {
                            setEditingMoveframe(mf);
                            setShowMoveframeDialog(true);
                          }}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Remove from favourites?')) {
                              setMoveframes(moveframes.filter(m => m.id !== mf.id));
                            }
                          }}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Favorite Sports Tab */}
      {activeTab === 'sports' && (
        <div className="space-y-6">
          {/* Instructions */}
          <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-3">
                <Star className="w-5 h-5 text-yellow-600 fill-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Select Your Favorite Sports</h3>
                  <p className="text-sm text-gray-700 mb-2">
                    Choose up to 5 sports. They appear as quick-select icons when adding moveframes. Use{' '}
                    <strong>Names</strong> on each sport to edit labels in all languages (English is required). Names in
                    another language without a translation show the English name in <span className="text-red-600 font-semibold">red</span>.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-white/80 px-3 py-2">
                <span className="text-xs font-medium text-gray-600">Preview labels:</span>
                <select
                  value={sportDisplayLanguage}
                  onChange={(e) => setSportDisplayLanguage(e.target.value)}
                  className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  title="Language used for sport names in the grid below"
                >
                  {supportedLanguages.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.name} ({lang.code.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Selected Sports (Ordered) */}
          {selectedSports.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Star className="w-4 h-4 text-yellow-600 fill-yellow-400" />
                Your Favorite Sports ({selectedSports.length}/5)
              </h4>
              <div className="space-y-2">
                {selectedSports.map((sport, index) => {
                  const icon = getSportIcon(sport, showIconType);
                  const isImage = icon.startsWith('/');
                  
                  return (
                    <div
                      key={sport}
                      className="flex items-center gap-3 p-3 bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-lg"
                    >
                      <span className="text-lg font-bold text-gray-500 w-6">#{index + 1}</span>
                      
                      {/* Sport Icon */}
                      {isImage ? (
                        <div className="w-12 h-12 flex items-center justify-center border border-gray-300 rounded bg-white flex-shrink-0">
                          <Image 
                            src={icon} 
                            alt={sport}
                            width={48}
                            height={48}
                            className="object-contain"
                            style={{ width: '48px', height: '48px' }}
                          />
                        </div>
                      ) : (
                        <div className="w-12 h-12 flex items-center justify-center text-3xl border border-gray-300 rounded bg-white flex-shrink-0">
                          {icon}
                        </div>
                      )}
                      
                      {/* Sport Name */}
                      <div className="flex flex-1 items-center gap-2 min-w-0">
                        <span
                          className={`flex-1 font-semibold truncate cursor-pointer ${
                            getSportDisplay(sport).isRed ? 'text-red-600' : 'text-gray-900'
                          }`}
                          onDoubleClick={() => handleOpenSportTranslationDialog(sport)}
                          title="Double-click to edit names in all languages"
                        >
                          {getSportDisplay(sport).text}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleOpenSportTranslationDialog(sport)}
                          className="flex-shrink-0 p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-md"
                          title="Edit sport name in all languages"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </div>
                      
                      {/* Reorder Buttons */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => moveSportUp(index)}
                          disabled={index === 0}
                          className={`p-1.5 rounded ${
                            index === 0
                              ? 'text-gray-300 cursor-not-allowed'
                              : 'text-gray-600 hover:bg-blue-100'
                          }`}
                          title="Move up"
                        >
                          ▲
                        </button>
                        <button
                          onClick={() => moveSportDown(index)}
                          disabled={index === selectedSports.length - 1}
                          className={`p-1.5 rounded ${
                            index === selectedSports.length - 1
                              ? 'text-gray-300 cursor-not-allowed'
                              : 'text-gray-600 hover:bg-blue-100'
                          }`}
                          title="Move down"
                        >
                          ▼
                        </button>
                        <button
                          onClick={() => toggleSport(sport)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded ml-2"
                          title="Remove"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Available Sports Grid */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-gray-900">All Sports</h4>
              
              {/* Icon Type Toggle */}
              <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setShowIconType('emoji')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                    showIconType === 'emoji'
                      ? 'bg-white text-blue-600 shadow'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  😊 Emoji
                </button>
                <button
                  onClick={() => setShowIconType('icon')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                    showIconType === 'icon'
                      ? 'bg-white text-blue-600 shadow'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  🖼️ Icon
                </button>
              </div>
            </div>
            
            <p className="text-sm text-gray-600 mb-4">
              Click the tile to add or remove a favorite. Use <strong>Names</strong> to edit labels in every language.
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2">
              {SPORTS_LIST.filter((sport) =>
                searchQuery.trim() === '' ||
                getSportDisplay(sport).text.toLowerCase().includes(searchQuery.toLowerCase()) ||
                sport.toLowerCase().includes(searchQuery.toLowerCase())
              ).map((sport) => {
                const isSelected = selectedSports.includes(sport);
                const icon = getSportIcon(sport, showIconType);
                const isImage = icon.startsWith('/');
                const disp = getSportDisplay(sport);

                return (
                  <div
                    key={sport}
                    className={`flex flex-col rounded-lg border-2 overflow-hidden transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 shadow-md'
                        : 'border-gray-300 bg-white hover:border-yellow-400 hover:bg-yellow-50'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleSport(sport)}
                      className="flex flex-col items-center justify-center p-2 flex-1 min-h-[72px]"
                      title={isSelected ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      {isImage ? (
                        <div className="w-8 h-8 flex items-center justify-center mb-1 flex-shrink-0">
                          <Image
                            src={icon}
                            alt={sport}
                            width={32}
                            height={32}
                            className="object-contain"
                            style={{ width: '32px', height: '32px' }}
                          />
                        </div>
                      ) : (
                        <div className="w-8 h-8 flex items-center justify-center text-xl mb-1 flex-shrink-0">
                          {icon}
                        </div>
                      )}
                      <span
                        className={`text-[10px] font-medium text-center leading-tight line-clamp-2 ${
                          disp.isRed ? 'text-red-600' : 'text-gray-800'
                        }`}
                      >
                        {disp.text}
                      </span>
                      {isSelected && (
                        <Star className="w-3 h-3 text-yellow-600 fill-yellow-400 mt-0.5" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenSportTranslationDialog(sport)}
                      className="text-[10px] py-1 px-1 bg-gray-50 border-t border-gray-200 text-indigo-600 hover:bg-indigo-50 font-medium"
                    >
                      Names
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setSelectedSports([])}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-semibold"
            >
              Clear All
            </button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {((activeTab === 'plans' && weeklyPlans.filter(p => 
          (searchQuery === '' || p.name.toLowerCase().includes(searchQuery.toLowerCase())) &&
          (filterTag === 'all' || p.tags.includes(filterTag))
        ).length === 0) ||
        (activeTab === 'workouts' && workouts.filter(w => 
          (searchQuery === '' || w.name.toLowerCase().includes(searchQuery.toLowerCase())) &&
          (filterTag === 'all' || w.tags.includes(filterTag))
        ).length === 0) ||
        (activeTab === 'moveframes' && moveframes.filter(mf => 
          searchQuery === '' || mf.name.toLowerCase().includes(searchQuery.toLowerCase())
        ).length === 0)) && (
        <div className="text-center py-16 bg-gray-50 rounded-xl">
          <Star className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 text-lg mb-2">No favourites found</p>
          <p className="text-gray-500 text-sm">
            {searchQuery || filterTag !== 'all' ? 'Try adjusting your filters' : 'Add your first favourite to get started!'}
          </p>
        </div>
      )}

      {/* Weekly Plan Dialog */}
      {showPlanDialog && editingPlan && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold mb-6">
              {editingPlan.id ? 'Edit Weekly Plan' : 'Add Weekly Plan'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Plan Name</label>
                <input
                  type="text"
                  value={editingPlan.name}
                  onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Full Body Strength Program"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                <textarea
                  value={editingPlan.description}
                  onChange={(e) => setEditingPlan({ ...editingPlan, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Describe your weekly plan..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Week Starts</label>
                  <select
                    value={editingPlan.weekStart}
                    onChange={(e) => setEditingPlan({ ...editingPlan, weekStart: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Monday">Monday</option>
                    <option value="Sunday">Sunday</option>
                    <option value="Saturday">Saturday</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Training Days</label>
                  <input
                    type="number"
                    min="1"
                    max="7"
                    value={editingPlan.daysCount}
                    onChange={(e) => setEditingPlan({ ...editingPlan, daysCount: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Total Workouts</label>
                  <input
                    type="number"
                    min="0"
                    value={editingPlan.workoutsCount}
                    onChange={(e) => setEditingPlan({ ...editingPlan, workoutsCount: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={editingPlan.tags.join(', ')}
                  onChange={(e) => setEditingPlan({ ...editingPlan, tags: e.target.value.split(',').map(s => s.trim()).filter(s => s) })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Strength, Beginner, Full Body"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => {
                  if (!editingPlan.name) {
                    alert('Please enter a plan name');
                    return;
                  }
                  if (editingPlan.id) {
                    setWeeklyPlans(weeklyPlans.map(p => p.id === editingPlan.id ? editingPlan : p));
                  } else {
                    setWeeklyPlans([...weeklyPlans, { ...editingPlan, id: Date.now().toString() }]);
                  }
                  setShowPlanDialog(false);
                  setEditingPlan(null);
                }}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
              >
                {editingPlan.id ? 'Save Changes' : 'Add to Favourites'}
              </button>
              <button
                onClick={() => {
                  setShowPlanDialog(false);
                  setEditingPlan(null);
                }}
                className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Workout Dialog */}
      {showWorkoutDialog && editingWorkout && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold mb-6">
              {editingWorkout.id ? 'Edit Workout' : 'Add Workout'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Workout Name</label>
                <input
                  type="text"
                  value={editingWorkout.name}
                  onChange={(e) => setEditingWorkout({ ...editingWorkout, name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Upper Body Push"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                <textarea
                  value={editingWorkout.description}
                  onChange={(e) => setEditingWorkout({ ...editingWorkout, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Describe your workout..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Duration (minutes)</label>
                  <input
                    type="number"
                    min="0"
                    value={editingWorkout.duration}
                    onChange={(e) => setEditingWorkout({ ...editingWorkout, duration: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Intensity</label>
                  <select
                    value={editingWorkout.intensity}
                    onChange={(e) => setEditingWorkout({ ...editingWorkout, intensity: e.target.value as 'Low' | 'Medium' | 'High' })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Sport</label>
                  <input
                    type="text"
                    value={editingWorkout.sport}
                    onChange={(e) => setEditingWorkout({ ...editingWorkout, sport: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Weightlifting"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Moveframes Count</label>
                  <input
                    type="number"
                    min="0"
                    value={editingWorkout.moveframesCount}
                    onChange={(e) => setEditingWorkout({ ...editingWorkout, moveframesCount: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={editingWorkout.tags.join(', ')}
                  onChange={(e) => setEditingWorkout({ ...editingWorkout, tags: e.target.value.split(',').map(s => s.trim()).filter(s => s) })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Upper Body, Push, Strength"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => {
                  if (!editingWorkout.name) {
                    alert('Please enter a workout name');
                    return;
                  }
                  if (editingWorkout.id) {
                    setWorkouts(workouts.map(w => w.id === editingWorkout.id ? editingWorkout : w));
                  } else {
                    setWorkouts([...workouts, { ...editingWorkout, id: Date.now().toString() }]);
                  }
                  setShowWorkoutDialog(false);
                  setEditingWorkout(null);
                }}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
              >
                {editingWorkout.id ? 'Save Changes' : 'Add to Favourites'}
              </button>
              <button
                onClick={() => {
                  setShowWorkoutDialog(false);
                  setEditingWorkout(null);
                }}
                className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Moveframe Dialog */}
      {showMoveframeDialog && editingMoveframe && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold mb-6">
              {editingMoveframe.id ? 'Edit Moveframe' : 'Add Moveframe'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Exercise Name</label>
                <input
                  type="text"
                  value={editingMoveframe.name}
                  onChange={(e) => setEditingMoveframe({ ...editingMoveframe, name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Barbell Bench Press"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                <textarea
                  value={editingMoveframe.description}
                  onChange={(e) => setEditingMoveframe({ ...editingMoveframe, description: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Brief description..."
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Sets</label>
                  <input
                    type="number"
                    min="1"
                    value={editingMoveframe.sets}
                    onChange={(e) => setEditingMoveframe({ ...editingMoveframe, sets: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Reps</label>
                  <input
                    type="text"
                    value={editingMoveframe.reps}
                    onChange={(e) => setEditingMoveframe({ ...editingMoveframe, reps: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 10 or 8-12"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Rest (sec)</label>
                  <input
                    type="number"
                    min="0"
                    value={editingMoveframe.restTime}
                    onChange={(e) => setEditingMoveframe({ ...editingMoveframe, restTime: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Difficulty</label>
                <select
                  value={editingMoveframe.difficulty}
                  onChange={(e) => setEditingMoveframe({ ...editingMoveframe, difficulty: e.target.value as 'Beginner' | 'Intermediate' | 'Advanced' })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Equipment (comma-separated)</label>
                <input
                  type="text"
                  value={editingMoveframe.equipment.join(', ')}
                  onChange={(e) => setEditingMoveframe({ ...editingMoveframe, equipment: e.target.value.split(',').map(s => s.trim()).filter(s => s) })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Barbell, Bench"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Muscle Groups (comma-separated)</label>
                <input
                  type="text"
                  value={editingMoveframe.muscleGroups.join(', ')}
                  onChange={(e) => setEditingMoveframe({ ...editingMoveframe, muscleGroups: e.target.value.split(',').map(s => s.trim()).filter(s => s) })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Chest, Triceps, Shoulders"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => {
                  if (!editingMoveframe.name) {
                    alert('Please enter an exercise name');
                    return;
                  }
                  if (editingMoveframe.id) {
                    setMoveframes(moveframes.map(m => m.id === editingMoveframe.id ? editingMoveframe : m));
                  } else {
                    setMoveframes([...moveframes, { ...editingMoveframe, id: Date.now().toString() }]);
                  }
                  setShowMoveframeDialog(false);
                  setEditingMoveframe(null);
                }}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
              >
                {editingMoveframe.id ? 'Save Changes' : 'Add to Favourites'}
              </button>
              <button
                onClick={() => {
                  setShowMoveframeDialog(false);
                  setEditingMoveframe(null);
                }}
                className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Password Dialog */}
      {showPasswordDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full">
            <h3 className="text-xl font-semibold mb-4">🔐 Confirm Your Identity</h3>
            <p className="text-gray-600 mb-4">
              Please enter your password to confirm and save your <strong>personal favourites</strong>.
            </p>
            <div className="text-sm text-blue-700 bg-blue-50 p-3 rounded-lg mb-4">
              <p><strong>💾 Saving Your Personal Favourites:</strong></p>
              <p className="mt-1">These favourites will be saved to your account only and will not affect other users.</p>
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Password:
              </label>
              <input
                type="password"
                value={superAdminPassword}
                onChange={(e) => setSuperAdminPassword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handlePasswordSubmit()}
                placeholder="Enter password"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handlePasswordSubmit}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
              >
                Save My Favourites
              </button>
              <button
                onClick={() => {
                  setShowPasswordDialog(false);
                  setSuperAdminPassword('');
                }}
                className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sport Translation Dialog */}
      {showSportTranslationDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-2xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold mb-2">Edit sport names (all languages)</h3>
            <p className="text-sm text-gray-600 mb-4">
              Sport code: <strong>{editingSportKey}</strong>
              <span className="block mt-1 text-red-700 font-medium">
                English name is required. Leave other languages blank to show English in red for that language in the grid.
              </span>
            </p>
            <div className="space-y-3">
              {supportedLanguages.map((lang) => (
                <div key={lang.code} className="grid grid-cols-[90px_1fr] gap-3 items-center">
                  <div className="text-xs font-semibold text-gray-700">
                    {lang.code.toUpperCase()} - {lang.name}
                  </div>
                  <input
                    type="text"
                    value={sportTranslationsDraft[lang.code] || ''}
                    onChange={(e) =>
                      setSportTranslationsDraft((prev) => ({
                        ...prev,
                        [lang.code]: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder={lang.code === 'en' ? getDefaultSportLabel(editingSportKey) : 'Translation'}
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSaveSportTranslations}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setShowSportTranslationDialog(false);
                  setEditingSportKey('');
                  setSportTranslationsDraft({});
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Load Language Defaults Dialog */}
      {showLoadDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full">
            <h3 className="text-xl font-semibold mb-4">📥 Load Language Defaults</h3>
            <p className="text-gray-600 mb-4">
              Load default favourites for <strong>{supportedLanguages.find(l => l.code === selectedLanguage)?.name}</strong>?
            </p>
            <p className="text-sm text-yellow-700 bg-yellow-50 p-3 rounded-lg mb-4">
              ⚠️ <strong>Note:</strong> This will add default favourite items for this language. Your existing items will be preserved.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleLoadConfirm}
                className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold"
              >
                Load Defaults
              </button>
              <button
                onClick={() => setShowLoadDialog(false)}
                className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Workout Overview Modal */}
      {showOverviewModal && overviewWorkout && (
        <WorkoutOverviewModal
          workout={overviewWorkout}
          onClose={() => {
            setShowOverviewModal(false);
            setOverviewWorkout(null);
          }}
        />
      )}

      {/* Use in Planner Modal */}
      {showUsePlannerModal && plannerWorkout && (
        <UseInPlannerModal
          workout={plannerWorkout}
          onClose={() => {
            setShowUsePlannerModal(false);
            setPlannerWorkout(null);
          }}
          onConfirm={handleAddToPlanner}
        />
      )}
    </div>
  );
}

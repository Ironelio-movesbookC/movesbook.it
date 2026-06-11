import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Period,
  WorkoutSection,
  BodyBuildingTechnique,
  Sport,
  Equipment,
  Exercise,
  Device,
  IconType,
  type ExercisePathologyCatalogItem,
  type PeriodizationTemplate,
  normalizePeriodizationTemplates,
  normalizePathologyCatalog,
  DEFAULT_PERIODS,
  DEFAULT_SECTIONS,
  DEFAULT_BODYBUILDING_TECHNIQUES,
  DEFAULT_SPORTS,
  DEFAULT_EQUIPMENT,
  DEFAULT_EXERCISES,
  DEFAULT_DEVICES,
  STORAGE_KEYS
} from '@/constants/tools.constants';
import { getAuthToken, getAuthHeaders } from '@/utils/auth.utils';

function coerceExercisePathologyCatalog(raw: unknown): ExercisePathologyCatalogItem[] {
  return normalizePathologyCatalog(raw);
}

interface UseToolsDataReturn {
  // State
  periods: Period[];
  sections: WorkoutSection[];
  bodyBuildingTechniques: BodyBuildingTechnique[];
  sports: Sport[];
  equipment: Equipment[];
  exercises: Exercise[];
  /** Technical Settings — Pathologies catalog for exercise contraindications */
  exercisePathologyCatalog: ExercisePathologyCatalogItem[];
  /** Periodization presets (toolsSettings JSON; Super Admin defaults + user copies). */
  periodizationTemplates: PeriodizationTemplate[];
  devices: Device[];
  iconType: IconType;
  isLoadingIconPreference: boolean;
  isSavingToDatabase: boolean;
  lastSavedTime: Date | null;
  
  // Actions
  setPeriods: React.Dispatch<React.SetStateAction<Period[]>>;
  setSections: React.Dispatch<React.SetStateAction<WorkoutSection[]>>;
  setBodyBuildingTechniques: React.Dispatch<React.SetStateAction<BodyBuildingTechnique[]>>;
  setSports: React.Dispatch<React.SetStateAction<Sport[]>>;
  setEquipment: React.Dispatch<React.SetStateAction<Equipment[]>>;
  setExercises: React.Dispatch<React.SetStateAction<Exercise[]>>;
  setExercisePathologyCatalog: React.Dispatch<React.SetStateAction<ExercisePathologyCatalogItem[]>>;
  setPeriodizationTemplates: React.Dispatch<React.SetStateAction<PeriodizationTemplate[]>>;
  setDevices: React.Dispatch<React.SetStateAction<Device[]>>;
  setIconType: React.Dispatch<React.SetStateAction<IconType>>;
  setIsSavingToDatabase: React.Dispatch<React.SetStateAction<boolean>>;
  setLastSavedTime: React.Dispatch<React.SetStateAction<Date | null>>;
  
  // Loading functions
  loadToolsSettingsFromDatabase: () => Promise<void>;
  saveToLocalStorage: (
    periods?: Period[],
    sections?: WorkoutSection[],
    bodyBuildingTechniques?: BodyBuildingTechnique[],
    sports?: Sport[],
    equipment?: Equipment[],
    exercises?: Exercise[],
    devices?: Device[],
    exercisePathologyCatalogData?: ExercisePathologyCatalogItem[]
  ) => void;
  saveToDatabase: () => Promise<void>;
}

/**
 * Custom hook for managing tools settings data
 * Extracted from ToolsSettings.tsx
 * 
 * Handles:
 * - Loading from database with localStorage fallback
 * - Icon type preferences
 * - Saving to database and localStorage
 * - Default data initialization
 */
export function useToolsData(): UseToolsDataReturn {
  const [periods, setPeriods] = useState<Period[]>([]);
  const [sections, setSections] = useState<WorkoutSection[]>([]);
  const [bodyBuildingTechniques, setBodyBuildingTechniques] = useState<BodyBuildingTechnique[]>([]);
  const [sports, setSports] = useState<Sport[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [exercisePathologyCatalog, setExercisePathologyCatalog] = useState<ExercisePathologyCatalogItem[]>([]);
  const [periodizationTemplates, setPeriodizationTemplates] = useState<PeriodizationTemplate[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [iconType, setIconType] = useState<IconType>('emoji');
  const [isLoadingIconPreference, setIsLoadingIconPreference] = useState(true);
  const [isSavingToDatabase, setIsSavingToDatabase] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null);

  /** Debounced callers must read latest lists (not a stale render closure). */
  const latestForDbSave = useRef({
    periods: [] as Period[],
    sections: [] as WorkoutSection[],
    bodyBuildingTechniques: [] as BodyBuildingTechnique[],
    sports: [] as Sport[],
    equipment: [] as Equipment[],
    exercises: [] as Exercise[],
    devices: [] as Device[],
    exercisePathologyCatalog: [] as ExercisePathologyCatalogItem[],
    periodizationTemplates: [] as PeriodizationTemplate[],
  });
  latestForDbSave.current = {
    periods,
    sections,
    bodyBuildingTechniques,
    sports,
    equipment,
    exercises,
    devices,
    exercisePathologyCatalog,
    periodizationTemplates,
  };

  /**
   * Load icon type preference from user settings
   */
  useEffect(() => {
    const loadIconTypePreference = async () => {
      try {
        const token = getAuthToken();
        if (!token) {
          setIsLoadingIconPreference(false);
          return;
        }
        
        const response = await fetch('/api/user/settings', {
          headers: getAuthHeaders()
        });
        
        if (response.ok) {
          const settings = await response.json();
          setIconType(settings.sportIconType || 'emoji');
        }
      } catch (error) {
        console.error('Error loading icon type preference:', error);
      } finally {
        setIsLoadingIconPreference(false);
      }
    };
    
    loadIconTypePreference();
  }, []);
  
  /**
   * Load periods from localStorage
   */
  const loadPeriodsFromLocalStorage = useCallback(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PERIODS);
    if (saved) {
      try {
        setPeriods(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load periods');
        setPeriods(DEFAULT_PERIODS);
      }
    } else {
      setPeriods(DEFAULT_PERIODS);
    }
  }, []);
  
  /**
   * Load sections from localStorage
   */
  const loadSectionsFromLocalStorage = useCallback(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SECTIONS);
    if (saved) {
      try {
        setSections(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load sections');
        setSections(DEFAULT_SECTIONS);
      }
    } else {
      setSections(DEFAULT_SECTIONS);
    }
  }, []);
  
  /**
   * Load body building techniques from localStorage
   */
  const loadBodyBuildingTechniquesFromLocalStorage = useCallback(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.BODYBUILDING_TECHNIQUES);
    if (saved) {
      try {
        setBodyBuildingTechniques(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load body building techniques');
        setBodyBuildingTechniques(DEFAULT_BODYBUILDING_TECHNIQUES);
      }
    } else {
      setBodyBuildingTechniques(DEFAULT_BODYBUILDING_TECHNIQUES);
    }
  }, []);
  
  /**
   * Load sports from localStorage
   */
  const loadSportsFromLocalStorage = useCallback(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SPORTS);
    if (saved) {
      try {
        setSports(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load sports');
        setSports(DEFAULT_SPORTS);
      }
    } else {
      setSports(DEFAULT_SPORTS);
    }
  }, []);
  
  /**
   * Load equipment from localStorage
   */
  const loadEquipmentFromLocalStorage = useCallback(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.EQUIPMENT);
    if (saved) {
      try {
        setEquipment(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load equipment');
        setEquipment(DEFAULT_EQUIPMENT);
      }
    } else {
      setEquipment(DEFAULT_EQUIPMENT);
    }
  }, []);
  
  /**
   * Load exercises from localStorage
   */
  const loadExercisesFromLocalStorage = useCallback(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.EXERCISES);
    if (saved) {
      try {
        setExercises(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load exercises');
        setExercises(DEFAULT_EXERCISES);
      }
    } else {
      setExercises(DEFAULT_EXERCISES);
    }
  }, []);
  
  /**
   * Load devices from localStorage
   */
  const loadDevicesFromLocalStorage = useCallback(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.DEVICES);
    if (saved) {
      try {
        setDevices(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load devices');
        setDevices(DEFAULT_DEVICES);
      }
    } else {
      setDevices(DEFAULT_DEVICES);
    }
  }, []);

  const loadExercisePathologyCatalogFromLocalStorage = useCallback(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.EXERCISE_PATHOLOGY_CATALOG);
    if (saved) {
      try {
        setExercisePathologyCatalog(coerceExercisePathologyCatalog(JSON.parse(saved)));
      } catch (e) {
        console.error('Failed to load exercise pathology catalog');
        setExercisePathologyCatalog([]);
      }
    } else {
      setExercisePathologyCatalog([]);
    }
  }, []);
  
  /**
   * Load all data from localStorage
   */
  const loadAllFromLocalStorage = useCallback(() => {
    loadPeriodsFromLocalStorage();
    loadSectionsFromLocalStorage();
    loadBodyBuildingTechniquesFromLocalStorage();
    loadSportsFromLocalStorage();
    loadEquipmentFromLocalStorage();
    loadExercisesFromLocalStorage();
    loadExercisePathologyCatalogFromLocalStorage();
    loadDevicesFromLocalStorage();
  }, [
    loadPeriodsFromLocalStorage,
    loadSectionsFromLocalStorage,
    loadBodyBuildingTechniquesFromLocalStorage,
    loadSportsFromLocalStorage,
    loadEquipmentFromLocalStorage,
    loadExercisesFromLocalStorage,
    loadExercisePathologyCatalogFromLocalStorage,
    loadDevicesFromLocalStorage,
  ]);
  
  /**
   * Load settings from database with localStorage fallback
   */
  const loadToolsSettingsFromDatabase = useCallback(async () => {
    try {
      const token = getAuthToken();
      
      if (!token) {
        console.warn('⚠️ No authentication token found. Loading from localStorage fallback.');
        loadAllFromLocalStorage();
        return;
      }
      
      // Load periods from Prisma Period table (not from JSON settings)
      const periodsResponse = await fetch('/api/workouts/periods', {
        headers: getAuthHeaders()
      });
      
      if (periodsResponse.ok) {
        const periodsData = await periodsResponse.json();
        if (periodsData.periods && periodsData.periods.length > 0) {
          // Convert Prisma Period format to local Period format
          const formattedPeriods = periodsData.periods.map((p: any) => {
            let descriptionByLanguage: Record<string, string> | undefined;
            if (p.descriptionTranslations && typeof p.descriptionTranslations === 'string') {
              try {
                const parsed = JSON.parse(p.descriptionTranslations) as Record<string, string>;
                if (parsed && typeof parsed === 'object') descriptionByLanguage = parsed;
              } catch {
                /* ignore */
              }
            }
            return {
              id: p.id,
              title: p.name,
              description: p.description || '',
              descriptionByLanguage,
              color: p.color,
              order: p.displayOrder !== undefined ? p.displayOrder : 0,
              userId: p.userId
            };
          });
          setPeriods(formattedPeriods);
        } else {
          loadPeriodsFromLocalStorage();
        }
      } else {
        loadPeriodsFromLocalStorage();
      }
      
      // Load workout sections from Prisma WorkoutSection table (not from JSON settings)
      const sectionsResponse = await fetch('/api/workouts/sections', {
        headers: getAuthHeaders()
      });
      
      if (sectionsResponse.ok) {
        const sectionsData = await sectionsResponse.json();
        if (sectionsData.sections && sectionsData.sections.length > 0) {
          // Convert Prisma WorkoutSection format to local Section format
          const formattedSections = sectionsData.sections.map((s: any) => ({
            id: s.id,
            title: s.name,
            code: s.code || '',
            description: s.description || '',
            color: s.color,
            order: s.displayOrder !== undefined ? s.displayOrder : 0, // Use displayOrder from database
            userId: s.userId // Track ownership
          }));
          setSections(formattedSections);
          console.log('✅ Loaded workout sections from database:', formattedSections);
          console.log('📊 Sections with order:', formattedSections.map((s: any) => ({ title: s.title, order: s.order, displayOrder: sectionsData.sections.find((orig: any) => orig.id === s.id)?.displayOrder })));
          console.log('🔢 SECTION ORDERS:', formattedSections.map((s: any) => `${s.title}: order=${s.order}`).join(', '));
        } else {
          loadSectionsFromLocalStorage();
        }
      } else {
        loadSectionsFromLocalStorage();
      }
      
      // Load body building techniques from Prisma BodyBuildingTechnique table
      const techniquesResponse = await fetch('/api/bodybuilding/techniques', {
        headers: getAuthHeaders()
      });
      
      if (techniquesResponse.ok) {
        const techniquesData = await techniquesResponse.json();
        if (techniquesData.techniques && techniquesData.techniques.length > 0) {
          // Get current user ID from token
          const userStr = localStorage.getItem('user');
          let currentUserId = null;
          if (userStr) {
            try {
              const user = JSON.parse(userStr);
              currentUserId = user.id;
            } catch (e) {
              console.error('Failed to parse user from localStorage');
            }
          }
          
          // Filter to only show user's own techniques (exclude admin techniques)
          const userTechniques = techniquesData.techniques.filter((t: any) => 
            t.userId === currentUserId
          );
          
          console.log(`🔍 Filtered ${userTechniques.length} user techniques from ${techniquesData.techniques.length} total (excluding ${techniquesData.techniques.length - userTechniques.length} admin techniques)`);
          
          // Convert Prisma BodyBuildingTechnique format to local format
          const formattedTechniques = userTechniques.map((t: any) => ({
            id: t.id,
            title: t.name,
            description: t.description || '',
            color: t.color,
            sports: t.sports || [], // API already returns array, no need to check
            order: t.displayOrder !== undefined ? t.displayOrder : 0, // Use displayOrder from database
            userId: t.userId // Track ownership
          }));
          setBodyBuildingTechniques(formattedTechniques);
          console.log('✅ Loaded body building techniques from database:', formattedTechniques);
          console.log('🔍 Techniques details:', formattedTechniques.map((t: BodyBuildingTechnique) => ({ 
            title: t.title, 
            order: t.order,
            sports: t.sports, 
            userId: t.userId,
            displayOrder: userTechniques.find((orig: any) => orig.id === t.id)?.displayOrder
          })));
          console.log('🔢 TECHNIQUE ORDERS:', formattedTechniques.map((t: any) => `${t.title}: order=${t.order}`).join(', '));
        } else {
          loadBodyBuildingTechniquesFromLocalStorage();
        }
      } else {
        loadBodyBuildingTechniquesFromLocalStorage();
      }
      
      // Load other settings from UserSettings JSON
      const response = await fetch('/api/user/settings', {
        headers: getAuthHeaders()
      });

      if (response.ok) {
        const settings = await response.json();
        const toolsSettings = settings.toolsSettings || {};

        // Sports, equipment, exercises, devices are in JSON (sections now loaded from Prisma table above)

        if (toolsSettings.sports && toolsSettings.sports.length > 0) {
          setSports(toolsSettings.sports);
        } else {
          loadSportsFromLocalStorage();
        }

        if (toolsSettings.equipment && toolsSettings.equipment.length > 0) {
          setEquipment(toolsSettings.equipment);
        } else {
          loadEquipmentFromLocalStorage();
        }

        if (toolsSettings.exercises && toolsSettings.exercises.length > 0) {
          setExercises(toolsSettings.exercises);
        } else {
          loadExercisesFromLocalStorage();
        }

        if (Array.isArray(toolsSettings.exercisePathologyCatalog)) {
          setExercisePathologyCatalog(coerceExercisePathologyCatalog(toolsSettings.exercisePathologyCatalog));
        } else {
          loadExercisePathologyCatalogFromLocalStorage();
        }

        if (toolsSettings.devices && toolsSettings.devices.length > 0) {
          setDevices(toolsSettings.devices);
        } else {
          loadDevicesFromLocalStorage();
        }
      } else {
        // Fallback to localStorage if API fails
        loadAllFromLocalStorage();
      }
    } catch (error) {
      console.error('Error loading tools settings from database:', error);
      // Fallback to localStorage on error
      loadAllFromLocalStorage();
    }
  }, [
    loadAllFromLocalStorage,
    loadPeriodsFromLocalStorage,
    loadSectionsFromLocalStorage,
    loadBodyBuildingTechniquesFromLocalStorage,
    loadSportsFromLocalStorage,
    loadEquipmentFromLocalStorage,
    loadExercisesFromLocalStorage,
    loadExercisePathologyCatalogFromLocalStorage,
    loadDevicesFromLocalStorage,
  ]);
  
  /**
   * Load all tools settings from database first, then fallback to localStorage
   */
  useEffect(() => {
    loadToolsSettingsFromDatabase();
  }, [loadToolsSettingsFromDatabase]);
  
  /**
   * Save to localStorage
   */
  const saveToLocalStorage = (
    periodsData?: Period[],
    sectionsData?: WorkoutSection[],
    bodyBuildingTechniquesData?: BodyBuildingTechnique[],
    sportsData?: Sport[],
    equipmentData?: Equipment[],
    exercisesData?: Exercise[],
    devicesData?: Device[],
    exercisePathologyCatalogData?: ExercisePathologyCatalogItem[]
  ) => {
    if (periodsData) {
      localStorage.setItem(STORAGE_KEYS.PERIODS, JSON.stringify(periodsData));
    }
    if (sectionsData) {
      localStorage.setItem(STORAGE_KEYS.SECTIONS, JSON.stringify(sectionsData));
    }
    if (bodyBuildingTechniquesData) {
      localStorage.setItem(STORAGE_KEYS.BODYBUILDING_TECHNIQUES, JSON.stringify(bodyBuildingTechniquesData));
    }
    if (sportsData) {
      localStorage.setItem(STORAGE_KEYS.SPORTS, JSON.stringify(sportsData));
    }
    if (equipmentData) {
      localStorage.setItem(STORAGE_KEYS.EQUIPMENT, JSON.stringify(equipmentData));
    }
    if (exercisesData) {
      localStorage.setItem(STORAGE_KEYS.EXERCISES, JSON.stringify(exercisesData));
    }
    if (devicesData) {
      localStorage.setItem(STORAGE_KEYS.DEVICES, JSON.stringify(devicesData));
    }
    if (exercisePathologyCatalogData) {
      localStorage.setItem(
        STORAGE_KEYS.EXERCISE_PATHOLOGY_CATALOG,
        JSON.stringify(exercisePathologyCatalogData)
      );
    }
  };
  
  /**
   * Save all settings to database
   */
  const saveToDatabase = useCallback(async () => {
    setIsSavingToDatabase(true);
    try {
      const token = getAuthToken();
      if (!token) {
        console.warn('Cannot save: not logged in');
        setIsSavingToDatabase(false);
        return;
      }

      const {
        periods,
        sections,
        bodyBuildingTechniques,
        sports,
        equipment,
        exercises,
        devices,
        exercisePathologyCatalog,
      } = latestForDbSave.current;

      console.log('💾 Saving periods to database...', periods);

      // Save periods to Prisma Period table (bulk sync)
      const periodsResponse = await fetch('/api/workouts/periods/sync', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ periods })
      });

      if (periodsResponse.ok) {
        const periodsData = await periodsResponse.json();
        console.log('✅ Periods synced successfully:', periodsData);
        // Don't reload to avoid triggering auto-save loop
      } else {
        console.error('❌ Failed to sync periods');
      }

      // Sync workout sections to Prisma WorkoutSection table (bulk sync)
      const sectionsResponse = await fetch('/api/workouts/sections/sync', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sections })
      });

      if (sectionsResponse.ok) {
        const sectionsData = await sectionsResponse.json();
        console.log('✅ Workout sections synced successfully:', sectionsData);
        // Don't reload to avoid triggering auto-save loop
      } else {
        console.error('❌ Failed to sync workout sections');
      }

      // Sync body building techniques to Prisma BodyBuildingTechnique table (bulk sync)
      // Use actual sports array from each technique (no override)
      const techniquesResponse = await fetch('/api/bodybuilding/techniques/sync', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ techniques: bodyBuildingTechniques })
      });

      if (techniquesResponse.ok) {
        const techniquesData = await techniquesResponse.json();
        console.log('✅ Body building techniques synced successfully:', techniquesData);
        // Don't update state to avoid triggering auto-save loop
      } else {
        console.error('❌ Failed to sync body building techniques');
      }

      // Save other tools settings to UserSettings JSON
      const response = await fetch('/api/user/settings', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          toolsSettings: {
            // Periods and sections are now in Prisma tables, not JSON
            sports,
            equipment,
            exercises,
            devices,
            exercisePathologyCatalog,
          }
        })
      });

      if (response.status === 401) {
        console.warn('Session expired. Please log in again.');
        setIsSavingToDatabase(false);
        return;
      }

      if (response.ok) {
        setLastSavedTime(new Date());
        console.log('✅ Tools settings saved to database successfully');
      } else {
        const errBody = await response.text().catch(() => '');
        let detail = errBody;
        try {
          const j = JSON.parse(errBody) as { error?: string; details?: string };
          detail = j.details || j.error || errBody;
        } catch {
          /* keep raw */
        }
        console.error('❌ PATCH /api/user/settings failed:', response.status, detail);
        throw new Error(
          detail ? `Save failed (${response.status}): ${detail}` : `Save failed (${response.status})`
        );
      }
    } catch (error) {
      console.error('Error saving to database:', error);
      const msg = error instanceof Error ? error.message : 'Unknown error';
      alert(
        msg.includes('Save failed')
          ? msg
          : 'Failed to save to database. Please try again. (Check the browser console for details.)'
      );
    } finally {
      setIsSavingToDatabase(false);
    }
  }, []);
  
  return {
    // State
    periods,
    sections,
    bodyBuildingTechniques,
    sports,
    equipment,
    exercises,
    exercisePathologyCatalog,
    periodizationTemplates,
    devices,
    iconType,
    isLoadingIconPreference,
    isSavingToDatabase,
    lastSavedTime,
    
    // Actions
    setPeriods,
    setSections,
    setBodyBuildingTechniques,
    setSports,
    setEquipment,
    setExercises,
    setExercisePathologyCatalog,
    setPeriodizationTemplates,
    setDevices,
    setIconType,
    setIsSavingToDatabase,
    setLastSavedTime,
    
    // Loading functions
    loadToolsSettingsFromDatabase,
    saveToLocalStorage,
    saveToDatabase
  };
}


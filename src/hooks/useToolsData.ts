import { useState, useEffect, useCallback } from 'react';
import {
  Period,
  WorkoutSection,
  BodyBuildingTechnique,
  Sport,
  Equipment,
  Exercise,
  Device,
  IconType,
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

/** Load `{ id }[]` from localStorage and return id set (best-effort). */
function toolsItemsIdsFromLocalStorage(storageKey: string): Set<string> {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(storageKey) : null;
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as { id?: unknown }[];
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.map((x) => String(x?.id ?? '')).filter(Boolean));
  } catch {
    return new Set();
  }
}

/**
 * Drop entries that belong to other tools lists (legacy corrupt saves sometimes duplicated periods/sections into commonDailyActions).
 */
function sanitizeCommonDailyActionsList(
  items: WorkoutSection[],
  opts: {
    periodIds: Set<string>;
    sectionIds: Set<string>;
    techniqueIds: Set<string>;
    workMethodIds: Set<string>;
  }
): WorkoutSection[] {
  return items.filter((item) => {
    const id = String(item?.id ?? '');
    if (!id) return true;
    if (opts.periodIds.has(id)) return false;
    if (opts.sectionIds.has(id)) return false;
    if (opts.techniqueIds.has(id)) return false;
    if (opts.workMethodIds.has(id)) return false;
    return true;
  });
}

interface UseToolsDataReturn {
  // State
  periods: Period[];
  sections: WorkoutSection[];
  /** Common daily actions — stored in toolsSettings JSON only (not WorkoutSection table) */
  commonDailyActions: WorkoutSection[];
  /** Work methods — same shape as sections; toolsSettings JSON only */
  workMethods: WorkoutSection[];
  bodyBuildingTechniques: BodyBuildingTechnique[];
  sports: Sport[];
  equipment: Equipment[];
  exercises: Exercise[];
  devices: Device[];
  iconType: IconType;
  isLoadingIconPreference: boolean;
  isSavingToDatabase: boolean;
  lastSavedTime: Date | null;
  
  // Actions
  setPeriods: React.Dispatch<React.SetStateAction<Period[]>>;
  setSections: React.Dispatch<React.SetStateAction<WorkoutSection[]>>;
  setCommonDailyActions: React.Dispatch<React.SetStateAction<WorkoutSection[]>>;
  setWorkMethods: React.Dispatch<React.SetStateAction<WorkoutSection[]>>;
  setBodyBuildingTechniques: React.Dispatch<React.SetStateAction<BodyBuildingTechnique[]>>;
  setSports: React.Dispatch<React.SetStateAction<Sport[]>>;
  setEquipment: React.Dispatch<React.SetStateAction<Equipment[]>>;
  setExercises: React.Dispatch<React.SetStateAction<Exercise[]>>;
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
    commonDailyActions?: WorkoutSection[],
    workMethods?: WorkoutSection[]
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
  const [commonDailyActions, setCommonDailyActions] = useState<WorkoutSection[]>([]);
  const [workMethods, setWorkMethods] = useState<WorkoutSection[]>([]);
  const [bodyBuildingTechniques, setBodyBuildingTechniques] = useState<BodyBuildingTechnique[]>([]);
  const [sports, setSports] = useState<Sport[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [iconType, setIconType] = useState<IconType>('emoji');
  const [isLoadingIconPreference, setIsLoadingIconPreference] = useState(true);
  const [isSavingToDatabase, setIsSavingToDatabase] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null);
  
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

  const loadCommonDailyActionsFromLocalStorage = useCallback(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.COMMON_DAILY_ACTIONS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as WorkoutSection[];
        const list = Array.isArray(parsed) ? parsed : [];
        const cleaned = sanitizeCommonDailyActionsList(list, {
          periodIds: toolsItemsIdsFromLocalStorage(STORAGE_KEYS.PERIODS),
          sectionIds: toolsItemsIdsFromLocalStorage(STORAGE_KEYS.SECTIONS),
          techniqueIds: toolsItemsIdsFromLocalStorage(STORAGE_KEYS.BODYBUILDING_TECHNIQUES),
          workMethodIds: toolsItemsIdsFromLocalStorage(STORAGE_KEYS.WORK_METHODS),
        });
        if (cleaned.length !== list.length) {
          console.warn(
            `[tools] Sanitized commonDailyActions (localStorage): removed ${list.length - cleaned.length} misplaced entr${list.length - cleaned.length === 1 ? 'y' : 'ies'}.`
          );
        }
        setCommonDailyActions(cleaned);
      } catch (e) {
        console.error('Failed to load common daily actions');
        setCommonDailyActions([]);
      }
    } else {
      setCommonDailyActions([]);
    }
  }, []);

  const loadWorkMethodsFromLocalStorage = useCallback(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.WORK_METHODS);
    if (saved) {
      try {
        setWorkMethods(JSON.parse(saved));
      } catch {
        setWorkMethods([]);
      }
    } else {
      setWorkMethods([]);
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
  
  /**
   * Load all data from localStorage
   */
  const loadAllFromLocalStorage = useCallback(() => {
    loadPeriodsFromLocalStorage();
    loadSectionsFromLocalStorage();
    loadCommonDailyActionsFromLocalStorage();
    loadWorkMethodsFromLocalStorage();
    loadBodyBuildingTechniquesFromLocalStorage();
    loadSportsFromLocalStorage();
    loadEquipmentFromLocalStorage();
    loadExercisesFromLocalStorage();
    loadDevicesFromLocalStorage();
  }, [
    loadPeriodsFromLocalStorage,
    loadSectionsFromLocalStorage,
    loadCommonDailyActionsFromLocalStorage,
    loadWorkMethodsFromLocalStorage,
    loadBodyBuildingTechniquesFromLocalStorage,
    loadSportsFromLocalStorage,
    loadEquipmentFromLocalStorage,
    loadExercisesFromLocalStorage,
    loadDevicesFromLocalStorage
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
      let periodIdsForCda = new Set<string>();
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
            let titleByLanguage: Record<string, string> | undefined;
            if (p.nameTranslations && typeof p.nameTranslations === 'string') {
              try {
                const parsed = JSON.parse(p.nameTranslations) as Record<string, string>;
                if (parsed && typeof parsed === 'object') titleByLanguage = parsed;
              } catch {
                /* ignore */
              }
            }
            return {
              id: p.id,
              title: p.name,
              description: p.description || '',
              titleByLanguage,
              descriptionByLanguage,
              color: p.color,
              order: p.displayOrder !== undefined ? p.displayOrder : 0,
              userId: p.userId
            };
          });
          periodIdsForCda = new Set(formattedPeriods.map((p: Period) => String(p.id)));
          setPeriods(formattedPeriods);
        } else {
          loadPeriodsFromLocalStorage();
          periodIdsForCda = toolsItemsIdsFromLocalStorage(STORAGE_KEYS.PERIODS);
        }
      } else {
        loadPeriodsFromLocalStorage();
        periodIdsForCda = toolsItemsIdsFromLocalStorage(STORAGE_KEYS.PERIODS);
      }
      
      // Load workout sections from Prisma WorkoutSection table (not from JSON settings)
      let sectionIdsForCda = new Set<string>();
      const sectionsResponse = await fetch('/api/workouts/sections', {
        headers: getAuthHeaders()
      });
      
      if (sectionsResponse.ok) {
        const sectionsData = await sectionsResponse.json();
        if (sectionsData.sections && sectionsData.sections.length > 0) {
          // Convert Prisma WorkoutSection format to local Section format
          const formattedSections = sectionsData.sections.map((s: any) => {
            let descriptionByLanguage: Record<string, string> | undefined;
            if (s.descriptionTranslations && typeof s.descriptionTranslations === 'string') {
              try {
                const parsed = JSON.parse(s.descriptionTranslations) as Record<string, string>;
                if (parsed && typeof parsed === 'object') descriptionByLanguage = parsed;
              } catch {
                /* ignore */
              }
            }
            let titleByLanguage: Record<string, string> | undefined;
            if (s.nameTranslations && typeof s.nameTranslations === 'string') {
              try {
                const parsed = JSON.parse(s.nameTranslations) as Record<string, string>;
                if (parsed && typeof parsed === 'object') titleByLanguage = parsed;
              } catch {
                /* ignore */
              }
            }
            return {
              id: s.id,
              title: s.name,
              code: s.code || '',
              description: s.description || '',
              descriptionByLanguage,
              titleByLanguage,
              color: s.color,
              order: s.displayOrder !== undefined ? s.displayOrder : 0,
              userId: s.userId
            };
          });
          sectionIdsForCda = new Set(formattedSections.map((s: WorkoutSection) => String(s.id)));
          setSections(formattedSections);
          console.log('✅ Loaded workout sections from database:', formattedSections);
          console.log('📊 Sections with order:', formattedSections.map((s: any) => ({ title: s.title, order: s.order, displayOrder: sectionsData.sections.find((orig: any) => orig.id === s.id)?.displayOrder })));
          console.log('🔢 SECTION ORDERS:', formattedSections.map((s: any) => `${s.title}: order=${s.order}`).join(', '));
        } else {
          loadSectionsFromLocalStorage();
          sectionIdsForCda = toolsItemsIdsFromLocalStorage(STORAGE_KEYS.SECTIONS);
        }
      } else {
        loadSectionsFromLocalStorage();
        sectionIdsForCda = toolsItemsIdsFromLocalStorage(STORAGE_KEYS.SECTIONS);
      }
      
      // Load body building techniques from Prisma BodyBuildingTechnique table
      let techniqueIdsForCda = new Set<string>();
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
          const formattedTechniques = userTechniques.map((t: any) => {
            let descriptionByLanguage: Record<string, string> | undefined;
            if (t.descriptionTranslations && typeof t.descriptionTranslations === 'string') {
              try {
                const parsed = JSON.parse(t.descriptionTranslations) as Record<string, string>;
                if (parsed && typeof parsed === 'object') descriptionByLanguage = parsed;
              } catch {
                /* ignore */
              }
            }
            let titleByLanguage: Record<string, string> | undefined;
            if (t.nameTranslations && typeof t.nameTranslations === 'string') {
              try {
                const parsed = JSON.parse(t.nameTranslations) as Record<string, string>;
                if (parsed && typeof parsed === 'object') titleByLanguage = parsed;
              } catch {
                /* ignore */
              }
            }
            return {
              id: t.id,
              title: t.name,
              description: t.description || '',
              descriptionByLanguage,
              titleByLanguage,
              color: t.color,
              sports: t.sports || [],
              order: t.displayOrder !== undefined ? t.displayOrder : 0,
              userId: t.userId
            };
          });
          techniqueIdsForCda = new Set(formattedTechniques.map((t: BodyBuildingTechnique) => String(t.id)));
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
          techniqueIdsForCda = toolsItemsIdsFromLocalStorage(STORAGE_KEYS.BODYBUILDING_TECHNIQUES);
        }
      } else {
        loadBodyBuildingTechniquesFromLocalStorage();
        techniqueIdsForCda = toolsItemsIdsFromLocalStorage(STORAGE_KEYS.BODYBUILDING_TECHNIQUES);
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

        if (toolsSettings.devices && toolsSettings.devices.length > 0) {
          setDevices(toolsSettings.devices);
        } else {
          loadDevicesFromLocalStorage();
        }

        if (Array.isArray(toolsSettings.commonDailyActions)) {
          const wmArr = Array.isArray(toolsSettings.workMethods) ? toolsSettings.workMethods : [];
          const wmIdsForCda = new Set<string>(
            wmArr.map((w: { id?: unknown }) => String(w?.id ?? '')).filter(Boolean)
          );
          const rawCda = toolsSettings.commonDailyActions as WorkoutSection[];
          const cleanedCda = sanitizeCommonDailyActionsList(rawCda, {
            periodIds: periodIdsForCda,
            sectionIds: sectionIdsForCda,
            techniqueIds: techniqueIdsForCda,
            workMethodIds: wmIdsForCda,
          });
          if (cleanedCda.length !== rawCda.length) {
            console.warn(
              `[tools] Sanitized commonDailyActions (loaded from DB): removed ${rawCda.length - cleanedCda.length} misplaced entr${rawCda.length - cleanedCda.length === 1 ? 'y' : 'ies'} (same ids as periods/sections/work methods/techniques).`
            );
          }
          setCommonDailyActions(cleanedCda);
        } else {
          setCommonDailyActions([]);
        }

        if (Array.isArray(toolsSettings.workMethods)) {
          setWorkMethods(toolsSettings.workMethods as WorkoutSection[]);
        } else {
          setWorkMethods([]);
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
    loadDevicesFromLocalStorage
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
    commonDailyActionsData?: WorkoutSection[],
    workMethodsData?: WorkoutSection[]
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
    if (commonDailyActionsData) {
      localStorage.setItem(STORAGE_KEYS.COMMON_DAILY_ACTIONS, JSON.stringify(commonDailyActionsData));
    }
    if (workMethodsData) {
      localStorage.setItem(STORAGE_KEYS.WORK_METHODS, JSON.stringify(workMethodsData));
    }
  };
  
  /**
   * Save all settings to database
   */
  const saveToDatabase = async () => {
    setIsSavingToDatabase(true);
    try {
      const token = getAuthToken();
      if (!token) {
        console.warn('Cannot save: not logged in');
        setIsSavingToDatabase(false);
        return;
      }

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

      let mergedToolsSettings: Record<string, unknown> = {
        sports,
        equipment,
        exercises,
        devices,
        commonDailyActions,
        workMethods
      };
      try {
        const cur = await fetch('/api/user/settings', { headers: getAuthHeaders() });
        if (cur.ok) {
          const sd = await cur.json();
          const prev = sd.toolsSettings && typeof sd.toolsSettings === 'object' ? sd.toolsSettings : {};
          mergedToolsSettings = {
            ...(prev as Record<string, unknown>),
            sports,
            equipment,
            exercises,
            devices,
            commonDailyActions,
            workMethods
          };
        }
      } catch {
        /* keep mergedToolsSettings as-is */
      }

      const response = await fetch('/api/user/settings', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          toolsSettings: mergedToolsSettings
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
        throw new Error('Failed to save to database');
      }
    } catch (error) {
      console.error('Error saving to database:', error);
      alert('Failed to save to database. Please try again.');
    } finally {
      setIsSavingToDatabase(false);
    }
  };
  
  return {
    // State
    periods,
    sections,
    commonDailyActions,
    workMethods,
    bodyBuildingTechniques,
    sports,
    equipment,
    exercises,
    devices,
    iconType,
    isLoadingIconPreference,
    isSavingToDatabase,
    lastSavedTime,
    
    // Actions
    setPeriods,
    setSections,
    setCommonDailyActions,
    setWorkMethods,
    setBodyBuildingTechniques,
    setSports,
    setEquipment,
    setExercises,
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


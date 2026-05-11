'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Image from 'next/image';
import {
  Plus,
  Edit2,
  Trash2,
  GripVertical,
  ArrowUpAZ,
  ArrowDownZA,
  Save,
  X,
  Download,
  Globe,
  Image as ImageIcon,
  Smile,
  Grid3x3,
  List,
  ListOrdered,
  ArrowUpDown,
  AlertCircle,
  CheckCircle,
  Building2,
  LogIn,
  Search,
  Copy,
  Eye,
  Layers,
  Star,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToolsData } from '@/hooks/useToolsData';
import {
  Period,
  WorkoutSection,
  BodyBuildingTechnique,
  Sport,
  Equipment,
  Exercise,
  type ExercisePathologyCatalogItem,
  Device,
  IconType,
  ToolsTab,
  type PeriodizationTemplate,
  normalizePeriodizationTemplates,
  SUPPORTED_LANGUAGES,
  supportedLanguagesPeriodAdminOrder,
  DEFAULT_SPORTS,
  filterBySearch,
  filterByCategory,
  reorderItems,
  createDefaultExercise,
  mergeExerciseWithDefaults,
  finalizeExerciseForStorage,
  normalizeMuscleAreaPercentTags,
  muscleInvolvementPercentTotal,
} from '@/constants/tools.constants';
import { SPORTS_LIST, getSportDisplayName } from '@/constants/moveframe.constants';
import PeriodizationTabPanel from '@/components/settings/PeriodizationTabPanel';
import PeriodizationOverviewPanel from '@/components/settings/PeriodizationOverviewPanel';
import PlannedActionTemplatesEditor from '@/components/settings/PlannedActionTemplatesEditor';
import SportMachinesSection from '@/components/settings/SportMachinesSection';
import SuperAdminCompaniesSection from '@/components/settings/SuperAdminCompaniesSection';
import SectionExerciseDialog from '@/components/settings/SectionExerciseDialog';
import ExercisePathologiesCatalogSection from '@/components/settings/ExercisePathologiesCatalogSection';
import ExerciseBankTab from '@/components/settings/ExerciseBankTab';
import { useCanManageSportMachineCompanies } from '@/hooks/useCanManageSportMachineCompanies';
import {
  normalizeToolsLanguage,
  resolveProfileLanguageCodeForToolsLoad,
} from '@/utils/toolsProfileLanguage';

/**
 * Read one language from `titleByLanguage` / `descriptionByLanguage` maps.
 * Keys in older data may not match `SUPPORTED_LANGUAGES` codes exactly (casing, locale tags).
 */
function toolsTranslationFromMap(
  map: Record<string, string> | undefined | null,
  langCode: string
): string {
  if (!map || typeof map !== 'object') return '';
  const want = normalizeToolsLanguage(langCode);
  const direct = map[want];
  if (typeof direct === 'string' && direct.trim()) return direct.trim();
  for (const [k, v] of Object.entries(map)) {
    if (typeof v !== 'string' || !v.trim()) continue;
    if (normalizeToolsLanguage(k) === want) return v.trim();
  }
  return '';
}

/** Admin toolsDefaults JSON may be flat `{ commonDailyActions }` or nested `{ toolsSettings: { commonDailyActions } }`. */
function extractCommonDailyActionsFromToolsDefaultsPayload(toolsData: unknown): WorkoutSection[] {
  if (!toolsData || typeof toolsData !== 'object' || Array.isArray(toolsData)) return [];
  const td = toolsData as Record<string, unknown>;
  const top = td.commonDailyActions;
  if (Array.isArray(top)) return top as WorkoutSection[];
  const ts = td.toolsSettings;
  if (ts && typeof ts === 'object' && !Array.isArray(ts)) {
    const inner = (ts as Record<string, unknown>).commonDailyActions;
    if (Array.isArray(inner)) return inner as WorkoutSection[];
  }
  return [];
}

function resolveToolsStorageItemType(
  tab: ToolsTab
): 'periods' | 'sections' | 'bodyBuildingTechniques' | 'commonDailyActions' | 'workMethods' {
  if (tab === 'periods' || tab === 'periodizationPlan') return 'periods';
  if (tab === 'bodyBuildingTechniques') return 'bodyBuildingTechniques';
  if (tab === 'commonDailyActions') return 'commonDailyActions';
  if (tab === 'workMethods') return 'workMethods';
  return 'sections';
}

/** Stable list order for drag/save: one record set; display language must not reshuffle. */
function sortToolsItemsByOrder<T extends { order?: number; id: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const ao = a.order ?? 0;
    const bo = b.order ?? 0;
    if (ao !== bo) return ao - bo;
    return a.id.localeCompare(b.id);
  });
}

/** Keep first occurrence only — duplicate ids corrupt drag/delete (cards look "cloned"). */
function dedupeToolsItemsById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    const key = String(item.id);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

/**
 * For admin tools with English fallback: show a non-EN field's own value, or the English value when the slot is empty.
 * Trimming decides "empty" so spaces-only does not count as a real translation.
 */
function getToolsAdminTranslationFieldDisplay(
  translations: Record<string, { title: string; description: string }>,
  langCode: string,
  field: 'title' | 'description',
  useEnglishFallbackRules: boolean
): string {
  if (!useEnglishFallbackRules) {
    return translations[langCode]?.[field] ?? '';
  }
  const raw = translations[langCode]?.[field];
  const str = raw === undefined || raw === null ? '' : String(raw);
  if (langCode === 'en') {
    return str;
  }
  if (str.trim() !== '') {
    return str;
  }
  return translations['en']?.[field] ?? '';
}

/** True when non-EN field is visually showing English fallback (empty own value, English has text). */
function isToolsAdminTranslationFieldInherited(
  translations: Record<string, { title: string; description: string }>,
  langCode: string,
  field: 'title' | 'description',
  useEnglishFallbackRules: boolean
): boolean {
  if (!useEnglishFallbackRules || langCode === 'en') {
    return false;
  }
  const raw = translations[langCode]?.[field];
  const str = raw === undefined || raw === null ? '' : String(raw);
  if (str.trim() !== '') {
    return false;
  }
  const enRaw = translations['en']?.[field];
  const enStr = enRaw === undefined || enRaw === null ? '' : String(enRaw);
  return enStr.trim() !== '';
}

/** Same `/api/translate` flow as Language → Long texts (English source → all tools-supported languages). */
const TOOLS_TRANSLATION_TARGET_LANG_CODES = SUPPORTED_LANGUAGES.filter((l) => l.code !== 'en').map((l) => l.code);

async function fetchToolsLineTranslations(text: string): Promise<Record<string, string>> {
  const response = await fetch('/api/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      targetLanguages: TOOLS_TRANSLATION_TARGET_LANG_CODES,
    }),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Translation API returned ${response.status}: ${errorText.substring(0, 120)}`);
  }
  const data = await response.json();
  return data.translations && typeof data.translations === 'object' ? (data.translations as Record<string, string>) : {};
}

type PeriodizationSubview = 'periodSettings' | 'periodization' | 'overview';

interface ToolsSettingsProps {
  isAdmin?: boolean;
  userType?: string;
  mode?: 'tools' | 'technical';
  initialTab?: ToolsTab;
  /** When true, only the Periods UI is shown (main Settings → Periodization). */
  periodizationOnly?: boolean;
}

function getAllowedTabs(isAdmin: boolean, mode: 'tools' | 'technical'): ToolsTab[] {
  if (mode === 'technical') {
    return [
      'equipmentFactories',
      'muscles',
      'sportsEquipment',
      'sportMachines',
      'pathologies',
      'exercises',
      'myLibrary',
      'devices',
    ];
  }
  if (isAdmin) {
    // Common daily actions (multi-language) + planned action types live on the same tab (see below).
    return [
      'periods',
      'periodizationPlan',
      'periodizationLibrary',
      'sections',
      'workMethods',
      'bodyBuildingTechniques',
      'commonDailyActions',
    ];
  }
  // Personal Settings (all users): keep official user tabs only
  // and exclude technical/admin tabs (factories, muscles, sports-equipment).
  // Daily actions use the same Common daily actions form as Super Admin, single language only.
  return [
    'periods',
    'periodizationPlan',
    'sections',
    'workMethods',
    'bodyBuildingTechniques',
    'equipment',
    'exercises',
    'myLibrary',
    'devices',
    'commonDailyActions',
  ];
}

export default function ToolsSettings({
  isAdmin = false,
  userType = 'ATHLETE',
  mode = 'tools',
  initialTab,
  periodizationOnly = false
}: ToolsSettingsProps = {}) {
  const { t, currentLanguage } = useLanguage();
  
  // Use custom hook for data management
  const {
    periods,
    sections,
    commonDailyActions,
    workMethods,
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
    setPeriods,
    setSections,
    setCommonDailyActions,
    setWorkMethods,
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
    loadToolsSettingsFromDatabase,
    saveToLocalStorage,
    saveToDatabase
  } = useToolsData();
  
  const [activeTab, setActiveTab] = useState<ToolsTab>(() => {
    if (typeof window === 'undefined' || periodizationOnly) {
      return mode === 'technical' ? 'equipmentFactories' : 'periods';
    }
    const key = `settings_tools_tab_${mode}`;
    const saved = localStorage.getItem(key) as ToolsTab | null;
    const allowed = getAllowedTabs(isAdmin, mode);
    if (saved && allowed.includes(saved)) {
      // Legacy tab: planned templates now live under Common daily actions.
      if (saved === 'insertActions' && allowed.includes('commonDailyActions')) return 'commonDailyActions';
      return saved;
    }
    return mode === 'technical' ? 'equipmentFactories' : 'periods';
  });
  const [editingItem, setEditingItem] = useState<Period | WorkoutSection | BodyBuildingTechnique | null>(null);
  const [editItemTranslations, setEditItemTranslations] = useState<Record<string, { title: string; description: string }>>({});
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newItem, setNewItem] = useState({
    title: '',
    code: '',
    description: '',
    color: '#3b82f6',
    sports: [] as string[],
    picture: ''
  });
  const [newItemTranslations, setNewItemTranslations] = useState<Record<string, { title: string; description: string }>>({});
  const [isTranslatingToolsFields, setIsTranslatingToolsFields] = useState(false);
  const [activeInputLanguage, setActiveInputLanguage] = useState('en');
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [draggedSport, setDraggedSport] = useState<string | null>(null);
  const [dragOverSport, setDragOverSport] = useState<string | null>(null);
  const [showEquipmentDialog, setShowEquipmentDialog] = useState(false);
  const [showExerciseDialog, setShowExerciseDialog] = useState(false);
  const [showDeviceDialog, setShowDeviceDialog] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [editingSport, setEditingSport] = useState<Sport | null>(null);
  const [showEditSportDialog, setShowEditSportDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [periodizationLibTagFilter, setPeriodizationLibTagFilter] = useState('all');
  const [showPeriodizationTemplateDialog, setShowPeriodizationTemplateDialog] = useState(false);
  const [editingPeriodizationTemplate, setEditingPeriodizationTemplate] =
    useState<PeriodizationTemplate | null>(null);
  const [periodizationTagsInput, setPeriodizationTagsInput] = useState('');
  
  // Equipment view and sort state
  const [equipmentViewMode, setEquipmentViewMode] = useState<'cards' | 'table'>('cards');
  const [equipmentSortField, setEquipmentSortField] = useState<'name' | 'category' | 'company' | 'startDate'>('name');
  const [equipmentSortDirection, setEquipmentSortDirection] = useState<'asc' | 'desc'>('asc');
  
  // Language-specific defaults state
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [superAdminPassword, setSuperAdminPassword] = useState('');
  const [equipmentFactoriesMessage, setEquipmentFactoriesMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const { canManage: canManageMachineCompanies, refresh: refreshMachineCompaniesAccess } =
    useCanManageSportMachineCompanies(mode === 'technical');
  const [periodizationSubview, setPeriodizationSubview] =
    useState<PeriodizationSubview>(() => {
      if (typeof window === 'undefined') return 'periodSettings';
      const saved = localStorage.getItem('settings_periodization_subview');
      const valid: PeriodizationSubview[] = ['periodSettings', 'periodization', 'overview'];
      return (saved && valid.includes(saved as PeriodizationSubview))
        ? (saved as PeriodizationSubview)
        : 'periodSettings';
    });
  const allowedTabs = useMemo(() => {
    const base = getAllowedTabs(isAdmin, mode);
    return periodizationOnly ? base.filter((tab) => tab === 'periods') : base;
  }, [isAdmin, mode, periodizationOnly]);

  useEffect(() => {
    if (!periodizationOnly) return;
    const code = resolveProfileLanguageCodeForToolsLoad();
    setSelectedLanguage(code);
  }, [periodizationOnly]);
  const useEnglishFallbackRules =
    activeTab === 'periods' ||
    activeTab === 'sections' ||
    activeTab === 'workMethods' ||
    activeTab === 'commonDailyActions' ||
    activeTab === 'bodyBuildingTechniques';

  const adminTranslationLanguages = useMemo(() => {
    if (isAdmin && activeTab === 'periods') return supportedLanguagesPeriodAdminOrder();
    return SUPPORTED_LANGUAGES;
  }, [isAdmin, activeTab]);

  const profileLanguageLabel = useMemo(() => {
    const code = normalizeToolsLanguage(
      !isAdmin ? resolveProfileLanguageCodeForToolsLoad() : selectedLanguage
    );
    return SUPPORTED_LANGUAGES.find((l) => l.code === code)?.name || code.toUpperCase();
  }, [isAdmin, selectedLanguage]);

  const periodizationLibAllTags = useMemo(
    () => Array.from(new Set(periodizationTemplates.flatMap((t) => t.tags || []))).sort(),
    [periodizationTemplates]
  );

  const filteredPeriodizationTemplates = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return periodizationTemplates.filter((t) => {
      const matchQ =
        !q ||
        t.name.toLowerCase().includes(q) ||
        t.sport.toLowerCase().includes(q) ||
        t.level.toLowerCase().includes(q) ||
        (t.tags || []).some((tag) => tag.toLowerCase().includes(q));
      const matchTag =
        periodizationLibTagFilter === 'all' || (t.tags || []).includes(periodizationLibTagFilter);
      return matchQ && matchTag;
    });
  }, [periodizationTemplates, searchQuery, periodizationLibTagFilter]);

  useEffect(() => {
    if (!allowedTabs.includes(activeTab)) {
      setActiveTab(allowedTabs[0]);
    }
  }, [activeTab, allowedTabs]);

  useEffect(() => {
    if (!initialTab) return;
    const tab =
      initialTab === 'insertActions' && allowedTabs.includes('commonDailyActions')
        ? 'commonDailyActions'
        : initialTab;
    if (allowedTabs.includes(tab)) {
      setActiveTab(tab);
    }
  }, [initialTab, allowedTabs]);

  useEffect(() => {
    if (mode !== 'technical' || activeTab !== 'equipmentFactories') return;
    void refreshMachineCompaniesAccess();
  }, [mode, activeTab, refreshMachineCompaniesAccess]);

  // Persist active tab and periodization subview across refreshes
  useEffect(() => {
    if (periodizationOnly) return;
    localStorage.setItem(`settings_tools_tab_${mode}`, activeTab);
  }, [activeTab, mode, periodizationOnly]);

  useEffect(() => {
    localStorage.setItem('settings_periodization_subview', periodizationSubview);
  }, [periodizationSubview]);

  /** Plan + Overview live under Tools → Periodization; Period settings stay on the Periods tab. */
  useEffect(() => {
    if (activeTab !== 'periodizationPlan') return;
    if (periodizationSubview === 'periodSettings') {
      setPeriodizationSubview('periodization');
    }
  }, [activeTab, periodizationSubview]);
  
  // Get current user ID for ownership checking
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  useEffect(() => {
    // Get user ID from localStorage
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setCurrentUserId(user.id || null);
      } catch (e) {
        console.error('Error parsing user from localStorage:', e);
      }
    }
    
    // Mark initial load as complete after first render
    const timer = setTimeout(() => {
      setIsInitialLoad(false);
    }, 500); // Wait 500ms for all data to load
    
    return () => clearTimeout(timer);
  }, []);
  
  // For non-admin users, lock selected language to their profile language.
  useEffect(() => {
    if (isAdmin) return;
    const userStr = localStorage.getItem('user');
    if (!userStr) return;
    try {
      const parsed = JSON.parse(userStr);
      const profileLanguage = typeof parsed?.language === 'string' ? parsed.language.toLowerCase() : '';
      if (profileLanguage) {
        setSelectedLanguage(profileLanguage);
      }
    } catch (e) {
      console.error('Failed to parse user language from localStorage:', e);
    }
  }, [isAdmin, currentLanguage]);
  
  // Equipment sorting function
  const sortEquipment = (equipmentList: Equipment[]) => {
    return [...equipmentList].sort((a, b) => {
      let aValue: string | number = '';
      let bValue: string | number = '';
      
      switch (equipmentSortField) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'category':
          aValue = a.category.toLowerCase();
          bValue = b.category.toLowerCase();
          break;
        case 'company':
          aValue = (a.company || '').toLowerCase();
          bValue = (b.company || '').toLowerCase();
          break;
        case 'startDate':
          aValue = a.startDate ? new Date(a.startDate).getTime() : 0;
          bValue = b.startDate ? new Date(b.startDate).getTime() : 0;
          break;
      }
      
      if (equipmentSortDirection === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });
  };
  
  // Handle equipment column sort
  const handleEquipmentSort = (field: 'name' | 'category' | 'company' | 'startDate') => {
    if (equipmentSortField === field) {
      setEquipmentSortDirection(equipmentSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setEquipmentSortField(field);
      setEquipmentSortDirection('asc');
    }
  };
  
  // Data loading is now handled by useToolsData hook
  // All loading functions removed - handled by useToolsData hook

  // Use refs to track previous values and prevent unnecessary re-renders
  const prevPeriodsRef = useRef<Period[]>([]);
  const prevSectionsRef = useRef<WorkoutSection[]>([]);
  const prevCommonDailyActionsRef = useRef<WorkoutSection[]>([]);
  const prevWorkMethodsRef = useRef<WorkoutSection[]>([]);
  const prevBodyBuildingTechniquesRef = useRef<BodyBuildingTechnique[]>([]);
  const prevSportsRef = useRef<Sport[]>([]);
  const prevEquipmentRef = useRef<Equipment[]>([]);
  const prevExercisesRef = useRef<Exercise[]>([]);
  const prevExercisePathologyCatalogRef = useRef<ExercisePathologyCatalogItem[]>([]);
  const prevDevicesRef = useRef<Device[]>([]);
  const prevPeriodizationTemplatesRef = useRef<PeriodizationTemplate[]>([]);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /** Drag/manual order per list (not updated by A-Z / Z-A). Used by "My sorting". */
  const manualOrderPeriodIdsRef = useRef<string[] | null>(null);
  const manualOrderSectionIdsRef = useRef<string[] | null>(null);
  const manualOrderCommonDailyIdsRef = useRef<string[] | null>(null);
  const manualOrderWorkMethodsIdsRef = useRef<string[] | null>(null);
  const manualOrderTechniqueIdsRef = useRef<string[] | null>(null);

  const getManualOrderRefForActiveTab = (): React.MutableRefObject<string[] | null> => {
    if (activeTab === 'periods') return manualOrderPeriodIdsRef;
    if (activeTab === 'bodyBuildingTechniques') return manualOrderTechniqueIdsRef;
    if (activeTab === 'commonDailyActions') return manualOrderCommonDailyIdsRef;
    if (activeTab === 'workMethods') return manualOrderWorkMethodsIdsRef;
    return manualOrderSectionIdsRef;
  };

  // Seed manual-order snapshots from DB `order` once per list (before user uses A-Z or drag).
  useEffect(() => {
    if (activeTab === 'periods') {
      if (periods.length === 0) manualOrderPeriodIdsRef.current = null;
      else if (manualOrderPeriodIdsRef.current === null) {
        manualOrderPeriodIdsRef.current = sortToolsItemsByOrder(periods).map((p) => p.id);
      }
    }
  }, [activeTab, periods]);

  useEffect(() => {
    if (activeTab === 'sections') {
      if (sections.length === 0) manualOrderSectionIdsRef.current = null;
      else if (manualOrderSectionIdsRef.current === null) {
        manualOrderSectionIdsRef.current = sortToolsItemsByOrder(sections).map((s) => s.id);
      }
    }
  }, [activeTab, sections]);

  useEffect(() => {
    if (activeTab === 'workMethods') {
      if (workMethods.length === 0) manualOrderWorkMethodsIdsRef.current = null;
      else if (manualOrderWorkMethodsIdsRef.current === null) {
        manualOrderWorkMethodsIdsRef.current = sortToolsItemsByOrder(workMethods).map((s) => s.id);
      }
    }
  }, [activeTab, workMethods]);

  useEffect(() => {
    if (activeTab === 'commonDailyActions') {
      if (commonDailyActions.length === 0) manualOrderCommonDailyIdsRef.current = null;
      else if (manualOrderCommonDailyIdsRef.current === null) {
        manualOrderCommonDailyIdsRef.current = sortToolsItemsByOrder(commonDailyActions).map((s) => s.id);
      }
    }
  }, [activeTab, commonDailyActions]);

  useEffect(() => {
    if (activeTab === 'bodyBuildingTechniques') {
      if (bodyBuildingTechniques.length === 0) manualOrderTechniqueIdsRef.current = null;
      else if (manualOrderTechniqueIdsRef.current === null) {
        manualOrderTechniqueIdsRef.current = sortToolsItemsByOrder(bodyBuildingTechniques).map((t) => t.id);
      }
    }
  }, [activeTab, bodyBuildingTechniques]);

  // Debounced auto-save (uses hook)
  useEffect(() => {
    // Don't auto-save during initial load
    if (isInitialLoad) {
      console.log('⏭️ Skipping auto-save: initial load in progress');
      // Update refs on initial load
      prevPeriodsRef.current = periods;
      prevSectionsRef.current = sections;
      prevCommonDailyActionsRef.current = commonDailyActions;
      prevWorkMethodsRef.current = workMethods;
      prevBodyBuildingTechniquesRef.current = bodyBuildingTechniques;
      prevSportsRef.current = sports;
      prevEquipmentRef.current = equipment;
      prevExercisesRef.current = exercises;
      prevExercisePathologyCatalogRef.current = exercisePathologyCatalog;
      prevDevicesRef.current = devices;
      prevPeriodizationTemplatesRef.current = periodizationTemplates;
      return;
    }
    
    // Don't auto-save if data is being loaded initially
    if (
      periods.length === 0 &&
      sections.length === 0 &&
      sports.length === 0 &&
      periodizationTemplates.length === 0
    ) {
      return;
    }
    
    // Check if data actually changed (deep comparison by length and IDs)
    const periodsChanged = JSON.stringify(periods) !== JSON.stringify(prevPeriodsRef.current);
    const sectionsChanged = JSON.stringify(sections) !== JSON.stringify(prevSectionsRef.current);
    const commonDailyChanged =
      JSON.stringify(commonDailyActions) !== JSON.stringify(prevCommonDailyActionsRef.current);
    const workMethodsChanged =
      JSON.stringify(workMethods) !== JSON.stringify(prevWorkMethodsRef.current);
    const techniquesChanged = JSON.stringify(bodyBuildingTechniques) !== JSON.stringify(prevBodyBuildingTechniquesRef.current);
    const sportsChanged = JSON.stringify(sports) !== JSON.stringify(prevSportsRef.current);
    const equipmentChanged = JSON.stringify(equipment) !== JSON.stringify(prevEquipmentRef.current);
    const exercisesChanged = JSON.stringify(exercises) !== JSON.stringify(prevExercisesRef.current);
    const pathologyCatalogChanged =
      JSON.stringify(exercisePathologyCatalog) !== JSON.stringify(prevExercisePathologyCatalogRef.current);
    const devicesChanged = JSON.stringify(devices) !== JSON.stringify(prevDevicesRef.current);
    const periodizationTemplatesChanged =
      JSON.stringify(periodizationTemplates) !== JSON.stringify(prevPeriodizationTemplatesRef.current);
    
    if (
      !periodsChanged &&
      !sectionsChanged &&
      !commonDailyChanged &&
      !workMethodsChanged &&
      !techniquesChanged &&
      !sportsChanged &&
      !equipmentChanged &&
      !exercisesChanged &&
      !pathologyCatalogChanged &&
      !devicesChanged &&
      !periodizationTemplatesChanged
    ) {
      console.log('⏭️ Skipping auto-save: no changes detected');
      return;
    }
    
    // Don't trigger auto-save if a save is already in progress
    if (isSavingToDatabase) {
      console.log('⏭️ Skipping auto-save: save already in progress');
      return;
    }
    
    console.log('💾 Auto-save triggered: changes detected');
    if (periodsChanged) console.log('  - Periods changed');
    if (sectionsChanged) console.log('  - Sections changed');
    if (commonDailyChanged) console.log('  - Common daily actions changed');
    if (workMethodsChanged) console.log('  - Work methods changed');
    if (techniquesChanged) console.log('  - Techniques changed');
    
    // Save to localStorage immediately (backup)
      saveToLocalStorage(
        periods,
        sections,
        bodyBuildingTechniques,
        sports,
        equipment,
        exercises,
        devices,
        commonDailyActions,
        workMethods,
        exercisePathologyCatalog
      );
    
    // Clear any pending save timeout
    if (saveTimeoutRef.current) {
      console.log('⏱️  Cancelling previous save timeout (debouncing)');
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Debounce database save (wait 1 second after last change)
    saveTimeoutRef.current = setTimeout(() => {
      console.log('💾 Saving to database...');
      saveToDatabase().then(() => {
        console.log('✅ Database save complete');
        saveTimeoutRef.current = null;
      }).catch((error) => {
        console.error('❌ Database save failed:', error);
        saveTimeoutRef.current = null;
      });
    }, 1000);
    
    // Update refs immediately so next change is detected
    prevPeriodsRef.current = periods;
    prevSectionsRef.current = sections;
    prevCommonDailyActionsRef.current = commonDailyActions;
    prevWorkMethodsRef.current = workMethods;
    prevBodyBuildingTechniquesRef.current = bodyBuildingTechniques;
    prevSportsRef.current = sports;
    prevEquipmentRef.current = equipment;
    prevExercisesRef.current = exercises;
    prevExercisePathologyCatalogRef.current = exercisePathologyCatalog;
    prevDevicesRef.current = devices;
    prevPeriodizationTemplatesRef.current = periodizationTemplates;
    
    // Cleanup function - only clear timeout, don't return it
    return () => {
      // Don't cancel if save is in progress, just cancel pending timeout
      if (saveTimeoutRef.current) {
        console.log('🧹 Cleanup: clearing pending save timeout');
        clearTimeout(saveTimeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    periods,
    sections,
    commonDailyActions,
    workMethods,
    bodyBuildingTechniques,
    sports,
    equipment,
    exercises,
    exercisePathologyCatalog,
    devices,
    periodizationTemplates,
    isInitialLoad,
    isSavingToDatabase
  ]);

  const getActiveItems = () => {
    if (activeTab === 'periods') return sortToolsItemsByOrder(periods);
    if (activeTab === 'sections') return sortToolsItemsByOrder(sections);
    if (activeTab === 'workMethods') return sortToolsItemsByOrder(workMethods);
    if (activeTab === 'commonDailyActions') return sortToolsItemsByOrder(commonDailyActions);
    if (activeTab === 'bodyBuildingTechniques') return sortToolsItemsByOrder(bodyBuildingTechniques);
    return sortToolsItemsByOrder(sections);
  };

  const setActiveItems = (items: Period[] | WorkoutSection[] | BodyBuildingTechnique[]) => {
    const clean = dedupeToolsItemsById(items as (Period & { id: string })[]);
    const withOrder = clean.map((item, index) => ({ ...item, order: index }));
    if (activeTab === 'periods') {
      setPeriods(withOrder as Period[]);
    } else if (activeTab === 'sections') {
      setSections(withOrder as WorkoutSection[]);
    } else if (activeTab === 'workMethods') {
      setWorkMethods(withOrder as WorkoutSection[]);
    } else if (activeTab === 'commonDailyActions') {
      setCommonDailyActions(withOrder as WorkoutSection[]);
    } else if (activeTab === 'bodyBuildingTechniques') {
      setBodyBuildingTechniques(withOrder as BodyBuildingTechnique[]);
    }
  };

  const handleAdd = () => {
    if (isAdmin) {
      if (useEnglishFallbackRules) {
        // Periods/Sections/Execution techniques rule: English title is mandatory
        const englishTitle = newItemTranslations['en']?.title?.trim() || '';
        if (!englishTitle) {
          alert('English title is mandatory.');
          return;
        }
      } else {
        // Other tabs: at least one language title is enough
        const hasAtLeastOneTitle = Object.values(newItemTranslations).some(trans => trans.title.trim());
        if (!hasAtLeastOneTitle) {
          alert('Please enter a title in at least one language');
          return;
        }
      }

      // Validate character limits for all languages
      for (const [lang, trans] of Object.entries(newItemTranslations)) {
        if (trans.title && trans.title.length > 30) {
          alert(`Title in ${lang.toUpperCase()} must be 30 characters or less`);
          return;
        }
        if (trans.description && trans.description.length > 255) {
          alert(`Description in ${lang.toUpperCase()} must be 255 characters or less`);
          return;
        }
      }
    } else {
      // Non-Admin: Only validate current language
      if (!newItem.title || !newItem.title.trim()) {
        alert('Please enter a title');
        return;
      }
      if (newItem.title.length > 30) {
        alert('Title must be 30 characters or less');
        return;
      }
      if (newItem.description && newItem.description.length > 255) {
        alert('Description must be 255 characters or less');
        return;
      }
    }

    const items = getActiveItems();
    const newId = Date.now().toString();

    const isSuperAdminTranslatedTools =
      isAdmin &&
      (activeTab === 'periods' ||
        activeTab === 'sections' ||
        activeTab === 'workMethods' ||
        activeTab === 'commonDailyActions' ||
        activeTab === 'bodyBuildingTechniques');
    const currentLangData = isAdmin
      ? (newItemTranslations[currentLanguage] || newItemTranslations['en'] || { title: '', description: '' })
      : { title: newItem.title, description: newItem.description };

    let descriptionByLanguage: Record<string, string> | undefined;
    let titleByLanguage: Record<string, string> | undefined;
    if (isSuperAdminTranslatedTools) {
      const m: Record<string, string> = {};
      const tm: Record<string, string> = {};
      const enT = (newItemTranslations['en']?.title || '').trim();
      const enD = (newItemTranslations['en']?.description || '').trim();
      SUPPORTED_LANGUAGES.forEach((lang) => {
        let d = (newItemTranslations[lang.code]?.description ?? '').trim();
        let tit = (newItemTranslations[lang.code]?.title ?? '').trim();
        if (
          lang.code !== 'en' &&
          tit === enT &&
          d === enD &&
          (tit !== '' || d !== '')
        ) {
          tit = '';
          d = '';
        }
        if (d) m[lang.code] = d;
        if (tit) tm[lang.code] = tit;
      });
      descriptionByLanguage = Object.keys(m).length > 0 ? m : undefined;
      titleByLanguage = Object.keys(tm).length > 0 ? tm : undefined;
    }

    const englishBlock = newItemTranslations['en'] || { title: '', description: '' };

    const newEntry = {
      id: newId,
      title: isAdmin
        ? isSuperAdminTranslatedTools
          ? (englishBlock.title || Object.values(newItemTranslations).find((t) => t.title)?.title || '')
          : (currentLangData.title || Object.values(newItemTranslations).find((t) => t.title)?.title || '')
        : newItem.title,
      description: isSuperAdminTranslatedTools
        ? (englishBlock.description || '').trim()
        : currentLangData.description || '',
      ...(isSuperAdminTranslatedTools && descriptionByLanguage ? { descriptionByLanguage } : {}),
      ...(isSuperAdminTranslatedTools && titleByLanguage ? { titleByLanguage } : {}),
      color: newItem.color,
      order: items.length,
      isUserCreated: !isAdmin, // Tag user-created items
      ...((activeTab === 'sections' || activeTab === 'workMethods') && { code: newItem.code || '' }),
      ...(activeTab === 'commonDailyActions' && {
        code: newItem.code || '',
        picture: newItem.picture || ''
      }),
      ...(activeTab === 'bodyBuildingTechniques' && { sports: newItem.sports || [] }) // Add sports field for execution techniques
    };

    // Save translations to localStorage
    const itemType = resolveToolsStorageItemType(activeTab);
    
    if (isAdmin) {
      // Admin: Save for all languages
      SUPPORTED_LANGUAGES.forEach(lang => {
        const langData = newItemTranslations[lang.code];
        if (langData && (langData.title || langData.description)) {
          // Load existing language library
          const storageKey = `tools_${itemType}_${lang.code}`;
          const existingDataStr = localStorage.getItem(storageKey);
          const existingData = existingDataStr ? JSON.parse(existingDataStr) : [];
          
          // Add new item with translations
          const langEntry = {
            id: newId,
            title: langData.title || '',
            description: langData.description || '',
            color: newItem.color,
            order: items.length,
            isUserCreated: false,
            ...(activeTab === 'commonDailyActions' && {
              code: newItem.code || '',
              picture: newItem.picture || ''
            }),
          };
          
          existingData.push(langEntry);
          localStorage.setItem(storageKey, JSON.stringify(existingData));
        }
      });
    } else {
      // Non-Admin: Only save for current language
      const storageKey = `tools_${itemType}_${selectedLanguage}`;
      const existingDataStr = localStorage.getItem(storageKey);
      const existingData = existingDataStr ? JSON.parse(existingDataStr) : [];
      
      const langEntry = {
        id: newId,
        title: newItem.title,
        description: newItem.description,
        color: newItem.color,
        order: items.length,
        isUserCreated: true,
        ...(activeTab === 'commonDailyActions' && {
          code: newItem.code || '',
          picture: newItem.picture || ''
        }),
      };
      
      existingData.push(langEntry);
      localStorage.setItem(storageKey, JSON.stringify(existingData));
    }

    setActiveItems([...items, newEntry]);
    const manualRefAdd = getManualOrderRefForActiveTab();
    if (manualRefAdd.current) {
      manualRefAdd.current = [...manualRefAdd.current, newEntry.id];
    } else {
      const base =
        activeTab === 'periods'
          ? periods
          : activeTab === 'bodyBuildingTechniques'
            ? bodyBuildingTechniques
            : activeTab === 'commonDailyActions'
              ? commonDailyActions
              : activeTab === 'workMethods'
                ? workMethods
                : sections;
      manualRefAdd.current = [...sortToolsItemsByOrder(base as any).map((x: any) => x.id), newEntry.id];
    }
    setNewItem({ title: '', code: '', description: '', color: '#3b82f6', sports: [] as string[], picture: '' });
    setNewItemTranslations({});
    setActiveInputLanguage('en');
    setShowAddDialog(false);
  };

  const handleEdit = (item: Period | WorkoutSection | BodyBuildingTechnique) => {
    // Check if user owns this item
    if (currentUserId && item.userId && item.userId !== currentUserId) {
      alert('⚠️ You cannot edit this item because it was not created by you.\n\nOnly items you created can be edited.');
      return;
    }
    
    setEditingItem({ ...item });

    const skipLocalStorageForTranslatedToolsAdmin =
      isAdmin &&
      (activeTab === 'periods' ||
        activeTab === 'sections' ||
        activeTab === 'workMethods' ||
        activeTab === 'commonDailyActions' ||
        activeTab === 'bodyBuildingTechniques');

    const translations: Record<string, { title: string; description: string }> = {};

    SUPPORTED_LANGUAGES.forEach((lang) => {
      if (useEnglishFallbackRules) {
        const anyItem = item as Period & WorkoutSection & BodyBuildingTechnique;
        const byLang = anyItem.descriptionByLanguage;
        const titlesByLang = anyItem.titleByLanguage;
        const useDbTranslations =
          isAdmin &&
          (activeTab === 'periods' ||
            activeTab === 'sections' ||
            activeTab === 'workMethods' ||
            activeTab === 'commonDailyActions' ||
            activeTab === 'bodyBuildingTechniques');

        const descForLang = useDbTranslations
          ? (byLang?.[lang.code]?.trim()
              ? (byLang[lang.code] as string)
              : lang.code === 'en'
                ? (item.description || '')
                : '')
          : lang.code === 'en'
            ? (item.description || '')
            : '';

        const titleForLang = useDbTranslations
          ? (titlesByLang?.[lang.code]?.trim()
              ? (titlesByLang[lang.code] as string)
              : lang.code === 'en'
                ? (item.title || '')
                : '')
          : lang.code === 'en'
            ? (item.title || '')
            : '';

        let titleOut = titleForLang;
        let descOut = descForLang;
        if (useDbTranslations && lang.code !== 'en') {
          const rawStoredT = (titlesByLang?.[lang.code] as string | undefined)?.trim() ?? '';
          const rawStoredD = (byLang?.[lang.code] as string | undefined)?.trim() ?? '';
          const enPrimaryT = (item.title || '').trim();
          const enPrimaryD = (item.description || '').trim();
          // Older data sometimes copied the English primary into per-language maps when other languages were left blank.
          // Clearing here makes the edit form treat the slot as empty so English shows in red until a real translation is entered.
          if (
            rawStoredT !== '' &&
            rawStoredT === enPrimaryT &&
            rawStoredD === enPrimaryD
          ) {
            titleOut = '';
            descOut = '';
          }
        }

        translations[lang.code] = {
          title: titleOut,
          description: descOut
        };
      } else {
        translations[lang.code] = {
          title: item.title || '',
          description: item.description || ''
        };
      }

      if (skipLocalStorageForTranslatedToolsAdmin) return;

      const itemType = resolveToolsStorageItemType(activeTab);
      const storageKey = `tools_${itemType}_${lang.code}`;
      const existingDataStr = localStorage.getItem(storageKey);
      if (existingDataStr) {
        try {
          const existingData = JSON.parse(existingDataStr);
          const existingItem = existingData.find((i: any) => i.id === item.id);
          if (existingItem) {
            translations[lang.code] = {
              title: existingItem.title || item.title || '',
              description: existingItem.description || item.description || ''
            };
          }
        } catch (e) {
          console.error(`Error loading ${lang.code} translation:`, e);
        }
      }
    });

    setEditItemTranslations(translations);
    if (isAdmin && useEnglishFallbackRules) setActiveInputLanguage('en');
  };

  const handleTranslateNewItemFields = async () => {
    const enBlock = newItemTranslations['en'] || { title: '', description: '' };
    const enTitle = enBlock.title.trim();
    const enDesc = enBlock.description.trim();
    if (!enTitle && !enDesc) {
      alert('Enter English title or description in the EN block first, then press Translation.');
      return;
    }
    setIsTranslatingToolsFields(true);
    try {
      const [titleMap, descMap] = await Promise.all([
        enTitle ? fetchToolsLineTranslations(enTitle) : Promise.resolve({} as Record<string, string>),
        enDesc ? fetchToolsLineTranslations(enDesc) : Promise.resolve({} as Record<string, string>),
      ]);
      setNewItemTranslations((prev) => {
        const en = prev['en'] || { title: '', description: '' };
        const next: Record<string, { title: string; description: string }> = {
          ...prev,
          en: {
            title: en.title.trim().slice(0, 30),
            description: en.description.trim().slice(0, 255),
          },
        };
        for (const code of TOOLS_TRANSLATION_TARGET_LANG_CODES) {
          const prior = prev[code] || { title: '', description: '' };
          const tRaw = titleMap[code];
          const dRaw = descMap[code];
          next[code] = {
            title: enTitle
              ? (typeof tRaw === 'string' ? tRaw.trim().slice(0, 30) : prior.title)
              : prior.title,
            description: enDesc
              ? (typeof dRaw === 'string' ? dRaw.trim().slice(0, 255) : prior.description)
              : prior.description,
          };
        }
        return next;
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      alert(
        `Translation failed.\n\n${msg}\n\nYou can enter other languages manually. Same API as Language → Long texts.`
      );
    } finally {
      setIsTranslatingToolsFields(false);
    }
  };

  const handleTranslateEditItemFields = async () => {
    const enBlock = editItemTranslations['en'] || { title: '', description: '' };
    const enTitle = enBlock.title.trim();
    const enDesc = enBlock.description.trim();
    if (!enTitle && !enDesc) {
      alert('Enter English title or description in the EN block first, then press Translation.');
      return;
    }
    setIsTranslatingToolsFields(true);
    try {
      const [titleMap, descMap] = await Promise.all([
        enTitle ? fetchToolsLineTranslations(enTitle) : Promise.resolve({} as Record<string, string>),
        enDesc ? fetchToolsLineTranslations(enDesc) : Promise.resolve({} as Record<string, string>),
      ]);
      setEditItemTranslations((prev) => {
        const en = prev['en'] || { title: '', description: '' };
        const next: Record<string, { title: string; description: string }> = {
          ...prev,
          en: {
            title: en.title.trim().slice(0, 30),
            description: en.description.trim().slice(0, 255),
          },
        };
        for (const code of TOOLS_TRANSLATION_TARGET_LANG_CODES) {
          const prior = prev[code] || { title: '', description: '' };
          const tRaw = titleMap[code];
          const dRaw = descMap[code];
          next[code] = {
            title: enTitle
              ? (typeof tRaw === 'string' ? tRaw.trim().slice(0, 30) : prior.title)
              : prior.title,
            description: enDesc
              ? (typeof dRaw === 'string' ? dRaw.trim().slice(0, 255) : prior.description)
              : prior.description,
          };
        }
        return next;
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      alert(
        `Translation failed.\n\n${msg}\n\nYou can enter other languages manually. Same API as Language → Long texts.`
      );
    } finally {
      setIsTranslatingToolsFields(false);
    }
  };

  const handleSaveEdit = () => {
    if (!editingItem) return;

    if (isAdmin) {
      if (useEnglishFallbackRules) {
        // Periods/Sections/Execution techniques rule: English title is mandatory
        const hasEnglish = editItemTranslations['en']?.title && editItemTranslations['en'].title.trim() !== '';
        if (!hasEnglish) {
          alert('English title is mandatory.');
          return;
        }
      } else {
        // Other tabs: at least English or Italian
        const hasEnglish = editItemTranslations['en']?.title && editItemTranslations['en'].title.trim() !== '';
        const hasItalian = editItemTranslations['it']?.title && editItemTranslations['it'].title.trim() !== '';
        if (!hasEnglish && !hasItalian) {
          alert('❌ MANDATORY: At least English or Italian translation is required!\n\nPlease fill in the title for:\n• English (EN) OR\n• Italian (IT)\n\nOne of these two languages must be filled.');
          return;
        }
      }

      // Validate all language translations
      for (const [lang, trans] of Object.entries(editItemTranslations)) {
        if (trans.title && trans.title.length > 30) {
          alert(`Title in ${lang.toUpperCase()} must be 30 characters or less`);
          return;
        }
        if (trans.description && trans.description.length > 255) {
          alert(`Description in ${lang.toUpperCase()} must be 255 characters or less`);
          return;
        }
      }

      if (
        activeTab === 'periods' ||
        activeTab === 'sections' ||
        activeTab === 'workMethods' ||
        activeTab === 'commonDailyActions' ||
        activeTab === 'bodyBuildingTechniques'
      ) {
        const enT = editItemTranslations['en'];
        editingItem.title = (enT?.title?.trim() || editingItem.title || '').trim();
        editingItem.description = (enT?.description || '').trim();
        const descByLang: Record<string, string> = {};
        const titleByLang: Record<string, string> = {};
        const enPrimaryT = (editItemTranslations['en']?.title || '').trim();
        const enPrimaryD = (editItemTranslations['en']?.description || '').trim();
        SUPPORTED_LANGUAGES.forEach((lang) => {
          let d = (editItemTranslations[lang.code]?.description ?? '').trim();
          let t = (editItemTranslations[lang.code]?.title ?? '').trim();
          if (
            lang.code !== 'en' &&
            t === enPrimaryT &&
            d === enPrimaryD &&
            (t !== '' || d !== '')
          ) {
            t = '';
            d = '';
          }
          if (d) descByLang[lang.code] = d;
          if (t) titleByLang[lang.code] = t;
        });
        if (activeTab === 'periods') {
          (editingItem as Period).descriptionByLanguage =
            Object.keys(descByLang).length > 0 ? descByLang : undefined;
          (editingItem as Period).titleByLanguage =
            Object.keys(titleByLang).length > 0 ? titleByLang : undefined;
        } else if (
          activeTab === 'sections' ||
          activeTab === 'workMethods' ||
          activeTab === 'commonDailyActions'
        ) {
          (editingItem as WorkoutSection).descriptionByLanguage =
            Object.keys(descByLang).length > 0 ? descByLang : undefined;
          (editingItem as WorkoutSection).titleByLanguage =
            Object.keys(titleByLang).length > 0 ? titleByLang : undefined;
        } else {
          (editingItem as BodyBuildingTechnique).descriptionByLanguage =
            Object.keys(descByLang).length > 0 ? descByLang : undefined;
          (editingItem as BodyBuildingTechnique).titleByLanguage =
            Object.keys(titleByLang).length > 0 ? titleByLang : undefined;
        }
      } else {
        const currentLangData =
          editItemTranslations[currentLanguage] ||
          editItemTranslations['en'] ||
          Object.values(editItemTranslations)[0];
        if (currentLangData) {
          editingItem.title = currentLangData.title || editingItem.title;
          editingItem.description = currentLangData.description || editingItem.description;
        }
      }
    } else {
      // Non-Admin: Validate current language only
      if (!editingItem.title || !editingItem.title.trim()) {
        alert('Please enter a title');
        return;
      }
      if (editingItem.title.length > 30) {
        alert('Title must be 30 characters or less');
        return;
      }
      if (editingItem.description && editingItem.description.length > 255) {
        alert('Description must be 255 characters or less');
        return;
      }
    }

    console.log('💾 Saving edited item:', {
      id: editingItem.id,
      title: editingItem.title,
      description: editingItem.description,
      currentLanguage,
      translationsKeys: Object.keys(editItemTranslations)
    });

    // Update in current state - Force new array reference for React to detect changes
    const items = getActiveItems();
    const updated = [...items].map(item => 
      item.id === editingItem.id ? { ...editingItem } : item
    );
    setActiveItems(updated);
    
    console.log('✅ State updated with:', updated);
    
    // Save to language libraries
    const itemType = resolveToolsStorageItemType(activeTab);
    
    if (isAdmin) {
      // Admin: Save to all language libraries
      SUPPORTED_LANGUAGES.forEach(lang => {
        const langData = editItemTranslations[lang.code];
        if (langData && (langData.title || langData.description)) {
          const storageKey = `tools_${itemType}_${lang.code}`;
          const existingDataStr = localStorage.getItem(storageKey);
          const existingData = existingDataStr ? JSON.parse(existingDataStr) : [];
          
          // Find and update the item
          const itemIndex = existingData.findIndex((i: any) => i.id === editingItem.id);
          if (itemIndex >= 0) {
            existingData[itemIndex] = {
              ...existingData[itemIndex],
              title: langData.title || '',
              description: langData.description || '',
              color: editingItem.color,
              ...((activeTab === 'sections' || activeTab === 'workMethods') && {
                code: (editingItem as any).code || ''
              }),
              ...(activeTab === 'commonDailyActions' && {
                code: (editingItem as any).code || '',
                picture: (editingItem as any).picture || ''
              })
            };
          } else {
            // Add if doesn't exist
            existingData.push({
              id: editingItem.id,
              title: langData.title || '',
              description: langData.description || '',
              color: editingItem.color,
              order: existingData.length,
            ...((activeTab === 'sections' || activeTab === 'workMethods') && {
                code: (editingItem as any).code || ''
              }),
            ...(activeTab === 'commonDailyActions' && {
              code: (editingItem as any).code || '',
              picture: (editingItem as any).picture || ''
            })
          });
        }
        
        localStorage.setItem(storageKey, JSON.stringify(existingData));
        }
      });
    } else {
      // Non-Admin: Only save to current language
      const storageKey = `tools_${itemType}_${selectedLanguage}`;
      const existingDataStr = localStorage.getItem(storageKey);
      const existingData = existingDataStr ? JSON.parse(existingDataStr) : [];
      
      const itemIndex = existingData.findIndex((i: any) => i.id === editingItem.id);
      if (itemIndex >= 0) {
        existingData[itemIndex] = {
          ...existingData[itemIndex],
          title: editingItem.title,
          description: editingItem.description,
          color: editingItem.color,
          ...((activeTab === 'sections' || activeTab === 'workMethods') && {
                code: (editingItem as any).code || ''
              }),
          ...(activeTab === 'commonDailyActions' && {
            code: (editingItem as any).code || '',
            picture: (editingItem as any).picture || ''
          })
        };
      } else {
        // Add if doesn't exist
        existingData.push({
          id: editingItem.id,
          title: editingItem.title,
          description: editingItem.description,
          color: editingItem.color,
          order: existingData.length,
          isUserCreated: true,
          ...((activeTab === 'sections' || activeTab === 'workMethods') && {
                code: (editingItem as any).code || ''
              }),
          ...(activeTab === 'commonDailyActions' && {
            code: (editingItem as any).code || '',
            picture: (editingItem as any).picture || ''
          })
        });
      }
      
      localStorage.setItem(storageKey, JSON.stringify(existingData));
    }
    
    setEditingItem(null);
    setEditItemTranslations({});
  };

  const handleDelete = (id: string) => {
    if (!confirm('Delete this item?')) return;
    
    const idKey = String(id);
    const items = getActiveItems();
    const updated = items.filter((item) => String(item.id) !== idKey);
    setActiveItems(updated);
    const manualRefDel = getManualOrderRefForActiveTab();
    if (manualRefDel.current) {
      manualRefDel.current = manualRefDel.current.filter((x) => String(x) !== idKey);
    }
  };

  const handleSortAZ = () => {
    const items = getActiveItems();
    const sorted = [...items].sort((a, b) =>
      getDisplayTitle(a).text.localeCompare(getDisplayTitle(b).text)
    );
    setActiveItems(sorted.map((item, index) => ({ ...item, order: index })));
  };

  const handleSortZA = () => {
    const items = getActiveItems();
    const sorted = [...items].sort((a, b) =>
      getDisplayTitle(b).text.localeCompare(getDisplayTitle(a).text)
    );
    setActiveItems(sorted.map((item, index) => ({ ...item, order: index })));
  };

  /** Restore order from last drag-and-drop sequence (snapshot not altered by A-Z / Z-A). */
  const handleRestoreMySorting = () => {
    const items = getActiveItems() as (Period | WorkoutSection | BodyBuildingTechnique)[];
    const manualRef = getManualOrderRefForActiveTab();
    let ids = manualRef.current;
    if (!ids || ids.length === 0) {
      const sorted = sortToolsItemsByOrder(items);
      setActiveItems(sorted.map((item, index) => ({ ...item, order: index })));
      return;
    }
    const byId = new Map(items.map((i) => [i.id, i]));
    const ordered = ids.filter((id) => byId.has(id)).map((id) => byId.get(id)!);
    const missing = items.filter((i) => !ids.includes(i.id));
    setActiveItems([...ordered, ...missing].map((item, index) => ({ ...item, order: index })));
  };

  const handleDragStart = (id: string) => {
    setDraggedItem(String(id));
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (!draggedItem) return;
    const dropId = String(id);
    if (String(draggedItem) === dropId) return;

    const items = getActiveItems();
    const draggedIndex = items.findIndex((item) => String(item.id) === String(draggedItem));
    const targetIndex = items.findIndex((item) => String(item.id) === dropId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const newItems = [...items];
    const [removed] = newItems.splice(draggedIndex, 1);
    newItems.splice(targetIndex, 0, removed);

    setActiveItems(newItems);
    getManualOrderRefForActiveTab().current = newItems.map((item) => item.id);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDraggedItem(null);
  };

  // Language-specific defaults handlers
  const saveLanguageDefaults = async () => {
    setShowPasswordDialog(true);
  };

  const handlePasswordSubmit = async () => {
    if (!superAdminPassword.trim()) {
      alert(`❌ Please enter ${isAdmin ? 'Super Admin' : 'your'} password`);
      return;
    }

    try {
      // Verify password first
      const token = localStorage.getItem('token');
      console.log('🔐 Token from localStorage:', token ? 'Present' : 'Missing');
      
      const verifyEndpoint = isAdmin 
        ? '/api/admin/super-admin/verify' 
        : '/api/user/verify-password';
      
      console.log('🔐 Using endpoint:', verifyEndpoint);
      console.log('🔐 Is admin mode:', isAdmin);
      
      const verifyHeaders: HeadersInit = { 'Content-Type': 'application/json' };
      if (!isAdmin && token) {
        verifyHeaders['Authorization'] = `Bearer ${token}`;
      }
      
      console.log('🔐 Request headers:', verifyHeaders);
      
      const verifyResponse = await fetch(verifyEndpoint, {
        method: 'POST',
        headers: verifyHeaders,
        body: JSON.stringify({ password: superAdminPassword })
      });

      console.log('🔐 Verify response status:', verifyResponse.status);
      const verifyData = await verifyResponse.json();
      console.log('🔐 Verify response data:', verifyData);
      
      if (!verifyData.valid) {
        alert(`❌ Invalid password`);
        return;
      }

      const toolsData = {
        periods,
        sections,
        commonDailyActions,
        workMethods,
        sports,
        equipment,
        exercises,
        devices,
        periodizationTemplates: normalizePeriodizationTemplates(periodizationTemplates),
      };

      if (isAdmin) {
        // Admin mode: Save as language defaults
        const response = await fetch('/api/admin/tools-defaults/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            language: selectedLanguage,
            toolsData,
            password: superAdminPassword
          })
        });

        const data = await response.json();
        
        if (response.ok) {
          alert(
            '✅ Success! Movesbook default settings saved.\n\n' +
              '📋 Included: Periods, Sections, Sports, Equipment, Exercises, Library, Devices, Periodization library — with every translation you entered on each item.\n\n' +
              '👥 Users who use Load in Language Defaults get these defaults in their profile language. Ensure each user\'s language is set in their profile.'
          );
          setShowPasswordDialog(false);
          setSuperAdminPassword('');
        } else {
          console.error('❌ Save failed:', data);
          alert(`❌ ${data.error || 'Failed to save defaults'}\n\nDetails: ${data.details || 'No additional details'}`);
        }
      } else {
        // Personal mode: Save to user's personal settings
        if (!token) {
          alert('❌ Please login to save settings');
          return;
        }

        const response = await fetch('/api/user/settings/save', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            toolsSettings: toolsData
          })
        });

        const data = await response.json();
        
        if (response.ok) {
          alert('✅ Personal settings saved successfully!');
          setShowPasswordDialog(false);
          setSuperAdminPassword('');
        } else {
          console.error('❌ Save failed:', data);
          alert(`❌ ${data.error || 'Failed to save settings'}\n\nDetails: ${data.details || 'No additional details'}`);
        }
      }
    } catch (error) {
      console.error('Error:', error);
      alert('❌ Error saving settings');
    }
  };

  // Display language is only `selectedLanguage` — it drives getDisplayTitle / getDisplayDescription.
  // Do not fetch /api/admin/tools-defaults/load here: that API returns a per-language snapshot (often a
  // different row count than the user's live DB list) and would replace periods/sports/etc.

  // Handle Load from Movesbook (for non-admin users)
  const handleLoadAdminDefaults = async () => {
    const loadLang = normalizeToolsLanguage(
      isAdmin ? selectedLanguage : resolveProfileLanguageCodeForToolsLoad()
    );
    const languageName = SUPPORTED_LANGUAGES.find((l) => l.code === loadLang)?.name || loadLang;

    const confirmed = window.confirm(
      isAdmin
        ? 'Do you want to continue?'
        : `Load Movesbook defaults from Super Admin (periods, sections, equipment, …) in ${languageName} (${loadLang})? Items you created yourself are kept.`
    );

    if (!confirmed) return;

    try {
      let response = await fetch(
        `/api/admin/tools-defaults/load?language=${encodeURIComponent(loadLang)}`
      );
      let data = await response.json();

      if ((!response.ok || !data.toolsData) && !isAdmin && loadLang !== 'en') {
        try {
          const enRes = await fetch(`/api/admin/tools-defaults/load?language=${encodeURIComponent('en')}`);
          const enJson = await enRes.json();
          if (enRes.ok && enJson.toolsData) {
            response = enRes;
            data = enJson;
            console.warn(
              `[tools] No Movesbook toolsDefaults row for profile language "${loadLang}"; loaded English Super Admin defaults instead.`
            );
          }
        } catch {
          /* ignore */
        }
      }

      if (response.ok && data.toolsData) {
        const toolsPayload: Record<string, any> = { ...data.toolsData };

        if (
          !isAdmin &&
          loadLang !== 'en' &&
          (!Array.isArray(toolsPayload.periods) || toolsPayload.periods.length === 0)
        ) {
          try {
            const enRes = await fetch(`/api/admin/tools-defaults/load?language=${encodeURIComponent('en')}`);
            const enJson = await enRes.json();
            if (enRes.ok && enJson.toolsData?.periods?.length) {
              toolsPayload.periods = enJson.toolsData.periods;
              console.warn(
                `[tools] Super Admin defaults for "${loadLang}" contained no periods; merged periods from the English defaults row.`
              );
            }
          } catch {
            /* ignore */
          }
        }

        // Get current user-created items (items with isUserCreated flag)
        const userPeriods = periods.filter((p: any) => p.isUserCreated);
        const userSections = sections.filter((s: any) => s.isUserCreated);
        const userWorkMethods = workMethods.filter((s: any) => s.isUserCreated);
        const userCommonDaily = commonDailyActions.filter((s: any) => s.isUserCreated);
        const userEquipment = equipment.filter((e: any) => e.isUserCreated);
        const userExercises = exercises.filter((ex: any) => ex.isUserCreated);
        const userDevices = devices.filter((d: any) => d.isUserCreated);
        const userPeriodizationTemplates = periodizationTemplates.filter((t) => t.isUserCreated);

        // Load admin defaults and merge with user-created items
        if (toolsPayload.periods) {
          setPeriods([...toolsPayload.periods, ...userPeriods]);
        }
        if (toolsPayload.sections) {
          setSections([...toolsPayload.sections, ...userSections]);
        }
        if (toolsPayload.workMethods && Array.isArray(toolsPayload.workMethods)) {
          setWorkMethods([...toolsPayload.workMethods, ...userWorkMethods]);
        }
        let adminCommonDaily = extractCommonDailyActionsFromToolsDefaultsPayload(toolsPayload);
        if (adminCommonDaily.length === 0 && loadLang !== 'en') {
          try {
            const enRes = await fetch(
              `/api/admin/tools-defaults/load?language=${encodeURIComponent('en')}`
            );
            const enJson = await enRes.json();
            if (enRes.ok && enJson.toolsData) {
              const fromEn = extractCommonDailyActionsFromToolsDefaultsPayload(enJson.toolsData);
              if (fromEn.length > 0) {
                adminCommonDaily = fromEn;
                console.warn(
                  `[tools] No common daily actions in Movesbook defaults for "${loadLang}"; loaded English catalog as fallback. Re-save Super Admin defaults for ${loadLang} to include daily actions in that language.`
                );
              }
            }
          } catch {
            /* ignore */
          }
        }
        setCommonDailyActions([...adminCommonDaily, ...userCommonDaily]);
        if (toolsPayload.sports) {
          setSports([...toolsPayload.sports]); // Sports are read-only for users
        }
        if (toolsPayload.equipment) {
          setEquipment([...toolsPayload.equipment, ...userEquipment]);
        }
        if (toolsPayload.exercises) {
          setExercises([...toolsPayload.exercises, ...userExercises]);
        }
        if (toolsPayload.devices) {
          setDevices([...toolsPayload.devices, ...userDevices]);
        }
        if (Object.prototype.hasOwnProperty.call(toolsPayload, 'periodizationTemplates')) {
          setPeriodizationTemplates([
            ...normalizePeriodizationTemplates(toolsPayload.periodizationTemplates),
            ...userPeriodizationTemplates,
          ]);
        }

        alert(
          `✅ Success!\n\nMovesbook Super Admin settings for ${languageName} have been loaded and merged into your lists.\n\nYour manually created items are preserved.`
        );
      } else {
        alert(`❌ No admin defaults found for ${languageName}`);
      }
    } catch (error) {
      alert('❌ Error loading admin defaults. Please try again.');
    }
  };

  /** Periods/sections/etc. cards: respect Display language for every user (not only admin). */
  const useTranslatedEntityCards =
    useEnglishFallbackRules &&
    (activeTab === 'periods' ||
      activeTab === 'sections' ||
      activeTab === 'workMethods' ||
      activeTab === 'commonDailyActions' ||
      activeTab === 'bodyBuildingTechniques');

  /** Same gate as `handleEdit` `useDbTranslations` — admin + translated tools from DB. */
  const useDbBackedTranslationMaps =
    isAdmin &&
    (activeTab === 'periods' ||
      activeTab === 'sections' ||
      activeTab === 'workMethods' ||
      activeTab === 'commonDailyActions' ||
      activeTab === 'bodyBuildingTechniques');

  /**
   * English row text for list cards — must match how `handleEdit` fills the EN block:
   * - Admin + DB-backed tabs: use `titleByLanguage.en` when set, else primary `item.title`.
   * - Otherwise: primary `item.title` first (same as non-admin EN field), else `titleByLanguage.en`.
   */
  const primaryEnglishTitle = (item: any): string => {
    if (useDbBackedTranslationMaps) {
      const fromMap = toolsTranslationFromMap(item.titleByLanguage, 'en');
      if (fromMap) return fromMap;
      return ((item.title || '') as string).trim();
    }
    const primary = ((item.title || '') as string).trim();
    if (primary) return primary;
    return toolsTranslationFromMap(item.titleByLanguage, 'en');
  };

  const primaryEnglishDescription = (item: any): string => {
    if (useDbBackedTranslationMaps) {
      const fromMap = toolsTranslationFromMap(item.descriptionByLanguage, 'en');
      if (fromMap) return fromMap;
      return ((item.description || '') as string).trim();
    }
    const primary = ((item.description || '') as string).trim();
    if (primary) return primary;
    return toolsTranslationFromMap(item.descriptionByLanguage, 'en');
  };

  const getDisplayTitle = (item: any): { text: string; isRed: boolean } => {
    const lang = normalizeToolsLanguage(selectedLanguage);
    const englishTitle = primaryEnglishTitle(item);

    if (useTranslatedEntityCards) {
      if (lang === 'en') {
        return { text: englishTitle || 'Untitled', isRed: false };
      }
      const t = toolsTranslationFromMap(item.titleByLanguage, lang);
      const d = toolsTranslationFromMap(item.descriptionByLanguage, lang);
      const enPrimaryT = ((item.title || '') as string).trim();
      const enPrimaryD = ((item.description || '') as string).trim();
      const isPhantomStoredCopy =
        t !== '' && t === enPrimaryT && d === enPrimaryD;

      if (t && !isPhantomStoredCopy) {
        return { text: t, isRed: false };
      }
      return { text: englishTitle || 'Untitled', isRed: !!englishTitle };
    }

    const title = ((item.title || '') as string).trim();
    return { text: title || 'Untitled', isRed: false };
  };

  const getDisplayDescription = (item: any): { text: string; isRed: boolean } => {
    const lang = normalizeToolsLanguage(selectedLanguage);
    const englishDesc = primaryEnglishDescription(item);

    if (useTranslatedEntityCards) {
      if (lang === 'en') {
        return { text: englishDesc, isRed: false };
      }
      const d = toolsTranslationFromMap(item.descriptionByLanguage, lang);
      const t = toolsTranslationFromMap(item.titleByLanguage, lang);
      const enPrimaryT = ((item.title || '') as string).trim();
      const enPrimaryD = ((item.description || '') as string).trim();
      const isPhantomStoredCopy =
        t !== '' && t === enPrimaryT && d === enPrimaryD;

      if (d && !isPhantomStoredCopy) {
        return { text: d, isRed: false };
      }
      return { text: englishDesc, isRed: !!englishDesc };
    }

    return { text: item.description || '', isRed: false };
  };

  // Sports-specific handlers
  const handleSportDragStart = (id: string) => {
    console.log('🎯 Drag start:', id);
    setDraggedSport(id);
  };

  const handleSportDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverSport(id);
  };

  const handleSportDragEnd = () => {
    console.log('✅ Sport drag ended');
    setDraggedSport(null);
    setDragOverSport(null);
  };

  // Use DEFAULT_SPORTS as fallback if sports array is empty
  const activeSports = (sports && sports.length > 0) ? sports : DEFAULT_SPORTS;

  const handleSportDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!draggedSport || draggedSport === targetId) {
      setDraggedSport(null);
      setDragOverSport(null);
      return;
    }

    console.log('📦 Dropping sport:', draggedSport, 'onto:', targetId);

    // IMPORTANT: Work with the actual sports state, not activeSports
    // If sports is empty, we need to first initialize it with DEFAULT_SPORTS
    const sportsToUse = (sports && sports.length > 0) ? sports : DEFAULT_SPORTS;
    console.log('🔍 Using sports array:', sportsToUse.length, 'sports');
    
    const draggedIndex = sportsToUse.findIndex(sport => sport.id === draggedSport);
    const targetIndex = sportsToUse.findIndex(sport => sport.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) {
      console.error('❌ Sport not found in array. Dragged:', draggedSport, 'Target:', targetId);
      console.error('Available sport IDs:', sportsToUse.map(s => s.id));
      setDraggedSport(null);
      setDragOverSport(null);
      return;
    }

    const newSports = [...sportsToUse];
    const [removed] = newSports.splice(draggedIndex, 1);
    newSports.splice(targetIndex, 0, removed);

    // Update top5 status and order based on new positions
    const updated = newSports.map((sport, index) => ({
      ...sport,
      order: index,
      isTop5: index < 5
    }));

    console.log('💾 Updating sports order:', updated.map(s => s.name));
    console.log('✅ Setting sports state - this should trigger auto-save');
    setSports(updated);
    setDraggedSport(null);
    setDragOverSport(null);
  };
  const top5Sports = activeSports.filter(s => s.isTop5).sort((a, b) => a.order - b.order);
  const otherSports = activeSports.filter(s => !s.isTop5).sort((a, b) => a.order - b.order);

  // Handle icon type change
  const handleIconTypeChange = async (newType: IconType) => {
    setIconType(newType);
    
    // Save to user settings
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      await fetch('/api/user/settings', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sportIconType: newType })
      });
    } catch (error) {
      console.error('Error saving icon type preference:', error);
    }
  };

  // Map sport names to icon filenames
  const getSportIconFilename = (sportName: string): string => {
    const iconMap: Record<string, string> = {
      'Swimming': 'swimming.jpg',
      'Running': 'running.jpg',
      'Cycling': 'cycling.jpg',
      'Weightlifting': 'weights.jpg',
      'Football/Soccer': 'Technical/soccer.jpg',
      'Basketball': 'Technical/basketball.jpg',
      'Tennis': 'Technical/tennis.jpg',
      'Volleyball': 'volley.jpg',
      'Boxing': 'boxe.jpg',
      'Martial Arts': 'Technical/martial_arts.jpg',
      'Rowing': 'rowing.jpg',
      'Yoga': 'yoga.jpg',
      'Gymnastics': 'gymnastics.jpg',
      'Skiing': 'skiing.jpg',
      'Surfing': 'surfing.jpg',
      'Golf': 'golf.jpg',
      'Baseball': 'Technical/baseball.jpg',
      'Ice Hockey': 'ice_hockey.jpg',
      'Rugby': 'Technical/rugby.jpg',
      'Climbing': 'climbing.jpg',
    };
    return iconMap[sportName] || 'running.jpg';
  };

  // Render sport icon based on type
  const renderSportIcon = (sport: Sport) => {
    if (iconType === 'emoji') {
      return <div className="w-8 h-8 flex items-center justify-center text-2xl flex-shrink-0">{sport.icon}</div>;
    } else {
      return (
        <Image 
          src={`/icons/${getSportIconFilename(sport.name)}`} 
          alt={sport.name}
          width={32}
          height={32}
          className="w-8 h-8 object-cover rounded flex-shrink-0"
        />
      );
    }
  };

  const showLanguageDefaultsToolbarInMainTools =
    !periodizationOnly &&
    ((useEnglishFallbackRules &&
      (activeTab === 'periods' ||
        activeTab === 'sections' ||
        activeTab === 'workMethods' ||
        activeTab === 'commonDailyActions' ||
        activeTab === 'bodyBuildingTechniques')) ||
      (isAdmin && activeTab === 'periodizationLibrary'));

  const languageDefaultsToolbar = (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-3 py-3 px-2 sm:px-4 bg-white dark:bg-gray-900/40 border border-gray-200 dark:border-gray-600 rounded-lg">
        <div className="flex flex-wrap items-center gap-3 min-w-0">
          {isAdmin ? (
            <>
              <Globe className="w-5 h-5 text-violet-600 dark:text-violet-400 shrink-0" aria-hidden />
              <span className="text-sm font-semibold text-gray-800 dark:text-gray-100 whitespace-nowrap">
                Language Defaults:
              </span>
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                disabled={!isAdmin}
                className="px-3 py-2 text-sm font-medium border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500 min-w-[10.5rem] disabled:opacity-70 disabled:cursor-not-allowed"
                aria-label="Language defaults — updates card labels for periods, sections, and related lists"
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name}
                  </option>
                ))}
              </select>
            </>
          ) : (
            <p className="text-sm text-gray-700 dark:text-gray-200 m-0 leading-snug">
              <span className="font-semibold text-gray-900 dark:text-white">Profile language:</span>{' '}
              {profileLanguageLabel}{' '}
              <span className="text-gray-500 dark:text-gray-400">
                ({normalizeToolsLanguage(selectedLanguage).toUpperCase()})
              </span>
              <span className="text-gray-600 dark:text-gray-400">
                {' '}
                — Load from Movesbook copies Super Admin defaults only in this language.
              </span>
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 shrink-0">
          {isAdmin && (
            <button
              type="button"
              onClick={() => void saveLanguageDefaults()}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg border-2 border-orange-500 text-orange-600 dark:text-orange-400 bg-white dark:bg-gray-800 hover:bg-orange-50 dark:hover:bg-gray-700 transition shadow-sm"
              title="Save current tools as Movesbook defaults for the selected language"
            >
              <Save className="w-4 h-4" />
              Save defaults
            </button>
          )}
          <button
            type="button"
            onClick={() => void handleLoadAdminDefaults()}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg text-white bg-violet-600 hover:bg-violet-700 shadow-md transition"
            title={
              isAdmin
                ? 'Load Movesbook defaults for the selected language (merges with your current list)'
                : 'Load Super Admin Movesbook defaults for your profile language (merges with your current list)'
            }
          >
            <Download className="w-4 h-4" />
            {isAdmin ? 'Load' : 'Load from Movesbook'}
          </button>
        </div>
      </div>
      {isAdmin &&
        ((useEnglishFallbackRules &&
          (activeTab === 'periods' ||
            activeTab === 'sections' ||
            activeTab === 'workMethods' ||
            activeTab === 'commonDailyActions' ||
            activeTab === 'bodyBuildingTechniques')) ||
          activeTab === 'periodizationLibrary') && (
          <p className="text-xs text-gray-600 dark:text-gray-400 px-1 sm:px-2 leading-relaxed max-w-4xl">
            {activeTab === 'periodizationLibrary' ? (
              <>
                Presets below are stored in Movesbook defaults for the language you select above. Use{' '}
                <span className="font-medium text-gray-700 dark:text-gray-300">Save defaults</span> after editing.
                Athletes merge them with <span className="font-medium text-gray-700 dark:text-gray-300">Load from Movesbook</span>{' '}
                (Tools or Favourites); templates they add themselves are kept on merge.
              </>
            ) : (
              <>
                Choosing a language updates the cards below immediately: each title and description matches what you would
                see in the edit dialog for that language (saved translation in normal text; English reference in red when that
                language is still empty). <span className="font-medium text-gray-700 dark:text-gray-300">Load</span> is only
                for merging Movesbook defaults from the server — it does not switch preview language by itself.
              </>
            )}
          </p>
        )}
    </div>
  );

  return (
    <div className="space-y-6">
      {periodizationOnly && (
        <div className="flex gap-1 sm:gap-2 border-b border-gray-200 dark:border-gray-600 overflow-x-auto pb-0">
          {(['periodSettings', 'periodization', 'overview'] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setPeriodizationSubview(key)}
              className={`px-4 sm:px-6 py-3 font-semibold transition whitespace-nowrap ${
                periodizationSubview === key
                  ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              {key === 'periodSettings' && t('settings_periodization_tab_period_settings')}
              {key === 'periodization' && t('settings_periodization_tab_periodization')}
              {key === 'overview' && t('settings_periodization_tab_overview')}
            </button>
          ))}
        </div>
      )}

      {periodizationOnly && periodizationSubview === 'periodSettings' && (
        <div className="mt-2">{languageDefaultsToolbar}</div>
      )}

      {/* Header (Tools / Technical only — Periodization uses sidebar title + sub-tabs) */}
      {!periodizationOnly && (
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
            {mode === 'technical' ? 'Technical Settings' : 'Tools Settings'}
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            {mode === 'technical'
              ? 'Manage factories, muscles, equipment, exercises, libraries, and devices'
              : 'Manage your workout periods, sections, sports, and equipment'}
          </p>
        </div>
      )}

      {/* Tabs */}
      {allowedTabs.length > 1 && (
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-600">
        {allowedTabs.includes('periods') && (
          <button
            onClick={() => setActiveTab('periods')}
            className={`px-6 py-3 font-semibold transition ${
              activeTab === 'periods'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Periods
          </button>
        )}
        {allowedTabs.includes('periodizationPlan') && (
          <button
            type="button"
            onClick={() => setActiveTab('periodizationPlan')}
            className={`px-6 py-3 font-semibold transition ${
              activeTab === 'periodizationPlan'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {t('settings_periodization')}
          </button>
        )}
        {allowedTabs.includes('periodizationLibrary') && (
          <button
            type="button"
            onClick={() => setActiveTab('periodizationLibrary')}
            className={`px-6 py-3 font-semibold transition ${
              activeTab === 'periodizationLibrary'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Layers className="w-4 h-4 inline mr-2" />
            Periodization library ({periodizationTemplates.length})
          </button>
        )}
        {allowedTabs.includes('sections') && (
          <button
            onClick={() => setActiveTab('sections')}
            className={`px-6 py-3 font-semibold transition ${
              activeTab === 'sections'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Workout Sections
          </button>
        )}
        {allowedTabs.includes('workMethods') && (
          <button
            type="button"
            onClick={() => setActiveTab('workMethods')}
            className={`px-6 py-3 font-semibold transition ${
              activeTab === 'workMethods'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Work Methods
          </button>
        )}
        {allowedTabs.includes('bodyBuildingTechniques') && (
          <button
            onClick={() => setActiveTab('bodyBuildingTechniques')}
            className={`px-6 py-3 font-semibold transition ${
              activeTab === 'bodyBuildingTechniques'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Execution Techniques
          </button>
        )}
        {allowedTabs.includes('commonDailyActions') && (
          <button
            onClick={() => setActiveTab('commonDailyActions')}
            className={`px-6 py-3 font-semibold transition ${
              activeTab === 'commonDailyActions'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {isAdmin ? 'Common daily actions' : 'Daily actions'}
          </button>
        )}
        {allowedTabs.includes('equipment') && (
          <button
            onClick={() => setActiveTab('equipment')}
            className={`px-6 py-3 font-semibold transition ${
              activeTab === 'equipment'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Personal Equipment
          </button>
        )}
        {allowedTabs.includes('equipmentFactories') && (
          <button
            onClick={() => setActiveTab('equipmentFactories')}
            className={`px-6 py-3 font-semibold transition ${
              activeTab === 'equipmentFactories'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Sports Equipment Factories
          </button>
        )}
        {allowedTabs.includes('muscles') && (
          <button
            onClick={() => setActiveTab('muscles')}
            className={`px-6 py-3 font-semibold transition ${
              activeTab === 'muscles'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Muscles Settings
          </button>
        )}
        {allowedTabs.includes('sportsEquipment') && (
          <button
            onClick={() => setActiveTab('sportsEquipment')}
            className={`px-6 py-3 font-semibold transition ${
              activeTab === 'sportsEquipment'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Sports Equipment
          </button>
        )}
        {allowedTabs.includes('sportMachines') && (
          <button
            onClick={() => setActiveTab('sportMachines')}
            className={`px-6 py-3 font-semibold transition ${
              activeTab === 'sportMachines'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Machines
          </button>
        )}
        {allowedTabs.includes('pathologies') && (
          <button
            onClick={() => setActiveTab('pathologies')}
            className={`px-6 py-3 font-semibold transition ${
              activeTab === 'pathologies'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Pathologies
          </button>
        )}
        {allowedTabs.includes('exercises') && (
          <button
            onClick={() => setActiveTab('exercises')}
            className={`px-6 py-3 font-semibold transition ${
              activeTab === 'exercises'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Exercise Bank
          </button>
        )}
        {allowedTabs.includes('myLibrary') && (
          <button
            onClick={() => setActiveTab('myLibrary')}
            className={`px-6 py-3 font-semibold transition ${
              activeTab === 'myLibrary'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <span className="flex flex-col items-center leading-tight">
              <span>My Library of Exercises</span>
            </span>
          </button>
        )}
        {allowedTabs.includes('devices') && (
          <button
            onClick={() => setActiveTab('devices')}
            className={`px-6 py-3 font-semibold transition ${
              activeTab === 'devices'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <span className="flex flex-col items-center leading-tight">
              <span>Device Enabled</span>
            </span>
          </button>
        )}
      </div>
      )}

      {/* Language defaults + load (main Tools — translated lists only; other tabs keep a compact language picker) */}
      {!periodizationOnly && (
        <div className="grid grid-cols-1 gap-3">
          {/* Instructions Banner - HIDDEN (code preserved for future use) */}
          <div className="hidden bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-4">
            <h4 className="font-semibold text-indigo-900 mb-2 flex items-center gap-2">
              <Globe className="w-5 h-5" />
              {isAdmin ? 'Multi-Language Settings Workflow (Admin)' : 'Personal Settings Workflow'}
            </h4>
            {isAdmin ? (
              <>
                <ol className="text-sm text-indigo-800 space-y-1 ml-6 list-decimal">
                  <li><strong>Select Language:</strong> Choose display language — labels update; missing translations show English in red</li>
                  <li><strong>Add/Edit:</strong> Fill English (required) and any other languages; blanks use English as fallback</li>
                  <li><strong>Required:</strong> ⚠️ <span className="font-bold text-red-600">English</span> title is mandatory</li>
                  <li><strong>Missing translations:</strong> In the selected display language, missing text shows the English value in <span className="font-bold text-red-600">RED</span></li>
                </ol>
                <p className="text-xs text-indigo-600 mt-2 italic">
                  <strong>💡 Example:</strong> Add "Special Period" with EN/FR/IT → Select RU → Item appears in RED (needs Russian translation)
                </p>
              </>
            ) : (
              <>
                <ol className="text-sm text-indigo-800 space-y-1 ml-6 list-decimal">
                  <li><strong>Select Language:</strong> Choose display language — labels update from your saved settings</li>
                  <li><strong>Load Defaults:</strong> Click "Load Admin Defaults" to get Movesbook's settings in your language</li>
                  <li><strong>Add/Edit:</strong> Create or edit items in your language - they're automatically saved</li>
                  <li><strong>Your Items:</strong> Items you create manually are preserved when loading admin defaults</li>
                </ol>
                <p className="text-xs text-indigo-600 mt-2 italic">
                  <strong>💡 Tip:</strong> All settings are automatically available in your workout panels - no save button needed!
                </p>
              </>
            )}
            <p className="text-xs text-purple-600 mt-2 font-semibold">
              This applies to: Periods, Sections, {isAdmin ? 'Sports, ' : ''}Equipment, Exercises, Library, Devices
            </p>
          </div>

          {showLanguageDefaultsToolbarInMainTools ? (
            languageDefaultsToolbar
          ) : isAdmin ? (
            <div className="flex flex-wrap items-center gap-3 p-3 bg-white dark:bg-gray-900/40 border border-gray-200 dark:border-gray-600 rounded-lg">
              <Globe className="w-5 h-5 text-indigo-500 shrink-0" aria-hidden />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Display language</span>
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="px-3 py-2 text-sm font-medium border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 min-w-[10.5rem]"
                aria-label="Display language"
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name} ({lang.code.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-3 p-3 bg-white dark:bg-gray-900/40 border border-gray-200 dark:border-gray-600 rounded-lg">
              <span className="text-sm text-gray-700 dark:text-gray-200">
                <span className="font-medium text-gray-900 dark:text-white">Profile language:</span>{' '}
                {profileLanguageLabel}{' '}
                <span className="text-gray-500">({normalizeToolsLanguage(selectedLanguage).toUpperCase()})</span>
              </span>
            </div>
          )}
        </div>
      )}

      {periodizationOnly && periodizationSubview === 'periodization' && (
        <PeriodizationTabPanel
          periods={periods}
          onPeriodizationTemplatesChanged={() => void loadToolsSettingsFromDatabase()}
        />
      )}

      {periodizationOnly && periodizationSubview === 'overview' && (
        <PeriodizationOverviewPanel periods={periods} />
      )}

      {!periodizationOnly && activeTab === 'periodizationPlan' && (
        <div className="space-y-4 mt-2">
          <p className="text-sm text-gray-600 dark:text-gray-400 px-1 max-w-4xl leading-relaxed">
            {t('settings_periodization_panel_help')}
          </p>
          <div className="flex gap-1 sm:gap-2 border-b border-gray-200 dark:border-gray-600 overflow-x-auto pb-0">
            {(['periodization', 'overview'] as const).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setPeriodizationSubview(key)}
                className={`px-4 sm:px-6 py-3 font-semibold transition whitespace-nowrap ${
                  periodizationSubview === key
                    ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                {key === 'periodization' && t('settings_periodization_tab_periodization')}
                {key === 'overview' && t('settings_periodization_tab_overview')}
              </button>
            ))}
          </div>
          {periodizationSubview === 'periodization' && (
            <PeriodizationTabPanel
              periods={periods}
              onPeriodizationTemplatesChanged={() => void loadToolsSettingsFromDatabase()}
            />
          )}
          {periodizationSubview === 'overview' && <PeriodizationOverviewPanel periods={periods} />}
        </div>
      )}

      {!periodizationOnly && activeTab === 'periodizationLibrary' && (
        <div className="space-y-4 mt-2">
          <p className="text-sm text-gray-600 dark:text-gray-400 px-1 max-w-3xl leading-relaxed">
            Create named periodization presets for Movesbook (name, sport, level, tags). Save defaults stores them for
            the selected language. Users see the same cards under Favourites → Periodizations after they load Movesbook
            defaults.
          </p>
          <div className="flex flex-wrap justify-between items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setEditingPeriodizationTemplate({
                  id: '',
                  name: '',
                  sport: '',
                  level: '',
                  tags: [],
                });
                setPeriodizationTagsInput('');
                setShowPeriodizationTemplateDialog(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              <Plus className="w-4 h-4" />
              Add periodization
            </button>
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <select
                value={periodizationLibTagFilter}
                onChange={(e) => setPeriodizationLibTagFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Tags</option>
                {periodizationLibAllTags.map((tag) => (
                  <option key={tag} value={tag}>
                    {tag}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPeriodizationTemplates.map((tpl) => (
              <div
                key={tpl.id}
                className="bg-white dark:bg-gray-900 rounded-xl border-2 border-gray-200 dark:border-gray-600 p-6 hover:border-blue-300 hover:shadow-lg transition"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2 min-w-0">
                    <Star className="w-5 h-5 text-yellow-500 fill-yellow-500 shrink-0" />
                    <h3 className="font-bold text-gray-900 dark:text-white truncate">{tpl.name}</h3>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingPeriodizationTemplate({ ...tpl });
                        setPeriodizationTagsInput((tpl.tags || []).join(', '));
                        setShowPeriodizationTemplateDialog(true);
                      }}
                      className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm('Delete this periodization preset?')) {
                          setPeriodizationTemplates((prev) => prev.filter((p) => p.id !== tpl.id));
                        }
                      }}
                      className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm gap-2">
                    <span className="text-gray-500 shrink-0">Sport</span>
                    <span className="font-semibold text-gray-900 dark:text-white text-right">{tpl.sport || '—'}</span>
                  </div>
                  <div className="flex justify-between text-sm gap-2">
                    <span className="text-gray-500 shrink-0">Level</span>
                    <span className="font-semibold text-gray-900 dark:text-white text-right">{tpl.level || '—'}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  {(tpl.tags || []).map((tag) => (
                    <span
                      key={`${tpl.id}-${tag}`}
                      className="px-2 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-200 text-xs font-semibold rounded"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('periodizationPlan');
                      setPeriodizationSubview('periodization');
                    }}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition"
                  >
                    Use in periodization
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPeriodizationTemplates((prev) => [
                        ...prev,
                        {
                          ...tpl,
                          id: `pt-${Date.now()}`,
                          name: `${tpl.name} (copy)`,
                        },
                      ]);
                    }}
                    className="px-4 py-2 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 text-sm font-semibold rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                    title="Duplicate"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      window.alert(
                        `${tpl.name}\n\nSport: ${tpl.sport}\nLevel: ${tpl.level}\nTags: ${(tpl.tags || []).join(', ') || '—'}`
                      );
                    }}
                    className="px-4 py-2 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 text-sm font-semibold rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                    title="View"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          {filteredPeriodizationTemplates.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400 py-6 text-center">
              No periodization presets match your search. Use Add periodization to create one.
            </p>
          )}
        </div>
      )}

      {/* Periods, Sections & Execution Techniques Tab Content */}
      {((!periodizationOnly &&
        (activeTab === 'periods' ||
          activeTab === 'sections' ||
          activeTab === 'workMethods' ||
          activeTab === 'commonDailyActions' ||
          activeTab === 'bodyBuildingTechniques')) ||
        (periodizationOnly && periodizationSubview === 'periodSettings')) && (
        <div className="space-y-6">
          {activeTab === 'commonDailyActions' && !isAdmin && (
            <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
              <p className="text-sm text-indigo-900">
                Add your own daily actions in <span className="font-semibold">your profile language</span> only.
                Items from Movesbook stay read-only unless you create your own copy.
              </p>
            </div>
          )}

          {/* Action Bar */}
          <div className="flex justify-between items-center">
            <div className="flex gap-3">
              <button
                onClick={() => {
                  if (isAdmin && useEnglishFallbackRules) setActiveInputLanguage('en');
                  setShowAddDialog(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                <Plus className="w-4 h-4" />
                Add New
              </button>
              <button
                onClick={handleSortAZ}
                className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
              >
                <ArrowUpAZ className="w-4 h-4" />
                A-Z
              </button>
              <button
                onClick={handleSortZA}
                className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
              >
                <ArrowDownZA className="w-4 h-4" />
                Z-A
              </button>
              <button
                type="button"
                onClick={handleRestoreMySorting}
                className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                title="Restore your manual drag order (undo A-Z / Z-A)"
              >
                <ListOrdered className="w-4 h-4" />
                My sorting
              </button>
            </div>
            <div className="text-sm text-gray-600">
              Drag to reorder • {getActiveItems().length} items
            </div>
          </div>

          {/* Items Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {getActiveItems().map((item) => (
              <div
                key={item.id}
                onDragOver={(e) => handleDragOver(e, item.id)}
                onDrop={handleDrop}
                className={`bg-white rounded-xl border-2 p-4 transition ${
                  draggedItem !== null && String(draggedItem) === String(item.id)
                    ? 'opacity-50 border-blue-500'
                    : currentUserId && item.userId && item.userId !== currentUserId
                      ? 'border-gray-300 bg-gray-50'
                      : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    draggable
                    role="button"
                    tabIndex={0}
                    aria-label="Drag to reorder"
                    title="Drag to reorder"
                    onDragStart={(e) => {
                      e.stopPropagation();
                      handleDragStart(item.id);
                    }}
                    onDragEnd={(e) => {
                      e.stopPropagation();
                      handleDragEnd();
                    }}
                    className="cursor-grab active:cursor-grabbing touch-none flex-shrink-0 p-1 -m-1 rounded hover:bg-gray-100 mt-0.5"
                  >
                    <GripVertical className="w-5 h-5 text-gray-400" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    {activeTab === 'commonDailyActions' && (item as any).picture && (
                      <div className="mb-2">
                        <Image
                          src={(item as any).picture}
                          alt={item.title}
                          width={48}
                          height={48}
                          className="w-12 h-12 object-cover rounded border border-gray-200"
                          unoptimized
                        />
                      </div>
                    )}
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className="w-4 h-4 rounded-full flex-shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <h3
                        className={`font-semibold truncate ${
                          getDisplayTitle(item).isRed
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-gray-900 dark:text-gray-100'
                        }`}
                      >
                        {getDisplayTitle(item).text}
                      </h3>
                      {currentUserId && item.userId && item.userId !== currentUserId && (
                        <span className="text-xs px-2 py-0.5 bg-gray-200 text-gray-600 rounded-full flex-shrink-0">
                          Read-only
                        </span>
                      )}
                    </div>
                    <p
                      className={`text-sm line-clamp-2 ${
                        getDisplayDescription(item).isRed
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      {getDisplayDescription(item).text}
                    </p>
                  </div>

                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleEdit(item);
                      }}
                      disabled={!!(currentUserId && item.userId && item.userId !== currentUserId)}
                      className={`p-2 rounded-lg transition ${
                        currentUserId && item.userId && item.userId !== currentUserId
                          ? 'text-gray-300 cursor-not-allowed'
                          : 'text-blue-600 hover:bg-blue-50'
                      }`}
                      title={currentUserId && item.userId && item.userId !== currentUserId ? 'Cannot edit - not created by you' : 'Edit'}
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDelete(item.id);
                      }}
                      disabled={!!(currentUserId && item.userId && item.userId !== currentUserId)}
                      className={`p-2 rounded-lg transition ${
                        currentUserId && item.userId && item.userId !== currentUserId
                          ? 'text-gray-300 cursor-not-allowed'
                          : 'text-red-600 hover:bg-red-50'
                      }`}
                      title={currentUserId && item.userId && item.userId !== currentUserId ? 'Cannot delete - not created by you' : 'Delete'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {getActiveItems().length === 0 && (
            <div className="text-center py-12 bg-gray-50 rounded-xl">
              <p className="text-gray-600 mb-4">No items yet. Click "Add New" to get started!</p>
            </div>
          )}

          {activeTab === 'commonDailyActions' && isAdmin && (
            <div className="mt-10 pt-8 border-t-2 border-gray-200 space-y-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Planned action types</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Colors and icons for action types on the yearly / done plan. This is separate from the common daily
                  action cards above.
                </p>
              </div>
              <PlannedActionTemplatesEditor />
            </div>
          )}
        </div>
      )}

      {/* Personal Equipment Tab */}
      {activeTab === 'equipment' && (
        <div className="space-y-6">
          {/* Action Bar */}
          <div className="flex justify-between items-center">
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setEditingEquipment({ 
                    id: '', 
                    name: '', 
                    picture: '',
                    category: '', 
                    sports: [],
                    company: '',
                    description: '', 
                    inStock: true,
                    startDate: '',
                    durationAlarm: { days: undefined, km: undefined, time: '' }
                  });
                  setShowEquipmentDialog(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                <Plus className="w-4 h-4" />
                Add Equipment
              </button>
              
              {/* View Toggle */}
              <div className="flex border border-gray-300 rounded-lg overflow-hidden">
                <button
                  onClick={() => setEquipmentViewMode('cards')}
                  className={`px-3 py-2 flex items-center gap-2 transition ${
                    equipmentViewMode === 'cards'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                  title="Card View"
                >
                  <Grid3x3 className="w-4 h-4" />
                  Cards
                </button>
                <button
                  onClick={() => setEquipmentViewMode('table')}
                  className={`px-3 py-2 flex items-center gap-2 transition border-l border-gray-300 ${
                    equipmentViewMode === 'table'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                  title="Table View"
                >
                  <List className="w-4 h-4" />
                  Table
                </button>
              </div>
            </div>
            <div className="flex gap-3 items-center">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Categories</option>
                <option value="Cardio">Cardio</option>
                <option value="Weights">Weights</option>
                <option value="Accessories">Accessories</option>
                <option value="Machines">Machines</option>
                <option value="Clothes">Clothes</option>
                <option value="Shoes">Shoes</option>
                <option value="Beverages">Beverages</option>
                <option value="Sport devices">Sport devices</option>
              </select>
              <div className="text-sm text-gray-600">
                {equipment.filter(e => categoryFilter === 'all' || e.category === categoryFilter).length} items
              </div>
            </div>
          </div>

          {/* Equipment Cards View */}
          {equipmentViewMode === 'cards' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sortEquipment(equipment.filter(e => categoryFilter === 'all' || e.category === categoryFilter))
                .map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-xl border border-gray-200 p-5 hover:border-gray-300 transition"
                >
                  <div className="flex items-start gap-3 mb-3">
                    {item.picture && (
                      <Image src={item.picture} alt={item.name} width={64} height={64} className="w-16 h-16 object-cover rounded-lg border-2 border-gray-200 flex-shrink-0" unoptimized />
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900 mb-1 truncate">{item.name}</h3>
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded">
                        {item.category}
                      </span>
                      {item.company && (
                        <p className="text-xs text-gray-500 mt-1">{item.company}</p>
                      )}
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => {
                          setEditingEquipment(item);
                          setShowEquipmentDialog(true);
                        }}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Delete this equipment?')) {
                            setEquipment(equipment.filter(e => e.id !== item.id));
                          }
                        }}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  {/* Sports Tags */}
                  {item.sports && item.sports.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {item.sports.map((sportId, index) => {
                        const sport = sports.find(s => s.id === sportId);
                        return sport ? (
                          <span key={index} className="inline-flex items-center px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded">
                            {sport.icon} {sport.name}
                          </span>
                        ) : null;
                      })}
                    </div>
                  )}
                  
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{item.description}</p>
                  
                  {/* Athlete fields */}
                  {!isAdmin && item.startDate && (
                    <div className="mb-3 p-2 bg-blue-50 rounded-lg text-xs">
                      <p className="text-gray-700"><strong>Start:</strong> {new Date(item.startDate).toLocaleDateString()}</p>
                      {item.durationAlarm && (
                        <p className="text-gray-700 mt-1">
                          <strong>Alarm:</strong> 
                          {item.durationAlarm.days && ` ${item.durationAlarm.days}d`}
                          {item.durationAlarm.km && ` ${item.durationAlarm.km}km`}
                          {item.durationAlarm.time && ` ${item.durationAlarm.time}`}
                        </p>
                      )}
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-semibold ${item.inStock ? 'text-green-600' : 'text-red-600'}`}>
                      {item.inStock ? '✓ In Stock' : '✗ Out of Stock'}
                    </span>
                    <button
                      onClick={() => {
                        setEquipment(equipment.map(e => 
                          e.id === item.id ? { ...e, inStock: !e.inStock } : e
                        ));
                      }}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Toggle
                    </button>
                  </div>
                </div>
                ))}
            </div>
          )}
          
          {/* Equipment Table View */}
          {equipmentViewMode === 'table' && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th 
                      className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase cursor-pointer hover:bg-gray-100 transition"
                      onClick={() => handleEquipmentSort('name')}
                    >
                      <div className="flex items-center gap-2">
                        Name
                        {equipmentSortField === 'name' && (
                          <ArrowUpDown className="w-3 h-3" />
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase cursor-pointer hover:bg-gray-100 transition"
                      onClick={() => handleEquipmentSort('category')}
                    >
                      <div className="flex items-center gap-2">
                        Category
                        {equipmentSortField === 'category' && (
                          <ArrowUpDown className="w-3 h-3" />
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase cursor-pointer hover:bg-gray-100 transition"
                      onClick={() => handleEquipmentSort('company')}
                    >
                      <div className="flex items-center gap-2">
                        Company
                        {equipmentSortField === 'company' && (
                          <ArrowUpDown className="w-3 h-3" />
                        )}
                      </div>
                    </th>
                    {!isAdmin && (
                      <th 
                        className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase cursor-pointer hover:bg-gray-100 transition"
                        onClick={() => handleEquipmentSort('startDate')}
                      >
                        <div className="flex items-center gap-2">
                          Date Start
                          {equipmentSortField === 'startDate' && (
                            <ArrowUpDown className="w-3 h-3" />
                          )}
                        </div>
                      </th>
                    )}
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {sortEquipment(equipment.filter(e => categoryFilter === 'all' || e.category === categoryFilter))
                    .map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {item.picture && (
                              <Image src={item.picture} alt={item.name} width={40} height={40} className="w-10 h-10 object-cover rounded border border-gray-200 flex-shrink-0" unoptimized />
                            )}
                            <div>
                              <div className="font-semibold text-gray-900">{item.name}</div>
                              {item.sports && item.sports.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {item.sports.slice(0, 2).map((sportId, index) => {
                                    const sport = sports.find(s => s.id === sportId);
                                    return sport ? (
                                      <span key={index} className="text-xs">
                                        {sport.icon}
                                      </span>
                                    ) : null;
                                  })}
                                  {item.sports.length > 2 && (
                                    <span className="text-xs text-gray-500">+{item.sports.length - 2}</span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded">
                            {item.category}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-700">{item.company || '—'}</div>
                        </td>
                        {!isAdmin && (
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-700">
                              {item.startDate ? new Date(item.startDate).toLocaleDateString() : '—'}
                            </div>
                          </td>
                        )}
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => {
                                setEditingEquipment(item);
                                setShowEquipmentDialog(true);
                              }}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm('Delete this equipment?')) {
                                  setEquipment(equipment.filter(e => e.id !== item.id));
                                }
                              }}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                              title="Delete"
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

          {equipment.filter(e => categoryFilter === 'all' || e.category === categoryFilter).length === 0 && (
            <div className="text-center py-12 bg-gray-50 rounded-xl">
              <p className="text-gray-600">No equipment found. Click "Add Equipment" to get started!</p>
            </div>
          )}
        </div>
      )}

      {/* Sports Equipment Factories Tab — machine manufacturer catalog (Super Admin / Admin panel) */}
      {activeTab === 'equipmentFactories' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/40 dark:to-pink-950/30 rounded-xl border border-purple-200 dark:border-purple-800 p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
              <span className="text-2xl">🏭</span>
              Equipment factories
            </h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm">
              Register brands that build gym and sport machines. This catalog feeds the{' '}
              <span className="font-semibold text-purple-600 dark:text-purple-400">Machines</span> section.
              Editing is limited to{' '}
              <span className="font-semibold text-purple-600 dark:text-purple-400">
                Super Admin or Admin panel (ADMIN user)
              </span>
              .
            </p>
          </div>

          {equipmentFactoriesMessage && (
            <div
              className={`flex items-center gap-2 p-4 rounded-lg ${
                equipmentFactoriesMessage.type === 'success'
                  ? 'bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-200'
                  : 'bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
              }`}
            >
              {equipmentFactoriesMessage.type === 'success' ? (
                <CheckCircle className="w-5 h-5 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 shrink-0" />
              )}
              <span className="text-sm font-medium">{equipmentFactoriesMessage.text}</span>
            </div>
          )}

          {canManageMachineCompanies ? (
            <SuperAdminCompaniesSection onNotify={setEquipmentFactoriesMessage} />
          ) : (
            <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-8 text-center space-y-4">
              <Building2 className="w-12 h-12 text-amber-700 dark:text-amber-500 mx-auto" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Companies (machine manufacturers)</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 max-w-lg mx-auto">
                  Sign in with the <strong>admin panel</strong> (red admin bar) as an ADMIN user, or log in as{' '}
                  <strong>Super Admin</strong> under{' '}
                  <span className="whitespace-nowrap">Admin Management</span>. Then return here or refresh the page.
                </p>
              </div>
              <a
                href="/settings/admin-management"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
              >
                <LogIn className="w-4 h-4" />
                Open Admin Management
              </a>
            </div>
          )}
        </div>
      )}

      {/* Muscles Settings Tab */}
      {activeTab === 'muscles' && (
        <div className="space-y-6">
          {/* Info Banner */}
          <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-xl border border-red-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <span className="text-2xl">💪</span>
              Muscles Settings
            </h3>
            <p className="text-gray-600 text-sm">
              Configure muscle groups, anatomical references, and training targets. Admin only section.
            </p>
          </div>

          {/* Placeholder Content */}
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <div className="text-6xl mb-4">💪</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Muscles Settings</h3>
            <p className="text-gray-600 mb-4">
              Define muscle groups, add anatomical descriptions, and set training parameters.
            </p>
            <button className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-semibold">
              <Plus className="w-4 h-4 inline-block mr-2" />
              Add Muscle Group
            </button>
          </div>
        </div>
      )}

      {/* Sports Equipment Tab */}
      {activeTab === 'sportsEquipment' && (
        <div className="space-y-6">
          {/* Info Banner */}
          <div className="bg-gradient-to-r from-cyan-50 to-blue-50 rounded-xl border border-cyan-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <span className="text-2xl">⚽</span>
              Sports Equipment
            </h3>
            <p className="text-gray-600 text-sm">
              Manage all types of sports equipment and gear. This section is available for{' '}
              <span className="font-semibold text-cyan-600">all users</span>.
            </p>
          </div>

          {/* Placeholder Content */}
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <div className="text-6xl mb-4">⚽</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Sports Equipment</h3>
            <p className="text-gray-600 mb-4">
              Add sports-specific equipment, accessories, and gear for your training sessions.
            </p>
            <button className="px-6 py-3 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition font-semibold">
              <Plus className="w-4 h-4 inline-block mr-2" />
              Add Equipment
            </button>
          </div>
        </div>
      )}

      {activeTab === 'sportMachines' && <SportMachinesSection />}

      {activeTab === 'pathologies' && (
        <ExercisePathologiesCatalogSection
          pathologies={exercisePathologyCatalog}
          setPathologies={setExercisePathologyCatalog}
        />
      )}

      {/* Exercises Tab — Label 1 grid + filters; labels 2–6 + FAQs in detail panel / quick view */}
      {activeTab === 'exercises' && (
        <ExerciseBankTab
          exercises={exercises}
          setExercises={setExercises}
          sports={sports}
          pathologyCatalog={exercisePathologyCatalog}
          onAddExercise={() => {
            setEditingExercise(createDefaultExercise());
            setShowExerciseDialog(true);
          }}
          onEditExercise={(ex) => {
            setEditingExercise(mergeExerciseWithDefaults(ex));
            setShowExerciseDialog(true);
          }}
        />
      )}

      {/* My Library of Exercises Tab */}
      {activeTab === 'myLibrary' && (
        <div className="space-y-6">
          {/* Info Banner */}
          <div className="bg-gradient-to-r from-green-50 to-teal-50 rounded-xl border border-green-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <span className="text-2xl">📚</span>
              My Library of Exercises
            </h3>
            <p className="text-gray-600 text-sm">
              Your personal collection of custom exercises and workout routines. This section is available for{' '}
              <span className="font-semibold text-green-600">all users</span>.
            </p>
          </div>

          {/* Placeholder Content */}
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <div className="text-6xl mb-4">📚</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">My Library of Exercises</h3>
            <p className="text-gray-600 mb-4">
              Create and save your own custom exercises, workout templates, and training programs.
            </p>
            <button className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold">
              <Plus className="w-4 h-4 inline-block mr-2" />
              Add Custom Exercise
            </button>
          </div>
        </div>
      )}

      {/* Device Enabled Tab */}
      {activeTab === 'devices' && (
        <div className="space-y-6">
          {/* Info Banner */}
          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border border-purple-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <span className="text-2xl">📱</span>
              Device Management - Super Admin Only
            </h3>
            <p className="text-gray-600 text-sm mb-3">
              Add new devices and their descriptions that will be shown to users when they select their Services.
            </p>
            <div className="bg-white rounded-lg p-3 border border-purple-100">
              <p className="text-xs text-gray-500">
                <strong className="text-purple-700">Note:</strong> Device communication protocols will be synced and linked to official reading protocols in future updates. 
                Users will be able to configure their personal device settings after login.
              </p>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex justify-between items-center">
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setEditingDevice({ 
                    id: '', 
                    name: '', 
                    brand: '',
                    model: '',
                    codekey: '',
                    type: 'Watch',
                    compatibility: [],
                    isEnabled: true,
                    syncProtocol: '',
                    description: ''
                  });
                  setShowDeviceDialog(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
              >
                <Plus className="w-4 h-4" />
                Add Device
              </button>
            </div>
            <div className="flex gap-3 items-center">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="all">All Device Types</option>
                <option value="Watch">Smart Watches</option>
                <option value="Tracker">Fitness Trackers</option>
                <option value="Monitor">Heart Rate Monitors</option>
                <option value="Scale">Smart Scales</option>
                <option value="Sensor">Sensors</option>
                <option value="Other">Other Devices</option>
              </select>
              <div className="text-sm text-gray-600">
                {devices.filter(d => categoryFilter === 'all' || d.type === categoryFilter).length} devices
              </div>
            </div>
          </div>

          {/* Devices Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {devices
              .filter(d => categoryFilter === 'all' || d.type === categoryFilter)
              .map((device) => (
                <div
                  key={device.id}
                  className={`bg-white rounded-xl border-2 p-5 transition ${
                    device.isEnabled ? 'border-green-200 bg-green-50/30' : 'border-gray-200 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-gray-900">{device.name}</h3>
                        <span className={`w-3 h-3 rounded-full ${device.isEnabled ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                      </div>
                      <p className="text-sm text-gray-600 mb-1">{device.brand} {device.model}</p>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded">
                          {device.type}
                        </span>
                        {device.codekey && (
                          <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs font-mono font-bold rounded border border-orange-300">
                            {device.codekey}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingDevice(device);
                          setShowDeviceDialog(true);
                        }}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Delete this device?')) {
                            setDevices(devices.filter(d => d.id !== device.id));
                          }
                        }}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-3">{device.description}</p>
                  
                  <div className="space-y-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-gray-500">Sync:</span>
                      <span className="text-xs text-gray-700 font-medium">{device.syncProtocol}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-gray-500">Compatible:</span>
                      <div className="flex flex-wrap gap-1">
                        {device.compatibility.map((comp, idx) => (
                          <span key={idx} className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                            {comp}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                    <span className={`text-sm font-semibold ${device.isEnabled ? 'text-green-600' : 'text-gray-500'}`}>
                      {device.isEnabled ? '✓ Enabled' : '✗ Disabled'}
                    </span>
                    <button
                      onClick={() => {
                        setDevices(devices.map(d => 
                          d.id === device.id ? { ...d, isEnabled: !d.isEnabled } : d
                        ));
                      }}
                      className="text-xs text-purple-600 hover:underline font-medium"
                    >
                      Toggle
                    </button>
                  </div>
                </div>
              ))}
          </div>

          {devices.filter(d => categoryFilter === 'all' || d.type === categoryFilter).length === 0 && (
            <div className="text-center py-12 bg-gray-50 rounded-xl">
              <p className="text-gray-600">No devices found. Click "Add Device" to register a compatible device!</p>
            </div>
          )}

          {/* Device Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="text-2xl font-bold text-gray-900">{devices.length}</div>
              <div className="text-sm text-gray-600">Total Devices</div>
            </div>
            <div className="bg-white rounded-xl border border-green-200 p-4">
              <div className="text-2xl font-bold text-green-600">{devices.filter(d => d.isEnabled).length}</div>
              <div className="text-sm text-gray-600">Enabled</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="text-2xl font-bold text-gray-600">{devices.filter(d => !d.isEnabled).length}</div>
              <div className="text-sm text-gray-600">Disabled</div>
            </div>
          </div>
        </div>
      )}

      {/* Add Dialog */}
      {showAddDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold mb-6">
              Add New{' '}
              {activeTab === 'periods'
                ? 'Period'
                : activeTab === 'sections'
                  ? 'Section'
                  : activeTab === 'workMethods'
                    ? 'Work Method'
                    : activeTab === 'commonDailyActions'
                      ? isAdmin
                        ? 'Common Daily Action'
                        : 'Daily action'
                      : 'Execution Technique'}
            </h3>
            
            {/* Info Banner — Super Admin only (user accounts edit one language) */}
            {isAdmin && (
              <div className="mb-6 p-3 bg-blue-50 border-2 border-blue-300 rounded-lg">
                <div className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-blue-700" />
                  <span className="text-sm font-semibold text-blue-900">
                    Edit in all languages simultaneously - changes save to all language libraries at once!
                  </span>
                </div>
              </div>
            )}

            {isAdmin && activeTab === 'periods' && (
              <div className="mb-6 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-950">
                  <span className="font-semibold">Super Admin — Periods:</span> English (EN) is the default reference
                  language. The stored primary name and description are the English fields; other languages are saved as
                  translations. Language blocks are listed with English first. If you have not entered a title or
                  description for a language yet, the English text is shown in{' '}
                  <span className="font-semibold text-red-700">red</span> in that language&apos;s fields as a reminder to
                  add a translation.
                </p>
              </div>
            )}
            
            {/* Global Fields (Code & Color) */}
            <div className="space-y-4 mb-6">
              {(activeTab === 'sections' ||
                activeTab === 'workMethods' ||
                activeTab === 'commonDailyActions') && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Code{' '}
                    <span className="text-gray-500">
                      {isAdmin ? '(max 5 characters, same for all languages)' : '(max 5 characters)'}
                    </span>
                  </label>
                  <input
                    type="text"
                    value={newItem.code || ''}
                    onChange={(e) => {
                      const value = e.target.value.slice(0, 5).toUpperCase();
                      setNewItem({ ...newItem, code: value });
                    }}
                    placeholder="Enter code..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono font-bold"
                    maxLength={5}
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    {(newItem.code || '').length}/5 - Short code for compact display
                  </div>
                </div>
              )}

              {activeTab === 'commonDailyActions' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Picture {isAdmin && <span className="text-gray-500">(same for all languages)</span>}
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setNewItem({ ...newItem, picture: (reader.result as string) || '' });
                        };
                        reader.readAsDataURL(file);
                      }}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                    />
                    {newItem.picture && (
                      <Image
                        src={newItem.picture}
                        alt="Preview"
                        width={56}
                        height={56}
                        className="w-14 h-14 object-cover rounded-lg border border-gray-200"
                        unoptimized
                      />
                    )}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Color {isAdmin && <span className="text-gray-500">(same for all languages)</span>}
                </label>
                <div className="flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-lg border-2 border-gray-300 cursor-pointer"
                    style={{ backgroundColor: newItem.color }}
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'color';
                      input.value = newItem.color;
                      input.onchange = (e) => setNewItem({ ...newItem, color: (e.target as HTMLInputElement).value });
                      input.click();
                    }}
                  />
                  <input
                    type="text"
                    value={newItem.color}
                    onChange={(e) => setNewItem({ ...newItem, color: e.target.value })}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg font-mono text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Per-Language Fields */}
            {isAdmin ? (
              // Admin: Show all languages
              <div className="space-y-6">
                <h4 className="text-lg font-semibold text-gray-800 border-b pb-2">Translations</h4>

                {useEnglishFallbackRules && (
                  <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg flex flex-wrap items-center gap-3">
                    <p className="text-sm text-gray-700 flex-1 min-w-[220px]">
                      Fill all languages from the <span className="font-semibold">English (EN)</span> title and
                      description — same <span className="font-semibold">Translation</span> service as{' '}
                      <span className="font-semibold">Language → Long texts</span>.
                    </p>
                    <button
                      type="button"
                      onClick={() => void handleTranslateNewItemFields()}
                      disabled={isTranslatingToolsFields}
                      className={`px-6 py-2.5 rounded-lg font-bold border-2 transition ${
                        isTranslatingToolsFields
                          ? 'bg-gray-200 text-gray-500 border-gray-300 cursor-not-allowed'
                          : 'bg-white text-gray-800 border-gray-300 hover:bg-gray-50 hover:border-gray-400'
                      }`}
                    >
                      {isTranslatingToolsFields ? 'Translating…' : 'Translation'}
                    </button>
                  </div>
                )}
                
                {adminTranslationLanguages.map((lang) => (
                  <div key={lang.code} className="border-2 border-gray-200 rounded-lg p-4 bg-gray-50">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="px-3 py-1 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-md font-bold text-sm">
                        {lang.code.toUpperCase()}
                      </span>
                      <span className="text-sm font-medium text-gray-700">{lang.name}</span>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">
                          Title <span className="text-gray-400">(max 30 chars)</span>
                        </label>
                        <input
                          type="text"
                          value={getToolsAdminTranslationFieldDisplay(
                            newItemTranslations,
                            lang.code,
                            'title',
                            useEnglishFallbackRules
                          )}
                          onChange={(e) => {
                            const value = e.target.value.slice(0, 30);
                            setNewItemTranslations((prev) => {
                              const cur = prev[lang.code] ?? { title: '', description: '' };
                              return {
                                ...prev,
                                [lang.code]: {
                                  ...cur,
                                  title: value,
                                },
                              };
                            });
                          }}
                          placeholder={`Enter ${lang.name} title...`}
                          className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${
                            isToolsAdminTranslationFieldInherited(
                              newItemTranslations,
                              lang.code,
                              'title',
                              useEnglishFallbackRules
                            )
                              ? 'text-red-600'
                              : 'text-gray-900'
                          }`}
                          maxLength={30}
                        />
                        <div className="text-xs text-gray-400 mt-0.5">
                          {getToolsAdminTranslationFieldDisplay(
                            newItemTranslations,
                            lang.code,
                            'title',
                            useEnglishFallbackRules
                          ).length}
                          /30
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">
                          Description <span className="text-gray-400">(max 255 chars)</span>
                        </label>
                        <textarea
                          value={getToolsAdminTranslationFieldDisplay(
                            newItemTranslations,
                            lang.code,
                            'description',
                            useEnglishFallbackRules
                          )}
                          onChange={(e) => {
                            const value = e.target.value.slice(0, 255);
                            setNewItemTranslations((prev) => {
                              const cur = prev[lang.code] ?? { title: '', description: '' };
                              return {
                                ...prev,
                                [lang.code]: {
                                  ...cur,
                                  description: value,
                                },
                              };
                            });
                          }}
                          placeholder={`Enter ${lang.name} description...`}
                          rows={2}
                          className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${
                            isToolsAdminTranslationFieldInherited(
                              newItemTranslations,
                              lang.code,
                              'description',
                              useEnglishFallbackRules
                            )
                              ? 'text-red-600'
                              : 'text-gray-900'
                          }`}
                          maxLength={255}
                        />
                        <div className="text-xs text-gray-400 mt-0.5">
                          {getToolsAdminTranslationFieldDisplay(
                            newItemTranslations,
                            lang.code,
                            'description',
                            useEnglishFallbackRules
                          ).length}
                          /255
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              // Non-Admin: Only show current language fields
              <div className="space-y-4">
                {activeTab === 'commonDailyActions' && (
                  <p className="text-sm text-gray-600">
                    Title and description are stored in{' '}
                    <span className="font-semibold">{profileLanguageLabel}</span>, the same language used when you load
                    defaults from Movesbook.
                  </p>
                )}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Title <span className="text-gray-500">(max 30 chars)</span>
                  </label>
                  <input
                    type="text"
                    value={newItem.title}
                    onChange={(e) => setNewItem({ ...newItem, title: e.target.value.slice(0, 30) })}
                    placeholder={
                      activeTab === 'commonDailyActions'
                        ? `Enter title in ${profileLanguageLabel}...`
                        : 'Enter title...'
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    maxLength={30}
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    {newItem.title.length}/30
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Description <span className="text-gray-500">(max 255 chars)</span>
                  </label>
                  <textarea
                    value={newItem.description}
                    onChange={(e) => setNewItem({ ...newItem, description: e.target.value.slice(0, 255) })}
                    placeholder={
                      activeTab === 'commonDailyActions'
                        ? `Enter description in ${profileLanguageLabel}...`
                        : 'Enter description...'
                    }
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    maxLength={255}
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    {newItem.description.length}/255
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3 mt-8">
              <button
                onClick={handleAdd}
                className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold"
              >
                {isAdmin ? 'Save to All Languages' : 'Save'}
              </button>
              <button
                onClick={() => {
                  setShowAddDialog(false);
                  setNewItem({ title: '', code: '', description: '', color: '#3b82f6', sports: [] as string[], picture: '' });
                  setNewItemTranslations({});
                  setActiveInputLanguage('en');
                }}
                className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Dialog */}
      {editingItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold mb-6">
              Edit{' '}
              {activeTab === 'periods'
                ? 'Period'
                : activeTab === 'sections'
                  ? 'Section'
                  : activeTab === 'workMethods'
                    ? 'Work Method'
                    : activeTab === 'commonDailyActions'
                      ? isAdmin
                        ? 'Common Daily Action'
                        : 'Daily action'
                      : 'Execution Technique'}
            </h3>
            
            {/* Info Banner - Only for Admin */}
            {isAdmin && (
              <div className="mb-6 p-3 bg-blue-50 border-2 border-blue-300 rounded-lg">
                <div className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-blue-700" />
                  <span className="text-sm font-semibold text-blue-900">
                    Edit in all languages simultaneously - changes save to all language libraries at once!
                  </span>
                </div>
              </div>
            )}

            {isAdmin && activeTab === 'periods' && (
              <div className="mb-6 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-950">
                  <span className="font-semibold">Super Admin — Periods:</span> English (EN) is the default reference
                  language. The stored primary name and description are the English fields; other languages are saved as
                  translations. Language blocks are listed with English first. If you have not entered a title or
                  description for a language yet, the English text is shown in{' '}
                  <span className="font-semibold text-red-700">red</span> in that language&apos;s fields as a reminder to
                  add a translation.
                </p>
              </div>
            )}

            {/* Global Fields (Code & Color) */}
            <div className="space-y-4 mb-6">
              {(activeTab === 'sections' ||
                activeTab === 'workMethods' ||
                activeTab === 'commonDailyActions') && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Code{' '}
                    <span className="text-gray-500">
                      {isAdmin ? '(max 5 characters, same for all languages)' : '(max 5 characters)'}
                    </span>
                  </label>
                  <input
                    type="text"
                    value={(editingItem as any).code || ''}
                    onChange={(e) => {
                      const value = e.target.value.slice(0, 5).toUpperCase();
                      setEditingItem({ ...editingItem, code: value } as any);
                    }}
                    placeholder="Enter code..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono font-bold"
                    maxLength={5}
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    {((editingItem as any).code || '').length}/5 - Short code for compact display
                  </div>
                </div>
              )}

              {activeTab === 'commonDailyActions' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Picture {isAdmin && <span className="text-gray-500">(same for all languages)</span>}
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file || !editingItem) return;
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setEditingItem({ ...editingItem, picture: (reader.result as string) || '' } as any);
                        };
                        reader.readAsDataURL(file);
                      }}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                    />
                    {(editingItem as any).picture && (
                      <Image
                        src={(editingItem as any).picture}
                        alt="Preview"
                        width={56}
                        height={56}
                        className="w-14 h-14 object-cover rounded-lg border border-gray-200"
                        unoptimized
                      />
                    )}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Color {isAdmin && <span className="text-gray-500">(same for all languages)</span>}
                </label>
                <div className="flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-lg border-2 border-gray-300 cursor-pointer"
                    style={{ backgroundColor: editingItem.color }}
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'color';
                      input.value = editingItem.color;
                      input.onchange = (e) => setEditingItem({ ...editingItem, color: (e.target as HTMLInputElement).value });
                      input.click();
                    }}
                  />
                  <input
                    type="text"
                    value={editingItem.color}
                    onChange={(e) => setEditingItem({ ...editingItem, color: e.target.value })}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg font-mono text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Per-Language Fields */}
            {isAdmin ? (
              // Admin: Show all languages
              <div className="space-y-6">
                <h4 className="text-lg font-semibold text-gray-800 border-b pb-2">Translations</h4>

                {useEnglishFallbackRules && (
                  <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg flex flex-wrap items-center gap-3">
                    <p className="text-sm text-gray-700 flex-1 min-w-[220px]">
                      Fill all languages from the <span className="font-semibold">English (EN)</span> title and
                      description — same <span className="font-semibold">Translation</span> service as{' '}
                      <span className="font-semibold">Language → Long texts</span>.
                    </p>
                    <button
                      type="button"
                      onClick={() => void handleTranslateEditItemFields()}
                      disabled={isTranslatingToolsFields}
                      className={`px-6 py-2.5 rounded-lg font-bold border-2 transition ${
                        isTranslatingToolsFields
                          ? 'bg-gray-200 text-gray-500 border-gray-300 cursor-not-allowed'
                          : 'bg-white text-gray-800 border-gray-300 hover:bg-gray-50 hover:border-gray-400'
                      }`}
                    >
                      {isTranslatingToolsFields ? 'Translating…' : 'Translation'}
                    </button>
                  </div>
                )}
                
                {adminTranslationLanguages.map((lang) => (
                  <div key={lang.code} className="border-2 border-gray-200 rounded-lg p-4 bg-gray-50">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="px-3 py-1 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-md font-bold text-sm">
                        {lang.code.toUpperCase()}
                      </span>
                      <span className="text-sm font-medium text-gray-700">{lang.name}</span>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">
                          Title <span className="text-gray-400">(max 30 chars)</span>
                        </label>
                        <input
                          type="text"
                          value={getToolsAdminTranslationFieldDisplay(
                            editItemTranslations,
                            lang.code,
                            'title',
                            useEnglishFallbackRules
                          )}
                          onChange={(e) => {
                            const value = e.target.value.slice(0, 30);
                            setEditItemTranslations((prev) => {
                              const cur = prev[lang.code] ?? { title: '', description: '' };
                              return {
                                ...prev,
                                [lang.code]: {
                                  ...cur,
                                  title: value,
                                },
                              };
                            });
                          }}
                          placeholder={`Enter ${lang.name} title...`}
                          className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${
                            isToolsAdminTranslationFieldInherited(
                              editItemTranslations,
                              lang.code,
                              'title',
                              useEnglishFallbackRules
                            )
                              ? 'text-red-600'
                              : 'text-gray-900'
                          }`}
                          maxLength={30}
                        />
                        <div className="text-xs text-gray-400 mt-0.5">
                          {getToolsAdminTranslationFieldDisplay(
                            editItemTranslations,
                            lang.code,
                            'title',
                            useEnglishFallbackRules
                          ).length}
                          /30
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">
                          Description <span className="text-gray-400">(max 255 chars)</span>
                        </label>
                        <textarea
                          value={getToolsAdminTranslationFieldDisplay(
                            editItemTranslations,
                            lang.code,
                            'description',
                            useEnglishFallbackRules
                          )}
                          onChange={(e) => {
                            const value = e.target.value.slice(0, 255);
                            setEditItemTranslations((prev) => {
                              const cur = prev[lang.code] ?? { title: '', description: '' };
                              return {
                                ...prev,
                                [lang.code]: {
                                  ...cur,
                                  description: value,
                                },
                              };
                            });
                          }}
                          placeholder={`Enter ${lang.name} description...`}
                          rows={2}
                          className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${
                            isToolsAdminTranslationFieldInherited(
                              editItemTranslations,
                              lang.code,
                              'description',
                              useEnglishFallbackRules
                            )
                              ? 'text-red-600'
                              : 'text-gray-900'
                          }`}
                          maxLength={255}
                        />
                        <div className="text-xs text-gray-400 mt-0.5">
                          {getToolsAdminTranslationFieldDisplay(
                            editItemTranslations,
                            lang.code,
                            'description',
                            useEnglishFallbackRules
                          ).length}
                          /255
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              // Non-Admin: Only show current language fields
              <div className="space-y-4">
                {activeTab === 'commonDailyActions' && (
                  <p className="text-sm text-gray-600">
                    Title and description are stored in{' '}
                    <span className="font-semibold">{profileLanguageLabel}</span>, the same language used when you load
                    defaults from Movesbook.
                  </p>
                )}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Title <span className="text-gray-500">(max 30 chars)</span>
                  </label>
                  <input
                    type="text"
                    value={editingItem.title}
                    onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value.slice(0, 30) })}
                    placeholder={
                      activeTab === 'commonDailyActions'
                        ? `Enter title in ${profileLanguageLabel}...`
                        : 'Enter title...'
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    maxLength={30}
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    {editingItem.title.length}/30
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Description <span className="text-gray-500">(max 255 chars)</span>
                  </label>
                  <textarea
                    value={editingItem.description}
                    onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value.slice(0, 255) })}
                    placeholder={
                      activeTab === 'commonDailyActions'
                        ? `Enter description in ${profileLanguageLabel}...`
                        : 'Enter description...'
                    }
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    maxLength={255}
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    {editingItem.description.length}/255
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3 mt-8">
              <button
                onClick={handleSaveEdit}
                className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                {isAdmin ? 'Save to All Languages' : 'Save'}
              </button>
              <button
                onClick={() => setEditingItem(null)}
                className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-semibold flex items-center justify-center gap-2"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Periodization template dialog (Super Admin library) */}
      {showPeriodizationTemplateDialog && editingPeriodizationTemplate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 max-w-lg w-full my-8 border border-gray-200 dark:border-gray-600">
            <h3 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
              {editingPeriodizationTemplate.id ? 'Edit periodization' : 'Add periodization'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Name *</label>
                <input
                  type="text"
                  value={editingPeriodizationTemplate.name}
                  onChange={(e) =>
                    setEditingPeriodizationTemplate({
                      ...editingPeriodizationTemplate,
                      name: e.target.value,
                    })
                  }
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Off-season base"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Sport *</label>
                <select
                  value={editingPeriodizationTemplate.sport}
                  onChange={(e) =>
                    setEditingPeriodizationTemplate({
                      ...editingPeriodizationTemplate,
                      sport: e.target.value,
                    })
                  }
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select sport</option>
                  {SPORTS_LIST.map((s) => {
                    const label = getSportDisplayName(s);
                    return (
                      <option key={s} value={label}>
                        {label}
                      </option>
                    );
                  })}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Level *</label>
                <input
                  type="text"
                  value={editingPeriodizationTemplate.level}
                  onChange={(e) =>
                    setEditingPeriodizationTemplate({
                      ...editingPeriodizationTemplate,
                      level: e.target.value,
                    })
                  }
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Intermediate, Club, Elite"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={periodizationTagsInput}
                  onChange={(e) => setPeriodizationTagsInput(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="strength, prep, mesocycle 1"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button
                type="button"
                onClick={() => {
                  if (!editingPeriodizationTemplate.name.trim()) {
                    alert('Please enter a name.');
                    return;
                  }
                  if (!editingPeriodizationTemplate.sport.trim()) {
                    alert('Please select a sport.');
                    return;
                  }
                  if (!editingPeriodizationTemplate.level.trim()) {
                    alert('Please enter a level.');
                    return;
                  }
                  const tags = periodizationTagsInput
                    .split(',')
                    .map((x) => x.trim())
                    .filter(Boolean);
                  const existingId = editingPeriodizationTemplate.id;
                  const id =
                    existingId && periodizationTemplates.some((p) => p.id === existingId)
                      ? existingId
                      : `pt-${Date.now()}`;
                  const entry: PeriodizationTemplate = {
                    ...editingPeriodizationTemplate,
                    id,
                    tags,
                  };
                  setPeriodizationTemplates((prev) => {
                    const idx = prev.findIndex((p) => p.id === id);
                    if (idx >= 0) {
                      const next = [...prev];
                      next[idx] = entry;
                      return next;
                    }
                    return [...prev, entry];
                  });
                  setShowPeriodizationTemplateDialog(false);
                  setEditingPeriodizationTemplate(null);
                }}
                className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowPeriodizationTemplateDialog(false);
                  setEditingPeriodizationTemplate(null);
                }}
                className="flex-1 px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Equipment Dialog */}
      {showEquipmentDialog && editingEquipment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl p-8 max-w-2xl w-full my-8">
            <h3 className="text-2xl font-bold mb-6">
              {editingEquipment.id ? 'Edit Equipment' : 'Add New Equipment'}
            </h3>
            
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              {/* Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Name *</label>
                <input
                  type="text"
                  value={editingEquipment.name}
                  onChange={(e) => setEditingEquipment({ ...editingEquipment, name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Equipment name"
                />
              </div>

              {/* Picture */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Picture</label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        // For now, store as data URL. In production, upload to server
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setEditingEquipment({ ...editingEquipment, picture: reader.result as string });
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                    style={{ position: 'relative', zIndex: 1 }}
                  />
                  {editingEquipment.picture && (
                    <Image src={editingEquipment.picture} alt="Preview" width={64} height={64} className="w-16 h-16 object-cover rounded-lg border-2 border-gray-300" unoptimized />
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">Upload an image of the equipment</p>
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Category *</label>
                <select
                  value={editingEquipment.category}
                  onChange={(e) => setEditingEquipment({ ...editingEquipment, category: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select category</option>
                  <option value="Cardio">Cardio</option>
                  <option value="Weights">Weights</option>
                  <option value="Accessories">Accessories</option>
                  <option value="Machines">Machines</option>
                  <option value="Clothes">Clothes</option>
                  <option value="Shoes">Shoes</option>
                  <option value="Beverages">Beverages</option>
                  <option value="Sport devices">Sport devices</option>
                </select>
              </div>

              {/* Sport Tags */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Sport *</label>
                <div className="border border-gray-300 rounded-lg p-3 min-h-[100px]">
                  <div className="flex flex-wrap gap-2 mb-2">
                    {editingEquipment.sports?.map((sportId, index) => {
                      const sport = sports.find(s => s.id === sportId);
                      return sport ? (
                        <span key={index} className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                          {sport.icon} {sport.name}
                          <button
                            onClick={() => {
                              setEditingEquipment({
                                ...editingEquipment,
                                sports: editingEquipment.sports?.filter((_, i) => i !== index) || []
                              });
                            }}
                            className="ml-1 hover:text-blue-900"
                          >
                            ×
                          </button>
                        </span>
                      ) : null;
                    })}
                  </div>
                  <select
                    onChange={(e) => {
                      const sportId = e.target.value;
                      console.log('Sport selected:', sportId);
                      console.log('Current equipment sports:', editingEquipment.sports);
                      
                      if (sportId && editingEquipment && !editingEquipment.sports?.includes(sportId)) {
                        const updatedSports = [...(editingEquipment.sports || []), sportId];
                        console.log('Updating sports to:', updatedSports);
                        
                        setEditingEquipment({
                          ...editingEquipment,
                          sports: updatedSports
                        });
                      }
                      // Reset select to default
                      setTimeout(() => {
                        e.target.value = '';
                      }, 0);
                    }}
                    className="w-full px-3 py-2 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white cursor-pointer"
                    value=""
                  >
                    <option value="" disabled>+ Add sport</option>
                    {(sports && sports.length > 0 ? sports : DEFAULT_SPORTS)
                      .filter(s => !editingEquipment?.sports?.includes(s.id))
                      .map(sport => (
                        <option key={sport.id} value={sport.id}>
                          {sport.icon} {sport.name}
                        </option>
                      ))}
                  </select>
                </div>
                <p className="text-xs text-gray-500 mt-1">Select one or more sports this equipment is used for</p>
              </div>

              {/* Company */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Company</label>
                <input
                  type="text"
                  value={editingEquipment.company || ''}
                  onChange={(e) => setEditingEquipment({ ...editingEquipment, company: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Manufacturer or brand name"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                <textarea
                  value={editingEquipment.description}
                  onChange={(e) => setEditingEquipment({ ...editingEquipment, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Equipment description"
                />
              </div>

              {/* Athlete-specific fields */}
              {!isAdmin && (
                <>
                  <div className="border-t pt-4 mt-4">
                    <h4 className="font-semibold text-gray-700 mb-3">Athlete Tracking</h4>
                    
                    {/* Start Date */}
                    <div className="mb-4">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Start Date</label>
                      <input
                        type="date"
                        value={editingEquipment.startDate || ''}
                        onChange={(e) => setEditingEquipment({ ...editingEquipment, startDate: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Duration Alarm */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Duration Alarm</label>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Days (autofilled)</label>
                          <input
                            type="number"
                            value={editingEquipment.durationAlarm?.days || ''}
                            onChange={(e) => setEditingEquipment({
                              ...editingEquipment,
                              durationAlarm: {
                                ...editingEquipment.durationAlarm,
                                days: parseInt(e.target.value) || undefined
                              }
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            placeholder="Days"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Km (autofilled)</label>
                          <input
                            type="number"
                            value={editingEquipment.durationAlarm?.km || ''}
                            onChange={(e) => setEditingEquipment({
                              ...editingEquipment,
                              durationAlarm: {
                                ...editingEquipment.durationAlarm,
                                km: parseInt(e.target.value) || undefined
                              }
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            placeholder="Km"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Time (autofilled)</label>
                          <input
                            type="text"
                            value={editingEquipment.durationAlarm?.time || ''}
                            onChange={(e) => setEditingEquipment({
                              ...editingEquipment,
                              durationAlarm: {
                                ...editingEquipment.durationAlarm,
                                time: e.target.value
                              }
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            placeholder="HH:MM:SS"
                          />
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">Set automatic alarms based on usage duration</p>
                    </div>
                  </div>
                </>
              )}

              {/* In Stock */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="inStock"
                  checked={editingEquipment.inStock}
                  onChange={(e) => setEditingEquipment({ ...editingEquipment, inStock: e.target.checked })}
                  className="w-5 h-5 text-blue-600"
                />
                <label htmlFor="inStock" className="text-sm font-semibold text-gray-700">
                  In Stock
                </label>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => {
                  if (!editingEquipment.name || !editingEquipment.category) {
                    alert('Please fill in all required fields (Name, Category, Sport)');
                    return;
                  }
                  if (!editingEquipment.sports || editingEquipment.sports.length === 0) {
                    alert('Please select at least one sport');
                    return;
                  }
                  if (editingEquipment.id) {
                    setEquipment(equipment.map(e => e.id === editingEquipment.id ? editingEquipment : e));
                  } else {
                    setEquipment([...equipment, { ...editingEquipment, id: Date.now().toString(), isUserCreated: !isAdmin }]);
                  }
                  setShowEquipmentDialog(false);
                  setEditingEquipment(null);
                }}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
              >
                {editingEquipment.id ? 'Save' : 'Add'}
              </button>
              <button
                onClick={() => {
                  setShowEquipmentDialog(false);
                  setEditingEquipment(null);
                }}
                className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exercise Dialog — Section Exercises (extended bank form) */}
      {showExerciseDialog && editingExercise && (
        <SectionExerciseDialog
          exercise={editingExercise}
          onChange={setEditingExercise}
          sports={sports}
          pathologyCatalog={exercisePathologyCatalog}
          title={
            editingExercise.id
              ? 'Edit Exercise'
              : 'SECTION EXERCISES — Add New Exercise'
          }
          onSave={() => {
            const ex = editingExercise;
            if (!ex.name?.trim()) {
              window.alert('Please enter the exercise name in English.');
              return;
            }
            if (!(ex.exerciseCode || '').trim()) {
              window.alert('Please enter the exercise code (reference).');
              return;
            }
            if (!ex.typology) {
              window.alert('Please select a typology.');
              return;
            }
            if (!ex.sportsIndicated?.length) {
              window.alert('Please select at least one sport (or add sports in the Sports tab).');
              return;
            }
            if (!ex.equipmentType) {
              window.alert('Please select a type of equipment.');
              return;
            }
            const mTags = normalizeMuscleAreaPercentTags(ex.muscleAreaPercentTags || []);
            const mainEntry = mTags.find((t) => t.isMain);
            if (!(mainEntry?.area || '').trim()) {
              window.alert('Please select the main muscular area with a percentage (Label 6).');
              return;
            }
            const totalPct = muscleInvolvementPercentTotal(mTags);
            if (totalPct !== 100) {
              window.alert(
                `Muscular area percentages must total exactly 100% (currently ${totalPct}%). Adjust Label 6.`
              );
              return;
            }
            const areasUsed = mTags.filter((t) => (t.area || '').trim()).map((t) => t.area.trim());
            if (new Set(areasUsed).size !== areasUsed.length) {
              window.alert('Each muscular area can appear only once.');
              return;
            }
            if (!ex.levels?.length) {
              window.alert('Please select at least one level (1–5).');
              return;
            }
            const finalized = finalizeExerciseForStorage(ex);
            if (finalized.id) {
              setExercises(exercises.map((row) => (row.id === finalized.id ? finalized : row)));
            } else {
              setExercises([
                ...exercises,
                { ...finalized, id: Date.now().toString(), isUserCreated: !isAdmin },
              ]);
            }
            setShowExerciseDialog(false);
            setEditingExercise(null);
          }}
          onCancel={() => {
            setShowExerciseDialog(false);
            setEditingExercise(null);
          }}
        />
      )}

      {/* Device Dialog */}
      {showDeviceDialog && editingDevice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl p-8 max-w-2xl w-full my-8">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-2xl font-bold flex items-center gap-2">
                <span className="text-2xl">📱</span>
                {editingDevice.id ? 'Edit Device' : 'Add New Compatible Device'}
              </h3>
              {editingDevice.codekey && (
                <div className="flex items-center gap-2 px-4 py-2 bg-purple-100 border-2 border-purple-300 rounded-lg">
                  <span className="text-xs font-semibold text-purple-700">CODEKEY:</span>
                  <span className="text-sm font-bold text-purple-900 tracking-wider">{editingDevice.codekey}</span>
                </div>
              )}
            </div>
            
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Device Name *</label>
                  <input
                    type="text"
                    value={editingDevice.name}
                    onChange={(e) => setEditingDevice({ ...editingDevice, name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="e.g., GARMIN FORERUNNER 945"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Codekey *</label>
                  <input
                    type="text"
                    value={editingDevice.codekey || ''}
                    onChange={(e) => {
                      const value = e.target.value.toUpperCase().replace(/[^A-Z0-9\-_]/g, '');
                      setEditingDevice({ ...editingDevice, codekey: value });
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono font-bold tracking-wider"
                    placeholder="e.g., GARM-FR945"
                    maxLength={20}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Unique protocol identifier (uppercase, numbers, - and _ only)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Brand *</label>
                  <input
                    type="text"
                    value={editingDevice.brand}
                    onChange={(e) => setEditingDevice({ ...editingDevice, brand: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="e.g., Apple, Garmin, Fitbit"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Model</label>
                  <input
                    type="text"
                    value={editingDevice.model}
                    onChange={(e) => setEditingDevice({ ...editingDevice, model: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="e.g., Series 9, Forerunner 945"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Device Type *</label>
                  <select
                    value={editingDevice.type}
                    onChange={(e) => setEditingDevice({ ...editingDevice, type: e.target.value as Device['type'] })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="Watch">Smart Watch</option>
                    <option value="Tracker">Fitness Tracker</option>
                    <option value="Monitor">Heart Rate Monitor</option>
                    <option value="Scale">Smart Scale</option>
                    <option value="Sensor">Sensor</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Sync Protocol *</label>
                  <input
                    type="text"
                    value={editingDevice.syncProtocol}
                    onChange={(e) => setEditingDevice({ ...editingDevice, syncProtocol: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="e.g., Bluetooth LE, HealthKit, Garmin API, ANT+"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Compatibility (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={editingDevice.compatibility.join(', ')}
                    onChange={(e) => setEditingDevice({ 
                      ...editingDevice, 
                      compatibility: e.target.value.split(',').map(s => s.trim()).filter(s => s) 
                    })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="e.g., iOS, Android, Windows, macOS, Bluetooth, Wi-Fi"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Description (Shown to Users)</label>
                  <textarea
                    value={editingDevice.description}
                    onChange={(e) => setEditingDevice({ ...editingDevice, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Enter description that users will see when selecting this device in their Services"
                  />
                </div>

                <div className="col-span-2">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="deviceEnabled"
                      checked={editingDevice.isEnabled}
                      onChange={(e) => setEditingDevice({ ...editingDevice, isEnabled: e.target.checked })}
                      className="w-5 h-5 text-purple-600"
                    />
                    <label htmlFor="deviceEnabled" className="text-sm font-semibold text-gray-700">
                      Make this device available to users
                    </label>
                  </div>
                  <p className="text-xs text-gray-500 mt-2 ml-8">
                    When enabled, users will see this device option in their Services and can select it for workout tracking
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => {
                  if (!editingDevice.name || !editingDevice.brand || !editingDevice.codekey || !editingDevice.syncProtocol) {
                    alert('Please fill in all required fields (Name, Brand, Codekey, Sync Protocol)');
                    return;
                  }
                  // Check for duplicate codekey
                  const existingDevice = devices.find(d => d.codekey === editingDevice.codekey && d.id !== editingDevice.id);
                  if (existingDevice) {
                    alert(`⚠️ Codekey "${editingDevice.codekey}" is already in use by "${existingDevice.name}".\n\nEach device must have a unique codekey.`);
                    return;
                  }
                  if (editingDevice.id) {
                    setDevices(devices.map(d => d.id === editingDevice.id ? editingDevice : d));
                  } else {
                    setDevices([...devices, { ...editingDevice, id: Date.now().toString(), isUserCreated: !isAdmin }]);
                  }
                  setShowDeviceDialog(false);
                  setEditingDevice(null);
                }}
                className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-semibold"
              >
                {editingDevice.id ? 'Save Device' : 'Add Device'}
              </button>
              <button
                onClick={() => {
                  setShowDeviceDialog(false);
                  setEditingDevice(null);
                }}
                className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password Dialog (Admin or Personal) */}
      {showPasswordDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full">
            <h3 className="text-xl font-semibold mb-4">
              🔐 {isAdmin ? 'Super Admin Authentication' : 'Confirm Your Identity'}
            </h3>
            <p className="text-gray-600 mb-4">
              {isAdmin ? (
                <>
                  You are about to save <strong>all current settings from every tab</strong> as global <strong>Movesbook defaults</strong>. What you save includes the data on screen now — including <strong>translations on each item for every supported language</strong> you have filled in (not just one display language).
                </>
              ) : (
                <>
                  Please enter your password to confirm and save your <strong>personal settings</strong>.
                </>
              )}
            </p>
            {isAdmin && (
              <div className="text-sm text-orange-700 bg-orange-50 p-3 rounded-lg mb-4 space-y-2">
                <p><strong>📌 What will be saved:</strong></p>
                <ul className="list-disc ml-5 space-y-1">
                  <li><strong>Periods:</strong> All periods from Periods tab</li>
                  <li><strong>Sections:</strong> All sections from Sections tab</li>
                  <li><strong>Sports:</strong> Managed in Favourite - Favourite Sports</li>
                  <li><strong>Equipment:</strong> All equipment from Personal Equipment tab</li>
                  <li><strong>Exercises:</strong> All exercises from Exercise Bank tab</li>
                  <li><strong>Library:</strong> All exercises from My Library tab</li>
                  <li><strong>Devices:</strong> All devices from Device Enabled tab</li>
                </ul>
                <p className="pt-2">
                  <strong>👥 For users:</strong> When they use <strong>Load</strong> in Language Defaults (Load admin defaults), those defaults are applied{' '}
                  <strong>in their profile language</strong>. Each user should set <strong>language</strong> in their profile so the system knows which locale to load.
                </p>
              </div>
            )}
            {!isAdmin && (
              <div className="text-sm text-blue-700 bg-blue-50 p-3 rounded-lg mb-4">
                <p><strong>💾 Saving Your Personal Settings:</strong></p>
                <p className="mt-1">These settings will be saved to your account only and will not affect other users.</p>
              </div>
            )}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {isAdmin ? 'Super Admin Password:' : 'Your Password:'}
              </label>
              <input
                type="password"
                value={superAdminPassword}
                onChange={(e) => setSuperAdminPassword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handlePasswordSubmit()}
                placeholder="Enter password"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                autoFocus
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handlePasswordSubmit}
                className="flex-1 px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-semibold"
              >
                {isAdmin ? 'Save Defaults' : 'Save My Settings'}
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

      {/* Edit Sport Dialog */}
      {showEditSportDialog && editingSport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full">
            <h3 className="text-2xl font-bold mb-6">
              ✏️ Edit Sport - Translation
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Sport Name</label>
                <input
                  type="text"
                  value={editingSport.name}
                  onChange={(e) => setEditingSport({ ...editingSport, name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter sport name in your language"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Translate the sport name into {SUPPORTED_LANGUAGES.find(l => l.code === selectedLanguage)?.name}
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Sport Icon (Emoji)</label>
                <input
                  type="text"
                  value={editingSport.icon}
                  onChange={(e) => setEditingSport({ ...editingSport, icon: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-2xl text-center"
                  placeholder="🏊‍♂️"
                  maxLength={5}
                />
                <p className="text-xs text-gray-500 mt-1">
                  You can change the emoji icon if needed
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-700">
                  <strong>💡 Tip:</strong> After translating all sports, use <strong>Save defaults</strong> in the Language Defaults bar to publish them for{' '}
                  {SUPPORTED_LANGUAGES.find((l) => l.code === selectedLanguage)?.name}
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => {
                  if (!editingSport.name.trim()) {
                    alert('Please enter a sport name');
                    return;
                  }
                  setSports(sports.map(s => s.id === editingSport.id ? editingSport : s));
                  setShowEditSportDialog(false);
                  setEditingSport(null);
                }}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save
              </button>
              <button
                onClick={() => {
                  setShowEditSportDialog(false);
                  setEditingSport(null);
                }}
                className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-semibold flex items-center justify-center gap-2"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

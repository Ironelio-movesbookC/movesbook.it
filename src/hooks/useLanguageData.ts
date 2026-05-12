import { useState, useEffect } from 'react';
import { i18n } from '@/lib/i18n';
import {
  Language,
  TranslationKey,
  DEFAULT_ACTIVE_LANGUAGES,
  createLanguageList,
  sortLanguagesByOrder
} from '@/constants/language.constants';
import { getAuthHeaders } from '@/utils/auth.utils';

/**
 * Get category from translation key name
 */
function getCategoryFromKey(key: string): string {
  const lowerKey = key.toLowerCase();
  
  // System Administration & Homepage
  if (lowerKey.includes('nav') || lowerKey.includes('navigation')) return 'system';
  if (lowerKey.includes('auth') || lowerKey.includes('login') || lowerKey.includes('register')) return 'system';
  if (lowerKey.includes('dashboard') || lowerKey.includes('home')) return 'system';
  if (lowerKey.includes('settings') || lowerKey.includes('config')) return 'system';
  if (lowerKey.includes('footer') || lowerKey.includes('header')) return 'system';
  if (lowerKey.includes('admin')) return 'system';
  if (lowerKey.includes('system')) return 'system';
  
  // Social & Sport
  if (lowerKey.includes('sport') || lowerKey.includes('workout') || lowerKey.includes('training')) return 'social';
  if (lowerKey.includes('club')) return 'social';
  if (lowerKey.includes('athlete')) return 'social';
  if (lowerKey.includes('coach')) return 'social';
  if (lowerKey.includes('team')) return 'social';
  if (lowerKey.includes('group')) return 'social';
  
  // Management
  if (key.startsWith('member_')) return 'management';
  if (key.startsWith('user_type_')) return 'management';
  if (key.startsWith('sidebar_')) return 'management';
  if (key.startsWith('workout_')) return 'management';
  
  return 'system';
}

interface UseLanguageDataReturn {
  // State
  languages: Language[];
  allKeys: TranslationKey[];
  filteredKeys: TranslationKey[];
  isLoading: boolean;
  
  // Actions
  loadLanguagesData: () => void;
  loadStaticTranslations: () => Promise<void>;
  saveLanguageOrder: (newOrder: string[]) => void;
  setLanguages: React.Dispatch<React.SetStateAction<Language[]>>;
  setAllKeys: React.Dispatch<React.SetStateAction<TranslationKey[]>>;
  setFilteredKeys: React.Dispatch<React.SetStateAction<TranslationKey[]>>;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
}

/**
 * Custom hook for managing language data and translations
 * Extracted from LanguageSettings.tsx
 * 
 * Handles:
 * - Loading language list from localStorage
 * - Loading translations from i18n and database
 * - Merging i18n defaults with database edits
 * - Language ordering
 */
export function useLanguageData(): UseLanguageDataReturn {
  const [languages, setLanguages] = useState<Language[]>([]);
  const [allKeys, setAllKeys] = useState<TranslationKey[]>([]);
  const [filteredKeys, setFilteredKeys] = useState<TranslationKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  /**
   * Load languages from localStorage with active status
   */
  const loadLanguagesData = () => {
    // Load saved active languages from localStorage
    let activeLanguageCodes = DEFAULT_ACTIVE_LANGUAGES;
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('activeLanguages');
      if (saved) {
        try {
          activeLanguageCodes = JSON.parse(saved);
        } catch (e) {
          console.error('Error parsing active languages:', e);
        }
      }
    }
    
    // Create language list with active status
    const languageList = createLanguageList(activeLanguageCodes);
    
    // Load saved language order from localStorage
    let languageOrder: string[] = [];
    if (typeof window !== 'undefined') {
      const savedOrder = localStorage.getItem('languageOrder');
      if (savedOrder) {
        try {
          languageOrder = JSON.parse(savedOrder);
        } catch (e) {
          console.error('Error parsing language order:', e);
        }
      }
      
      // Fallback to activeLanguages order if languageOrder not set
      if (languageOrder.length === 0) {
        languageOrder = activeLanguageCodes;
      }
    }
    
    // Sort languages according to saved order
    const sortedLanguages = sortLanguagesByOrder(languageList, languageOrder);
    
    setLanguages(sortedLanguages);
  };
  
  /**
   * Load translations from i18n and database, merge them
   */
  const loadStaticTranslations = async () => {
    setIsLoading(true);
    try {
      // Step 1: Load base translations from i18n (always available)
      const availableLanguages = i18n.getLanguages();
      const englishLang = availableLanguages.find(l => l.code === 'en');
      
      if (!englishLang) {
        console.error('English language not found');
        setIsLoading(false);
        return;
      }

      const keys = Object.keys(englishLang.strings);
      const i18nData: TranslationKey[] = keys.map((key) => {
        const values: Record<string, string> = {};
        
        availableLanguages.forEach((lang) => {
          values[lang.code] = lang.strings[key] || '';
        });

        return {
          key: key,
          category: getCategoryFromKey(key),
          descriptionEn: `Translation for ${key}`,
          values: values,
        };
      });

      console.log('📖 Loaded base translations from i18n:', i18nData.length);
      
      // Step 2: Load edited translations from database and merge them
      try {
        const response = await fetch('/api/admin/translations', {
          headers: { ...getAuthHeaders() },
        });
        
        if (response.ok) {
          const data = await response.json();
          
          if (data.success && data.translations && data.translations.length > 0) {
            console.log('💾 Loaded edited translations from database:', data.translations.length);
            
            // Create a map of database translations by key
            const dbMap = new Map<string, TranslationKey>();
            data.translations.forEach((trans: TranslationKey) => {
              dbMap.set(trans.key, trans);
            });
            
            // Merge: use database version if exists, otherwise use i18n
            const mergedData = i18nData.map(i18nTrans => {
              const dbTrans = dbMap.get(i18nTrans.key);
              if (dbTrans) {
                // Database version exists - use it (admin edited this)
                return dbTrans;
              }
              // No database version - use i18n default
              return i18nTrans;
            });
            
            // Also add any database translations that aren't in i18n (custom ones)
            data.translations.forEach((trans: TranslationKey) => {
              if (!i18nData.find(t => t.key === trans.key)) {
                mergedData.push(trans);
              }
            });
            
            console.log('✅ Merged data ready:', mergedData.length, 'translations');
            setAllKeys(mergedData);
            setFilteredKeys(mergedData);
            
            // Update i18n with deleted keys
            const deletedKeys = mergedData
              .filter(t => t.isDeleted)
              .map(t => t.key);
            if (deletedKeys.length > 0) {
              i18n.setDeletedKeys(deletedKeys);
              console.log('🗑️ Updated deleted keys in i18n:', deletedKeys.length);
            }
            
            setIsLoading(false);
            return;
          }
        }
      } catch (dbError) {
        console.warn('Database load failed, using i18n only:', dbError);
      }
      
      // If database load failed, just use i18n
      console.log('📖 Using i18n translations only');
      setAllKeys(i18nData);
      setFilteredKeys(i18nData);
    } catch (error) {
      console.error('Error loading translations:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  /**
   * Save language order to localStorage
   */
  const saveLanguageOrder = (newOrder: string[]) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('languageOrder', JSON.stringify(newOrder));
    }
  };
  
  // Load data on mount
  useEffect(() => {
    loadLanguagesData();
    loadStaticTranslations();
  }, []);
  
  return {
    // State
    languages,
    allKeys,
    filteredKeys,
    isLoading,
    
    // Actions
    loadLanguagesData,
    loadStaticTranslations,
    saveLanguageOrder,
    setLanguages,
    setAllKeys,
    setFilteredKeys,
    setIsLoading
  };
}


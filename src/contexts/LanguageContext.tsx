'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import { i18n } from '@/lib/i18n';

interface LanguageContextType {
  currentLanguage: string;
  setLanguage: (code: string) => void;
  t: (key: string) => string;
  availableLanguages: Array<{ code: string; name: string }>;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [, forceUpdate] = useState({});
  const [activeLanguages, setActiveLanguages] = useState<string[]>([]);

  // Initialize language and active languages from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedLanguage = localStorage.getItem('language') || 'en';
      setCurrentLanguage(savedLanguage);
      i18n.setLanguage(savedLanguage);
      
      // Load active languages
      const savedActiveLanguages = localStorage.getItem('activeLanguages');
      if (savedActiveLanguages) {
        try {
          setActiveLanguages(JSON.parse(savedActiveLanguages));
        } catch (e) {
          console.error('Error parsing active languages:', e);
          setActiveLanguages(['en', 'fr', 'de', 'it', 'es', 'hi']); // defaults
        }
      } else {
        setActiveLanguages(['en', 'fr', 'de', 'it', 'es', 'hi']); // defaults
      }
    }
  }, []);
  
  // Listen for changes to active languages
  useEffect(() => {
    const handleStorageChange = () => {
      if (typeof window !== 'undefined') {
        const savedActiveLanguages = localStorage.getItem('activeLanguages');
        if (savedActiveLanguages) {
          try {
            setActiveLanguages(JSON.parse(savedActiveLanguages));
            forceUpdate({});
          } catch (e) {
            console.error('Error parsing active languages:', e);
          }
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    // Also listen for custom event for same-tab updates
    window.addEventListener('activeLanguagesChanged', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('activeLanguagesChanged', handleStorageChange);
    };
  }, []);

  const setLanguage = useCallback((code: string) => {
    setCurrentLanguage(code);
    i18n.setLanguage(code);
    if (typeof window !== 'undefined') {
      localStorage.setItem('language', code);
    }
    // Force re-render of all consumers
    forceUpdate({});
  }, []);

  // Memoize the translation function to depend on currentLanguage
  const t = useCallback((key: string) => {
    return i18n.t(key);
  }, []);

  // Memoize available languages - filter by active status AND preserve custom order
  const availableLanguages = useMemo(() => {
    const allLanguages = i18n.getLanguages().map(lang => ({
      code: lang.code,
      name: lang.name
    }));
    
    // If no active languages set yet, return all
    if (activeLanguages.length === 0) {
      return allLanguages;
    }
    
    // Preserve the custom order from activeLanguages array
    // This ensures the navbar displays languages in the priority order set by admin
    return activeLanguages
      .map(code => allLanguages.find(lang => lang.code === code))
      .filter(lang => lang !== undefined) as Array<{ code: string; name: string }>;
  }, [activeLanguages]);

  const value = useMemo(() => ({
    currentLanguage,
    setLanguage,
    t,
    availableLanguages
  }), [currentLanguage, setLanguage, t, availableLanguages]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}


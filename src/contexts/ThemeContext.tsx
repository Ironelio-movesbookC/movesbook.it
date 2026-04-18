'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';

export type ThemeMode = 'light' | 'dark' | 'auto' | 'time-based';
export type ResolvedTheme = 'light' | 'dark';

interface ThemeContextType {
  theme: ThemeMode;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: ThemeMode) => void;
  currentTimeInfo?: string; // For debugging/display
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children, mode }: { children: ReactNode, mode: string }) {
  const [theme, setThemeState] = useState<ThemeMode>('light');
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('light');
  const [currentTimeInfo, setCurrentTimeInfo] = useState<string>('');

  // Detect system theme preference
  const getSystemTheme = useCallback((): ResolvedTheme => {
    if (typeof window === 'undefined') return 'light';
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    return mediaQuery.matches ? 'dark' : 'light';
  }, []);

  // Get theme based on current time (6 AM - 6 PM = Light, 6 PM - 6 AM = Dark)
  const getTimeBasedTheme = useCallback((): ResolvedTheme => {
    const now = new Date();
    const hour = now.getHours();
    
    // Update time info for display
    setCurrentTimeInfo(`${hour}:${String(now.getMinutes()).padStart(2, '0')}`);
    
    // Light mode: 6 AM (6) to 6 PM (18)
    // Dark mode: 6 PM (18) to 6 AM (6)
    if (hour >= 6 && hour < 18) {
      return 'light'; // Daytime
    } else {
      return 'dark'; // Nighttime
    }
  }, []);

  // Resolve the actual theme to apply
  const resolveTheme = useCallback((themeMode: ThemeMode): ResolvedTheme => {
    if (themeMode === 'auto') {
      return getSystemTheme();
    }
    if (themeMode === 'time-based') {
      return getTimeBasedTheme();
    }
    return themeMode;
  }, [getSystemTheme, getTimeBasedTheme]);

  // Apply theme to document
  const applyTheme = useCallback((resolved: ResolvedTheme) => {
    if (typeof window === 'undefined') return;

    const root = document.documentElement;
    
    if (resolved === 'dark') {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    }
  }, []);

  // Initialize theme from localStorage or default
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = (localStorage.getItem('theme') || 'light') as ThemeMode;
      setThemeState(savedTheme);
      
      const resolved = resolveTheme(savedTheme);
      setResolvedTheme(resolved);
      applyTheme(resolved);
    }
  }, [resolveTheme, applyTheme]);

  // Listen for system theme changes (for auto mode)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = () => {
      if (theme === 'auto') {
        const newResolved = getSystemTheme();
        setResolvedTheme(newResolved);
        applyTheme(newResolved);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, [theme, getSystemTheme, applyTheme]);

  // Listen for time changes (for time-based mode)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (theme !== 'time-based') return;

    // Check every minute if theme should change
    const interval = setInterval(() => {
      const newResolved = getTimeBasedTheme();
      if (newResolved !== resolvedTheme) {
        setResolvedTheme(newResolved);
        applyTheme(newResolved);
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [theme, resolvedTheme, getTimeBasedTheme, applyTheme]);

  // Listen for storage changes (cross-tab sync)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'theme' && e.newValue) {
        const newTheme = e.newValue as ThemeMode;
        setThemeState(newTheme);
        const resolved = resolveTheme(newTheme);
        setResolvedTheme(resolved);
        applyTheme(resolved);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [resolveTheme, applyTheme]);

  // Public method to set theme
  const setTheme = useCallback((newTheme: ThemeMode) => {
    setThemeState(newTheme);
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', newTheme);
    }
    
    const resolved = resolveTheme(newTheme);
    setResolvedTheme(resolved);
    applyTheme(resolved);
  }, [resolveTheme, applyTheme]);

  const value = useMemo(() => ({
    theme,
    resolvedTheme,
    setTheme,
    currentTimeInfo
  }), [theme, resolvedTheme, setTheme, currentTimeInfo]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}


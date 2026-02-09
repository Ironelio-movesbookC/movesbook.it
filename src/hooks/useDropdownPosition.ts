import { useState, useRef, useEffect, useCallback } from 'react';

interface DropdownPosition {
  top: number;
  left: number;
}

interface UseDropdownPositionReturn {
  isOpen: boolean;
  dropdownPosition: DropdownPosition;
  dropdownRef: React.RefObject<HTMLDivElement>;
  dropdownContentRef: React.RefObject<HTMLDivElement>;
  buttonRef: React.RefObject<HTMLButtonElement>;
  isMounted: boolean;
  openDropdown: () => void;
  closeDropdown: () => void;
  toggleDropdown: () => void;
}

/**
 * Custom hook for managing dropdown position with React Portal
 * Extracted from DayRowTable.tsx
 * 
 * Handles:
 * - Dropdown open/close state
 * - Dynamic position calculation
 * - Scroll/resize event listeners
 * - Click outside to close
 * - Smooth position updates with requestAnimationFrame
 */
export function useDropdownPosition(): UseDropdownPositionReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<DropdownPosition>({ 
    top: 0, 
    left: 0 
  });
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const dropdownContentRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  
  // Set mounted state
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  /**
   * Update dropdown position based on button position
   */
  const updateDropdownPosition = useCallback(() => {
    if (buttonRef.current && isOpen) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 4,
        left: rect.left
      });
    }
  }, [isOpen]);
  
  /**
   * Update position when dropdown opens
   */
  useEffect(() => {
    if (isOpen) {
      updateDropdownPosition();
    }
  }, [isOpen, updateDropdownPosition]);
  
  /**
   * Update position on scroll/resize with smooth animation frame
   */
  useEffect(() => {
    if (!isOpen) return;
    
    let rafId: number | null = null;
    let isUpdating = false;
    
    const handleScrollOrResize = () => {
      if (isUpdating) return;
      
      isUpdating = true;
      rafId = requestAnimationFrame(() => {
        updateDropdownPosition();
        isUpdating = false;
      });
    };
    
    // Listen to scroll on window and all scrollable parents
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    
    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [isOpen, updateDropdownPosition]);
  
  /**
   * Close dropdown when clicking outside
   */
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      // Check if click is outside both the button and the dropdown content
      if (
        buttonRef.current && !buttonRef.current.contains(target) &&
        dropdownContentRef.current && !dropdownContentRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);
  
  // Action functions
  const openDropdown = () => setIsOpen(true);
  const closeDropdown = () => setIsOpen(false);
  const toggleDropdown = () => setIsOpen(prev => !prev);
  
  return {
    isOpen,
    dropdownPosition,
    dropdownRef,
    dropdownContentRef,
    buttonRef,
    isMounted,
    openDropdown,
    closeDropdown,
    toggleDropdown
  };
}


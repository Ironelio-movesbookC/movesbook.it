import { useState, useEffect, useRef, useCallback } from 'react';
import { DEFAULT_COLUMN_WIDTHS } from '@/constants/language.constants';

interface ColumnWidths {
  [key: string]: number;
}

interface UseColumnResizeReturn {
  // State
  columnWidths: ColumnWidths;
  resizingColumn: string | null;
  scrollbarWidth: number;
  scrollbarLeft: number;
  scrollbarContainerWidth: number;
  
  // Refs
  tableContainerRef: React.RefObject<HTMLDivElement>;
  scrollbarRef: React.RefObject<HTMLDivElement>;
  
  // Actions
  startResize: (columnName: string, startX: number, startWidth: number) => void;
  setColumnWidths: React.Dispatch<React.SetStateAction<ColumnWidths>>;
}

/**
 * Custom hook for managing table column resizing
 * Extracted from LanguageSettings.tsx
 * 
 * Handles:
 * - Column drag-to-resize functionality
 * - Scrollbar width synchronization
 * - Mouse event listeners for dragging
 */
export function useColumnResize(activeTab: string): UseColumnResizeReturn {
  const [columnWidths, setColumnWidths] = useState<ColumnWidths>(DEFAULT_COLUMN_WIDTHS);
  const [resizingColumn, setResizingColumn] = useState<string | null>(null);
  const [resizeStartX, setResizeStartX] = useState(0);
  const [resizeStartWidth, setResizeStartWidth] = useState(0);
  const [scrollbarWidth, setScrollbarWidth] = useState(0);
  const [scrollbarLeft, setScrollbarLeft] = useState(0);
  const [scrollbarContainerWidth, setScrollbarContainerWidth] = useState(0);
  
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const scrollbarRef = useRef<HTMLDivElement>(null);
  
  /**
   * Start column resize
   */
  const startResize = (columnName: string, startX: number, startWidth: number) => {
    setResizingColumn(columnName);
    setResizeStartX(startX);
    setResizeStartWidth(startWidth);
  };
  
  /**
   * Handle mouse move during resize
   */
  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (!resizingColumn) return;
    
    const diff = e.clientX - resizeStartX;
    const newWidth = Math.max(60, resizeStartWidth + diff);
    
    setColumnWidths(prev => ({
      ...prev,
      [resizingColumn]: newWidth
    }));
    
    // Update scrollbar width after resize
    const tableContainer = tableContainerRef.current;
    if (tableContainer) {
      const table = tableContainer.querySelector('table');
      if (table) {
        setScrollbarWidth(table.scrollWidth);
      }
    }
  }, [resizingColumn, resizeStartX, resizeStartWidth]);
  
  /**
   * Handle mouse up to end resize
   */
  const handleResizeEnd = useCallback(() => {
    setResizingColumn(null);
  }, []);
  
  /**
   * Add mouse event listeners for column resizing
   */
  useEffect(() => {
    if (resizingColumn) {
      document.addEventListener('mousemove', handleResizeMove);
      document.addEventListener('mouseup', handleResizeEnd);
      
      return () => {
        document.removeEventListener('mousemove', handleResizeMove);
        document.removeEventListener('mouseup', handleResizeEnd);
      };
    }
  }, [resizingColumn, handleResizeMove, handleResizeEnd]);
  
  /**
   * Sync scrollbar with table container
   */
  useEffect(() => {
    if (activeTab !== 'settings') {
      // Reset when not on settings tab
      setScrollbarWidth(0);
      setScrollbarLeft(0);
      setScrollbarContainerWidth(0);
      return;
    }
    
    const tableContainer = tableContainerRef.current;
    const scrollbar = scrollbarRef.current;
    
    if (!tableContainer) {
      return;
    }
    
    // Set scrollbar width and position to match table container
    const updateScrollbarWidth = () => {
      const table = tableContainer.querySelector('table');
      const rect = tableContainer.getBoundingClientRect();
      if (table && rect) {
        const totalWidth = Object.values(columnWidths).reduce((sum, w) => sum + w, 0);
        const contentWidth = Math.max(totalWidth, 1400);
        
        setScrollbarWidth(contentWidth);
        setScrollbarLeft(rect.left);
        setScrollbarContainerWidth(rect.width);
      }
    };
    
    // Initial updates
    updateScrollbarWidth();
    setTimeout(updateScrollbarWidth, 100);
    setTimeout(updateScrollbarWidth, 500);
    
    window.addEventListener('resize', updateScrollbarWidth);
    window.addEventListener('scroll', updateScrollbarWidth);
    
    if (scrollbar) {
      // Sync scrollbar with table
      const handleTableScroll = () => {
        scrollbar.scrollLeft = tableContainer.scrollLeft;
      };
      
      const handleScrollbarScroll = () => {
        tableContainer.scrollLeft = scrollbar.scrollLeft;
      };
      
      tableContainer.addEventListener('scroll', handleTableScroll);
      scrollbar.addEventListener('scroll', handleScrollbarScroll);
      
      return () => {
        window.removeEventListener('resize', updateScrollbarWidth);
        window.removeEventListener('scroll', updateScrollbarWidth);
        tableContainer.removeEventListener('scroll', handleTableScroll);
        scrollbar.removeEventListener('scroll', handleScrollbarScroll);
      };
    }
    
    return () => {
      window.removeEventListener('resize', updateScrollbarWidth);
      window.removeEventListener('scroll', updateScrollbarWidth);
    };
  }, [activeTab, columnWidths]);
  
  return {
    // State
    columnWidths,
    resizingColumn,
    scrollbarWidth,
    scrollbarLeft,
    scrollbarContainerWidth,
    
    // Refs
    tableContainerRef,
    scrollbarRef,
    
    // Actions
    startResize,
    setColumnWidths
  };
}


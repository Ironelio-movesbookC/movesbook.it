/**
 * Custom Hook for Managing Table Column Configurations
 * Handles column visibility, reordering, and localStorage persistence
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  ColumnConfig, 
  DEFAULT_WORKOUT_COLUMNS,
  DEFAULT_MOVEFRAME_COLUMNS,
  DEFAULT_MOVELAP_COLUMNS,
  COLUMN_CONFIG_STORAGE_KEYS 
} from '@/config/table.columns.config';

type TableType = 'workout' | 'moveframe' | 'movelap' | 'nutritionFood' | 'nutritionComponent';

function normalizeTableType(tableType: TableType): 'workout' | 'moveframe' | 'movelap' {
  if (tableType === 'nutritionFood') return 'moveframe';
  if (tableType === 'nutritionComponent') return 'movelap';
  return tableType;
}

export function useTableColumns(tableType: TableType) {
  const normalizedType = normalizeTableType(tableType);
  const [columns, setColumns] = useState<ColumnConfig[]>(() => {
    // Initialize with default columns based on table type
    switch (normalizedType) {
      case 'workout':
        return DEFAULT_WORKOUT_COLUMNS;
      case 'moveframe':
        return DEFAULT_MOVEFRAME_COLUMNS;
      case 'movelap':
        return DEFAULT_MOVELAP_COLUMNS;
      default:
        return [];
    }
  });

  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

  // Load column configuration from localStorage on mount
  useEffect(() => {
    const storageKey = getStorageKey(normalizedType);
    const versionKey = `${storageKey}_version`;
    const currentVersion = '2.0'; // Increment this to force reset
    const saved = localStorage.getItem(storageKey);
    const savedVersion = localStorage.getItem(versionKey);
    
    // Force reset if version mismatch or no version
    if (savedVersion !== currentVersion) {
      console.log(`Column config version mismatch. Resetting ${tableType} columns...`);
      let defaultColumns: ColumnConfig[];
      switch (normalizedType) {
        case 'workout':
          defaultColumns = DEFAULT_WORKOUT_COLUMNS;
          break;
        case 'moveframe':
          defaultColumns = DEFAULT_MOVEFRAME_COLUMNS;
          break;
        case 'movelap':
          defaultColumns = DEFAULT_MOVELAP_COLUMNS;
          break;
        default:
          defaultColumns = [];
      }
      localStorage.setItem(storageKey, JSON.stringify(defaultColumns));
      localStorage.setItem(versionKey, currentVersion);
      setColumns(defaultColumns);
      return;
    }
    
    if (saved) {
      try {
        const savedColumns = JSON.parse(saved) as ColumnConfig[];
        setColumns(savedColumns);
      } catch (error) {
        console.error('Failed to load column config:', error);
      }
    }
  }, [normalizedType]);

  // Save column configuration to localStorage
  const saveColumns = useCallback((newColumns: ColumnConfig[]) => {
    const storageKey = getStorageKey(normalizedType);
    localStorage.setItem(storageKey, JSON.stringify(newColumns));
    setColumns(newColumns);
  }, [normalizedType]);

  // Toggle column visibility
  const toggleColumn = useCallback((columnId: string) => {
    const newColumns = columns.map(col => {
      if (col.id === columnId && !col.required) {
        return { ...col, visible: !col.visible };
      }
      return col;
    });
    saveColumns(newColumns);
  }, [columns, saveColumns]);

  // Reset to default configuration
  const resetToDefault = useCallback(() => {
    let defaultColumns: ColumnConfig[];
    switch (normalizedType) {
      case 'workout':
        defaultColumns = DEFAULT_WORKOUT_COLUMNS;
        break;
      case 'moveframe':
        defaultColumns = DEFAULT_MOVEFRAME_COLUMNS;
        break;
      case 'movelap':
        defaultColumns = DEFAULT_MOVELAP_COLUMNS;
        break;
      default:
        defaultColumns = [];
    }
    saveColumns(defaultColumns);
  }, [normalizedType, saveColumns]);

  // Get only visible columns
  const visibleColumns = columns.filter(col => col.visible);

  // Get column count (excluding Options column which is always visible)
  const visibleColumnCount = visibleColumns.length;

  return {
    columns,
    visibleColumns,
    visibleColumnCount,
    toggleColumn,
    resetToDefault,
    saveColumns,
    isConfigModalOpen,
    setIsConfigModalOpen
  };
}

// Helper function to get storage key
function getStorageKey(tableType: 'workout' | 'moveframe' | 'movelap'): string {
  switch (tableType) {
    case 'workout':
      return COLUMN_CONFIG_STORAGE_KEYS.WORKOUT;
    case 'moveframe':
      return COLUMN_CONFIG_STORAGE_KEYS.MOVEFRAME;
    case 'movelap':
      return COLUMN_CONFIG_STORAGE_KEYS.MOVELAP;
    default:
      return 'table_columns';
  }
}


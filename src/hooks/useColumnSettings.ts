import { useState, useEffect } from 'react';
import { ColumnSettings, getDefaultColumnSettings, type ColumnTableType } from '@/types/columnSettings';

const STORAGE_KEY = 'workout_column_settings';

function normalizeColumnTableType(
  tableType: ColumnTableType
): 'day' | 'workout' | 'moveframe' | 'movelap' {
  if (tableType === 'nutritionFood') return 'moveframe';
  if (tableType === 'nutritionComponent') return 'movelap';
  return tableType;
}

// Helper function to migrate settings when new columns are added
function migrateTableSettings(
  saved: { visibleColumns: string[]; columnOrder: string[] } | undefined,
  defaults: { visibleColumns: string[]; columnOrder: string[] },
  tableType: string
): { visibleColumns: string[]; columnOrder: string[] } {
  if (!saved || !saved.visibleColumns || saved.visibleColumns.length === 0) {
    return defaults;
  }

  // Find new columns that exist in defaults but not in saved settings
  const newColumns = defaults.columnOrder.filter(col => !saved.columnOrder.includes(col));

  if (newColumns.length > 0) {
    console.log(`🔄 Migrating ${tableType} column settings: Adding ${newColumns.length} new columns`, newColumns);
    
    // Build migrated column order by inserting new columns at their default positions
    const migratedColumnOrder: string[] = [];
    
    // Go through default order and insert columns
    defaults.columnOrder.forEach((defaultCol) => {
      if (newColumns.includes(defaultCol)) {
        // This is a new column, add it at its default position
        migratedColumnOrder.push(defaultCol);
      } else if (saved.columnOrder.includes(defaultCol)) {
        // This is an existing column that user has, keep it
        migratedColumnOrder.push(defaultCol);
      }
    });
    
    // Add any saved columns that aren't in defaults (shouldn't happen but be safe)
    saved.columnOrder.forEach(savedCol => {
      if (!migratedColumnOrder.includes(savedCol)) {
        migratedColumnOrder.push(savedCol);
      }
    });
    
    // Build visible columns list
    const migratedVisibleColumns = [...saved.visibleColumns];
    
    // Add new columns to visible list if they're visible by default
    newColumns.forEach(newCol => {
      if (defaults.visibleColumns.includes(newCol) && !migratedVisibleColumns.includes(newCol)) {
        migratedVisibleColumns.push(newCol);
      }
    });
    
    // Filter out any columns that no longer exist
    const finalVisibleColumns = migratedVisibleColumns.filter(col => 
      migratedColumnOrder.includes(col)
    );
    
    console.log(`✅ Migration complete. Column order:`, migratedColumnOrder);
    console.log(`✅ Visible columns:`, finalVisibleColumns);
    
    return {
      visibleColumns: finalVisibleColumns,
      columnOrder: migratedColumnOrder,
    };
  }

  return saved;
}

export function useColumnSettings() {
  const [settings, setSettings] = useState<ColumnSettings>(() => {
    // Load from localStorage on mount
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          // Migrate settings to include any new columns
          const migrated = {
            day: migrateTableSettings(parsed.day, getDefaultColumnSettings('day'), 'day'),
            workout: migrateTableSettings(parsed.workout, getDefaultColumnSettings('workout'), 'workout'),
            moveframe: migrateTableSettings(parsed.moveframe, getDefaultColumnSettings('moveframe'), 'moveframe'),
            movelap: migrateTableSettings(parsed.movelap, getDefaultColumnSettings('movelap'), 'movelap'),
          };
          return migrated;
        } catch (e) {
          console.error('Failed to parse column settings:', e);
        }
      }
    }
    
    // Return default settings
    return {
      day: getDefaultColumnSettings('day'),
      workout: getDefaultColumnSettings('workout'),
      moveframe: getDefaultColumnSettings('moveframe'),
      movelap: getDefaultColumnSettings('movelap'),
    };
  });

  // Save to localStorage whenever settings change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    }
  }, [settings]);

  const updateTableSettings = (
    tableType: ColumnTableType,
    visibleColumns: string[],
    columnOrder?: string[]
  ) => {
    const key = normalizeColumnTableType(tableType);
    setSettings(prev => ({
      ...prev,
      [key]: {
        visibleColumns,
        columnOrder: columnOrder || prev[key]?.columnOrder || [],
      },
    }));
  };

  const resetTableSettings = (tableType: ColumnTableType) => {
    const key = normalizeColumnTableType(tableType);
    setSettings(prev => ({
      ...prev,
      [key]: getDefaultColumnSettings(tableType),
    }));
  };

  const resetAllSettings = () => {
    setSettings({
      day: getDefaultColumnSettings('day'),
      workout: getDefaultColumnSettings('workout'),
      moveframe: getDefaultColumnSettings('moveframe'),
      movelap: getDefaultColumnSettings('movelap'),
    });
  };

  const isColumnVisible = (tableType: ColumnTableType, columnId: string): boolean => {
    const key = normalizeColumnTableType(tableType);
    const visibleColumns = settings[key]?.visibleColumns;
    // If no settings exist, default to showing the column
    if (!visibleColumns || visibleColumns.length === 0) {
      return true;
    }
    return visibleColumns.includes(columnId);
  };

  const getVisibleColumns = (tableType: ColumnTableType): string[] => {
    const key = normalizeColumnTableType(tableType);
    return settings[key]?.visibleColumns || [];
  };

  const getColumnOrder = (tableType: ColumnTableType): string[] => {
    const key = normalizeColumnTableType(tableType);
    return settings[key]?.columnOrder || [];
  };

  return {
    settings,
    updateTableSettings,
    resetTableSettings,
    resetAllSettings,
    isColumnVisible,
    getVisibleColumns,
    getColumnOrder,
  };
}


import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUserSettings } from '@/hooks/useUserSettings';

interface ColorSettings {
  pageBackground: string;
  pageBackgroundOpacity: number;
  weekHeader: string;
  weekHeaderText: string;
  dayHeader: string;
  dayHeaderText: string;
  dayAlternateRow: string;
  dayAlternateRowText: string;
  workoutHeader: string;
  workoutHeaderText: string;
  workout2Header: string;
  workout2HeaderText: string;
  workout3Header: string;
  workout3HeaderText: string;
  moveframeHeader: string;
  moveframeHeaderText: string;
  movelapHeader: string;
  movelapHeaderText: string;
  microlapBackground: string;
  microlapText: string;
  selectedRow: string;
  selectedRowText: string;
  alternateRow: string;
  alternateRowText: string;
  alternateRowMovelap: string;
  alternateRowTextMovelap: string;
  buttonAdd: string;
  buttonAddHover: string;
  buttonAddText: string;
  buttonAddHeaderText: string;
  buttonEdit: string;
  buttonEditHover: string;
  buttonEditText: string;
  buttonDelete: string;
  buttonDeleteHover: string;
  buttonDeleteText: string;
  buttonPrint: string;
  buttonPrintHover: string;
  buttonPrintText: string;
  buttonEditHeaderText: string;
  buttonDeleteHeaderText: string;
  buttonPrintHeaderText: string;
  selectedRowMovelap: string;
  selectedRowTextMovelap: string;
  selectedRowMoveframe: string;
  selectedRowTextMoveframe: string;
  alternateRowMoveframe: string;
  alternateRowTextMoveframe: string;
  alternateRowmoveframe: string;
  alternateRowTextmoveframe: string;
  dayBorderEnabled?: boolean;
  dayBorderColor?: string;
  dayBorderWidth?: string;
  workoutBorderEnabled?: boolean;
  workoutBorderColor?: string;
  workoutBorderWidth?: string;
  moveframeBorderEnabled?: boolean;
  moveframeBorderColor?: string;
  moveframeBorderWidth?: string;
  movelapBorderEnabled?: boolean;
  movelapBorderColor?: string;
  movelapBorderWidth?: string;
  movelapTextColorSource?: 'table' | 'rows';
  movelapRows?: any;
}

const defaultColors: ColorSettings = {
  pageBackground: '#eeefe6',
  pageBackgroundOpacity: 89,
  weekHeader: '#6b7cde',
  weekHeaderText: '#ffffff',
  dayHeader: '#5168c2',
  dayHeaderText: '#e6e6ad',
  dayAlternateRow: '#e0f2fe',
  dayAlternateRowText: '#0c4a6e',
  workoutHeader: '#c6f8e2',
  workoutHeaderText: '#2386d1',
  workout2Header: '#fed7aa',
  workout2HeaderText: '#9a3412',
  workout3Header: '#c6f8e2',
  workout3HeaderText: '#2386d1',
  moveframeHeader: '#f7f2bb',
  moveframeHeaderText: '#f61909',
  movelapHeader: '#f7f7f7',
  movelapHeaderText: '#f50a2d',
  microlapBackground: '#f1f5f9',
  microlapText: '#334155',
  selectedRow: '#fef08a',
  selectedRowText: '#ef4444',
  alternateRow: '#f1f5f9',
  alternateRowText: '#1e293b',
  alternateRowMovelap: '#dbeafe',
  alternateRowTextMovelap: '#1e293b',
  buttonAdd: '#10b981',
  buttonAddHover: '#059669',
  buttonAddText: '#ffffff',
  buttonAddHeaderText: '#ffffff',
  buttonEdit: '#f59e0b',
  buttonEditHover: '#d97706',
  buttonEditText: '#ffffff',
  buttonDelete: '#ef4444',
  buttonDeleteHover: '#dc2626',
  buttonDeleteText: '#ffffff',
  buttonPrint: '#6b7280',
  buttonPrintHover: '#4b5563',
  buttonPrintText: '#ffffff',
  buttonPrintHeaderText: '#ffffff',
  buttonEditHeaderText: '#ffffff',
  buttonDeleteHeaderText: '#ffffff',
  selectedRowMovelap: '#fef08a',
  selectedRowTextMovelap: '#ef4444',
  alternateRowMoveframe: '#fef3c7',
  alternateRowTextMoveframe: '#ef4444',
  selectedRowMoveframe: '#fef08a',
  selectedRowTextMoveframe: '#ef4444',
  alternateRowmoveframe: '#dbeafe',
  alternateRowTextmoveframe: '#1e293b',
  movelapTextColorSource: 'table',
  dayBorderEnabled: false,
  dayBorderColor: '#000000',
  dayBorderWidth: 'normal',
  workoutBorderEnabled: false,
  workoutBorderColor: '#000000',
  workoutBorderWidth: 'normal',
  moveframeBorderEnabled: false,
  moveframeBorderColor: '#000000',
  moveframeBorderWidth: 'normal',
  movelapBorderEnabled: false,
  movelapBorderColor: '#000000',
  movelapBorderWidth: 'normal'
};

export function useColorSettings() {
  const { user } = useAuth();
  const { settings: dbSettings, loading } = useUserSettings(user?.id);
  const [colors, setColors] = useState<ColorSettings>(defaultColors);

  useEffect(() => {
    if (dbSettings && !loading) {
      if (dbSettings.colorSettings) {
        try {
          const loadedColors = typeof dbSettings.colorSettings === 'string'
            ? JSON.parse(dbSettings.colorSettings)
            : dbSettings.colorSettings;

          if (loadedColors && Object.keys(loadedColors).length > 0) {
            console.log('✅ Color settings loaded from database:', {
              weekHeader: loadedColors.weekHeader,
              dayHeader: loadedColors.dayHeader,
              workoutHeader: loadedColors.workoutHeader,
              totalKeys: Object.keys(loadedColors).length
            });
            setColors({ ...defaultColors, ...loadedColors });
          }
        } catch (error) {
          console.error('❌ Failed to parse color settings:', error);
        }
      } else {
        console.log('ℹ️ No custom color settings found, using defaults');
      }
    }
  }, [dbSettings, loading]);

  // Helper function to get border style
  const getBorderStyle = (type: 'day' | 'workout' | 'moveframe' | 'movelap' | 'nutritionFood' | 'nutritionComponent') => {
    const normalizedType =
      type === 'nutritionFood' ? 'moveframe' :
      type === 'nutritionComponent' ? 'movelap' :
      type;
    const enabled = colors[`${normalizedType}BorderEnabled` as keyof ColorSettings];
    const color = colors[`${normalizedType}BorderColor` as keyof ColorSettings];
    const width = colors[`${normalizedType}BorderWidth` as keyof ColorSettings];

    if (!enabled) return undefined;

    const widthPx = 
      width === 'very-thin' ? '1px' :
      width === 'thin' ? '2px' :
      width === 'thick' ? '4px' : '3px';

    return `${widthPx} solid ${color}`;
  };

  return {
    colors,
    loading,
    getBorderStyle
  };
}


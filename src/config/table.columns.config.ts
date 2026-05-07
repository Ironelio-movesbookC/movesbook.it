/**
 * Table Column Configuration
 * Defines editable column structures for Workout, Moveframe, and Movelap tables
 */

export interface ColumnConfig {
  id: string;
  label: string;
  width?: string;
  minWidth?: string;
  align?: 'left' | 'center' | 'right';
  visible: boolean;
  required?: boolean; // Cannot be hidden
  dataKey: string;
  format?: (value: any, row?: any) => string | React.ReactNode;
}

// ==================== WORKOUT TABLE COLUMNS ====================
export const DEFAULT_WORKOUT_COLUMNS: ColumnConfig[] = [
  {
    id: 'no',
    label: 'No',
    align: 'left',
    visible: true,
    required: true,
    dataKey: 'sessionNumber'
  },
  {
    id: 'match',
    label: 'Match',
    align: 'left',
    visible: false,
    dataKey: 'completionRate'
  },
  {
    id: 'sport1_name',
    label: 'Sport',
    align: 'left',
    visible: true,
    dataKey: 'sport1.name'
  },
  {
    id: 'sport1_icon',
    label: 'Ico',
    align: 'center',
    visible: true,
    dataKey: 'sport1.icon'
  },
  {
    id: 'sport1_distance',
    label: 'Dist',
    align: 'right',
    visible: true,
    dataKey: 'sport1.distance'
  },
  {
    id: 'sport1_duration',
    label: 'Dur',
    align: 'right',
    visible: false,
    dataKey: 'sport1.duration'
  },
  {
    id: 'sport1_k',
    label: 'K',
    align: 'center',
    visible: false,
    dataKey: 'sport1.k'
  },
  {
    id: 'sport2_name',
    label: 'Sport',
    align: 'left',
    visible: true,
    dataKey: 'sport2.name'
  },
  {
    id: 'sport2_icon',
    label: 'Ico',
    align: 'center',
    visible: true,
    dataKey: 'sport2.icon'
  },
  {
    id: 'sport2_distance',
    label: 'Dist',
    align: 'right',
    visible: true,
    dataKey: 'sport2.distance'
  },
  {
    id: 'sport2_duration',
    label: 'Dur',
    align: 'right',
    visible: false,
    dataKey: 'sport2.duration'
  },
  {
    id: 'sport2_k',
    label: 'K',
    align: 'center',
    visible: false,
    dataKey: 'sport2.k'
  },
  {
    id: 'sport3_name',
    label: 'Sport',
    align: 'left',
    visible: false,
    dataKey: 'sport3.name'
  },
  {
    id: 'sport3_icon',
    label: 'Ico',
    align: 'center',
    visible: false,
    dataKey: 'sport3.icon'
  },
  {
    id: 'sport3_distance',
    label: 'Dist',
    align: 'right',
    visible: false,
    dataKey: 'sport3.distance'
  },
  {
    id: 'sport3_duration',
    label: 'Dur',
    align: 'right',
    visible: false,
    dataKey: 'sport3.duration'
  },
  {
    id: 'sport3_k',
    label: 'K',
    align: 'center',
    visible: false,
    dataKey: 'sport3.k'
  },
  {
    id: 'sport4_name',
    label: 'Sport',
    align: 'left',
    visible: false,
    dataKey: 'sport4.name'
  },
  {
    id: 'sport4_icon',
    label: 'Ico',
    align: 'center',
    visible: false,
    dataKey: 'sport4.icon'
  },
  {
    id: 'sport4_distance',
    label: 'Dist',
    align: 'right',
    visible: false,
    dataKey: 'sport4.distance'
  },
  {
    id: 'sport4_duration',
    label: 'Dur',
    align: 'right',
    visible: false,
    dataKey: 'sport4.duration'
  },
  {
    id: 'sport4_k',
    label: 'K',
    align: 'center',
    visible: false,
    dataKey: 'sport4.k'
  }
];

// ==================== MOVEFRAME TABLE COLUMNS ====================
export const DEFAULT_MOVEFRAME_COLUMNS: ColumnConfig[] = [
  {
    id: 'mf',
    label: 'MF',
    align: 'center',
    visible: true,
    required: true,
    dataKey: 'letter'
  },
  {
    id: 'color',
    label: 'Col',
    align: 'center',
    visible: false,
    dataKey: 'section.color'
  },
  {
    id: 'type',
    label: 'Type',
    align: 'left',
    visible: true,
    dataKey: 'section.name'
  },
  {
    id: 'sport',
    label: 'Sport',
    align: 'left',
    visible: true,
    dataKey: 'sport'
  },
  {
    id: 'description',
    label: 'Description',
    align: 'left',
    visible: true,
    dataKey: 'description'
  },
  {
    id: 'repetitions',
    label: 'Rip\\Sets',
    align: 'center',
    visible: true,
    dataKey: 'movelaps.length'
  },
  {
    id: 'total_distance',
    label: 'Dist/Dur',
    align: 'right',
    visible: true,
    dataKey: 'totalDistance'
  },
  {
    id: 'macro',
    label: 'Macro',
    align: 'center',
    visible: false,
    dataKey: 'macro'
  },
  {
    id: 'alarm',
    label: 'Alarm',
    align: 'center',
    visible: false,
    dataKey: 'alarm'
  },
  {
    id: 'notes',
    label: 'Notes',
    align: 'left',
    visible: false,
    dataKey: 'notes'
  }
];

// ==================== MOVELAP TABLE COLUMNS ====================
export const DEFAULT_MOVELAP_COLUMNS: ColumnConfig[] = [
  {
    id: 'mf',
    label: 'MF',
    align: 'center',
    visible: true,
    required: true,
    dataKey: 'moveframeCode'
  },
  {
    id: 'color',
    label: 'Col',
    align: 'center',
    visible: false,
    dataKey: 'color'
  },
  {
    id: 'section_name',
    label: 'Sec',
    align: 'left',
    visible: false,
    dataKey: 'section.name'
  },
  {
    id: 'sport',
    label: 'Sport',
    align: 'left',
    visible: true,
    dataKey: 'sport'
  },
  {
    id: 'distance',
    label: 'Dist/Dur',
    align: 'right',
    visible: true,
    dataKey: 'distance'
  },
  {
    id: 'style',
    label: 'Style',
    align: 'center',
    visible: true,
    dataKey: 'style'
  },
  {
    id: 'speed',
    label: 'Spd',
    align: 'center',
    visible: true,
    dataKey: 'speed'
  },
  {
    id: 'time',
    label: 'Time',
    align: 'center',
    visible: true,
    dataKey: 'time'
  },
  {
    id: 'pace',
    label: 'Pace',
    align: 'center',
    visible: false,
    dataKey: 'pace'
  },
  {
    id: 'rec',
    label: 'Rec',
    align: 'center',
    visible: true,
    dataKey: 'pause'
  },
  {
    id: 'rest_to',
    label: 'Rest',
    align: 'center',
    visible: false,
    dataKey: 'restType'
  },
  {
    id: 'aim_sound',
    label: 'Snd',
    align: 'center',
    visible: false,
    dataKey: 'alarm'
  },
  {
    id: 'annotation',
    label: 'Note',
    align: 'left',
    visible: true,
    dataKey: 'notes'
  },
  {
    id: 'heartrate',
    label: 'HR',
    align: 'center',
    visible: false,
    dataKey: 'heartRate'
  },
  {
    id: 'calories',
    label: 'Cal',
    align: 'center',
    visible: false,
    dataKey: 'calories'
  }
];

// ==================== STORAGE KEYS ====================
export const COLUMN_CONFIG_STORAGE_KEYS = {
  WORKOUT: 'workout_table_columns',
  MOVEFRAME: 'moveframe_table_columns',
  MOVELAP: 'movelap_table_columns'
} as const;


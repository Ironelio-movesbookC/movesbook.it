// Column Settings Types

export interface ColumnDefinition {
  id: string;
  label: string;
  defaultVisible: boolean;
  required?: boolean; // Cannot be hidden
  description?: string;
}

export interface ColumnSettings {
  [tableType: string]: {
    visibleColumns: string[];
    columnOrder: string[];
  };
}

// Day Row Table Columns
export const DAY_ROW_COLUMNS: ColumnDefinition[] = [
  { id: 'drag', label: '::', defaultVisible: true, required: true, description: 'Drag handle' },
  { id: 'day', label: 'Day', defaultVisible: true, required: true, description: 'Day of week' },
  { id: 'date', label: 'Date', defaultVisible: true, required: true, description: 'Date' },
  { id: 'period', label: 'Period', defaultVisible: true, description: 'Training period' },
  { id: 'weekNumber', label: 'Week#', defaultVisible: true, description: 'Week number' },
  { id: 'dayType', label: 'Day Type', defaultVisible: true, description: 'Type of day' },
  { id: 'weather', label: 'Weather', defaultVisible: false, description: 'Weather conditions' },
  { id: 'location', label: 'Location', defaultVisible: false, description: 'Training location' },
  { id: 'notes', label: 'Notes', defaultVisible: false, description: 'Day notes' },
  { id: 'options', label: 'Options', defaultVisible: true, required: true, description: 'Action buttons' },
];

// Workout Table Columns
export const WORKOUT_COLUMNS: ColumnDefinition[] = [
  { id: 'drag', label: '::', defaultVisible: true, required: true, description: 'Drag handle' },
  { id: 'session', label: 'Session', defaultVisible: true, required: true, description: 'Workout session number' },
  { id: 'name', label: 'Name', defaultVisible: true, description: 'Workout name' },
  { id: 'code', label: 'Code', defaultVisible: false, description: 'Workout code' },
  { id: 'time', label: 'Time', defaultVisible: true, description: 'Workout time' },
  { id: 'location', label: 'Location', defaultVisible: false, description: 'Workout location' },
  { id: 'weather', label: 'Weather', defaultVisible: false, description: 'Weather' },
  { id: 'heartRateMax', label: 'HR Max', defaultVisible: false, description: 'Max heart rate' },
  { id: 'heartRateAvg', label: 'HR Avg', defaultVisible: false, description: 'Avg heart rate' },
  { id: 'calories', label: 'Calories', defaultVisible: false, description: 'Calories burned' },
  { id: 'feeling', label: 'Feeling', defaultVisible: true, description: 'How you felt' },
  { id: 'notes', label: 'Notes', defaultVisible: false, description: 'Workout notes' },
  { id: 'actions', label: 'Actions', defaultVisible: true, required: true, description: 'Action buttons' },
];

// Moveframe Table Columns
export const MOVEFRAME_COLUMNS: ColumnDefinition[] = [
  { id: 'drag', label: '⋮⋮', defaultVisible: true, required: true, description: 'Drag to reorder' },
  { id: 'expand', label: '::', defaultVisible: true, required: true, description: 'Expand/Collapse' },
  { id: 'index', label: '#', defaultVisible: true, description: 'Index' },
  { id: 'mf', label: 'MF', defaultVisible: true, required: true, description: 'Moveframe letter' },
  { id: 'section', label: 'Workout section', defaultVisible: true, description: 'Workout section' },
  { id: 'icon', label: 'Ico', defaultVisible: true, description: 'Sport icon' },
  { id: 'sport', label: 'Sport of the moveframe', defaultVisible: true, required: true, description: 'Sport type' },
  { id: 'description', label: 'Moveframe description', defaultVisible: true, required: true, description: 'Moveframe description' },
  { id: 'duration', label: 'Duration', defaultVisible: true, description: 'Distance/Time/Series duration' },
  { id: 'rip', label: 'Rip\\Sets', defaultVisible: true, description: 'Repetitions/Sets' },
  { id: 'macro', label: 'Ave pause', defaultVisible: true, description: 'Average pause / macro rest across laps' },
  { id: 'alarm', label: 'Alarm & Sound', defaultVisible: true, description: 'Alarm settings' },
  { id: 'options', label: 'Options', defaultVisible: true, required: true, description: 'Action buttons' },
];

// Movelap Table Columns
export const MOVELAP_COLUMNS: ColumnDefinition[] = [
  { id: 'number', label: '#', defaultVisible: true, required: true, description: 'Lap number' },
  { id: 'status', label: 'Status', defaultVisible: true, description: 'Completion status' },
  { id: 'distance', label: 'Distance', defaultVisible: true, description: 'Lap distance' },
  { id: 'speed', label: 'Speed', defaultVisible: true, description: 'Speed code' },
  { id: 'style', label: 'Style', defaultVisible: false, description: 'Swimming style' },
  { id: 'pace', label: 'Pace', defaultVisible: true, description: 'Pace per unit' },
  { id: 'time', label: 'Time', defaultVisible: true, description: 'Lap time' },
  { id: 'reps', label: 'Reps', defaultVisible: false, description: 'Repetitions' },
  { id: 'rest', label: 'Rest', defaultVisible: false, description: 'Rest type' },
  { id: 'pause', label: 'Pause', defaultVisible: true, description: 'Pause duration' },
  { id: 'alarm', label: 'Alarm', defaultVisible: false, description: 'Alarm setting' },
  { id: 'sound', label: 'Sound', defaultVisible: false, description: 'Sound setting' },
  { id: 'notes', label: 'Notes', defaultVisible: false, description: 'Lap notes' },
  { id: 'actions', label: 'Actions', defaultVisible: true, required: true, description: 'Action buttons' },
];

// Get default settings for a table type
export type ColumnTableType =
  | 'day'
  | 'workout'
  | 'moveframe'
  | 'movelap'
  | 'nutritionFood'
  | 'nutritionComponent';

function normalizeColumnTableType(
  tableType: ColumnTableType
): 'day' | 'workout' | 'moveframe' | 'movelap' {
  if (tableType === 'nutritionFood') return 'moveframe';
  if (tableType === 'nutritionComponent') return 'movelap';
  return tableType;
}

export function getDefaultColumnSettings(tableType: ColumnTableType): {
  visibleColumns: string[];
  columnOrder: string[];
} {
  const normalized = normalizeColumnTableType(tableType);
  let columns: ColumnDefinition[] = [];
  
  switch (normalized) {
    case 'day':
      columns = DAY_ROW_COLUMNS;
      break;
    case 'workout':
      columns = WORKOUT_COLUMNS;
      break;
    case 'moveframe':
      columns = MOVEFRAME_COLUMNS;
      break;
    case 'movelap':
      columns = MOVELAP_COLUMNS;
      break;
  }

  const visibleColumns = columns
    .filter(col => col.defaultVisible)
    .map(col => col.id);
  
  const columnOrder = columns.map(col => col.id);

  return { visibleColumns, columnOrder };
}

// Get all columns for a table type
export function getColumnsForTable(tableType: ColumnTableType): ColumnDefinition[] {
  switch (normalizeColumnTableType(tableType)) {
    case 'day':
      return DAY_ROW_COLUMNS;
    case 'workout':
      return WORKOUT_COLUMNS;
    case 'moveframe':
      return MOVEFRAME_COLUMNS;
    case 'movelap':
      return MOVELAP_COLUMNS;
    default:
      return [];
  }
}


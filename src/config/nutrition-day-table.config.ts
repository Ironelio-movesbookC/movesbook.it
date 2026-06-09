/**
 * Day Table Configuration
 * Defines column widths and sticky positions for the day row table
 */

export const DAY_TABLE_COLUMNS = {
  // Fixed-width columns (frozen on left)
  NO_WORKOUTS: {
    width: 50,
    label: 'No\nworkouts',
    className: 'w-[50px] min-w-[50px]',
  },
  COLOR_CYCLE: {
    width: 50,
    label: 'Color\ncycle',
    className: 'w-[50px] min-w-[50px]',
  },
  NAME_CYCLE: {
    width: 90,
    label: 'Name\ncycle',
    className: 'w-[90px] min-w-[90px]',
  },
  DAYNAME: {
    width: 80,
    label: 'Dayname',
    className: 'w-[80px] min-w-[80px]',
  },
  DATE: {
    width: 80,
    label: 'Date',
    className: 'w-[80px] min-w-[80px]',
  },
  MATCH_DONE: {
    width: 60,
    label: 'Match\ndone',
    className: 'w-[60px] min-w-[60px]',
  },
  WORKOUTS: {
    width: 80,
    label: 'Workouts',
    className: 'w-[80px] min-w-[80px]',
  },
  
  // Sport columns (S1-S4) - each has sub-columns
  SPORT: {
    ICON: {
      width: 40,
      label: 'ico',
      className: 'w-[40px] min-w-[40px]',
    },
    SPORT: {
      width: 80,
      label: 'Sport',
      className: 'w-[80px] min-w-[80px]',
    },
    NAME: {
      width: 90,
      label: 'name',
      className: 'w-[90px] min-w-[90px]',
    },
    DISTANCE: {
      width: 70,
      label: 'Distance',
      className: 'w-[70px] min-w-[70px]',
    },
    DURATION: {
      width: 70,
      label: 'Duration',
      className: 'w-[70px] min-w-[70px]',
    },
    K: {
      width: 40,
      label: 'K',
      className: 'w-[40px] min-w-[40px]',
    },
  },
  
  // Options column (frozen on right)
  OPTIONS: {
    width: 180,
    label: 'Options',
    className: 'w-[180px] min-w-[180px]',
  },
} as const;

/**
 * Calculate cumulative left positions for sticky columns
 */
export const STICKY_COLUMN_POSITIONS = {
  COL_1: 0,
  COL_2: DAY_TABLE_COLUMNS.NO_WORKOUTS.width,
  COL_3: DAY_TABLE_COLUMNS.NO_WORKOUTS.width + DAY_TABLE_COLUMNS.COLOR_CYCLE.width,
  COL_4: DAY_TABLE_COLUMNS.NO_WORKOUTS.width + DAY_TABLE_COLUMNS.COLOR_CYCLE.width + DAY_TABLE_COLUMNS.NAME_CYCLE.width,
  COL_5: DAY_TABLE_COLUMNS.NO_WORKOUTS.width + DAY_TABLE_COLUMNS.COLOR_CYCLE.width + DAY_TABLE_COLUMNS.NAME_CYCLE.width + DAY_TABLE_COLUMNS.DAYNAME.width,
  COL_6: DAY_TABLE_COLUMNS.NO_WORKOUTS.width + DAY_TABLE_COLUMNS.COLOR_CYCLE.width + DAY_TABLE_COLUMNS.NAME_CYCLE.width + DAY_TABLE_COLUMNS.DAYNAME.width + DAY_TABLE_COLUMNS.DATE.width,
  COL_7: DAY_TABLE_COLUMNS.NO_WORKOUTS.width + DAY_TABLE_COLUMNS.COLOR_CYCLE.width + DAY_TABLE_COLUMNS.NAME_CYCLE.width + DAY_TABLE_COLUMNS.DAYNAME.width + DAY_TABLE_COLUMNS.DATE.width + DAY_TABLE_COLUMNS.MATCH_DONE.width,
} as const;

/**
 * Total width of one sport column group (S1, S2, S3, or S4)
 */
export const SPORT_COLUMN_GROUP_WIDTH = 
  DAY_TABLE_COLUMNS.SPORT.ICON.width +
  DAY_TABLE_COLUMNS.SPORT.SPORT.width +
  DAY_TABLE_COLUMNS.SPORT.NAME.width +
  DAY_TABLE_COLUMNS.SPORT.DISTANCE.width +
  DAY_TABLE_COLUMNS.SPORT.DURATION.width +
  DAY_TABLE_COLUMNS.SPORT.K.width;

/**
 * Total number of columns in the table
 */
export const TOTAL_COLUMNS = 
  7 + // Fixed left columns
  (6 * 4) + // Sport columns (6 sub-columns × 4 sports)
  1; // Options column

console.log('Sticky Column Positions:', STICKY_COLUMN_POSITIONS);
console.log('Sport Column Width:', SPORT_COLUMN_GROUP_WIDTH);
console.log('Total Columns:', TOTAL_COLUMNS);


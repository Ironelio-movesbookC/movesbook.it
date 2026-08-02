export type FoodDatabaseSourceId =
  | 'movesbook_bundled'
  | 'fosav'
  | 'usda'
  | 'italy_tables_1'
  | 'italy_tables_2'
  | 'open_food_facts'
  | 'k_datasets_recipes';

/** import = copy into local DB (Settings → Import). live = query external API on demand. */
export type FoodDatabaseAccessMode = 'import' | 'live';

export interface FoodDatabaseSourceDefinition {
  id: FoodDatabaseSourceId;
  menuIndex?: number;
  label: string;
  shortLabel: string;
  region: string;
  description: string;
  accessMode: FoodDatabaseAccessMode;
  contentType: 'foods' | 'recipes' | 'both';
  envKeys?: string[];
}

/** Shown in the main database menu (numbered 1–6). */
export const FOOD_DATABASE_MENU_SOURCES: FoodDatabaseSourceDefinition[] = [
  {
    id: 'fosav',
    menuIndex: 1,
    label: 'Swiss Nutrition Facts Database (FOSAV)',
    shortLabel: 'FOSAV (Switzerland)',
    region: 'Switzerland',
    description: 'Swiss Food Composition Database — imported from public/nutritions/1-swiss.xlsx.',
    accessMode: 'import',
    contentType: 'foods',
  },
  {
    id: 'usda',
    menuIndex: 2,
    label: 'USDA FoodData Central (United States)',
    shortLabel: 'USDA FoodData Central',
    region: 'United States',
    description: 'Large US catalog — searched live via USDA API when selected.',
    accessMode: 'live',
    contentType: 'foods',
    envKeys: ['USDA_FDC_API_KEY'],
  },
  {
    id: 'italy_tables_1',
    menuIndex: 3,
    label: 'Food composition tables I (Italy)',
    shortLabel: 'Italy tables I',
    region: 'Italy',
    description: 'Italian food composition table I — file not bundled yet.',
    accessMode: 'import',
    contentType: 'foods',
  },
  {
    id: 'italy_tables_2',
    menuIndex: 4,
    label: 'Food composition tables II (Italy)',
    shortLabel: 'Italy tables II',
    region: 'Italy',
    description: 'Italian food composition table II — imported from public/nutritions/4-Food-composition-table-2.xlsm.',
    accessMode: 'import',
    contentType: 'foods',
  },
  {
    id: 'open_food_facts',
    menuIndex: 5,
    label: 'Open Food Facts Database',
    shortLabel: 'Open Food Facts',
    region: 'International',
    description: 'Global product catalog — searched live when selected.',
    accessMode: 'live',
    contentType: 'foods',
  },
  {
    id: 'k_datasets_recipes',
    menuIndex: 6,
    label: 'Ready recipes - K-Datasets',
    shortLabel: 'K-Datasets recipes',
    region: 'International',
    description: 'Ready-made recipes dataset — not bundled yet.',
    accessMode: 'import',
    contentType: 'recipes',
  },
];

/** Internal default dataset (bundled JSON). */
export const MOVESBOOK_BUNDLED_SOURCE: FoodDatabaseSourceDefinition = {
  id: 'movesbook_bundled',
  menuIndex: 0,
  label: 'Movesbook database',
  shortLabel: 'Movesbook default',
  region: 'Internal',
  description: 'Foods and recipes inserted by Movesbook — stored separately from imported catalogs.',
  accessMode: 'import',
  contentType: 'both',
};

export const FOOD_DATABASE_SOURCES: FoodDatabaseSourceDefinition[] = [
  MOVESBOOK_BUNDLED_SOURCE,
  ...FOOD_DATABASE_MENU_SOURCES,
];

/** Full menu: 0 = Movesbook, 1–6 = external sources. */
export const FOOD_DATABASE_DISPLAY_MENU: FoodDatabaseSourceDefinition[] = FOOD_DATABASE_SOURCES.filter(
  (s) => s.menuIndex != null
).sort((a, b) => (a.menuIndex ?? 99) - (b.menuIndex ?? 99));

export const IMPORTABLE_FOOD_DATABASE_SOURCES = FOOD_DATABASE_SOURCES.filter(
  (s) => s.accessMode === 'import'
);

export const LIVE_FOOD_DATABASE_SOURCES = FOOD_DATABASE_SOURCES.filter(
  (s) => s.accessMode === 'live'
);

export function getFoodDatabaseSource(id: string): FoodDatabaseSourceDefinition | undefined {
  return FOOD_DATABASE_SOURCES.find((s) => s.id === id);
}

export function getFoodDatabaseSourceLabel(id: string): string {
  return getFoodDatabaseSource(id)?.label ?? id;
}

export function isLiveFoodDatabaseSource(id: string): boolean {
  return getFoodDatabaseSource(id)?.accessMode === 'live';
}

export function isImportFoodDatabaseSource(id: string): boolean {
  return getFoodDatabaseSource(id)?.accessMode === 'import';
}

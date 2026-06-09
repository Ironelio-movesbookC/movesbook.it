import { NutrientTotals, EMPTY_NUTRIENT_TOTALS, sumNutrientTotals } from '@/utils/nutritionMealTotals';

export type DietArchiveFilter = 'day' | 'week' | 'list';

export interface DietArchiveLine {
  name: string;
  grams: number;
  unit: string;
}

export interface DietArchiveEntry {
  id: string;
  savedAt: string;
  mealLabel: string;
  nutritionMealId?: string;
  totalGrams: number;
  foodDescription: string;
  nutrients: NutrientTotals;
  lines: DietArchiveLine[];
}

const STORAGE_KEY = 'movesbook_diet_builder_archive';
const FAVORITES_KEY = 'movesbook_diet_builder_favorites';

export function loadDietArchive(): DietArchiveEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveDietArchiveEntry(entry: DietArchiveEntry): void {
  const list = loadDietArchive();
  list.unshift(entry);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, 500)));
}

export function deleteDietArchiveEntries(ids: string[]): void {
  const set = new Set(ids);
  const next = loadDietArchive().filter((e) => !set.has(e.id));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function loadFavoriteFoodIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

export function saveFavoriteFoodIds(ids: string[]): void {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(ids));
}

export function filterArchiveEntries(
  entries: DietArchiveEntry[],
  mode: DietArchiveFilter,
  dateFrom?: string,
  dateTo?: string
): DietArchiveEntry[] {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  let filtered = entries;

  if (mode === 'day') {
    filtered = entries.filter((e) => new Date(e.savedAt) >= startOfDay);
  } else if (mode === 'week') {
    const weekStart = new Date(startOfDay);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    filtered = entries.filter((e) => new Date(e.savedAt) >= weekStart);
  }

  if (dateFrom) {
    const from = new Date(dateFrom);
    from.setHours(0, 0, 0, 0);
    filtered = filtered.filter((e) => new Date(e.savedAt) >= from);
  }
  if (dateTo) {
    const to = new Date(dateTo);
    to.setHours(23, 59, 59, 999);
    filtered = filtered.filter((e) => new Date(e.savedAt) <= to);
  }

  return filtered;
}

export function sumArchiveNutrients(entries: DietArchiveEntry[]): NutrientTotals {
  return sumNutrientTotals(entries.map((e) => e.nutrients));
}

export function formatArchiveDate(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

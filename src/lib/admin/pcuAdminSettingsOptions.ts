import { ALL_COUNTRIES } from '@/constants/countries.constants';

/** Static options for PCU admin operator / agent assignment UI. */
export const PCU_OPERATOR_OPTIONS = [
  { value: '', label: 'List of operator' },
  { value: 'dianae', label: 'Dianae' },
] as const;

export const PCU_AGENT_OPTIONS = [
  { value: '', label: 'List of agents/sub-agents' },
  { value: 'operator-seven', label: 'OperatorSeven' },
] as const;

/** News categories (Categories of News followed by the user). */
export const PCU_NEWS_FOLLOW_CATEGORIES = [
  'Applications',
  'Events',
  'Medicine',
  'News from the world',
  'Nutritions',
  'Organizations',
  'Plugs in',
  'Software for sport',
  'Sport',
  'Sport technology',
  'Training',
  'Tools for sports',
  'Upgrade news',
] as const;

export function createNewsCategoriesState(
  selected?: Record<string, boolean>,
): Record<string, boolean> {
  const next: Record<string, boolean> = {};
  for (const cat of PCU_NEWS_FOLLOW_CATEGORIES) {
    next[cat] = Boolean(selected?.[cat]);
  }
  return next;
}

export function createVipCountriesState(
  selected?: Record<string, boolean>,
): Record<string, boolean> {
  const next: Record<string, boolean> = { all: Boolean(selected?.all) };
  for (const country of ALL_COUNTRIES) {
    next[country] = Boolean(selected?.[country]);
  }
  return next as Record<string, boolean>;
}

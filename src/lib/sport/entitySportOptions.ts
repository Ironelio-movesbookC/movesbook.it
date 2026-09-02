/** Shared sport list for team / club / coach group entity profiles + member Settings. */
export const ENTITY_SPORT_OPTIONS = [
  'Basket',
  'Baseball',
  'Calisthenic\\Pilates',
  'Cricket',
  'Cycling',
  'Fitness\\Gym',
  'Football',
  'Gymnastic',
  'Martial arts',
  'Padel',
  'Rugby',
  'Swim',
  'Tennis',
  'Track & Fields',
  'Volley',
] as const;

export type EntitySportOption = (typeof ENTITY_SPORT_OPTIONS)[number];

export const DEFAULT_ENTITY_SPORT: EntitySportOption = 'Football';

const SPORT_ALIASES: Record<string, EntitySportOption> = {
  football: 'Football',
  'track & fields': 'Track & Fields',
  'track & field': 'Track & Fields',
  'body building': 'Fitness\\Gym',
  bodybuilding: 'Fitness\\Gym',
  gym: 'Fitness\\Gym',
  fitness: 'Fitness\\Gym',
  'fitness\\gym': 'Fitness\\Gym',
  'calisthenic\\pilates': 'Calisthenic\\Pilates',
  calisthenic: 'Calisthenic\\Pilates',
  pilates: 'Calisthenic\\Pilates',
  ski: 'Fitness\\Gym',
};

/** Normalize stored / legacy sport labels to the current catalog. */
export function normalizeEntitySport(
  value: string | null | undefined,
  fallback: EntitySportOption = DEFAULT_ENTITY_SPORT,
): EntitySportOption {
  const raw = String(value ?? '').trim();
  if (!raw) return fallback;
  const exact = ENTITY_SPORT_OPTIONS.find((s) => s.toLowerCase() === raw.toLowerCase());
  if (exact) return exact;
  const aliased = SPORT_ALIASES[raw.toLowerCase()];
  if (aliased) return aliased;
  return fallback;
}

export function isFootballSport(value: string | null | undefined): boolean {
  return normalizeEntitySport(value) === 'Football';
}

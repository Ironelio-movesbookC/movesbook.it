export const ARCHIVE_OFFICIAL_COLUMN_IDS = [
  'picture',
  'trainingType',
  'recordClass',
  'workoutCount',
  'duration',
  'mainSport',
  'goal',
  'level',
  'period',
  'title',
  'createdAt',
  'sharedAt',
  'expDate',
  'language',
  'shortDescription',
  'author',
  'actions',
] as const;

export type ArchiveOfficialColumnId = (typeof ARCHIVE_OFFICIAL_COLUMN_IDS)[number];

export const ARCHIVE_OFFICIAL_COLUMN_LABELS: Record<ArchiveOfficialColumnId, string> = {
  picture: 'Picture',
  trainingType: 'Type of training',
  recordClass: 'Class',
  workoutCount: 'No. workouts',
  duration: 'Duration',
  mainSport: 'Sport',
  goal: 'Goal',
  level: 'Level',
  period: 'Period',
  title: 'Title',
  createdAt: 'Date creation',
  sharedAt: 'Sharing date',
  expDate: 'Share expiration',
  language: 'Language',
  shortDescription: 'Short description',
  author: 'User',
  actions: 'Options',
};

export const DEFAULT_ARCHIVE_COLUMN_ORDER: ArchiveOfficialColumnId[] = [
  ...ARCHIVE_OFFICIAL_COLUMN_IDS,
];

export const LS_ARCHIVE_COLUMNS_PERSONAL = 'movesbook-personal-archive-column-order-v2';
export const LS_ARCHIVE_COLUMNS_GLOBAL = 'movesbook-global-archive-column-order-v2';

export function loadArchiveColumnOrder(storageKey: string): ArchiveOfficialColumnId[] {
  if (typeof window === 'undefined') return [...DEFAULT_ARCHIVE_COLUMN_ORDER];
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return [...DEFAULT_ARCHIVE_COLUMN_ORDER];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [...DEFAULT_ARCHIVE_COLUMN_ORDER];
    const valid = parsed.filter((id): id is ArchiveOfficialColumnId =>
      ARCHIVE_OFFICIAL_COLUMN_IDS.includes(id as ArchiveOfficialColumnId)
    );
    const missing = ARCHIVE_OFFICIAL_COLUMN_IDS.filter((id) => !valid.includes(id));
    if (missing.length > 0) return [...DEFAULT_ARCHIVE_COLUMN_ORDER];
    return valid;
  } catch {
    return [...DEFAULT_ARCHIVE_COLUMN_ORDER];
  }
}

export function saveArchiveColumnOrder(storageKey: string, order: ArchiveOfficialColumnId[]) {
  localStorage.setItem(storageKey, JSON.stringify(order));
}

/** Actions column stays last when reordering. */
export function reorderArchiveColumns(
  order: ArchiveOfficialColumnId[],
  activeId: ArchiveOfficialColumnId,
  overId: ArchiveOfficialColumnId
): ArchiveOfficialColumnId[] {
  if (activeId === 'actions' || overId === 'actions') return order;
  const movable = order.filter((c) => c !== 'actions');
  const oldIndex = movable.indexOf(activeId);
  const newIndex = movable.indexOf(overId);
  if (oldIndex < 0 || newIndex < 0) return order;
  const next = [...movable];
  const [removed] = next.splice(oldIndex, 1);
  next.splice(newIndex, 0, removed);
  return [...next, 'actions'];
}

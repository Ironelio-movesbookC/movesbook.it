export const ARCHIVE_OFFICIAL_COLUMN_IDS = [
  'codeTitle',
  'nw',
  'type',
  'author',
  'mainSport',
  'goal',
  'level',
  'period',
  'language',
  'country',
  'expDate',
  'actions',
] as const;

export type ArchiveOfficialColumnId = (typeof ARCHIVE_OFFICIAL_COLUMN_IDS)[number];

export const ARCHIVE_OFFICIAL_COLUMN_LABELS: Record<ArchiveOfficialColumnId, string> = {
  codeTitle: 'Code + Title',
  nw: 'NW',
  type: 'Type',
  author: 'Author',
  mainSport: 'Main sport',
  goal: 'Goal',
  level: 'Level',
  period: 'Period',
  language: 'Language',
  country: 'Country',
  expDate: 'Exp date',
  actions: 'ACTIONS',
};

export const DEFAULT_ARCHIVE_COLUMN_ORDER: ArchiveOfficialColumnId[] = [
  ...ARCHIVE_OFFICIAL_COLUMN_IDS,
];

export const LS_ARCHIVE_COLUMNS_PERSONAL = 'movesbook-personal-archive-column-order';
export const LS_ARCHIVE_COLUMNS_GLOBAL = 'movesbook-global-archive-column-order';

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
    if (valid.length !== ARCHIVE_OFFICIAL_COLUMN_IDS.length) return [...DEFAULT_ARCHIVE_COLUMN_ORDER];
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

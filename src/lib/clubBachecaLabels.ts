export const BACHECA_LABEL_COUNT = 14;

export type BachecaLabel = {
  id: string;
  name: string;
  activated: boolean;
  content: string;
  /** Display / sort date for this section (e.g. "20 Jul 2026" or ISO). */
  updatedOn: string;
};

export type BachecaSortMode = 'date' | 'name' | 'labels';

/** Names starting with "Default" are hidden on the member-facing club site. */
export function isDefaultBachecaLabelName(name: string): boolean {
  return /^default\b/i.test(name.trim());
}

/** Member view: activated and not a Default* label. */
export function isBachecaLabelVisibleToMembers(label: BachecaLabel): boolean {
  return label.activated && !isDefaultBachecaLabelName(label.name);
}

export function filterBachecaLabelsForMembers(labels: BachecaLabel[]): BachecaLabel[] {
  return labels.filter(isBachecaLabelVisibleToMembers);
}

export function parseBachecaUpdatedOn(value: string | null | undefined): number {
  const trimmed = (value ?? '').trim();
  if (!trimmed) return 0;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const t = new Date(`${trimmed}T12:00:00`).getTime();
    return Number.isNaN(t) ? 0 : t;
  }
  const t = new Date(trimmed).getTime();
  return Number.isNaN(t) ? 0 : t;
}

export function sortBachecaLabelsForDisplay(
  labels: BachecaLabel[],
  mode: BachecaSortMode,
): BachecaLabel[] {
  const next = [...labels];
  if (mode === 'name') {
    next.sort((a, b) =>
      a.name.trim().localeCompare(b.name.trim(), undefined, { sensitivity: 'base' }),
    );
    return next;
  }
  if (mode === 'labels') {
    next.sort((a, b) => {
      try {
        return bachecaLabelSlotIndex(a.id) - bachecaLabelSlotIndex(b.id);
      } catch {
        return a.id.localeCompare(b.id);
      }
    });
    return next;
  }
  // date: most recent first
  next.sort((a, b) => {
    const diff = parseBachecaUpdatedOn(b.updatedOn) - parseBachecaUpdatedOn(a.updatedOn);
    if (diff !== 0) return diff;
    try {
      return bachecaLabelSlotIndex(a.id) - bachecaLabelSlotIndex(b.id);
    } catch {
      return a.id.localeCompare(b.id);
    }
  });
  return next;
}

const INITIAL_BACHECA_NAMES = [
  'Tracking Workout',
  'bacheca two ON',
  'Default 3',
  'bacheca four NOT',
  'Default 5',
  'Default 6 ON',
  'Default 7',
  'Default 8',
  'Default 9',
  'Default 10',
  'Default 11',
  'Default 12',
  'Default 13',
  'Default 14',
] as const;

export function createInitialBachecaLabels(): BachecaLabel[] {
  return INITIAL_BACHECA_NAMES.map((name, index) => ({
    id: `bacheca-label-${index + 1}`,
    name,
    activated: !isDefaultBachecaLabelName(name) && !/\bNOT\b/i.test(name),
    content: '',
    updatedOn: '',
  }));
}

export function bachecaLabelSlotIndex(labelId: string): number {
  const match = labelId.match(/^bacheca-label-(\d+)$/);
  if (!match) {
    throw new Error(`Invalid bacheca label id: ${labelId}`);
  }
  const slot = Number.parseInt(match[1], 10);
  if (slot < 1 || slot > BACHECA_LABEL_COUNT) {
    throw new Error(`Bacheca label slot out of range: ${slot}`);
  }
  return slot;
}

export function normalizeBachecaLabel(
  raw: Partial<BachecaLabel> & Pick<BachecaLabel, 'id' | 'name'>,
): BachecaLabel {
  return {
    id: raw.id,
    name: raw.name,
    activated: Boolean(raw.activated),
    content: typeof raw.content === 'string' ? raw.content : '',
    updatedOn: typeof raw.updatedOn === 'string' ? raw.updatedOn : '',
  };
}

export function mergeBachecaLabelsWithDefaults(stored: BachecaLabel[]): BachecaLabel[] {
  const defaults = createInitialBachecaLabels();
  const byId = new Map(stored.map((label) => [label.id, label]));
  return defaults.map((defaultLabel) => {
    const saved = byId.get(defaultLabel.id);
    return saved ? normalizeBachecaLabel(saved) : defaultLabel;
  });
}

export function isBachecaLabelDraftDirty(
  saved: BachecaLabel | undefined,
  draft: Pick<BachecaLabel, 'name' | 'activated' | 'content' | 'updatedOn'>,
): boolean {
  if (!saved) return false;
  const trimmedName = draft.name.trim();
  return (
    saved.name !== trimmedName ||
    saved.activated !== draft.activated ||
    saved.content !== draft.content ||
    (saved.updatedOn ?? '') !== (draft.updatedOn ?? '').trim()
  );
}

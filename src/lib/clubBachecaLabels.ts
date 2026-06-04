export const BACHECA_LABEL_COUNT = 14;

export type BachecaLabel = {
  id: string;
  name: string;
  activated: boolean;
  content: string;
};

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
    activated:
      !isDefaultBachecaLabelName(name) && !/\bNOT\b/i.test(name),
    content: '',
  }));
}

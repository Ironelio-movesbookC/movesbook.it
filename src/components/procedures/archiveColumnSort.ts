import type { Member } from '@/types/clubTable';

export type ArchiveSortDir = 'asc' | 'desc';

export type ArchiveSortState = {
  key: keyof Member;
  dir: ArchiveSortDir;
};

const NON_SORTABLE_KEYS = new Set(['image', 'edit', 'delete', 'options']);

export function isColumnSortable(key: keyof Member, sortable?: boolean): boolean {
  if (sortable === false) return false;
  if (sortable === true) return true;
  return !NON_SORTABLE_KEYS.has(String(key));
}

function isEmpty(value: unknown): boolean {
  return value == null || value === '' || value === '-';
}

function toComparable(value: unknown): string | number {
  if (isEmpty(value)) return '';
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'boolean') return value ? 1 : 0;

  const raw = String(value).trim();
  if (!raw || raw === '-') return '';

  const asNum = Number(raw.replace(',', '.'));
  if (raw !== '' && !Number.isNaN(asNum) && /^-?\d+(\.\d+)?$/.test(raw.replace(',', '.'))) {
    return asNum;
  }

  const asDate = Date.parse(raw);
  if (!Number.isNaN(asDate) && /\d{4}|\d{1,2}[/-]\d{1,2}/.test(raw)) {
    return asDate;
  }

  return raw.toLowerCase();
}

export function compareArchiveValues(a: unknown, b: unknown): number {
  const emptyA = isEmpty(a);
  const emptyB = isEmpty(b);
  if (emptyA && emptyB) return 0;
  if (emptyA) return 1;
  if (emptyB) return -1;

  const ca = toComparable(a);
  const cb = toComparable(b);
  if (typeof ca === 'number' && typeof cb === 'number') return ca - cb;
  return String(ca).localeCompare(String(cb), undefined, { numeric: true, sensitivity: 'base' });
}

export function sortArchiveRows<T extends Member>(
  rows: T[],
  sort: ArchiveSortState | null
): T[] {
  if (!sort) return rows;
  const { key, dir } = sort;
  const factor = dir === 'asc' ? 1 : -1;
  return [...rows].sort((ra, rb) => factor * compareArchiveValues(ra[key], rb[key]));
}

export function nextArchiveSort(
  current: ArchiveSortState | null,
  key: keyof Member
): ArchiveSortState {
  if (current?.key === key) {
    return { key, dir: current.dir === 'asc' ? 'desc' : 'asc' };
  }
  return { key, dir: 'asc' };
}

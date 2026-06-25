/** Tags on archive entries that users mark as visible to other Movesbook users. */
export const SHAREABLE_ARCHIVE_TAG = 'shareable';

export function parseArchiveTags(tags?: string | null): string[] {
  if (!tags?.trim()) return [];
  return tags
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
}

export function isShareableArchiveRecord(tags?: string | null): boolean {
  return parseArchiveTags(tags).some((t) => t.toLowerCase() === SHAREABLE_ARCHIVE_TAG);
}

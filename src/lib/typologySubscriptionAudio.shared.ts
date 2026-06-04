/** Client-safe helpers (no Node `fs` / server public dir). */

export function typologyAudioPublicUrl(userId: string, fileName: string): string {
  return `/subscription_file/playlist/User_${userId}/${fileName}`;
}

/** Normalize DB / legacy values to `YYYY-MM-DD` for `<input type="date">`. */
export function normalizeTypologyDateInput(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const [, day, month, year] = slashMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return '';
}

export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

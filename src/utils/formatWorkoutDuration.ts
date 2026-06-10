/** Parse pause/time fields that may be seconds (number) or legacy strings. */
export function parseDurationSeconds(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const s = String(value).trim();
  if (!s) return null;
  const asNum = Number(s);
  if (Number.isFinite(asNum)) return asNum;
  return null;
}

export function formatDurationSeconds(value: unknown): string {
  const seconds = parseDurationSeconds(value);
  if (seconds === null) {
    const raw = value != null && String(value).trim() ? String(value).trim() : '';
    return raw || '—';
  }
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hours > 0) return `${hours}h ${mins}m ${secs}s`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

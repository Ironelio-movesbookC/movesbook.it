function toDdMmYy(year: number, month: number, day: number): string {
  const dd = String(day).padStart(2, '0');
  const mm = String(month).padStart(2, '0');
  const yy = String(year).slice(-2);
  return `${dd}-${mm}-${yy}`;
}

/** Display promocode subscription dates as dd-mm-yy. */
export function formatPromocodeDisplayDate(value: unknown): string {
  if (value == null || value === '') return '';

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return '';
    return toDdMmYy(value.getFullYear(), value.getMonth() + 1, value.getDate());
  }

  const s = String(value).trim();
  if (!s || s.startsWith('1970-01-01')) return '';

  const ddMmYy = s.match(/^(\d{2})-(\d{2})-(\d{2}|\d{4})$/);
  if (ddMmYy) {
    return `${ddMmYy[1]}-${ddMmYy[2]}-${ddMmYy[3].slice(-2)}`;
  }

  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    return toDdMmYy(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  }

  const parsed = new Date(s);
  if (Number.isNaN(parsed.getTime())) return '';
  return toDdMmYy(parsed.getFullYear(), parsed.getMonth() + 1, parsed.getDate());
}

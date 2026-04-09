export function parseJsonRecord(s: string | null | undefined): Record<string, string> {
  if (!s) return {};
  try {
    const o = JSON.parse(s);
    return typeof o === 'object' && o && !Array.isArray(o) ? o : {};
  } catch {
    return {};
  }
}

export function stringifyRecord(o: Record<string, string>): string | null {
  const keys = Object.keys(o).filter((k) => o[k]?.trim());
  if (keys.length === 0) return null;
  return JSON.stringify(
    keys.reduce<Record<string, string>>((acc, k) => {
      acc[k] = o[k].trim();
      return acc;
    }, {})
  );
}

export function computeNameEnglish(
  originalName: string,
  nameByLanguage: Record<string, string>
): string {
  const en = nameByLanguage.en?.trim();
  if (en) return en;
  return (originalName || '').trim();
}

export function parseStringArrayJson(s: string | null | undefined): string[] {
  if (!s) return [];
  try {
    const o = JSON.parse(s);
    return Array.isArray(o) ? o.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

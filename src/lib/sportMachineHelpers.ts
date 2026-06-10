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

export type MachineRichSectionKey =
  | 'machineTypes'
  | 'musclesPositioning'
  | 'correctExecution'
  | 'criticalMistakes';

export type MachineRichSections = Partial<
  Record<MachineRichSectionKey, Record<string, string>>
>;

const MACHINE_RICH_SECTION_KEYS: MachineRichSectionKey[] = [
  'machineTypes',
  'musclesPositioning',
  'correctExecution',
  'criticalMistakes',
];

export function parseMachineRichSections(
  s: string | null | undefined
): MachineRichSections {
  if (!s?.trim()) return {};
  try {
    const o = JSON.parse(s) as Record<string, unknown>;
    if (!o || typeof o !== 'object' || Array.isArray(o)) return {};
    const out: MachineRichSections = {};
    for (const key of MACHINE_RICH_SECTION_KEYS) {
      const block = o[key];
      if (block && typeof block === 'object' && !Array.isArray(block)) {
        const map: Record<string, string> = {};
        for (const [lang, val] of Object.entries(block as Record<string, unknown>)) {
          if (typeof val === 'string') map[lang] = val;
        }
        if (Object.keys(map).length > 0) out[key] = map;
      }
    }
    return out;
  } catch {
    return {};
  }
}

export function stringifyMachineRichSections(
  sections: MachineRichSections
): string | null {
  const out: MachineRichSections = {};
  for (const key of MACHINE_RICH_SECTION_KEYS) {
    const map = sections[key];
    if (!map) continue;
    const trimmed = stringifyRecord(map);
    if (trimmed) {
      out[key] = JSON.parse(trimmed) as Record<string, string>;
    }
  }
  if (Object.keys(out).length === 0) return null;
  return JSON.stringify(out);
}

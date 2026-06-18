/** Legacy PHP promocodes/add.ctp — hardcoded language dropdown (En + It). */
export const PROMOCODE_FORM_LANGUAGES: { id: number; value: string }[] = [
  { id: 1, value: 'En' },
  { id: 4, value: 'It' },
];

export const PROMOCODE_FORM_LANGUAGE_IDS = PROMOCODE_FORM_LANGUAGES.map((l) => l.id);

export function formatPromocodeLanguageLabel(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** Keep En/It like PHP add form; merge in languages returned for the selected HTML doc. */
export function mergePromocodeLanguageOptions(
  apiLangs: { id: number; value: string }[]
): { id: number; value: string }[] {
  const merged = new Map(PROMOCODE_FORM_LANGUAGES.map((l) => [l.id, { ...l }]));
  for (const el of apiLangs) {
    const id = Number(el.id);
    if (!Number.isFinite(id)) continue;
    merged.set(id, {
      id,
      value: formatPromocodeLanguageLabel(String(el.value ?? '')),
    });
  }
  return Array.from(merged.values()).sort((a, b) => a.id - b.id);
}

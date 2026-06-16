import { fetchLongTextTranslation } from './infoRepsLongText';

/** Fallback when Language → Long texts has no `IdentificationDevicesInfo` entry for the user locale. */
export const IDENTIFICATION_DEVICES_INFO_DEFAULT_EN =
  'Here you can select the activities that every reader must control.\n\n' +
  'Add new readers, set their control mode, and assign activities or services depending on the reader type.\n\n' +
  'Use "New reader" to register a device. Select a reader in the list to edit it, assign activities (for access control modes 1 and 2), open advanced settings, or delete it.\n\n' +
  'Expand a reader row to see which activities or services are linked to that device.';

/** DB / Language settings → Long texts key (Settings → Language → Long texts). */
export const IDENTIFICATION_DEVICES_INFO_TRANSLATION_KEY = 'IdentificationDevicesInfo' as const;

export function parseIdentificationDevicesInfoSections(raw: string): {
  title: string;
  paragraphs: string[];
  html: string | null;
} {
  const trimmed = raw.trim();
  if (/<\/?[a-z][\s\S]*>/i.test(trimmed)) {
    return { title: '', paragraphs: [], html: trimmed };
  }

  const parts = trimmed
    .split(/\n\n+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) return { title: '', paragraphs: [], html: null };
  if (parts.length === 1) return { title: parts[0], paragraphs: [], html: null };

  return {
    title: parts[0],
    paragraphs: parts.slice(1),
    html: null,
  };
}

export async function fetchIdentificationDevicesInfoText(language: string): Promise<string> {
  return fetchLongTextTranslation(
    IDENTIFICATION_DEVICES_INFO_TRANSLATION_KEY,
    language,
    IDENTIFICATION_DEVICES_INFO_DEFAULT_EN
  );
}

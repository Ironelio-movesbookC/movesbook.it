import { fetchLongTextTranslation } from './infoRepsLongText';
import { isRichHtmlContent, richTextToPlainText } from '@/utils/richTextTranslation';
import { fixUtf8Mojibake } from '@/utils/fixUtf8Mojibake';

/** Fallback when Language → Long texts has no `AutoProcessInfo` entry for the user locale. */
export const AUTO_PROCESS_INFO_DEFAULT_EN =
  'For each muscular area that has a series total set, this sets the number of exercises from the distribution table (by training level), and fills empty pause / macro fields with standard defaults.\n\n' +
  'Series totals and reps / pyramidal / %1MR rows are not removed; adjust those in the form or use Distribution series to change how many series each area gets.\n\n' +
  'Confirm only if you are OK replacing exercise counts and any blank pause / macro values on this day.';

/** DB / Language settings → Long texts key (Settings → Language → Long texts). */
export const AUTO_PROCESS_INFO_TRANSLATION_KEY = 'AutoProcessInfo' as const;

/** @deprecated Use AUTO_PROCESS_INFO_TRANSLATION_KEY */
export const AUTO_PROCESS_INFO_KEY = AUTO_PROCESS_INFO_TRANSLATION_KEY;

/** Normalize stored value (plain or RichTextEditor HTML) before paragraph split. */
export function normalizeAutoProcessInfoRaw(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  const normalized = isRichHtmlContent(trimmed) ? richTextToPlainText(trimmed) : trimmed;
  return fixUtf8Mojibake(normalized);
}

/** Split long text: last paragraph = warning callout; preceding paragraphs = main body. */
export function parseAutoProcessInfoSections(raw: string): {
  mainParagraphs: string[];
  warning: string;
} {
  const parts = normalizeAutoProcessInfoRaw(raw)
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return { mainParagraphs: [], warning: '' };
  if (parts.length === 1) return { mainParagraphs: [parts[0]], warning: '' };
  return {
    mainParagraphs: parts.slice(0, -1),
    warning: parts[parts.length - 1],
  };
}

export async function fetchAutoProcessInfoText(language: string): Promise<string> {
  return fetchLongTextTranslation(
    AUTO_PROCESS_INFO_TRANSLATION_KEY,
    language,
    AUTO_PROCESS_INFO_DEFAULT_EN,
  );
}

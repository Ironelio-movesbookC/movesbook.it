import type { TranslationRow } from './infoRepsLongText';

/**
 * Long text key for Language → Long texts (superadmin). Content is five blocks separated by a blank line (double newline):
 * 1) dialog title, 2) amber header subtitle, 3) first body paragraph, 4) second body paragraph, 5) warning box text.
 */
export const AUTO_PROCESS_INFO_KEY = 'AutoProcessInfo';

export const AUTO_PROCESS_INFO_DEFAULT_EN = `Automatic processing procedure

This action overwrites calculated fields for the current day

For each muscular area that has a series total set, this sets the number of exercises from the distribution table (by training level), and fills empty pause / macro fields with standard defaults.

Series totals and reps / pyramidal / %1MR rows are not removed; adjust those in the form or use Series distribution settings to change how many series each area gets.

Confirm only if you are OK replacing exercise counts and any blank pause / macro values on this day.`;

export type AutoProcessInfoParts = {
  title: string;
  subtitle: string;
  p1: string;
  p2: string;
  warn: string;
};

export function resolveAutoProcessInfoText(
  translations: TranslationRow[] | null | undefined,
  langCode: string
): string {
  const row = translations?.find((t) => t.key === AUTO_PROCESS_INFO_KEY);
  const v = row?.values?.[langCode] ?? row?.values?.en;
  const s = String(v ?? '').trim();
  return s || AUTO_PROCESS_INFO_DEFAULT_EN;
}

const AUTO_PROCESS_PARSE_FALLBACK: AutoProcessInfoParts = {
  title: 'Automatic processing procedure',
  subtitle: 'This action overwrites calculated fields for the current day',
  p1:
    'For each muscular area that has a series total set, this sets the number of exercises from the distribution table (by training level), and fills empty pause / macro fields with standard defaults.',
  p2:
    'Series totals and reps / pyramidal / %1MR rows are not removed; adjust those in the form or use Series distribution settings to change how many series each area gets.',
  warn:
    'Confirm only if you are OK replacing exercise counts and any blank pause / macro values on this day.',
};

export function parseAutoProcessInfo(raw: string, allowDefaultRetry = true): AutoProcessInfoParts {
  const parts = raw
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  if (parts.length >= 5) {
    return {
      title: parts[0],
      subtitle: parts[1],
      p1: parts[2],
      p2: parts[3],
      warn: parts[4],
    };
  }
  if (allowDefaultRetry && raw.trim() !== AUTO_PROCESS_INFO_DEFAULT_EN.trim()) {
    return parseAutoProcessInfo(AUTO_PROCESS_INFO_DEFAULT_EN, false);
  }
  return AUTO_PROCESS_PARSE_FALLBACK;
}

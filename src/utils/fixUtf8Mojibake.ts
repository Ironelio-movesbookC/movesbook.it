/**
 * Repair UTF-8 text that was mis-decoded as Latin-1 / Windows-1252 (common mojibake).
 * Safe to run on already-correct UTF-8 strings (no-op when patterns are absent).
 */
export function fixUtf8Mojibake(text: string): string {
  if (!text) return text;
  return (
    text
      .replace(/â€"/g, '\u2014')
      .replace(/â€“/g, '\u2013')
      .replace(/â†'/g, '\u2192')
      .replace(/â†/g, '\u2190')
      .replace(/â€¦/g, '\u2026')
      .replace(/â€™/g, '\u2019')
      .replace(/â€œ/g, '\u201c')
      .replace(/â€\u009d/g, '\u201d')
      .replace(/â€\u009c/g, '\u201c')
      .replace(/âš ï¸\u008f/g, '\u26a0\ufe0f')
      .replace(/âšï¸\u008f/g, '\u26a0\ufe0f')
      .replace(/âš /g, '\u26a0')
      // Legacy emoji corruption (strip; UI should use icons instead)
      .replace(/ðŸ"…/g, '')
      .replace(/ðŸ'¾/g, '')
      .replace(/\uFFFD/g, '')
  );
}

/** Common UI punctuation (ASCII-safe source, correct Unicode output). */
export const UI_EM_DASH = '\u2014';
export const UI_ARROW = '\u2192';
export const UI_ELLIPSIS = '\u2026';

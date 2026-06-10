import { sanitizeWorkoutHtml } from '@/utils/sanitizeWorkoutHtml';

function escapeHtmlPlain(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Decode entity-encoded HTML stored as plain text (shows literal tags if skipped). */
export function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, '\u00a0')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

function looksEntityEncodedHtml(text: string): boolean {
  return /&lt;\/?[a-zA-Z][\s\S]*?&gt;/.test(text) || /&amp;lt;/i.test(text);
}

/** Collapse empty div/br noise from contenteditable without stripping real content. */
export function collapseRichEditorEmptyBreaks(html: string): string {
  return html
    .replace(/<div>\s*(<div>\s*(<br\s*\/?>\s*)+<\/div>\s*)+<\/div>/gi, '<br>')
    .replace(/<div>\s*<br\s*\/?>\s*<\/div>/gi, '<br>')
    .replace(/(<br\s*\/?>\s*){3,}/gi, '<br><br>');
}

/**
 * Normalize exercise rich text for read-only display (bank aside, label details, FAQs).
 * Decodes escaped HTML, wraps legacy plain text, and trims editor clutter.
 */
export function prepareExerciseRichHtmlForDisplay(value: unknown): string {
  let html = sanitizeWorkoutHtml(value);
  if (!html) return '';

  if (looksEntityEncodedHtml(html)) {
    html = decodeHtmlEntities(html);
    if (looksEntityEncodedHtml(html)) {
      html = decodeHtmlEntities(html);
    }
  }

  html = collapseRichEditorEmptyBreaks(html);

  const hasMarkup = /<[a-zA-Z][^>]*>/.test(html);
  if (!hasMarkup) {
    const parts = html.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
    if (parts.length <= 1) return `<p>${escapeHtmlPlain(parts[0] || html.trim())}</p>`;
    return parts.map((p) => `<p>${escapeHtmlPlain(p)}</p>`).join('');
  }

  return html.trim();
}

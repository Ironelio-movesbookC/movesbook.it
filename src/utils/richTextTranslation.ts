/** Helpers for long-text translation with RichTextEditor (HTML in UI, plain text to API). */

export function richTextToPlainText(html: string): string {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function plainTextToRichHtml(text: string): string {
  if (!text?.trim()) return '';
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  const paragraphs = escaped.split(/\n{2,}/).filter(Boolean);
  if (paragraphs.length <= 1) {
    return `<p>${escaped.replace(/\n/g, '<br>')}</p>`;
  }
  return paragraphs.map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');
}

export function hasRichTextContent(html: string): boolean {
  return richTextToPlainText(html).length > 0;
}

/** Map app language codes to MyMemory / external API codes. */
export function mapLangForTranslationApi(code: string): string {
  const map: Record<string, string> = {
    zh: 'zh-CN',
    pt: 'pt-PT',
  };
  return map[code] || code;
}

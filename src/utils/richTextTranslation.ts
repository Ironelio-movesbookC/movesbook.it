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

/** Split plain text into paragraphs for block-by-block translation (preserves layout). */
export function splitPlainTextParagraphs(text: string): string[] {
  const normalized = text.replace(/\r\n/g, '\n').trim();
  if (!normalized) return [];
  const parts = normalized.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  return parts.length > 0 ? parts : [normalized];
}

/** Rebuild editor HTML from translated plain paragraphs (matches source paragraph count). */
export function paragraphsToRichHtml(paragraphs: string[]): string {
  if (paragraphs.length === 0) return '';
  return paragraphs.map((p) => {
    const escaped = p
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    return `<p>${escaped.replace(/\n/g, '<br>')}</p>`;
  }).join('');
}

export function isRichHtmlContent(text: string): boolean {
  return /<[a-z][\s\S]*>/i.test(text);
}

/** Normalize stored long text for read-only display (plain or HTML → safe HTML). */
export function longTextDisplayHtml(text: string): string {
  if (!text?.trim()) return '';
  if (isRichHtmlContent(text)) return text;
  return plainTextToRichHtml(text);
}

/** Client helper: POST plain source → per-language plain strings from `/api/translate`. */
export async function fetchLongTextTranslations(
  plainSource: string,
  targetLanguages: string[],
): Promise<{ translations: Record<string, string>; failedLanguages: string[] }> {
  const response = await fetch('/api/translate', {
    method: 'POST',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: plainSource, targetLanguages }),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Translation API returned ${response.status}: ${errorText.substring(0, 120)}`);
  }
  const data = (await response.json()) as {
    translations?: Record<string, string>;
    failedLanguages?: string[];
  };
  const translations = data.translations ?? { en: plainSource };
  const failedLanguages =
    data.failedLanguages ??
    targetLanguages.filter((lang) => {
      const v = translations[lang];
      return typeof v !== 'string' || v.trim() === '';
    });
  return { translations, failedLanguages };
}

/** Map app language codes to MyMemory / external API codes. */
export function mapLangForTranslationApi(code: string): string {
  const map: Record<string, string> = {
    zh: 'zh-CN',
    pt: 'pt-PT',
  };
  return map[code] || code;
}

const GTX_MAX_CHUNK = 1200;

function splitTextForTranslation(text: string, maxLength: number): string[] {
  if (text.length <= maxLength) return [text];
  const sentences = text.match(/[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g) ?? [text];
  const chunks: string[] = [];
  let current = '';
  for (const sentence of sentences) {
    const piece = sentence.trim();
    if (!piece) continue;
    if ((current + (current ? ' ' : '') + piece).length <= maxLength) {
      current = current ? `${current} ${piece}` : piece;
    } else {
      if (current) chunks.push(current);
      if (piece.length <= maxLength) {
        current = piece;
      } else {
        for (let i = 0; i < piece.length; i += maxLength) {
          chunks.push(piece.slice(i, i + maxLength));
        }
        current = '';
      }
    }
  }
  if (current) chunks.push(current);
  return chunks.length > 0 ? chunks : [text];
}

async function translateChunkWithGtx(chunk: string, apiLang: string): Promise<string | null> {
  const url =
    `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${encodeURIComponent(apiLang)}&dt=t&q=${encodeURIComponent(chunk)}`;
  const response = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MovesBook/1.0)' },
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) return null;
  const data = (await response.json()) as unknown;
  if (!Array.isArray(data) || !Array.isArray(data[0])) return null;
  const joined = (data[0] as unknown[][])
    .map((part) => (typeof part?.[0] === 'string' ? part[0] : ''))
    .join('');
  return joined.trim() || null;
}

/** Free Google Translate client endpoint — full sentences, not word substitution. */
export async function translatePlainTextGtx(
  text: string,
  targetLang: string,
): Promise<string | null> {
  const source = text.trim();
  if (!source) return '';
  const apiLang = mapLangForTranslationApi(targetLang);
  const chunks = splitTextForTranslation(source, GTX_MAX_CHUNK);
  const parts: string[] = [];
  for (const chunk of chunks) {
    const translated = await translateChunkWithGtx(chunk, apiLang);
    if (translated == null) return null;
    parts.push(translated);
    if (chunks.length > 1) {
      await new Promise((r) => setTimeout(r, 250));
    }
  }
  return parts.join(' ');
}

export async function translatePlainTextMyMemory(
  text: string,
  targetLang: string,
): Promise<string | null> {
  const apiLang = mapLangForTranslationApi(targetLang);
  const chunks = splitTextForTranslation(text.trim(), 400);
  const parts: string[] = [];
  for (const chunk of chunks) {
    const response = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(chunk)}&langpair=en|${encodeURIComponent(apiLang)}`,
      { signal: AbortSignal.timeout(10000) },
    );
    if (!response.ok) return null;
    const data = (await response.json()) as {
      responseData?: { translatedText?: string };
    };
    const translated = data.responseData?.translatedText?.trim();
    if (!translated) return null;
    parts.push(translated);
    if (chunks.length > 1) {
      await new Promise((r) => setTimeout(r, 300));
    }
  }
  return parts.join(' ');
}

import { NextRequest, NextResponse } from 'next/server';
import {
  mapLangForTranslationApi,
  splitPlainTextParagraphs,
  translatePlainTextGtx,
  translatePlainTextMyMemory,
} from '@/utils/richTextTranslation';

async function translateParagraphWithFallbacks(
  paragraph: string,
  lang: string,
): Promise<string | null> {
  const myMemory = await translatePlainTextMyMemory(paragraph, lang);
  if (myMemory) return myMemory;

  const gtx = await translatePlainTextGtx(paragraph, lang);
  if (gtx) return gtx;

  try {
    const response = await fetch('https://libretranslate.de/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        q: paragraph,
        source: 'en',
        target: lang,
        format: 'text',
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (response.ok) {
      const data = (await response.json()) as { translatedText?: string };
      if (data.translatedText?.trim()) {
        return data.translatedText.trim();
      }
    }
  } catch {
    /* no libretranslate */
  }

  return null;
}

async function translateToLanguage(sourceText: string, lang: string): Promise<string | null> {
  if (lang === 'en') return sourceText;

  const paragraphs = splitPlainTextParagraphs(sourceText);
  if (paragraphs.length === 0) return null;

  const translatedBlocks: string[] = [];
  for (const paragraph of paragraphs) {
    const translated = await translateParagraphWithFallbacks(paragraph, lang);
    if (!translated) return null;
    translatedBlocks.push(translated);
  }

  return translatedBlocks.join('\n\n');
}

async function translateWithGoogleApiKey(
  sourceText: string,
  lang: string,
  apiKey: string,
): Promise<string | null> {
  const apiTarget = mapLangForTranslationApi(lang);
  const paragraphs = splitPlainTextParagraphs(sourceText);
  const translatedParagraphs: string[] = [];

  for (const paragraph of paragraphs) {
    try {
      const response = await fetch(
        `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            q: paragraph,
            source: 'en',
            target: apiTarget,
            format: 'text',
          }),
          signal: AbortSignal.timeout(15000),
        },
      );
      const data = await response.json();
      const piece = data.data?.translations?.[0]?.translatedText?.trim();
      if (!piece) return null;
      translatedParagraphs.push(piece);
    } catch {
      return null;
    }
  }

  return translatedParagraphs.length === paragraphs.length
    ? translatedParagraphs.join('\n\n')
    : null;
}

export async function POST(request: NextRequest) {
  try {
    const { text, targetLanguages } = await request.json();
    const sourceText = typeof text === 'string' ? text.trim() : '';

    if (!sourceText || !targetLanguages || !Array.isArray(targetLanguages)) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 },
      );
    }

    const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
    const translations: Record<string, string> = { en: sourceText };
    const failed: string[] = [];

    for (const lang of targetLanguages) {
      if (lang === 'en') continue;

      try {
        let translated: string | null = null;

        if (apiKey) {
          translated = await translateWithGoogleApiKey(sourceText, lang, apiKey);
        }

        if (!translated) {
          translated = await translateToLanguage(sourceText, lang);
        }

        if (translated) {
          translations[lang] = translated;
        } else {
          failed.push(lang);
          translations[lang] = '';
        }
      } catch (error) {
        console.error(`Translation error for ${lang}:`, error);
        failed.push(lang);
        translations[lang] = '';
      }

      if (targetLanguages.indexOf(lang) < targetLanguages.length - 1) {
        await new Promise((r) => setTimeout(r, 150));
      }
    }

    const successCount = Object.keys(translations).filter(
      (key) => key !== 'en' && translations[key]?.trim(),
    ).length;

    return NextResponse.json({
      translations,
      ...(failed.length > 0 ? { failedLanguages: failed } : {}),
      ...(successCount === 0 && failed.length > 0
        ? { warning: 'All translation providers failed or timed out for every language.' }
        : {}),
    });
  } catch (error) {
    console.error('Translation API error:', error);
    return NextResponse.json(
      { error: 'Translation failed' },
      { status: 500 },
    );
  }
}

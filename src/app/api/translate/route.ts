import { NextRequest, NextResponse } from 'next/server';
import {
  mapLangForTranslationApi,
  splitPlainTextParagraphs,
  translatePlainTextGtx,
  translatePlainTextMyMemory,
} from '@/utils/richTextTranslation';

async function translateToLanguage(
  sourceText: string,
  lang: string,
  sourceLang: string,
): Promise<string | null> {
  if (lang === sourceLang) return sourceText;

  const paragraphs = splitPlainTextParagraphs(sourceText);
  if (paragraphs.length === 0) return null;

  const apiTarget = mapLangForTranslationApi(lang);
  const apiSource = mapLangForTranslationApi(sourceLang);
  const translatedBlocks: string[] = [];
  for (const paragraph of paragraphs) {
    const gtx = await translatePlainTextGtx(paragraph, lang, sourceLang);
    if (gtx) {
      translatedBlocks.push(gtx);
      continue;
    }
    const myMemory = await translatePlainTextMyMemory(paragraph, lang, sourceLang);
    if (myMemory) {
      translatedBlocks.push(myMemory);
      continue;
    }
    try {
      const response = await fetch('https://libretranslate.de/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          q: paragraph,
          source: apiSource,
          target: apiTarget,
          format: 'text',
        }),
        signal: AbortSignal.timeout(10000),
      });
      if (response.ok) {
        const data = (await response.json()) as { translatedText?: string };
        if (data.translatedText?.trim()) {
          translatedBlocks.push(data.translatedText.trim());
          continue;
        }
      }
    } catch {
      /* try next paragraph provider */
    }
    return null;
  }

  return translatedBlocks.join('\n\n');
}

export async function POST(request: NextRequest) {
  try {
    const { text, targetLanguages, sourceLanguage } = await request.json();
    const sourceText = typeof text === 'string' ? text.trim() : '';
    const sourceLang =
      typeof sourceLanguage === 'string' && sourceLanguage.trim()
        ? sourceLanguage.trim()
        : 'en';

    if (!sourceText || !targetLanguages || !Array.isArray(targetLanguages)) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 },
      );
    }

    const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
    const translations: Record<string, string> = {};
    if (sourceLang === 'en') {
      translations.en = sourceText;
    }
    const failed: string[] = [];

    for (const lang of targetLanguages) {
      if (lang === sourceLang) {
        translations[lang] = sourceText;
        continue;
      }

      if (apiKey) {
        const apiTarget = mapLangForTranslationApi(lang);
        const apiSource = mapLangForTranslationApi(sourceLang);
        try {
          const paragraphs = splitPlainTextParagraphs(sourceText);
          const translatedParagraphs: string[] = [];
          for (const paragraph of paragraphs) {
            const response = await fetch(
              `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  q: paragraph,
                  source: apiSource,
                  target: apiTarget,
                  format: 'text',
                }),
              },
            );
            const data = await response.json();
            const piece = data.data?.translations?.[0]?.translatedText?.trim();
            if (!piece) {
              translatedParagraphs.length = 0;
              break;
            }
            translatedParagraphs.push(piece);
          }
          if (translatedParagraphs.length === paragraphs.length) {
            translations[lang] = translatedParagraphs.join('\n\n');
            continue;
          }
        } catch (error) {
          console.error(`Google Translate API error for ${lang}:`, error);
        }
      }

      const translated = await translateToLanguage(sourceText, lang, sourceLang);
      if (translated) {
        translations[lang] = translated;
      } else {
        failed.push(lang);
        translations[lang] = '';
      }
      if (targetLanguages.indexOf(lang) < targetLanguages.length - 1) {
        await new Promise((r) => setTimeout(r, 200));
      }
    }

    return NextResponse.json({
      translations,
      ...(failed.length > 0 ? { failedLanguages: failed } : {}),
    });
  } catch (error) {
    console.error('Translation API error:', error);
    return NextResponse.json(
      { error: 'Translation failed' },
      { status: 500 },
    );
  }
}

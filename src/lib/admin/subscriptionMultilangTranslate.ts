import { SUBSCRIPTION_LANGUAGES } from '@/lib/admin/subscriptionSettingsMock';
import {
  hasRichTextContent,
  plainTextToRichHtml,
  richTextToPlainText,
} from '@/utils/richTextTranslation';

export const SUBSCRIPTION_TARGET_LANGS = SUBSCRIPTION_LANGUAGES.filter((l) => l.code !== 'en').map(
  (l) => l.code,
);

/** Subscription admin language codes → `/api/translate` codes. */
export function subscriptionLangToApiCode(code: string): string {
  const map: Record<string, string> = {
    por: 'pt',
    rus: 'ru',
    ind: 'hi',
    chin: 'zh',
    arab: 'ar',
  };
  return map[code] || code;
}

export async function fetchSubscriptionTranslations(text: string): Promise<Record<string, string>> {
  const targetLanguages = SUBSCRIPTION_TARGET_LANGS.map(subscriptionLangToApiCode);
  const response = await fetch('/api/translate', {
    method: 'POST',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, targetLanguages }),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Translation API returned ${response.status}: ${errorText.substring(0, 120)}`);
  }
  const data = await response.json();
  return data.translations && typeof data.translations === 'object'
    ? (data.translations as Record<string, string>)
    : {};
}

/** Translate English rich text into all subscription languages (keeps EN HTML as source). */
export async function translateEnglishRichTextToAllLangs(
  enHtml: string,
  existingByLang: Record<string, string> = {},
): Promise<Record<string, string>> {
  if (!hasRichTextContent(enHtml)) {
    throw new Error('Enter English text first, then press Translate.');
  }

  const plain = richTextToPlainText(enHtml);
  if (!plain) {
    throw new Error('Enter English text first, then press Translate.');
  }

  const translations = await fetchSubscriptionTranslations(plain);
  const record: Record<string, string> = { en: enHtml, ...existingByLang };

  for (const subLang of SUBSCRIPTION_TARGET_LANGS) {
    const apiLang = subscriptionLangToApiCode(subLang);
    const raw = translations[apiLang];
    if (typeof raw === 'string' && raw.trim()) {
      record[subLang] = plainTextToRichHtml(raw.trim());
    }
  }

  if (Object.keys(record).filter((k) => k !== 'en' && record[k]?.trim()).length === 0) {
    throw new Error('No translated values were returned by the translation service.');
  }

  return record;
}

import { SUBSCRIPTION_LANGUAGES } from '@/lib/admin/subscriptionSettingsMock';
import {
  getTranslateFetchHeaders,
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
    indo: 'id',
    jap: 'ja',
    chin: 'zh',
    arab: 'ar',
  };
  return map[code] || code;
}

export type SubscriptionTranslationFetchResult = {
  record: Record<string, string>;
  failedLanguages: string[];
  warning?: string;
};

export type SubscriptionRichTextTranslateResult = {
  byLang: Record<string, string>;
  partialWarning?: string;
};

export async function fetchSubscriptionTranslations(
  text: string,
): Promise<SubscriptionTranslationFetchResult> {
  const pairs = SUBSCRIPTION_TARGET_LANGS.map((subLang) => ({
    subLang,
    apiLang: subscriptionLangToApiCode(subLang),
  }));
  const targetLanguages = [...new Set(pairs.map((pair) => pair.apiLang))];

  const response = await fetch('/api/translate', {
    method: 'POST',
    cache: 'no-store',
    headers: getTranslateFetchHeaders(),
    body: JSON.stringify({ text, targetLanguages }),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Translation API returned ${response.status}: ${errorText.substring(0, 120)}`);
  }
  const data = await response.json();
  const apiTranslations =
    data.translations && typeof data.translations === 'object'
      ? (data.translations as Record<string, string>)
      : {};

  const record: Record<string, string> = {};
  for (const { subLang, apiLang } of pairs) {
    const raw = apiTranslations[apiLang] ?? apiTranslations[subLang];
    if (typeof raw === 'string' && raw.trim()) {
      record[subLang] = raw.trim();
    }
  }

  const failedLanguages = Array.isArray(data.failedLanguages)
    ? (data.failedLanguages as string[])
    : [];

  return { record, failedLanguages, warning: typeof data.warning === 'string' ? data.warning : undefined };
}

/** Translate English rich text into all subscription languages (keeps EN HTML as source). */
export async function translateEnglishRichTextToAllLangs(
  enHtml: string,
  existingByLang: Record<string, string> = {},
): Promise<SubscriptionRichTextTranslateResult> {
  if (!hasRichTextContent(enHtml)) {
    throw new Error('Enter English text first, then press Translate.');
  }

  const plain = richTextToPlainText(enHtml);
  if (!plain) {
    throw new Error('Enter English text first, then press Translate.');
  }

  const { record: translations, failedLanguages, warning } =
    await fetchSubscriptionTranslations(plain);
  const record: Record<string, string> = { en: enHtml, ...existingByLang };

  for (const subLang of SUBSCRIPTION_TARGET_LANGS) {
    const raw = translations[subLang];
    if (typeof raw === 'string' && raw.trim()) {
      record[subLang] = plainTextToRichHtml(raw.trim());
    }
  }

  const translatedCount = SUBSCRIPTION_TARGET_LANGS.filter((lang) => record[lang]?.trim()).length;

  if (translatedCount === 0) {
    throw new Error(
      warning ||
        'No translated values were returned. External translation services may be unreachable — try again or edit other languages manually.',
    );
  }

  if (failedLanguages.length > 0) {
    return {
      byLang: record,
      partialWarning: `${translatedCount} language(s) translated; failed: ${failedLanguages.join(', ')}`,
    };
  }

  return { byLang: record };
}

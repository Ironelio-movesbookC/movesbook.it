'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import {
  CLUB_WEBSITE_LANGUAGE_TABS,
  type ClubWebsiteLanguageCode,
} from '@/lib/clubWebsiteLanguages';

export function pickInitialTopicDisplayLang(
  available: ClubWebsiteLanguageCode[],
  preferred?: string
): ClubWebsiteLanguageCode {
  if (available.length === 0) return 'en';
  if (preferred && available.includes(preferred as ClubWebsiteLanguageCode)) {
    return preferred as ClubWebsiteLanguageCode;
  }
  if (available.includes('en')) return 'en';
  return available[0]!;
}

export default function TopicDisplayLanguageSelect({
  availableLanguages,
  value,
  onChange,
  titleColor,
}: {
  availableLanguages: ClubWebsiteLanguageCode[];
  value: ClubWebsiteLanguageCode;
  onChange: (lang: ClubWebsiteLanguageCode) => void;
  titleColor: string;
}) {
  const { t } = useLanguage();
  if (availableLanguages.length === 0) return null;

  return (
    <label className="flex shrink-0 items-center gap-2 text-xs font-normal sm:text-sm">
      <span className="whitespace-nowrap opacity-95" style={{ color: titleColor }}>
        {t('club_topic_select_language')}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as ClubWebsiteLanguageCode)}
        className="min-w-[4.5rem] rounded-sm border border-white/40 bg-white/95 px-2 py-1 text-xs font-medium text-zinc-900 shadow-sm outline-none focus:ring-1 focus:ring-white/80 sm:text-sm"
        aria-label={t('club_topic_select_language')}
      >
        {availableLanguages.map((code) => {
          const tab = CLUB_WEBSITE_LANGUAGE_TABS.find((l) => l.code === code);
          return (
            <option key={code} value={code}>
              {tab?.label ?? code}
            </option>
          );
        })}
      </select>
    </label>
  );
}

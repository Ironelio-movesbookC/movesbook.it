'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { ClubWebsiteLanguageCode } from '@/lib/clubWebsiteLanguages';
import { CLUB_WEBSITE_LANGUAGE_TABS } from '@/lib/clubWebsiteLanguages';
import {
  filterClubWebsiteTopicsForMembers,
  loadClubWebsiteTopics,
  type ClubWebsiteTopic,
} from '@/lib/clubWebsiteTopics';
import { languagesWithTopicHtmlContent } from '@/lib/clubWebsiteDisplayContent';
import { useClubWebsiteSettingsPage } from '@/hooks/useClubWebsiteSettingsPage';
import TopicDisplayLanguageSelect, {
  pickInitialTopicDisplayLang,
} from '@/components/club/websiteSettings/TopicDisplayLanguageSelect';

function TopicMemberDisplayContent() {
  const { t, currentLanguage } = useLanguage();
  const searchParams = useSearchParams();
  const topicId = searchParams?.get('id') ?? null;
  const langParam = searchParams?.get('lang');
  const preferredLang = (
    CLUB_WEBSITE_LANGUAGE_TABS.some((l) => l.code === langParam)
      ? langParam
      : currentLanguage
  ) as string;
  const { clubId, clubDisplayName, loading, clubsLoading } = useClubWebsiteSettingsPage();
  const [topics, setTopics] = useState<ClubWebsiteTopic[]>([]);

  useEffect(() => {
    if (clubId) setTopics(loadClubWebsiteTopics(clubId));
  }, [clubId]);

  const topic = useMemo(() => {
    const visible = filterClubWebsiteTopicsForMembers(topics);
    return visible.find((tpc) => tpc.id === topicId) ?? visible[0] ?? null;
  }, [topics, topicId]);

  const availableLanguages = useMemo(
    () => (topic ? languagesWithTopicHtmlContent(topic) : []),
    [topic]
  );

  const [displayLang, setDisplayLang] = useState<ClubWebsiteLanguageCode>('en');

  useEffect(() => {
    setDisplayLang(pickInitialTopicDisplayLang(availableLanguages, preferredLang));
  }, [topic?.id, availableLanguages, preferredLang]);

  const lang = availableLanguages.includes(displayLang)
    ? displayLang
    : pickInitialTopicDisplayLang(availableLanguages, preferredLang);

  if (loading || clubsLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-teal-700" />
      </div>
    );
  }

  if (!topic) {
    return (
      <div className="mx-auto max-w-3xl p-8 text-center text-sm text-zinc-600">
        {t('club_topic_display_not_found')}
      </div>
    );
  }

  const html = topic.contentsByLang[lang] ?? '';
  const keywords = topic.keywordsByLang[lang] ?? '';

  return (
    <div className="min-h-screen bg-zinc-100">
      <div className="border-b border-zinc-300 bg-zinc-200 px-4 py-1.5 text-center text-[11px] text-zinc-600">
        {t('club_topic_display_readonly_banner')}
      </div>
      <div
        className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-lg font-semibold"
        style={{ backgroundColor: topic.bannerColor, color: topic.titleColor }}
      >
        <span className="min-w-0 truncate">{topic.title}</span>
        <TopicDisplayLanguageSelect
          availableLanguages={availableLanguages}
          value={lang}
          onChange={setDisplayLang}
          titleColor={topic.titleColor}
        />
      </div>
      <div className="mx-auto max-w-4xl bg-white p-6 shadow-sm">
        <p className="text-xs text-zinc-500">
          {clubDisplayName}
          {topic.sectionName ? ` · ${topic.sectionName}` : ''}
          {topic.lastUpdate ? ` · ${topic.lastUpdate}` : ''}
        </p>
        <div
          className="prose prose-sm mt-4 max-w-none text-zinc-800"
          dangerouslySetInnerHTML={{ __html: html || '<p></p>' }}
        />
        {keywords.trim() ? (
          <p className="mt-6 border-t border-zinc-200 pt-4 text-xs text-zinc-500">
            <span className="font-medium text-zinc-600">{t('club_website_search_keywords')}:</span>{' '}
            {keywords}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export default function TopicMemberDisplayPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-teal-700" />
        </div>
      }
    >
      <TopicMemberDisplayContent />
    </Suspense>
  );
}

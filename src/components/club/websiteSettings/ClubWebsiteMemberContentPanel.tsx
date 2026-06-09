'use client';

import { useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { ClubWebsiteLanguageCode } from '@/lib/clubWebsiteLanguages';
import { CLUB_WEBSITE_LANGUAGE_TABS } from '@/lib/clubWebsiteLanguages';
import {
  filterClubWebsiteFriendItemsForMembers,
  type ClubWebsiteFriendItem,
} from '@/lib/clubWebsiteFriendList';
import {
  filterClubWebsiteTopicsForMembers,
  type ClubWebsiteTopic,
} from '@/lib/clubWebsiteTopics';
import {
  MOVEBOOK_TOPIC_ROWS,
  SOCIAL_SITE_ROWS,
} from '@/components/club/websiteSettings/clubWebsiteSettingsSidebarData';

const PLACEHOLDER_IDS = new Set([
  ...MOVEBOOK_TOPIC_ROWS.map((r) => r.id),
  ...SOCIAL_SITE_ROWS.map((r) => r.id),
]);

export default function ClubWebsiteMemberContentPanel({
  selectedTopicId,
  selectedTopicLabel,
  friendItems,
  customTopics,
  clubDisplayName,
  lang = 'en',
}: {
  selectedTopicId: string;
  selectedTopicLabel: string;
  friendItems: ClubWebsiteFriendItem[];
  customTopics: ClubWebsiteTopic[];
  clubDisplayName: string;
  lang?: ClubWebsiteLanguageCode;
}) {
  const { t } = useLanguage();

  const visibleFriends = useMemo(
    () => filterClubWebsiteFriendItemsForMembers(friendItems),
    [friendItems]
  );
  const visibleTopics = useMemo(
    () => filterClubWebsiteTopicsForMembers(customTopics),
    [customTopics]
  );

  const friendItem = useMemo(
    () => visibleFriends.find((i) => i.id === selectedTopicId) ?? null,
    [visibleFriends, selectedTopicId]
  );
  const customTopic = useMemo(
    () => visibleTopics.find((tpc) => tpc.id === selectedTopicId) ?? null,
    [visibleTopics, selectedTopicId]
  );

  const activeLang = CLUB_WEBSITE_LANGUAGE_TABS.some((l) => l.code === lang) ? lang : 'en';

  if (selectedTopicId === 'bacheca') {
    return (
      <div className="flex min-h-[480px] flex-1 flex-col bg-[#ececec]">
        <div className="border-b border-[#3d6d9e] bg-[#5b9bd5] px-4 py-3">
          <h2 className="text-sm font-semibold text-white">{t('club_website_bacheca')}</h2>
        </div>
        <div className="flex flex-1 items-center justify-center p-8">
          <p className="max-w-md text-center text-sm text-zinc-600">
            {t('club_website_display_bacheca_hint')}
          </p>
        </div>
      </div>
    );
  }

  if (friendItem) {
    return (
      <FriendItemContent
        item={friendItem}
        clubDisplayName={clubDisplayName}
        lang={activeLang}
      />
    );
  }

  if (customTopic) {
    return (
      <TopicContent topic={customTopic} clubDisplayName={clubDisplayName} lang={activeLang} />
    );
  }

  if (PLACEHOLDER_IDS.has(selectedTopicId)) {
    return (
      <div className="flex min-h-[480px] flex-1 flex-col bg-[#ececec]">
        <div className="border-b border-[#3d6d9e] bg-[#5b9bd5] px-4 py-3">
          <h2 className="text-sm font-semibold text-white">
            {selectedTopicLabel || selectedTopicId}
          </h2>
        </div>
        <div className="flex flex-1 items-center justify-center p-8">
          <p className="text-sm text-zinc-500">{t('club_website_display_no_topics')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[480px] flex-1 items-center justify-center bg-[#ececec] p-8">
      <p className="text-sm text-zinc-500">{t('club_website_display_no_topics')}</p>
    </div>
  );
}

function FriendItemContent({
  item,
  clubDisplayName,
  lang,
}: {
  item: ClubWebsiteFriendItem;
  clubDisplayName: string;
  lang: ClubWebsiteLanguageCode;
}) {
  const { t } = useLanguage();

  if (item.contentDisplayMode === 'link' && item.externalUrl.trim()) {
    if (item.openInSamePage) {
      return (
        <div className="flex min-h-[480px] flex-1 flex-col bg-white">
          <div
            className="shrink-0 px-4 py-2.5 text-sm font-semibold"
            style={{ backgroundColor: item.bannerColor, color: item.titleColor }}
          >
            {item.title}
          </div>
          <iframe
            title={item.title}
            src={item.externalUrl}
            className="min-h-0 flex-1 w-full border-0 bg-white"
          />
        </div>
      );
    }
    return (
      <ExternalLinkContent
        title={item.title}
        bannerColor={item.bannerColor}
        titleColor={item.titleColor}
        url={item.externalUrl}
      />
    );
  }

  const html = item.contentsByLang[lang] || item.contentsByLang.en || '';
  const keywords = item.keywordsByLang[lang] || item.keywordsByLang.en || '';

  return (
    <HtmlContent
      title={item.title}
      bannerColor={item.bannerColor}
      titleColor={item.titleColor}
      clubDisplayName={clubDisplayName}
      sectionName={item.sectionName}
      lastUpdate={item.lastUpdate}
      html={html}
      keywords={keywords}
    />
  );
}

function TopicContent({
  topic,
  clubDisplayName,
  lang,
}: {
  topic: ClubWebsiteTopic;
  clubDisplayName: string;
  lang: ClubWebsiteLanguageCode;
}) {
  const html = topic.contentsByLang[lang] || topic.contentsByLang.en || '';
  const keywords = topic.keywordsByLang[lang] || topic.keywordsByLang.en || '';

  return (
    <HtmlContent
      title={topic.title}
      bannerColor={topic.bannerColor}
      titleColor={topic.titleColor}
      clubDisplayName={clubDisplayName}
      sectionName={topic.sectionName}
      lastUpdate={topic.lastUpdate}
      html={html}
      keywords={keywords}
    />
  );
}

function ExternalLinkContent({
  title,
  bannerColor,
  titleColor,
  url,
}: {
  title: string;
  bannerColor: string;
  titleColor: string;
  url: string;
}) {
  const { t } = useLanguage();
  return (
    <div className="flex min-h-[480px] flex-1 flex-col bg-[#ececec]">
      <div
        className="px-4 py-3 text-sm font-semibold"
        style={{ backgroundColor: bannerColor, color: titleColor }}
      >
        {title}
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block rounded border border-sky-700 bg-sky-600 px-6 py-2 text-white hover:bg-sky-700"
        >
          {t('club_topic_open_external_link')}
        </a>
      </div>
    </div>
  );
}

function HtmlContent({
  title,
  bannerColor,
  titleColor,
  clubDisplayName,
  sectionName,
  lastUpdate,
  html,
  keywords,
}: {
  title: string;
  bannerColor: string;
  titleColor: string;
  clubDisplayName: string;
  sectionName: string;
  lastUpdate: string;
  html: string;
  keywords: string;
}) {
  const { t } = useLanguage();
  return (
    <div className="flex min-h-[480px] flex-1 flex-col overflow-y-auto bg-[#ececec]">
      <div
        className="shrink-0 px-4 py-3 text-sm font-semibold"
        style={{ backgroundColor: bannerColor, color: titleColor }}
      >
        {title}
      </div>
      <div className="mx-auto w-full max-w-4xl flex-1 bg-white p-6 shadow-sm">
        <p className="text-xs text-zinc-500">
          {clubDisplayName}
          {sectionName ? ` · ${sectionName}` : ''}
          {lastUpdate ? ` · ${lastUpdate}` : ''}
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

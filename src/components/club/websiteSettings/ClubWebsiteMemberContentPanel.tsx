'use client';

import { useMemo, type ReactNode } from 'react';
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
  resolveMemberDisplayEmbed,
  topicHasEmbedUrl,
  topicHasHtmlContent,
} from '@/lib/clubWebsiteDisplayContent';
import {
  MOVEBOOK_TOPIC_ROWS,
  SOCIAL_SITE_ROWS,
} from '@/components/club/websiteSettings/clubWebsiteSettingsSidebarData';
import { prepareRichHtmlForDisplay } from '@/lib/richHtmlDisplay';
import ClubBachecaMemberPanel from '@/components/club/websiteSettings/ClubBachecaMemberPanel';

const PLACEHOLDER_IDS = new Set([
  ...MOVEBOOK_TOPIC_ROWS.map((r) => r.id),
  ...SOCIAL_SITE_ROWS.map((r) => r.id),
]);

function ContentShell({
  children,
  showExampleNote,
}: {
  children: ReactNode;
  showExampleNote?: boolean;
}) {
  const { t } = useLanguage();

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      {children}
      {showExampleNote ? (
        <div
          className="pointer-events-none absolute bottom-4 left-1/2 z-10 max-w-[min(36rem,calc(100%-2rem))] -translate-x-1/2 rounded-full bg-zinc-600/90 px-5 py-2 text-center text-xs text-white shadow-lg sm:text-sm"
          role="note"
        >
          {t('club_website_display_example_note')}
        </div>
      ) : null}
    </div>
  );
}

function SiteEmbedFrame({
  url,
  title,
  showTitleBar = false,
}: {
  url: string;
  title: string;
  showTitleBar?: boolean;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-white">
      {showTitleBar && title.trim() ? (
        <div className="shrink-0 border-b border-zinc-300 bg-[#5b9bd5] px-4 py-2.5 text-sm font-semibold text-white">
          {title}
        </div>
      ) : null}
      <iframe
        title={title.trim() || 'Club website preview'}
        src={url}
        className="min-h-0 flex-1 w-full border-0 bg-white"
      />
    </div>
  );
}

export default function ClubWebsiteMemberContentPanel({
  selectedTopicId,
  selectedTopicLabel,
  friendItems,
  customTopics,
  clubDisplayName,
  clubId,
  lang = 'en',
  displayMode = false,
  showExampleNote = false,
}: {
  selectedTopicId: string;
  selectedTopicLabel: string;
  friendItems: ClubWebsiteFriendItem[];
  customTopics: ClubWebsiteTopic[];
  clubDisplayName: string;
  clubId?: string | null;
  lang?: ClubWebsiteLanguageCode;
  displayMode?: boolean;
  showExampleNote?: boolean;
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

  const displayEmbed = useMemo(() => {
    if (!displayMode) return null;
    return resolveMemberDisplayEmbed(friendItems, customTopics, selectedTopicId, activeLang);
  }, [displayMode, friendItems, customTopics, selectedTopicId, activeLang]);

  const showEmbedNote = showExampleNote && displayMode;

  if (displayMode && displayEmbed) {
    const selected = friendItem ?? customTopic;
    const selectedHasHtml = selected ? topicHasHtmlContent(selected, activeLang) : false;
    if (!selectedHasHtml) {
      return (
        <ContentShell showExampleNote={showEmbedNote}>
          <SiteEmbedFrame url={displayEmbed.url} title={displayEmbed.title} />
        </ContentShell>
      );
    }
  }

  if (selectedTopicId === 'bacheca') {
    if (clubId) {
      return (
        <ContentShell showExampleNote={showExampleNote}>
          <ClubBachecaMemberPanel clubId={clubId} />
        </ContentShell>
      );
    }
    return (
      <ContentShell showExampleNote={showExampleNote}>
        <div className="flex min-h-0 flex-1 flex-col bg-[#ececec]">
          <div className="border-b border-[#3d6d9e] bg-[#5b9bd5] px-4 py-3">
            <h2 className="text-sm font-semibold text-white">{t('club_website_bacheca')}</h2>
          </div>
          <div className="flex flex-1 items-center justify-center p-8">
            <p className="max-w-md text-center text-sm text-zinc-600">
              {t('club_website_display_bacheca_hint')}
            </p>
          </div>
        </div>
      </ContentShell>
    );
  }

  if (friendItem) {
    return (
      <ContentShell showExampleNote={showExampleNote}>
        <FriendItemContent
          item={friendItem}
          clubDisplayName={clubDisplayName}
          lang={activeLang}
          displayMode={displayMode}
        />
      </ContentShell>
    );
  }

  if (customTopic) {
    return (
      <ContentShell showExampleNote={showExampleNote}>
        <TopicContent
          topic={customTopic}
          clubDisplayName={clubDisplayName}
          lang={activeLang}
          displayMode={displayMode}
        />
      </ContentShell>
    );
  }

  if (PLACEHOLDER_IDS.has(selectedTopicId)) {
    if (displayMode && displayEmbed) {
      return (
        <ContentShell showExampleNote={showEmbedNote}>
          <SiteEmbedFrame url={displayEmbed.url} title={displayEmbed.title} />
        </ContentShell>
      );
    }
    return (
      <ContentShell showExampleNote={showExampleNote}>
        <div className="flex min-h-0 flex-1 flex-col bg-[#ececec]">
          <div className="border-b border-[#3d6d9e] bg-[#5b9bd5] px-4 py-3">
            <h2 className="text-sm font-semibold text-white">
              {selectedTopicLabel || selectedTopicId}
            </h2>
          </div>
          <div className="flex flex-1 items-center justify-center p-8">
            <p className="text-sm text-zinc-500">{t('club_website_display_no_topics')}</p>
          </div>
        </div>
      </ContentShell>
    );
  }

  if (displayMode && displayEmbed) {
    return (
      <ContentShell showExampleNote={showEmbedNote}>
        <SiteEmbedFrame url={displayEmbed.url} title={displayEmbed.title} />
      </ContentShell>
    );
  }

  return (
    <ContentShell showExampleNote={showExampleNote}>
      <div className="flex min-h-0 flex-1 items-center justify-center bg-[#ececec] p-8">
        <p className="text-sm text-zinc-500">{t('club_website_display_no_topics')}</p>
      </div>
    </ContentShell>
  );
}

function FriendItemContent({
  item,
  clubDisplayName,
  lang,
  displayMode = false,
}: {
  item: ClubWebsiteFriendItem;
  clubDisplayName: string;
  lang: ClubWebsiteLanguageCode;
  displayMode?: boolean;
}) {
  if (topicHasEmbedUrl(item)) {
    if (displayMode || item.openInSamePage) {
      return <SiteEmbedFrame url={item.externalUrl.trim()} title={item.title} />;
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
  displayMode = false,
}: {
  topic: ClubWebsiteTopic;
  clubDisplayName: string;
  lang: ClubWebsiteLanguageCode;
  displayMode?: boolean;
}) {
  if (topicHasEmbedUrl(topic)) {
    if (displayMode || topic.openInSamePage) {
      return <SiteEmbedFrame url={topic.externalUrl.trim()} title={topic.title} />;
    }
    return (
      <ExternalLinkContent
        title={topic.title}
        bannerColor={topic.bannerColor}
        titleColor={topic.titleColor}
        url={topic.externalUrl}
      />
    );
  }

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
    <div className="flex min-h-0 flex-1 flex-col bg-[#ececec]">
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
  const displayHtml = useMemo(() => prepareRichHtmlForDisplay(html || '<p></p>'), [html]);
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-[#ececec]">
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
          dangerouslySetInnerHTML={{ __html: displayHtml }}
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

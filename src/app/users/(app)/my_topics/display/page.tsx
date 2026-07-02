'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { CLUB_WEBSITE_LANGUAGE_TABS, type ClubWebsiteLanguageCode } from '@/lib/clubWebsiteLanguages';
import {
  filterClubWebsiteFriendItemsForMembers,
  getEffectiveFriendItemAudience,
  loadWebsiteFriendItems,
  type ClubWebsiteFriendItem,
} from '@/lib/clubWebsiteFriendList';
import { isTopicAudienceAllowed } from '@/lib/clubWebsiteTopicSettingsFields';
import { useAuth } from '@/hooks/useAuth';

function PersonalTopicDisplayContent() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const friendId = searchParams?.get('id') ?? null;
  const langParam = searchParams?.get('lang');
  const lang = (
    CLUB_WEBSITE_LANGUAGE_TABS.some((l) => l.code === langParam) ? langParam : 'en'
  ) as ClubWebsiteLanguageCode;
  const [items, setItems] = useState<ClubWebsiteFriendItem[]>([]);

  useEffect(() => {
    if (user?.id) setItems(loadWebsiteFriendItems('personal', user.id));
  }, [user?.id]);

  const item = useMemo(() => {
    const visible = filterClubWebsiteFriendItemsForMembers(items);
    const found = visible.find((i) => i.id === friendId) ?? visible[0] ?? null;
    if (!found || !isTopicAudienceAllowed(getEffectiveFriendItemAudience(items, found))) {
      return null;
    }
    return found;
  }, [items, friendId]);

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl p-8 text-center text-sm text-zinc-600">
        {t('club_friend_display_not_found')}
      </div>
    );
  }

  if (!item) {
    return (
      <div className="mx-auto max-w-3xl p-8 text-center text-sm text-zinc-600">
        {t('club_friend_display_not_found')}
      </div>
    );
  }

  if (item.contentDisplayMode === 'link' && item.externalUrl.trim()) {
    if (item.openInSamePage) {
      return (
        <div className="min-h-screen bg-zinc-100">
          <div className="border-b border-zinc-300 bg-zinc-200 px-4 py-1.5 text-center text-[11px] text-zinc-600">
            {t('club_topic_display_readonly_banner')}
          </div>
          <iframe
            title={item.title}
            src={item.externalUrl}
            className="h-[calc(100vh-2rem)] w-full border-0 bg-white"
          />
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-zinc-100">
        <div className="border-b border-zinc-300 bg-zinc-200 px-4 py-1.5 text-center text-[11px] text-zinc-600">
          {t('club_topic_display_readonly_banner')}
        </div>
        <div className="mx-auto max-w-2xl p-8 text-center">
          <p className="mb-4 text-lg font-semibold text-zinc-800">{item.title}</p>
          <a
            href={item.externalUrl}
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

  const html = item.contentsByLang[lang] || item.contentsByLang.en || '';
  const keywords = item.keywordsByLang[lang] || item.keywordsByLang.en || '';

  return (
    <div className="min-h-screen bg-zinc-100">
      <div className="border-b border-zinc-300 bg-zinc-200 px-4 py-1.5 text-center text-[11px] text-zinc-600">
        {t('club_topic_display_readonly_banner')}
      </div>
      <div
        className="px-4 py-3 text-lg font-semibold"
        style={{ backgroundColor: item.bannerColor, color: item.titleColor }}
      >
        {item.title}
      </div>
      <div className="mx-auto max-w-4xl bg-white p-6 shadow-sm">
        {item.sectionName ? (
          <p className="text-xs text-zinc-500">
            {item.sectionName}
            {item.lastUpdate ? ` · ${item.lastUpdate}` : ''}
          </p>
        ) : null}
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

export default function PersonalTopicDisplayPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-teal-700" />
        </div>
      }
    >
      <PersonalTopicDisplayContent />
    </Suspense>
  );
}

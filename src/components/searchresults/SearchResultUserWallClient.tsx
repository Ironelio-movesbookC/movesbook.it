'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Home, UserPlus, Users } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { SearchResultUserWallLeftSidebar } from '@/components/searchresults/SearchResultUserWallLeftSidebar';
import { SearchResultUserWallNotifications } from '@/components/searchresults/SearchResultUserWallNotifications';
import {
  SearchResultVisitorWallBanner,
  type VisitorWallBannerProfile,
} from '@/components/searchresults/SearchResultVisitorWallBanner';
import { SearchResultVisitorWallDashboardChrome } from '@/components/searchresults/SearchResultVisitorWallDashboardChrome';
import { SearchResultVisitorWallMainLayout } from '@/components/searchresults/SearchResultVisitorWallMainLayout';
import { useVisitorWallDisplayOptions } from '@/hooks/useVisitorWallDisplayOptions';

export type UserWallPayload = {
  selfPath: string;
  username: string;
  displayName: string;
  country: string | null;
  image: string | null;
  sportsLine: string;
  userTypeLabel: string;
  ageLabel: string | null;
  bannerProfile: VisitorWallBannerProfile;
};

export function SearchResultUserWallClient({ data }: { data: UserWallPayload }) {
  const { t } = useLanguage();
  const { selfPath, username, displayName, country, image, sportsLine, ageLabel, userTypeLabel, bannerProfile } =
    data;
  const {
    showAdBanner,
    setShowAdBanner,
    showPersonalBanner,
    setShowPersonalBanner,
    showLeftSidebar,
    setShowLeftSidebar,
    showRightSidebar,
    setShowRightSidebar,
    showToolbar,
    setShowToolbar,
    hideRightColumnByPolicy,
    rightSidebarVisible,
  } = useVisitorWallDisplayOptions();
  const [activeWallTab, setActiveWallTab] = useState<
    'posted_me' | 'posted_friends' | 'articles_me' | 'articles_friends'
  >('posted_me');

  const wallTabs = [
    { id: 'posted_me' as const, label: t('searchresult_tab_posted_me').replace('{name}', displayName) },
    {
      id: 'posted_friends' as const,
      label: t('searchresult_tab_posted_friends').replace('{name}', displayName),
    },
    {
      id: 'articles_me' as const,
      label: t('searchresult_tab_articles_me').replace('{name}', displayName),
    },
    {
      id: 'articles_friends' as const,
      label: t('searchresult_tab_articles_friends').replace('{name}', displayName),
    },
  ];

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col bg-zinc-200 pb-10">
      <SearchResultVisitorWallDashboardChrome
        showAdBanner={showAdBanner}
        showPersonalBanner={showPersonalBanner}
        showLeftSidebar={showLeftSidebar}
        showRightSidebar={showRightSidebar}
        showToolbar={showToolbar}
        hideRightColumnByPolicy={hideRightColumnByPolicy}
        onToggleAdBanner={setShowAdBanner}
        onTogglePersonalBanner={setShowPersonalBanner}
        onToggleLeftSidebar={setShowLeftSidebar}
        onToggleRightSidebar={setShowRightSidebar}
        onToggleToolbar={setShowToolbar}
        personalBanner={
          <SearchResultVisitorWallBanner
            profile={bannerProfile}
            badgeLabel={userTypeLabel.toUpperCase()}
          />
        }
      />

      <nav className="border-b border-zinc-700 bg-zinc-800 px-4 py-1.5 text-xs text-zinc-200">
        <div className="flex w-full items-center gap-2">
          <Home className="h-3.5 w-3.5" aria-hidden />
          <span>{t('searchresult_breadcrumb_home')}</span>
        </div>
      </nav>

      <SearchResultVisitorWallMainLayout
        showLeftSidebar={showLeftSidebar}
        rightSidebarVisible={rightSidebarVisible}
        rightVariant="user"
        leftSidebar={
          <SearchResultUserWallLeftSidebar
            displayName={displayName}
            username={username}
            country={country}
            image={image}
            sportsLine={sportsLine}
            ageLabel={ageLabel}
          />
        }
        centerContent={
          <div className="space-y-3">
          <div className="rounded-t border border-amber-200 bg-amber-100 px-3 py-2 text-sm font-semibold text-zinc-900">
            {displayName}
          </div>

          <div className="space-y-3 rounded-b border border-t-0 border-zinc-300 bg-zinc-50 p-4 shadow-inner">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 pb-3">
              <Link href={selfPath} className="text-sm font-medium text-blue-700 hover:underline">
                {selfPath}
              </Link>
              <span className="rounded bg-amber-200 px-2 py-0.5 text-xs font-semibold text-zinc-800">
                {t('searchresult_date_badge')}
              </span>
            </div>
            <button
              type="button"
              className="w-full rounded bg-blue-600 py-2.5 text-sm font-semibold text-white shadow hover:bg-blue-700"
            >
              {t('searchresult_faqs_page')}
            </button>
            <div className="flex flex-wrap justify-end gap-2 text-zinc-500">
              <UserPlus className="h-5 w-5" aria-hidden />
              <Users className="h-5 w-5" aria-hidden />
            </div>
          </div>

          <div className="rounded border border-zinc-300 bg-white shadow-sm">
            <div className="border-b border-zinc-200 bg-zinc-50 px-3 py-2">
              <h2 className="text-lg font-bold text-zinc-900">
                <span className="text-zinc-600">{displayName}</span>
                <span className="text-red-800">{t('searchresult_wall_suffix')}</span>
              </h2>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded border border-zinc-400 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-800 hover:bg-zinc-50"
                >
                  {t('searchresult_respond_friendship')}
                </button>
                <button
                  type="button"
                  className="rounded bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                >
                  {t('searchlist_btn_member')}
                </button>
                <button
                  type="button"
                  className="rounded bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                >
                  {t('searchlist_btn_member')}
                </button>
              </div>
            </div>

            <div className="px-3 py-3">
              <SearchResultUserWallNotifications
                displayName={displayName}
                image={image}
                t={t}
              />
            </div>

            <div className="flex flex-col items-center gap-3 border-t border-zinc-200 px-3 py-4">
              <button
                type="button"
                className="rounded bg-zinc-900 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-zinc-800"
              >
                {t('searchresult_new_post')}
              </button>
              <div className="flex w-full flex-wrap justify-center gap-2">
                {wallTabs.map(({ id, label }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setActiveWallTab(id)}
                    className={`rounded bg-zinc-900 px-2 py-1.5 text-center text-[10px] font-semibold leading-snug text-white hover:bg-zinc-800 sm:text-[11px] ${
                      activeWallTab === id ? 'ring-1 ring-zinc-400' : ''
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <hr className="mt-1 w-full border-zinc-300" />
            </div>
            <div className="min-h-[120px] p-4 text-sm text-zinc-600">
              {t('searchresult_wall_placeholder')}
            </div>
          </div>
          </div>
        }
      />
    </div>
  );
}

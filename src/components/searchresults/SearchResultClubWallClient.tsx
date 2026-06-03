'use client';

import Link from 'next/link';
import { Home } from 'lucide-react';
import {
  SearchResultVisitorWallBanner,
  type VisitorWallBannerProfile,
} from '@/components/searchresults/SearchResultVisitorWallBanner';
import { SearchResultVisitorWallDashboardChrome } from '@/components/searchresults/SearchResultVisitorWallDashboardChrome';
import { SearchResultVisitorWallMainLayout } from '@/components/searchresults/SearchResultVisitorWallMainLayout';
import { useVisitorWallDisplayOptions } from '@/hooks/useVisitorWallDisplayOptions';
import { useLanguage } from '@/contexts/LanguageContext';

export type ClubWallPayload = {
  selfPath: string;
  clubName: string;
  description: string | null;
  location: string | null;
  adminDisplayName: string;
  adminCountry: string | null;
  adminImage: string | null;
  bannerProfile: VisitorWallBannerProfile;
};

export function SearchResultClubWallClient({ data }: { data: ClubWallPayload }) {
  const { t } = useLanguage();
  const { selfPath, clubName, description, location, adminDisplayName, adminCountry, adminImage, bannerProfile } =
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
        personalBanner={<SearchResultVisitorWallBanner profile={bannerProfile} badgeLabel="CLUB" />}
      />

      <nav className="border-b border-zinc-900 bg-zinc-900 px-4 py-1.5 text-xs text-zinc-200">
        <div className="flex w-full items-center gap-2">
          <Home className="h-3.5 w-3.5" aria-hidden />
          <span>{t('searchresult_breadcrumb_home')}</span>
        </div>
      </nav>

      <SearchResultVisitorWallMainLayout
        showLeftSidebar={showLeftSidebar}
        rightSidebarVisible={rightSidebarVisible}
        rightVariant="club"
        leftSidebar={
        <aside className="space-y-3">
          <div className="flex gap-1 rounded border border-zinc-400 bg-zinc-100 p-1 text-xs font-semibold shadow-sm">
            <button type="button" className="flex-1 rounded bg-white px-2 py-2 text-zinc-900 shadow-sm">
              {t('searchresult_club_tab_club')}
            </button>
            <button
              type="button"
              className="flex-1 rounded px-2 py-2 text-zinc-600 hover:bg-white/60"
            >
              {t('searchresult_club_tab_admin')}
            </button>
          </div>

          <div className="rounded border border-zinc-500 bg-zinc-700 p-4 text-xs text-zinc-100 shadow">
            <label className="flex items-start gap-2 border-b border-zinc-600 pb-3">
              <input type="checkbox" className="mt-0.5" />
              <span>{t('searchresult_allow_watch')}</span>
            </label>
            <div className="mt-3 flex items-start gap-3">
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded bg-zinc-500">
                {adminImage ? (
                  <img src={adminImage} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[10px]">—</div>
                )}
              </div>
              <div>
                <p className="font-semibold text-white">{adminDisplayName}</p>
                <p className="mt-1 flex items-center gap-1 text-emerald-300">
                  <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" aria-hidden />
                  {t('searchresult_online')}
                </p>
              </div>
            </div>
            <dl className="mt-3 space-y-1.5 border-t border-zinc-600 pt-3">
              <div>
                <dt className="text-zinc-400">{t('searchresult_club_type')}</dt>
                <dd>{description?.split('\n')[0]?.slice(0, 60) || '—'}</dd>
              </div>
              <div>
                <dt className="text-zinc-400">{t('searchresult_country_label')}</dt>
                <dd>{adminCountry ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-zinc-400">{t('searchresult_locality')}</dt>
                <dd>{location ?? '—'}</dd>
              </div>
            </dl>
          </div>

          <div className="space-y-1 text-xs font-semibold text-white">
            <div className="rounded-t bg-zinc-700 px-3 py-2">{t('searchresult_acc_messages')}</div>
            <div className="bg-zinc-600 px-3 py-2">{t('searchresult_acc_posts')}</div>
            <div className="bg-zinc-600 px-3 py-2">{t('searchresult_acc_articles_club')}</div>
            <div className="bg-red-900 px-3 py-2">{t('searchresult_acc_social_training')}</div>
            <div className="rounded-b bg-teal-800 px-3 py-2">{t('searchresult_acc_communities')}</div>
          </div>
        </aside>
        }
        centerContent={
        <div className="space-y-3">
          <div className="rounded-t border border-amber-200 bg-amber-100 px-3 py-2 text-sm font-semibold text-zinc-900">
            {adminDisplayName}
          </div>

          <div className="rounded border border-zinc-300 bg-white shadow-sm">
            <div className="border-b border-zinc-200 px-4 py-3">
              <h2 className="text-xl font-bold text-red-700">
                {clubName}
                <span className="font-semibold text-red-700">{t('searchresult_club_wall_suffix')}</span>
              </h2>
              <button
                type="button"
                className="mt-2 text-sm font-semibold text-blue-700 hover:underline"
              >
                {t('searchresult_request_friendship')}
              </button>
            </div>
            <div className="flex flex-wrap gap-2 border-b border-zinc-200 px-4 py-2">
              <button
                type="button"
                className="rounded bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-800"
              >
                {t('searchresult_show_post')}
              </button>
              <button
                type="button"
                className="rounded bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-800"
              >
                {t('searchresult_new_post_user')}
              </button>
            </div>
            <div className="flex flex-wrap gap-1 border-b border-zinc-900 bg-zinc-900 px-1 py-1">
              <button type="button" className="rounded-t bg-white px-2 py-1.5 text-[11px] font-semibold text-zinc-900">
                {t('searchresult_tab_posted_me_club').replace('{name}', clubName)}
              </button>
              <button type="button" className="px-2 py-1.5 text-[11px] font-semibold text-zinc-200 hover:text-white">
                {t('searchresult_tab_posted_friends_club').replace('{name}', clubName)}
              </button>
              <button type="button" className="px-2 py-1.5 text-[11px] font-semibold text-zinc-200 hover:text-white">
                {t('searchresult_tab_articles_me_club').replace('{name}', clubName)}
              </button>
              <button type="button" className="px-2 py-1.5 text-[11px] font-semibold text-zinc-200 hover:text-white">
                {t('searchresult_tab_articles_friends_club').replace('{name}', clubName)}
              </button>
            </div>
            <div className="grid gap-4 p-4 sm:grid-cols-2">
              <div className="text-sm text-zinc-700">
                <p>
                  <span className="font-semibold">{t('searchresult_club_type')}:</span>{' '}
                  {description?.slice(0, 80) || '—'}
                </p>
                <p className="mt-2">
                  <span className="font-semibold">{t('searchresult_country_label')}:</span>{' '}
                  {adminCountry ?? '—'}
                </p>
                <p className="mt-2">
                  <span className="font-semibold">{t('searchresult_locality')}:</span> {location ?? '—'}
                </p>
                <p className="mt-4 text-xs leading-relaxed text-zinc-500">
                  {description || t('searchresult_wall_placeholder')}
                </p>
              </div>
              <div className="relative rounded border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-700">
                <span className="absolute right-2 top-2 rotate-12 rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900 shadow">
                  {t('searchresult_only_friends_ribbon')}
                </span>
                <p>
                  <span className="font-semibold">Email</span> —{' '}
                  <span className="text-zinc-500">{t('searchresult_contact_hidden')}</span>
                </p>
                <p className="mt-2">
                  <span className="font-semibold">Phone</span> — {t('searchresult_not_mentioned')}
                </p>
                <p className="mt-2">
                  <span className="font-semibold">Website</span> — {t('searchresult_not_mentioned')}
                </p>
              </div>
            </div>
            <div className="border-t border-zinc-100 px-4 py-2 text-center text-xs text-zinc-400">
              <Link href={selfPath} className="text-blue-600 hover:underline">
                {selfPath}
              </Link>
            </div>
          </div>
        </div>
        }
      />
    </div>
  );
}

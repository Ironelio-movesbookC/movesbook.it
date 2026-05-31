'use client';

import Link from 'next/link';
import { Home, UserPlus, Users } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { SearchResultUserWallLeftSidebar } from '@/components/searchresults/SearchResultUserWallLeftSidebar';

export type UserWallPayload = {
  selfPath: string;
  username: string;
  displayName: string;
  country: string | null;
  image: string | null;
  sportsLine: string;
  userTypeLabel: string;
  ageLabel: string | null;
};

export function SearchResultUserWallClient({ data }: { data: UserWallPayload }) {
  const { t } = useLanguage();
  const { selfPath, username, displayName, country, image, sportsLine, ageLabel } = data;

  return (
    <div className="min-h-0 flex-1 bg-zinc-200 pb-10">
      <section className="relative h-44 w-full overflow-hidden bg-gradient-to-r from-slate-800 via-slate-700 to-slate-900">
        <div className="absolute inset-0 bg-[url('/sidelogo.png')] bg-right bg-no-repeat opacity-10" />
        <div className="relative mx-auto flex h-full max-w-7xl items-end gap-3 px-4 pb-4">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded border-2 border-white bg-zinc-300 shadow-lg">
            {image ? (
              <img src={image} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs text-zinc-600">—</div>
            )}
          </div>
          <div className="mb-1 rounded bg-blue-700 px-4 py-2 text-lg font-semibold text-white shadow-md">
            {displayName}
          </div>
        </div>
      </section>

      <nav className="border-b border-zinc-700 bg-zinc-800 px-4 py-1.5 text-xs text-zinc-200">
        <div className="mx-auto flex max-w-7xl items-center gap-2">
          <Home className="h-3.5 w-3.5" aria-hidden />
          <span>{t('searchresult_breadcrumb_home')}</span>
        </div>
      </nav>

      <div className="mx-auto grid max-w-7xl gap-4 px-3 py-6 lg:grid-cols-12 lg:px-4">
        <SearchResultUserWallLeftSidebar
          displayName={displayName}
          username={username}
          country={country}
          image={image}
          sportsLine={sportsLine}
          ageLabel={ageLabel}
        />

        <section className="space-y-3 lg:col-span-6">
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
                {displayName}
                {t('searchresult_wall_suffix')}
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
            <div className="border-b border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
              {t('searchresult_member_confirmed')}
            </div>
            <div className="border-b-2 border-red-400 bg-red-50 p-3">
              <div className="flex justify-between gap-2">
                <p className="text-sm font-medium text-red-900">{t('searchresult_invite_notice_title')}</p>
                <button type="button" className="text-red-700 hover:text-red-900" aria-label="Close">
                  ×
                </button>
              </div>
              <p className="mt-2 text-xs text-red-800">{t('searchresult_invite_notice_body')}</p>
            </div>
            <div className="flex flex-wrap gap-2 border-b border-zinc-200 px-3 py-2">
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
                {t('searchresult_new_post')}
              </button>
            </div>
            <div className="flex flex-wrap gap-1 border-b border-zinc-800 bg-zinc-900 px-1 py-1">
              <button type="button" className="rounded-t bg-white px-2 py-1.5 text-[11px] font-semibold text-zinc-900">
                {t('searchresult_tab_posted_me').replace('{name}', displayName)}
              </button>
              <button type="button" className="px-2 py-1.5 text-[11px] font-semibold text-zinc-200 hover:text-white">
                {t('searchresult_tab_posted_friends').replace('{name}', displayName)}
              </button>
              <button type="button" className="px-2 py-1.5 text-[11px] font-semibold text-zinc-200 hover:text-white">
                {t('searchresult_tab_articles_me').replace('{name}', displayName)}
              </button>
              <button type="button" className="px-2 py-1.5 text-[11px] font-semibold text-zinc-200 hover:text-white">
                {t('searchresult_tab_articles_friends').replace('{name}', displayName)}
              </button>
            </div>
            <div className="min-h-[120px] p-4 text-sm text-zinc-600">
              {t('searchresult_wall_placeholder')}
            </div>
          </div>
        </section>

        <aside className="space-y-4 lg:col-span-3">
          <div className="rounded border border-zinc-400 bg-zinc-800 p-3 text-xs text-zinc-100 shadow">
            <h3 className="border-b border-zinc-600 pb-2 font-bold uppercase tracking-wide text-amber-200">
              {t('searchresult_next_event')}
            </h3>
            <ul className="mt-2 space-y-2">
              <li>{t('searchresult_event_birthday')}</li>
              <li>{t('searchresult_events_my_sports')}</li>
              <li>{t('searchresult_friends_events')}</li>
              <li>{t('searchresult_other_sport')}</li>
            </ul>
            <Link href="#" className="mt-2 inline-block text-red-400 hover:underline">
              {t('searchresult_see_all')}
            </Link>
          </div>
          <div className="rounded border border-zinc-400 bg-zinc-800 p-3 text-xs text-zinc-100 shadow">
            <h3 className="border-b border-zinc-600 pb-2 font-bold uppercase tracking-wide text-amber-200">
              {t('searchresult_news_by_friends')}
            </h3>
            <p className="mt-2 text-zinc-300">{t('searchresult_news_placeholder')}</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

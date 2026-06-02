'use client';

import { Filter, Mail, Twitter, Facebook } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  WallAvatarPlaceholder,
  WallMembersLastLoggedSection,
  WallNextEventSection,
} from '@/components/dashboard/wallRightColumn/shared';

const DEMO_NEWS = [
  {
    title: 'Trail Running',
    date: '27.4.2010',
    body: 'For all the runners who just love to run where there is no path...',
    meta: '1392 Members, 205049 Movers',
  },
  {
    title: 'Where is the limit',
    date: '18.5.2010',
    body: "We don't know where the limit is, but we know where it's not!!",
    meta: '1017 Members, 138718 Movers',
  },
  {
    title: 'Run for Japan',
    date: '18.3.2011',
    body: 'Now, if even, every Move counts with a death toll in the thousands...',
    meta: '90 Members, 24258 Movers',
  },
];

const DEMO_MEMBERS = ['Freiwildplayer', 'Freewildplayer', 'lemonWonderland'];

const DEMO_PAGES = [
  { name: 'Correre', line: 'Piace a Giusi Cricri e ad altri 36 amici.' },
  { name: 'Papa Benedetto XVI', line: 'Piace a Chiara Di Palma' },
  { name: 'Il Mattino', line: 'Piace a Fabio Manzi e ad altri 27 amici.' },
  { name: "L'uomo senza sonno", line: 'Piace a Luca Borsacchi.' },
];

/**
 * User visitor wall right column — same sections as dashboard RightSidebar (my-page).
 */
export default function VisitorWallUserRightColumn() {
  const { t } = useLanguage();

  return (
    <div className="flex flex-col">
      <WallNextEventSection />

      <div className="mt-3">
        <div className="bg-gray-900 px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-white">
          {t('sidebar_news_by_friends')}
        </div>
        <div className="divide-y divide-gray-200 bg-white">
          {DEMO_NEWS.map((item) => (
            <div key={item.title} className="px-3 py-2">
              <div className="mb-2 flex items-start gap-3">
                <WallAvatarPlaceholder />
                <div className="flex-1">
                  <h6 className="text-sm font-semibold text-red-700">{item.title}</h6>
                  <p className="text-xs text-gray-500">{item.date}</p>
                </div>
              </div>
              <p className="text-xs text-gray-700">{item.body}</p>
              <p className="mt-1 text-xs text-gray-500">{item.meta}</p>
            </div>
          ))}
        </div>
        <button
          type="button"
          className="w-full bg-white px-3 py-1.5 text-left text-[11px] font-semibold text-red-600 border-t border-gray-300"
        >
          + More
        </button>
      </div>

      <div className="mt-3">
        <div className="bg-gray-900 px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-white">
          {t('sidebar_newest_members')}
        </div>
        <button
          type="button"
          className="flex w-full items-center justify-center gap-2 bg-teal-600 py-2 px-3 text-xs font-semibold text-white transition-colors hover:bg-teal-700"
        >
          <Filter className="h-4 w-4" aria-hidden />
          {t('sidebar_filter_option')}
        </button>
        <div className="divide-y divide-gray-200 bg-white">
          {DEMO_MEMBERS.map((name, idx) => (
            <div key={`newest-${name}-${idx}`} className="flex items-start gap-3 px-3 py-2">
              <WallAvatarPlaceholder size="w-12 h-12" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-800">{name}</p>
                <button
                  type="button"
                  className="mt-1 flex items-center gap-1 text-xs text-gray-600 hover:text-gray-800"
                >
                  <Mail className="h-3 w-3" aria-hidden />
                  {t('sidebar_send_message')}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3">
        <WallMembersLastLoggedSection />
      </div>

      <div className="mt-3">
        <div className="bg-gray-900 px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-white">
          BUTTON FOR YOUR WEBSITE
        </div>
        <div className="bg-white px-3 py-4 text-center">
          <p className="text-xs text-gray-700">
            Promote this on your site just
            <br />
            click the button
          </p>
          <p className="mt-4 text-[10px] font-bold tracking-wide text-gray-700">FOLLOW MY MOVES AT</p>
          <button
            type="button"
            className="mt-2 w-full bg-red-600 py-2 text-xs font-bold text-white transition-colors hover:bg-red-700"
          >
            MOVESBOOK
          </button>
        </div>
      </div>

      <div className="mt-3">
        <div className="bg-gray-900 px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-white">
          SHARE THIS PAGE
        </div>
        <div className="flex items-center justify-center gap-3 bg-white px-3 py-4">
          <button
            type="button"
            className="inline-flex h-7 items-center justify-center rounded-full bg-black px-4 text-[11px] font-semibold text-white"
          >
            <Twitter className="mr-1.5 h-3.5 w-3.5" aria-hidden />
            Post
          </button>
          <button
            type="button"
            className="inline-flex h-7 items-center justify-center rounded bg-blue-600 px-4 text-[11px] font-semibold text-white"
          >
            <Facebook className="mr-1.5 h-3.5 w-3.5" aria-hidden />
            Share
          </button>
        </div>
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between bg-gray-900 px-3 py-2 text-white">
          <h4 className="text-[11px] font-bold uppercase tracking-wide">
            {t('sidebar_recommended_pages')}
          </h4>
          <button type="button" className="text-[10px] font-semibold text-gray-300 hover:text-white">
            {t('sidebar_see_all')}
          </button>
        </div>
        <button
          type="button"
          className="flex w-full items-center justify-center gap-2 bg-teal-600 py-2 px-3 text-xs font-semibold text-white transition-colors hover:bg-teal-700"
        >
          <Filter className="h-4 w-4" aria-hidden />
          {t('sidebar_filter_option')}
        </button>
        <div className="divide-y divide-gray-200 bg-white">
          {DEMO_PAGES.map((page) => (
            <div key={page.name} className="flex items-start gap-3 px-3 py-3">
              <WallAvatarPlaceholder />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold text-gray-800">{page.name}</p>
                <p className="mt-0.5 text-[10px] text-gray-600">{page.line}</p>
                <button type="button" className="mt-1 text-[10px] text-gray-600 hover:text-gray-800">
                  👍 {t('sidebar_mi_piace')}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

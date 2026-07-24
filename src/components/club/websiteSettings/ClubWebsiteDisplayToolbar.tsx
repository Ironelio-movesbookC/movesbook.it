'use client';

import Link from 'next/link';
import { Home, Settings } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { CLUB_WEBSITE_SETTINGS_INDEX_PATH } from '@/lib/clubWebsiteSettingsPaths';
import { writeClubWorkspaceTab } from '@/lib/club/clubWorkspaceTab';

function BannerBarbellIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 12" className={className} width={20} height={12} aria-hidden>
      <rect x="1" y="2" width="4" height="8" rx="0.5" fill="currentColor" />
      <rect x="19" y="2" width="4" height="8" rx="0.5" fill="currentColor" />
      <rect x="6" y="5" width="12" height="2" rx="0.5" fill="currentColor" />
    </svg>
  );
}

export default function ClubWebsiteDisplayToolbar({ clubId }: { clubId?: string | null }) {
  const { t } = useLanguage();
  const settingsHref = clubId
    ? `${CLUB_WEBSITE_SETTINGS_INDEX_PATH}?clubId=${encodeURIComponent(clubId)}`
    : CLUB_WEBSITE_SETTINGS_INDEX_PATH;

  return (
    <div className="relative h-[52px] shrink-0 overflow-hidden bg-[#3d3d3d] shadow-md">
      <div className="flex h-full items-center justify-between gap-3 px-3 sm:px-4">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <span className="inline-flex shrink-0 items-center text-gray-300" aria-hidden>
            <BannerBarbellIcon className="text-current" />
          </span>
          <button
            type="button"
            className="inline-flex shrink-0 items-center gap-1.5 text-sm text-gray-200 transition-colors hover:text-white"
          >
            <Home className="h-4 w-4 shrink-0" />
            <span>Home</span>
          </button>
          <button
            type="button"
            className="shrink-0 text-sm text-gray-200 transition-colors hover:text-white"
          >
            FAQ
          </button>
        </div>

        <div className="flex shrink-0 items-stretch overflow-hidden rounded-sm border border-red-900/80">
          <div className="flex items-center bg-gradient-to-r from-[#a31919] to-[#8b0000] px-4 py-2 text-sm font-semibold tracking-wide text-white">
            {t('sidebar_most_used_buttons')}
          </div>
          <Link
            href={settingsHref}
            onClick={() => writeClubWorkspaceTab('my-entity')}
            className="flex w-10 items-center justify-center border-l border-white/20 bg-gradient-to-r from-[#a31919] to-[#8b0000] text-white/95 transition-colors hover:bg-black/20"
            aria-label={t('sidebar_club_website_editor_aria')}
          >
            <Settings className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

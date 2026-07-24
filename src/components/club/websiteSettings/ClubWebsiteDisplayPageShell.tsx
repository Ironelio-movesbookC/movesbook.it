'use client';

import type { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import AdvertisementCarousel from '@/components/AdvertisementCarousel';
import ModernNavbar from '@/components/ModernNavbar';
import SimpleFooter from '@/components/SimpleFooter';
import { getHeroBannerDisplayUrl } from '@/lib/profileBannerSequence';
import { useClubWebsiteSettingsPage } from '@/hooks/useClubWebsiteSettingsPage';
import ClubWebsiteDisplayBanner from '@/components/club/websiteSettings/ClubWebsiteDisplayBanner';
import { isClubAccountUserType } from '@/utils/dashboardRouting';

/**
 * Club accounts: content only inside ClubWorkspaceShell.
 * Athletes/others: standalone chrome so "Topics of my clubs" can open display.
 */
export default function ClubWebsiteDisplayPageShell({
  children,
}: {
  children: (ctx: ReturnType<typeof useClubWebsiteSettingsPage>) => ReactNode;
}) {
  const ctx = useClubWebsiteSettingsPage();
  const { user, loading, clubsLoading, bannerProfile, clubDisplayName, showAdBanner } = ctx;
  const inClubWorkspace = Boolean(user && isClubAccountUserType(user.userType));

  if (loading || !user) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center bg-[#ececec]">
        <Loader2 className="h-8 w-8 animate-spin text-teal-700" />
      </div>
    );
  }

  const content = (
    <div className="flex min-h-0 flex-1 flex-col bg-[#ececec]">
      <ClubWebsiteDisplayBanner
        clubName={clubDisplayName}
        coverImageUrl={getHeroBannerDisplayUrl(bannerProfile)}
        coverBannerAlignment={
          bannerProfile?.profileBannerAlignment === 'center' ? 'center' : 'default'
        }
      />
      <main className="flex min-h-0 flex-1 flex-col">
        {clubsLoading ? (
          <div className="flex flex-1 items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-teal-700" />
          </div>
        ) : (
          children(ctx)
        )}
      </main>
    </div>
  );

  if (inClubWorkspace) {
    return content;
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#ececec]">
      <ModernNavbar />
      {showAdBanner ? (
        <div className="shrink-0 px-2 pt-2">
          <AdvertisementCarousel />
        </div>
      ) : null}
      {content}
      <SimpleFooter />
    </div>
  );
}

'use client';

import { DEFAULT_HERO_BANNER_URL } from '@/lib/profileBannerSequence';
import SafeCoverImage from '@/components/media/SafeCoverImage';

export default function ClubWebsiteDisplayBanner({
  clubName,
  coverImageUrl,
  coverBannerAlignment = 'default',
}: {
  clubName: string;
  coverImageUrl: string;
  coverBannerAlignment?: 'center' | 'default';
}) {
  const src = coverImageUrl || DEFAULT_HERO_BANNER_URL;
  const alignCenter = coverBannerAlignment === 'center';
  const coverObjectClass = alignCenter ? 'object-cover object-center' : 'object-cover object-top';
  const displayName = clubName.trim() || 'Club';

  return (
    <div className="relative h-[180px] w-full shrink-0 overflow-hidden bg-black sm:h-[200px]">
      <SafeCoverImage
        src={src}
        fill
        className={`${coverObjectClass} opacity-90`}
        priority
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/15 to-transparent pointer-events-none" />
      <div className="absolute bottom-3 left-3 z-10">
        <span className="inline-block max-w-[min(16rem,70vw)] truncate rounded bg-[#1e4f91] px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-white shadow">
          {displayName}
        </span>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { Camera } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { parseBannerSequenceJson } from '@/lib/profileBannerSequence';
import { resolvePublicImageUrl } from '@/lib/profileImageUrl';

export type VisitorWallBannerProfile = {
  image?: string | null;
  profileBanner?: string | null;
  profileBannerAlignment?: string | null;
  profileBannerSequence?: string | null;
  profileBannerVideo?: string | null;
};

type SearchResultVisitorWallBannerProps = {
  profile: VisitorWallBannerProfile | null;
  badgeLabel: string;
};

const DEFAULT_BANNER = '/images/banner.jpg';

function CoverImage({
  src,
  className,
  priority,
}: {
  src: string;
  className: string;
  priority?: boolean;
}) {
  const [current, setCurrent] = useState(src);

  useEffect(() => {
    setCurrent(src);
  }, [src]);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={current}
      alt=""
      className={`absolute inset-0 h-full w-full ${className}`}
      onError={() => {
        if (current !== DEFAULT_BANNER) setCurrent(DEFAULT_BANNER);
      }}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
    />
  );
}

function SequenceCoverImages({
  sequencePaths,
  coverObjectClass,
}: {
  sequencePaths: string[];
  coverObjectClass: string;
}) {
  const [idx, setIdx] = useState(0);
  const resolved = sequencePaths.map((p) => resolvePublicImageUrl(p) || DEFAULT_BANNER);

  useEffect(() => {
    if (resolved.length < 2) return;
    const id = setInterval(() => setIdx((i) => (i + 1) % resolved.length), 5000);
    return () => clearInterval(id);
  }, [resolved.length]);

  return (
    <div className="absolute inset-0">
      {resolved.map((src, i) => (
        <div
          key={`${src.slice(0, 64)}-${i}`}
          className={`absolute inset-0 transition-opacity duration-[900ms] ${
            i === idx ? 'opacity-90 z-[1]' : 'opacity-0 z-0 pointer-events-none'
          }`}
        >
          <CoverImage src={src} className={coverObjectClass} priority={i === 0} />
        </div>
      ))}
    </div>
  );
}

/**
 * Read-only visitor wall header: tall cover, large avatar, SPONSORED column (legacy layout).
 */
export function SearchResultVisitorWallBanner({
  profile,
  badgeLabel,
}: SearchResultVisitorWallBannerProps) {
  const { t } = useLanguage();
  const sequencePaths = parseBannerSequenceJson(profile?.profileBannerSequence);
  const useSequence = sequencePaths.length > 0;

  const videoSrc = profile?.profileBannerVideo?.trim()
    ? resolvePublicImageUrl(profile.profileBannerVideo)
    : null;

  const bannerSrc = profile?.profileBanner?.trim()
    ? resolvePublicImageUrl(profile.profileBanner) || DEFAULT_BANNER
    : DEFAULT_BANNER;

  const alignCenter = profile?.profileBannerAlignment === 'center';
  const coverObjectClass = alignCenter ? 'object-cover object-center' : 'object-cover object-top';

  const avatarSrc = resolvePublicImageUrl(profile?.image);
  const [sponsorThumb, setSponsorThumb] = useState(bannerSrc);

  useEffect(() => {
    setSponsorThumb(bannerSrc);
  }, [bannerSrc]);

  return (
    <div className="flex w-full flex-col sm:flex-row shadow-lg overflow-hidden bg-black min-h-[220px] max-h-[280px]">
      <div className="relative flex-1 min-h-[200px] sm:min-h-[220px]">
        {videoSrc ? (
          <video
            key={videoSrc}
            src={videoSrc}
            className={`absolute inset-0 h-full w-full ${coverObjectClass} opacity-90`}
            autoPlay
            muted
            loop
            playsInline
            aria-hidden
          />
        ) : useSequence ? (
          <SequenceCoverImages
            key={sequencePaths.map((p) => p.slice(0, 48)).join('|')}
            sequencePaths={sequencePaths}
            coverObjectClass={coverObjectClass}
          />
        ) : (
          <CoverImage
            key={bannerSrc.startsWith('data:') ? 'banner-data' : bannerSrc}
            src={bannerSrc}
            className={`${coverObjectClass} opacity-90`}
            priority
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/20 to-transparent pointer-events-none" />

        <div
          className="absolute top-0 left-0 right-0 h-12 flex items-start justify-start p-2 z-10"
          style={{
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.45), transparent)',
          }}
        >
          <span
            className="text-white/95 p-2 rounded bg-black/25 pointer-events-none"
            aria-hidden
          >
            <Camera className="w-5 h-5" />
          </span>
        </div>

        <div className="absolute bottom-0 left-0 right-0 flex items-end gap-3 p-3 z-10">
          <div className="flex items-end gap-2 min-w-0">
            <div className="relative flex-shrink-0">
              <div className="w-24 h-24 sm:w-28 sm:h-28 border-4 border-white shadow-lg overflow-hidden bg-gray-200">
                {avatarSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={avatarSrc.startsWith('data:') ? 'avatar-data' : avatarSrc}
                    src={avatarSrc}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-300 text-gray-600 text-sm font-medium">
                    ?
                  </div>
                )}
              </div>
              <span
                className="absolute -bottom-0.5 -right-0.5 w-7 h-7 rounded bg-black/70 text-white flex items-center justify-center pointer-events-none"
                aria-hidden
              >
                <Camera className="w-3.5 h-3.5" />
              </span>
            </div>
            <span className="mb-1 px-2 py-0.5 bg-blue-700 text-white text-xs font-semibold uppercase tracking-wide rounded shadow max-w-[12rem] truncate">
              {badgeLabel}
            </span>
          </div>
        </div>
      </div>

      <aside className="w-full sm:w-64 md:w-72 flex-shrink-0 bg-[#e8e8e8] border-t sm:border-t-0 sm:border-l border-gray-300 flex flex-col min-h-[140px] sm:min-h-0">
        <div className="bg-[#222] text-white text-center text-xs font-bold tracking-widest py-2 px-2">
          {t('sidebar_sponsored')}
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="flex gap-2 bg-white/80 p-2 rounded border border-gray-200/80"
            >
              <div className="w-12 h-12 flex-shrink-0 bg-gray-300 overflow-hidden relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={sponsorThumb}
                  alt=""
                  className="object-cover w-full h-full opacity-80"
                  onError={() => {
                    if (sponsorThumb !== DEFAULT_BANNER) setSponsorThumb(DEFAULT_BANNER);
                  }}
                />
              </div>
              <div className="min-w-0 text-xs leading-snug">
                <span className="text-blue-700 font-medium block truncate">
                  {t('athlete_sponsor_placeholder_title')}
                </span>
                <span className="text-gray-500">{t('athlete_sponsor_placeholder_domain')}</span>
                <br />
                <span className="text-gray-600">{t('athlete_sponsor_placeholder_desc')}</span>
              </div>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}

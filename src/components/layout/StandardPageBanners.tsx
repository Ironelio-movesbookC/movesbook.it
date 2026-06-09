'use client';

import AdvertisementCarousel from '@/components/AdvertisementCarousel';
import AthleteLegacyBanner, {
  type AthleteLegacyBannerProfile,
} from '@/components/athlete/AthleteLegacyBanner';

type StandardPageBannersProps = {
  bannerProfile: AthleteLegacyBannerProfile | null;
  primaryClubName?: string | null;
  onCoverCameraClick?: () => void;
  onAvatarCameraClick?: () => void;
  t: (key: string) => string;
};

/** Advertising + personal banner strip — always visible (no hide toggle). */
export default function StandardPageBanners({
  bannerProfile,
  primaryClubName,
  onCoverCameraClick,
  onAvatarCameraClick,
  t,
}: StandardPageBannersProps) {
  return (
    <>
      <div className="mb-6 flex-shrink-0 px-4">
        <AdvertisementCarousel />
      </div>
      <div className="mb-6 flex-shrink-0 px-4">
        <AthleteLegacyBanner
          profile={bannerProfile}
          primaryClubName={primaryClubName}
          onCoverCameraClick={onCoverCameraClick}
          onAvatarCameraClick={onAvatarCameraClick}
          t={t}
        />
      </div>
    </>
  );
}

export function profileToBannerProfile(data: {
  image?: string | null;
  profileBanner?: string | null;
  profileBannerAlignment?: string | null;
  profileBannerSequence?: string | null;
  profileBannerVideo?: string | null;
  name?: string | null;
  firstName?: string | null;
  surname?: string | null;
} | null): AthleteLegacyBannerProfile | null {
  if (!data) return null;
  return {
    image: data.image,
    profileBanner: data.profileBanner,
    profileBannerAlignment: data.profileBannerAlignment,
    profileBannerSequence: data.profileBannerSequence,
    profileBannerVideo: data.profileBannerVideo,
    name: data.name,
    firstName: data.firstName,
    surname: data.surname,
  };
}

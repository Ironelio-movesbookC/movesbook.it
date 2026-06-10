'use client';

import AdvertisementCarousel from '@/components/AdvertisementCarousel';
import DisplayOptionsToolbar from '@/app/my-page/components/DisplayOptionsToolbar';

type Props = {
  showAdBanner: boolean;
  showPersonalBanner: boolean;
  showLeftSidebar: boolean;
  showRightSidebar: boolean;
  hideRightColumnByPolicy: boolean;
  onToggleAdBanner: (value: boolean) => void;
  onTogglePersonalBanner: (value: boolean) => void;
  onToggleLeftSidebar: (value: boolean) => void;
  onToggleRightSidebar: (value: boolean) => void;
  personalBanner: React.ReactNode;
};

/**
 * Top dashboard chrome for visitor walls: Display Options + Advertising Banner + Personal Banner.
 * The right sidebar column is controlled separately; this block must always remain available.
 */
export function SearchResultVisitorWallDashboardChrome({
  showAdBanner,
  showPersonalBanner,
  showLeftSidebar,
  showRightSidebar,
  hideRightColumnByPolicy,
  onToggleAdBanner,
  onTogglePersonalBanner,
  onToggleLeftSidebar,
  onToggleRightSidebar,
  personalBanner,
}: Props) {
  return (
    <>
      <DisplayOptionsToolbar
        showAdBanner={showAdBanner}
        showPersonalBanner={showPersonalBanner}
        showLeftSidebar={showLeftSidebar}
        showRightSidebar={hideRightColumnByPolicy ? false : showRightSidebar}
        onToggleAdBanner={onToggleAdBanner}
        onTogglePersonalBanner={onTogglePersonalBanner}
        onToggleLeftSidebar={onToggleLeftSidebar}
        onToggleRightSidebar={hideRightColumnByPolicy ? () => {} : onToggleRightSidebar}
      />

      {showAdBanner ? (
        <div className="flex-shrink-0 pt-4 print:hidden">
          <AdvertisementCarousel />
        </div>
      ) : null}

      {showPersonalBanner ? personalBanner : null}
    </>
  );
}

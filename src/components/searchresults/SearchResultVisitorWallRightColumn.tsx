'use client';

import AthleteMyClubRightSidebar from '@/components/dashboard/AthleteMyClubRightSidebar';
import VisitorWallUserRightColumn from '@/components/dashboard/VisitorWallUserRightColumn';

export function SearchResultVisitorWallRightColumn({
  variant,
  mode = 'grid',
}: {
  variant: 'user' | 'club';
  /** `flex` when nested in dashboard shell (users layout); `grid` on visitor wall pages. */
  mode?: 'grid' | 'flex';
}) {
  const wrapClass =
    mode === 'flex' ? 'w-80 shrink-0 print:hidden' : 'lg:col-span-3';

  return (
    <aside className={wrapClass}>
      <div className="h-full min-h-0 overflow-y-auto rounded border border-zinc-400 bg-white shadow">
        {variant === 'club' ? (
          <AthleteMyClubRightSidebar showSponsoredBlock={false} />
        ) : (
          <VisitorWallUserRightColumn />
        )}
      </div>
    </aside>
  );
}

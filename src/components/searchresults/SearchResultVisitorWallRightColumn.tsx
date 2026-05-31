'use client';

import AthleteMyClubRightSidebar from '@/components/dashboard/AthleteMyClubRightSidebar';
import VisitorWallUserRightColumn from '@/components/dashboard/VisitorWallUserRightColumn';

export function SearchResultVisitorWallRightColumn({
  variant,
}: {
  variant: 'user' | 'club';
}) {
  return (
    <aside className="lg:col-span-3">
      <div className="overflow-hidden rounded border border-zinc-400 bg-white shadow">
        {variant === 'club' ? <AthleteMyClubRightSidebar /> : <VisitorWallUserRightColumn />}
      </div>
    </aside>
  );
}

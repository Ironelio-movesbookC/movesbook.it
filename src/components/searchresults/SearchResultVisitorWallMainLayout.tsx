'use client';

import { SearchResultVisitorWallRightColumn } from '@/components/searchresults/SearchResultVisitorWallRightColumn';

type Props = {
  showLeftSidebar: boolean;
  leftSidebar: React.ReactNode;
  centerContent: React.ReactNode;
  rightSidebarVisible: boolean;
  rightVariant: 'user' | 'club';
};

/**
 * Full-width three-column shell for visitor walls (same flex pattern as /my-page).
 */
export function SearchResultVisitorWallMainLayout({
  showLeftSidebar,
  leftSidebar,
  centerContent,
  rightSidebarVisible,
  rightVariant,
}: Props) {
  return (
    <div className="flex w-full flex-1 items-start gap-0 py-4">
      {showLeftSidebar ? (
        <div className="sticky top-0 w-80 shrink-0 self-start">{leftSidebar}</div>
      ) : null}
      <main className="min-w-0 flex-1 px-4">{centerContent}</main>
      {rightSidebarVisible ? (
        <SearchResultVisitorWallRightColumn variant={rightVariant} mode="flex" />
      ) : null}
    </div>
  );
}

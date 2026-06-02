'use client';

import { useMemo, useState } from 'react';
import { useVisitorWallHideRightColumn } from '@/hooks/useVisitorWallHideRightColumn';

/** Display-option toggles for visitor wall pages (same chrome as athlete dashboard). */
export function useVisitorWallDisplayOptions() {
  const hideRightColumnByPolicy = useVisitorWallHideRightColumn();

  const [showAdBanner, setShowAdBanner] = useState(true);
  const [showPersonalBanner, setShowPersonalBanner] = useState(true);
  const [showLeftSidebar, setShowLeftSidebar] = useState(true);
  const [showRightSidebar, setShowRightSidebar] = useState(true);
  const [showToolbar, setShowToolbar] = useState(true);

  const rightSidebarVisible = showRightSidebar && !hideRightColumnByPolicy;

  const centerColSpan = useMemo(() => {
    const left = showLeftSidebar ? 3 : 0;
    const right = rightSidebarVisible ? 3 : 0;
    return Math.max(6, 12 - left - right);
  }, [showLeftSidebar, rightSidebarVisible]);

  return {
    showAdBanner,
    setShowAdBanner,
    showPersonalBanner,
    setShowPersonalBanner,
    showLeftSidebar,
    setShowLeftSidebar,
    showRightSidebar,
    setShowRightSidebar,
    showToolbar,
    setShowToolbar,
    hideRightColumnByPolicy,
    rightSidebarVisible,
    centerColSpan,
  };
}

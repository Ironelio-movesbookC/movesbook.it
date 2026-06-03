'use client';

import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'movesbook.displayLayoutOptions';

export type DisplayLayoutOptions = {
  showAdBanner: boolean;
  showPersonalBanner: boolean;
  showLeftSidebar: boolean;
  showRightSidebar: boolean;
};

const DEFAULTS: DisplayLayoutOptions = {
  showAdBanner: true,
  showPersonalBanner: true,
  showLeftSidebar: true,
  showRightSidebar: true,
};

export function useDisplayLayoutOptions() {
  const [options, setOptions] = useState<DisplayLayoutOptions>(DEFAULTS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<DisplayLayoutOptions>;
        setOptions({ ...DEFAULTS, ...parsed });
      }
    } catch {
      /* ignore corrupt storage */
    }
    setHydrated(true);
  }, []);

  const patchOptions = useCallback((patch: Partial<DisplayLayoutOptions>) => {
    setOptions((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignore quota errors */
      }
      return next;
    });
  }, []);

  return {
    ...options,
    hydrated,
    setShowAdBanner: (showAdBanner: boolean) => patchOptions({ showAdBanner }),
    setShowPersonalBanner: (showPersonalBanner: boolean) => patchOptions({ showPersonalBanner }),
    setShowLeftSidebar: (showLeftSidebar: boolean) => patchOptions({ showLeftSidebar }),
    setShowRightSidebar: (showRightSidebar: boolean) => patchOptions({ showRightSidebar }),
  };
}

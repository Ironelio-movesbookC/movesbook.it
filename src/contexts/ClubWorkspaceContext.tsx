'use client';

import { createContext, useContext } from 'react';
import type { ClubWorkspaceTab } from '@/lib/club/clubWorkspaceTab';

type ClubWorkspaceContextValue = {
  activeTab: ClubWorkspaceTab;
  selectedClubId: string | null;
};

export const ClubWorkspaceContext = createContext<ClubWorkspaceContextValue>({
  activeTab: 'my-page',
  selectedClubId: null,
});

export function useClubWorkspace() {
  return useContext(ClubWorkspaceContext);
}

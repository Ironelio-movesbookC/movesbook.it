'use client';

import { useWebsiteFriendList } from '@/hooks/useWebsiteFriendList';

export function useClubWebsiteFriendList(clubId: string | undefined) {
  return useWebsiteFriendList('club', clubId);
}

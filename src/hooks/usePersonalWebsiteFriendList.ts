'use client';

import { useWebsiteFriendList } from '@/hooks/useWebsiteFriendList';

export function usePersonalWebsiteFriendList(userId: string | undefined) {
  return useWebsiteFriendList('personal', userId);
}

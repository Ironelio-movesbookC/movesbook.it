'use client';

import { useCallback, useEffect, useState } from 'react';
import { CHAT_UNREAD_COUNT_CHANGED_EVENT } from '@/lib/chat/chatUnreadEvents';

const POLL_INTERVAL_MS = 30_000;

/**
 * Total unread 1:1 chat messages for the logged-in user.
 * Polls periodically and refreshes when chat marks conversations as read.
 */
export function useChatUnreadCount(enabled = true) {
  const [unreadCount, setUnreadCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setUnreadCount(0);
      return;
    }
    try {
      const token =
        typeof window !== 'undefined'
          ? localStorage.getItem('token') || localStorage.getItem('adminToken')
          : null;
      if (!token) {
        setUnreadCount(0);
        return;
      }
      const res = await fetch('/api/chat/unread-count', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      if (!res.ok) {
        setUnreadCount(0);
        return;
      }
      const data = (await res.json()) as { unreadCount?: number };
      setUnreadCount(typeof data.unreadCount === 'number' ? data.unreadCount : 0);
    } catch {
      setUnreadCount(0);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setUnreadCount(0);
      return;
    }

    void refresh();
    const interval = setInterval(() => {
      void refresh();
    }, POLL_INTERVAL_MS);

    const onChanged = () => {
      void refresh();
    };
    window.addEventListener(CHAT_UNREAD_COUNT_CHANGED_EVENT, onChanged);
    window.addEventListener('focus', onChanged);

    return () => {
      clearInterval(interval);
      window.removeEventListener(CHAT_UNREAD_COUNT_CHANGED_EVENT, onChanged);
      window.removeEventListener('focus', onChanged);
    };
  }, [enabled, refresh]);

  return { unreadCount, refresh };
}

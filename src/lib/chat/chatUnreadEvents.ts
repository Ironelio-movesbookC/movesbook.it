/** Dispatched when 1:1 chat unread totals may have changed (e.g. conversation opened). */
export const CHAT_UNREAD_COUNT_CHANGED_EVENT = 'movesbook:chat-unread-count-changed';

export function notifyChatUnreadCountChanged(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(CHAT_UNREAD_COUNT_CHANGED_EVENT));
}

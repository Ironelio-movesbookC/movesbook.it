/** Legacy CakePHP parity: club website settings hub. */
export const CLUB_WEBSITE_SETTINGS_INDEX_PATH = '/WebsiteSettings/index';

/** Read-only club website for members (legacy /WebsiteSettings/display). */
export const CLUB_WEBSITE_DISPLAY_PATH = '/WebsiteSettings/display';

export function clubWebsiteDisplayUrl(clubId?: string | null): string {
  if (!clubId) return CLUB_WEBSITE_DISPLAY_PATH;
  return `${CLUB_WEBSITE_DISPLAY_PATH}?clubId=${encodeURIComponent(clubId)}`;
}

export function clubWebsiteDisplayTopicUrl(
  clubId: string | null | undefined,
  topicId: string
): string {
  const base = clubWebsiteDisplayUrl(clubId);
  const joiner = base.includes('?') ? '&' : '?';
  return `${base}${joiner}topic=${encodeURIComponent(topicId)}`;
}

/** Club bacheca (bulletin board) label editor — 14 themes. */
export const CLUB_WEBSITE_BACHECA_PATH = '/WebsiteSettings/bacheca';

/** My Club dashboard — show activated bacheca sections in the main panel. */
export function clubBachecaDashboardUrl(clubId: string): string {
  return `/club/dashboard?panel=bacheca&clubId=${encodeURIComponent(clubId)}`;
}

/** My Club dashboard — horizontal Club Topics browser in the main panel. */
export function clubTopicsHorizontalDashboardUrl(clubId: string): string {
  return `/club/dashboard?panel=topics-horizontal&clubId=${encodeURIComponent(clubId)}`;
}

/** My Club dashboard — show read-only topic HTML in the main panel. */
export function clubTopicDashboardUrl(clubId: string, topicId: string): string {
  return `/club/dashboard?panel=topic&clubId=${encodeURIComponent(clubId)}&topicId=${encodeURIComponent(topicId)}`;
}

/** Custom topics editor (admin/staff). */
export const CLUB_WEBSITE_TOPICS_PATH = '/WebsiteSettings/topics';

export function clubWebsiteTopicEditorUrl(topicId: string): string {
  return `${CLUB_WEBSITE_TOPICS_PATH}?id=${encodeURIComponent(topicId)}`;
}

/** Read-only view for club members (activated topics only). */
export const CLUB_WEBSITE_TOPIC_DISPLAY_PATH = '/WebsiteSettings/topics/display';

/** Friend list item editor (admin/staff). */
export const CLUB_WEBSITE_FRIENDS_PATH = '/WebsiteSettings/friends';

export function clubWebsiteFriendEditorUrl(friendId: string): string {
  return `${CLUB_WEBSITE_FRIENDS_PATH}?id=${encodeURIComponent(friendId)}`;
}

export const CLUB_WEBSITE_FRIEND_DISPLAY_PATH = '/WebsiteSettings/friends/display';

export function clubWebsiteFriendDisplayUrl(friendId: string, lang = 'en'): string {
  return `${CLUB_WEBSITE_FRIEND_DISPLAY_PATH}?id=${encodeURIComponent(friendId)}&lang=${encodeURIComponent(lang)}`;
}

export function clubWebsiteTopicDisplayUrl(topicId: string, lang = 'en'): string {
  return `${CLUB_WEBSITE_TOPIC_DISPLAY_PATH}?id=${encodeURIComponent(topicId)}&lang=${encodeURIComponent(lang)}`;
}

/** Legacy CakePHP parity: club website settings hub. */
export const CLUB_WEBSITE_SETTINGS_INDEX_PATH = '/WebsiteSettings/index';

/** Club bacheca (bulletin board) label editor — 14 themes. */
export const CLUB_WEBSITE_BACHECA_PATH = '/WebsiteSettings/bacheca';

/** Custom topics editor (admin/staff). */
export const CLUB_WEBSITE_TOPICS_PATH = '/WebsiteSettings/topics';

export function clubWebsiteTopicEditorUrl(topicId: string): string {
  return `${CLUB_WEBSITE_TOPICS_PATH}?id=${encodeURIComponent(topicId)}`;
}

/** Read-only view for club members (activated topics only). */
export const CLUB_WEBSITE_TOPIC_DISPLAY_PATH = '/WebsiteSettings/topics/display';

export function clubWebsiteTopicDisplayUrl(topicId: string, lang = 'en'): string {
  return `${CLUB_WEBSITE_TOPIC_DISPLAY_PATH}?id=${encodeURIComponent(topicId)}&lang=${encodeURIComponent(lang)}`;
}

/** Personal (My Page) topic editor — separate from club website settings. */
export const PERSONAL_WEBSITE_TOPICS_PATH = '/users/my_topics';

export function personalWebsiteTopicDisplayUrl(friendId: string, lang = 'en'): string {
  return `${PERSONAL_WEBSITE_TOPICS_PATH}/display?id=${encodeURIComponent(friendId)}&lang=${encodeURIComponent(lang)}`;
}

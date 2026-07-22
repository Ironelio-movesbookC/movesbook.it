/**
 * Launch URLs for Movesbook Topics sidebar rows.
 * Only rows with a known URL open in a new tab when enabled;
 * others will be filled in as Joshua provides them.
 */
export const MOVEBOOK_TOPIC_LAUNCH_URLS: Partial<Record<string, string>> = {
  news: '/news-by-movesbook',
};

export function resolveMovebookTopicLaunchUrl(rowId: string): string {
  return MOVEBOOK_TOPIC_LAUNCH_URLS[rowId]?.trim() ?? '';
}

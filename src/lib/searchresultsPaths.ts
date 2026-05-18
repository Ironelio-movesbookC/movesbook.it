/**
 * Public visitor wall for a club — same path as {@link NetworkSearchListClient} “Visit club”.
 * Resolves via {@link resolveSearchResultsSlug} on `clubs_new.name` (case variants).
 *
 * @example clubSearchResultsPath('Magiw Fitness Club')
 *   → `/searchresults/search/Magiw%20Fitness%20Club`
 */
export function clubSearchResultsPath(clubOfficialName: string): string | null {
  const name = clubOfficialName.trim();
  if (!name) return null;
  return `/searchresults/search/${encodeURIComponent(name)}`;
}

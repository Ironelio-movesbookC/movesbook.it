type NewsFeedMetaLineProps = {
  kind: 'news' | 'ogp' | 'ogp-group';
  /** News: category name. OGP / OGP group: topic. */
  sector?: string | null;
  /** News only: method (Shared / Typed / Posted). */
  mode?: string | null;
  /** News: author. OGP: creator username. */
  postedBy?: string | null;
  className?: string;
};

/**
 * Sector / Mode / Posted by metadata line used on Global News,
 * Movesbook News, and Club Global News feeds.
 */
export default function NewsFeedMetaLine({
  kind,
  sector,
  mode,
  postedBy,
  className = '',
}: NewsFeedMetaLineProps) {
  const sectorValue = sector?.trim() || null;
  const modeValue = kind === 'news' ? mode?.trim() || null : null;
  const postedByValue = postedBy?.trim() || null;

  if (!sectorValue && !modeValue && !postedByValue) return null;

  return (
    <p
      className={`mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-sm line-clamp-2 ${className}`}
    >
      {sectorValue ? (
        <span className="font-medium text-violet-700">Sector: {sectorValue}</span>
      ) : null}
      {modeValue ? (
        <span className="font-medium text-black">Mode: {modeValue}</span>
      ) : null}
      {postedByValue ? (
        <span className="italic text-blue-600">Posted by: {postedByValue}</span>
      ) : null}
    </p>
  );
}

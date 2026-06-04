'use client';

import Link from 'next/link';

function isEmptyReferencesHtml(html: string): boolean {
  const stripped = html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return !stripped;
}

type ClubReferencesDisplayProps = {
  referencesHtml?: string | null;
  referencesLevel?: string | null;
  editHref?: string;
};

export default function ClubReferencesDisplay({
  referencesHtml,
  referencesLevel,
  editHref,
}: ClubReferencesDisplayProps) {
  const html = referencesHtml?.trim() ?? '';
  const hasContent = !isEmptyReferencesHtml(html);
  const level = referencesLevel?.trim() || '1';

  return (
    <section
      className="mt-4 rounded-lg border-2 border-red-500 bg-white shadow-sm overflow-hidden"
      aria-labelledby="club-references-heading"
    >
      <div
        id="club-references-heading"
        className="border-b border-[#c9bd7a] bg-[#efe7b3] px-4 py-2 text-sm font-semibold text-gray-900"
      >
        References of the club
      </div>

      <div className="p-4 sm:p-5">
        <p className="mb-3 text-xs text-gray-600">
          These references belong to the club itself, not to the club admin personal account.
        </p>

        {hasContent ? (
          <>
            <div
              className="club-references-content text-sm text-gray-900 max-w-none border border-gray-200 rounded-lg bg-gray-50/50 p-4 [&_h1]:text-lg [&_h1]:font-bold [&_h2]:text-base [&_h2]:font-bold [&_h3]:font-bold [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_a]:text-blue-700 [&_a]:underline [&_img]:max-w-full [&_table]:border-collapse"
              dangerouslySetInnerHTML={{ __html: html }}
            />
            <div className="mt-4 flex items-center gap-2 text-sm text-gray-700">
              <span className="font-medium text-gray-600">References level</span>
              <span className="inline-flex min-w-[2rem] items-center justify-center rounded border border-gray-300 bg-gray-100 px-2 py-0.5 font-semibold">
                {level}
              </span>
            </div>
          </>
        ) : (
          <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-10 text-center">
            <p className="text-sm text-gray-600">No club references have been added yet.</p>
            {editHref ? (
              <Link
                href={editHref}
                className="mt-3 inline-block text-sm font-semibold text-red-600 hover:text-red-800"
              >
                Edit club profile to add references
              </Link>
            ) : null}
          </div>
        )}

        {hasContent && editHref ? (
          <div className="mt-4 text-right">
            <Link
              href={editHref}
              className="text-sm font-semibold text-red-600 hover:text-red-800"
            >
              Edit club profile
            </Link>
          </div>
        ) : null}
      </div>
    </section>
  );
}

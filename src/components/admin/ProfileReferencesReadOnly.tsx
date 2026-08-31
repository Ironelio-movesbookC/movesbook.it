'use client';

function isEmptyReferencesHtml(html: string): boolean {
  const stripped = html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return !stripped;
}

type ProfileReferencesReadOnlyProps = {
  referencesHtml?: string | null;
  referencesLevel?: string | null;
  emptyMessage?: string;
};

/** Read-only references block for admin PCU (owner edits on /profile). */
export default function ProfileReferencesReadOnly({
  referencesHtml,
  referencesLevel,
  emptyMessage = 'No references have been added yet.',
}: ProfileReferencesReadOnlyProps) {
  const html = referencesHtml?.trim() ?? '';
  const hasContent = !isEmptyReferencesHtml(html);
  const level = referencesLevel?.trim() || '1';

  return (
    <div className="border border-gray-300 p-3 bg-white">
      <p className="mb-2 text-xs text-gray-500 italic">(only view — editable by the profile owner)</p>
      {hasContent ? (
        <>
          <div
            className="club-references-content text-sm text-gray-900 max-w-none border border-gray-200 rounded-lg bg-gray-50/50 p-4 min-h-[120px] [&_h1]:text-lg [&_h1]:font-bold [&_h2]:text-base [&_h2]:font-bold [&_h3]:font-bold [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_a]:text-blue-700 [&_a]:underline [&_img]:max-w-full [&_table]:border-collapse"
            dangerouslySetInnerHTML={{ __html: html }}
          />
          <div className="mt-3 flex items-center gap-2 text-sm text-gray-700">
            <span className="font-medium text-gray-600">References level</span>
            <span className="inline-flex min-w-[2rem] items-center justify-center rounded border border-gray-300 bg-gray-100 px-2 py-0.5 font-semibold">
              {level}
            </span>
          </div>
        </>
      ) : (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-10 text-center text-sm text-gray-600">
          {emptyMessage}
        </div>
      )}
    </div>
  );
}

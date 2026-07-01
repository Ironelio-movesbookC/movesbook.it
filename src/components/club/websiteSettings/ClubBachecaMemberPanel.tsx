'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useClubBachecaMemberLabels } from '@/hooks/useClubBachecaMemberLabels';
import { prepareRichHtmlForDisplay } from '@/lib/richHtmlDisplay';

export default function ClubBachecaMemberPanel({
  clubId,
  compact = false,
}: {
  clubId: string;
  /** Tighter layout when embedded in the club dashboard main column. */
  compact?: boolean;
}) {
  const { t } = useLanguage();
  const { labels, loading, error, hydrated } = useClubBachecaMemberLabels(clubId);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    setSelectedId(null);
  }, [clubId]);

  useEffect(() => {
    if (!hydrated || labels.length === 0) return;
    setSelectedId((current) => {
      if (current && labels.some((l) => l.id === current)) return current;
      return labels[0]?.id ?? null;
    });
  }, [hydrated, labels]);

  const selected = useMemo(
    () => labels.find((l) => l.id === selectedId) ?? labels[0] ?? null,
    [labels, selectedId],
  );

  const displayHtml = useMemo(
    () => prepareRichHtmlForDisplay(selected?.content?.trim() ? selected.content : ''),
    [selected?.content],
  );

  const hasTextContent = displayHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().length > 0;

  if (loading && !hydrated) {
    return (
      <div className="flex min-h-[240px] flex-1 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-teal-700" />
      </div>
    );
  }

  return (
    <div className={`flex min-h-0 flex-1 flex-col ${compact ? '' : 'border border-zinc-300 bg-[#f0f0f0]'}`}>
      <style>{`
        .bacheca-rich-html .rich-html-video,
        .bacheca-rich-html figure.media {
          margin: 1rem 0;
          max-width: 48rem;
        }
        .bacheca-rich-html .rich-html-video {
          position: relative;
          aspect-ratio: 16 / 9;
          width: 100%;
          overflow: hidden;
          border-radius: 0.375rem;
          background: #000;
        }
        .bacheca-rich-html .rich-html-video iframe,
        .bacheca-rich-html figure.media iframe {
          display: block;
          width: 100%;
          height: 100%;
          border: 0;
        }
      `}</style>
      <div className={`border-b border-zinc-300 bg-white ${compact ? 'px-1 py-2' : 'px-4 py-3'}`}>
        <h2 className={`font-bold text-zinc-900 ${compact ? 'text-xl' : 'text-lg'}`}>
          {t('club_bacheca_title')}
        </h2>
        {!compact ? (
          <p className="mt-1 text-xs leading-snug text-zinc-600">{t('club_bacheca_intro')}</p>
        ) : null}
        {error ? (
          <p className="mt-2 text-xs font-medium text-red-700" role="alert">
            {error}
          </p>
        ) : null}
      </div>

      {labels.length === 0 ? (
        <div className="flex flex-1 items-center justify-center p-8">
          <p className="max-w-md text-center text-sm text-zinc-600">
            {t('club_bacheca_member_empty')}
          </p>
        </div>
      ) : (
        <>
          <div className={`border-b border-zinc-300 bg-[#e8e8e8] ${compact ? 'px-2 py-2' : 'px-3 py-3'}`}>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {labels.map((label) => {
                const isSelected = label.id === selectedId;
                return (
                  <button
                    key={label.id}
                    type="button"
                    onClick={() => setSelectedId(label.id)}
                    className={`min-h-[48px] rounded-none border px-1.5 py-2 text-center text-[11px] font-semibold leading-tight text-zinc-800 shadow-sm transition-colors ${
                      isSelected
                        ? 'border-sky-600 bg-gradient-to-b from-white to-[#c5d4e8] ring-2 ring-sky-500'
                        : 'border-zinc-500 bg-gradient-to-b from-[#f8f8f8] to-[#d4d4d4] hover:from-white hover:to-[#e0e0e0]'
                    }`}
                  >
                    <span className="line-clamp-3">{label.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className={`min-h-[200px] flex-1 overflow-y-auto bg-white ${compact ? 'p-3' : 'p-4'}`}>
            {selected ? (
              <>
                <p className="mb-3 text-xs font-medium text-zinc-600">
                  {t('club_bacheca_editing_label')}: <strong>{selected.name}</strong>
                </p>
                {hasTextContent ? (
                  <div
                    className="bacheca-rich-html prose prose-sm max-w-none text-zinc-800"
                    dangerouslySetInnerHTML={{ __html: displayHtml }}
                  />
                ) : (
                  <p className="text-sm text-zinc-500">{t('club_bacheca_member_no_content')}</p>
                )}
              </>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}

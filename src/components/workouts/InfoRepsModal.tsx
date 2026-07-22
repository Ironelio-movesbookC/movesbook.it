'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import {
  fetchInfoRepsDisplay,
  getInfoRepsCloseLabel,
  getInfoRepsModalTitle,
  resolveLongTextLanguage,
} from '@/constants/infoRepsLongText';
import { longTextDisplayHtml } from '@/utils/richTextTranslation';

type InfoRepsModalProps = {
  open: boolean;
  onClose: () => void;
  uiLanguage: string;
};

/** Scrollable Info Reps dialog — article + summary, localized, closed only via Close. */
export function InfoRepsModal({ open, onClose, uiLanguage }: InfoRepsModalProps) {
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const resolvedLang = resolveLongTextLanguage(uiLanguage);
  const title = getInfoRepsModalTitle(resolvedLang);
  const closeLabel = getInfoRepsCloseLabel(resolvedLang);
  const bodyHtml = useMemo(() => longTextDisplayHtml(body), [body]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setBody('');
    void fetchInfoRepsDisplay(resolvedLang).then((text) => {
      if (!cancelled) {
        setBody(text);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [open, resolvedLang]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="info-reps-title"
    >
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-xl">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-200 px-4 py-3">
          <h3 id="info-reps-title" className="text-base font-bold text-gray-900">
            {title}
          </h3>
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2.5 py-1 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            onClick={onClose}
            aria-label={closeLabel}
          >
            {closeLabel}
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 text-sm leading-relaxed text-gray-700">
          {loading ? (
            <p className="text-gray-500">{resolvedLang === 'it' ? 'Caricamento…' : 'Loading…'}</p>
          ) : (
            <div
              className="long-text-display space-y-3 leading-relaxed [&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
              dangerouslySetInnerHTML={{ __html: bodyHtml }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

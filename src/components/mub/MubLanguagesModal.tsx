'use client';

import { useState } from 'react';
import { MUB_LANGUAGE_OPTIONS } from '@/lib/mub/constants';

type Translations = Record<string, { shortText: string; extendedText: string }>;

type MubLanguagesModalProps = {
  translations: Translations;
  onClose: () => void;
  onSave: (translations: Translations) => void;
};

export default function MubLanguagesModal({ translations, onClose, onSave }: MubLanguagesModalProps) {
  const [draft, setDraft] = useState<Translations>(() => {
    const next: Translations = {};
    for (const lang of MUB_LANGUAGE_OPTIONS) {
      next[lang.code] = translations[lang.code] ?? { shortText: '', extendedText: '' };
    }
    return next;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded border border-gray-400 bg-white shadow-xl">
        <div className="border-b border-gray-300 bg-[#ececec] px-4 py-3 text-sm font-semibold text-gray-900">
          Set text in languages
        </div>
        <div className="space-y-3 p-4">
          {MUB_LANGUAGE_OPTIONS.map((lang) => (
            <div key={lang.code} className="grid gap-2 rounded border border-gray-200 p-3 sm:grid-cols-[48px_1fr]">
              <div className="text-sm font-bold uppercase text-gray-700">{lang.label}</div>
              <div className="space-y-2">
                <input
                  value={draft[lang.code]?.shortText ?? ''}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      [lang.code]: { ...(d[lang.code] ?? { shortText: '', extendedText: '' }), shortText: e.target.value },
                    }))
                  }
                  placeholder="Short text"
                  className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                />
                <input
                  value={draft[lang.code]?.extendedText ?? ''}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      [lang.code]: { ...(d[lang.code] ?? { shortText: '', extendedText: '' }), extendedText: e.target.value },
                    }))
                  }
                  placeholder="Extended text"
                  className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                />
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2 border-t border-gray-300 px-4 py-3">
          <button type="button" onClick={onClose} className="rounded border border-gray-400 px-4 py-1.5 text-sm">
            Cancel
          </button>
          <button type="button" onClick={() => onSave(draft)} className="rounded bg-green-700 px-4 py-1.5 text-sm text-white hover:bg-green-800">
            OK
          </button>
        </div>
      </div>
    </div>
  );
}

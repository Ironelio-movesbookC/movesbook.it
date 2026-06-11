'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function ClubWebsiteAddTopicModal({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string) => void;
}) {
  const { t } = useLanguage();
  const [name, setName] = useState('');

  useEffect(() => {
    if (open) setName('');
  }, [open]);

  if (!open) return null;

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onCreate(trimmed);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center bg-black/50 p-4 pt-24"
      role="dialog"
      aria-modal="true"
      aria-labelledby="club-add-topic-title"
    >
      <div className="w-full max-w-sm overflow-hidden rounded border border-zinc-500 bg-[#f5f5f5] shadow-2xl">
        <div className="border-b border-zinc-400 bg-[#5b9bd5] px-3 py-2 text-sm font-semibold text-white">
          {t('club_website_add_topic')}
        </div>
        <div className="space-y-3 p-4">
          <h2 id="club-add-topic-title" className="text-sm font-bold text-zinc-900">
            {t('club_topic_add_title')}
          </h2>
          <p className="text-xs text-zinc-600">{t('club_topic_add_hint')}</p>
          <label className="block text-sm text-zinc-800">
            <span className="mb-1 block">{t('club_topic_name_label')}</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submit();
              }}
              className="w-full border border-zinc-400 bg-white px-2 py-1.5 text-zinc-900"
              autoFocus
            />
          </label>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-none border border-zinc-700 bg-zinc-800 px-4 py-1.5 text-sm text-white hover:bg-zinc-900"
            >
              {t('btn_cancel')}
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={!name.trim()}
              className="rounded-none border border-red-800 bg-red-600 px-4 py-1.5 text-sm text-white hover:bg-red-700 disabled:opacity-50"
            >
              {t('btn_create')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

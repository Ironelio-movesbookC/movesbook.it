'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { ClubWebsiteTopic } from '@/lib/clubWebsiteTopics';
import ClubWebsiteLastUpdatePicker from '@/components/club/websiteSettings/ClubWebsiteLastUpdatePicker';

export default function ClubWebsiteTopicSettingsModal({
  topic,
  open,
  onClose,
  onSave,
}: {
  topic: ClubWebsiteTopic;
  open: boolean;
  onClose: () => void;
  onSave: (patch: Partial<ClubWebsiteTopic>) => void;
}) {
  const { t } = useLanguage();
  const [bannerColor, setBannerColor] = useState(topic.bannerColor);
  const [titleColor, setTitleColor] = useState(topic.titleColor);
  const [sectionName, setSectionName] = useState(topic.sectionName);
  const [title, setTitle] = useState(topic.title);
  const [lastUpdate, setLastUpdate] = useState(topic.lastUpdate);

  useEffect(() => {
    if (!open) return;
    setBannerColor(topic.bannerColor);
    setTitleColor(topic.titleColor);
    setSectionName(topic.sectionName);
    setTitle(topic.title);
    setLastUpdate(topic.lastUpdate);
  }, [open, topic]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center bg-black/50 p-4 pt-16"
      role="dialog"
      aria-modal="true"
      aria-labelledby="club-topic-settings-title"
    >
      <div className="w-full max-w-md overflow-hidden rounded border border-zinc-500 bg-[#f5f5f5] shadow-2xl">
        <div
          className="px-3 py-2 text-sm font-semibold"
          style={{ backgroundColor: bannerColor, color: titleColor }}
        >
          {title.trim() || t('club_website_title_placeholder')}
        </div>

        <div className="space-y-3 p-4">
          <h2 id="club-topic-settings-title" className="text-sm font-bold text-zinc-900">
            {t('club_topic_settings_title')}
          </h2>

          <label className="flex items-center justify-between gap-3 text-sm text-zinc-800">
            <span>{t('club_topic_color_banner')}</span>
            <input
              type="color"
              value={bannerColor}
              onChange={(e) => setBannerColor(e.target.value)}
              className="h-8 w-12 cursor-pointer border border-zinc-400"
            />
          </label>

          <label className="flex items-center justify-between gap-3 text-sm text-zinc-800">
            <span>{t('club_topic_color_title')}</span>
            <input
              type="color"
              value={titleColor}
              onChange={(e) => setTitleColor(e.target.value)}
              className="h-8 w-12 cursor-pointer border border-zinc-400"
            />
          </label>

          <label className="block text-sm text-zinc-800">
            <span className="mb-1 block">{t('club_topic_section_name')}</span>
            <input
              type="text"
              value={sectionName}
              onChange={(e) => setSectionName(e.target.value)}
              className="w-full border border-zinc-400 bg-[#ffffd9] px-2 py-1.5 text-zinc-900"
            />
          </label>

          <label className="block text-sm text-zinc-800">
            <span className="mb-1 block">{t('club_website_title_placeholder')}</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border border-zinc-400 bg-white px-2 py-1.5 text-zinc-900"
            />
          </label>

          <ClubWebsiteLastUpdatePicker value={lastUpdate} onChange={setLastUpdate} />

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-none border border-zinc-700 bg-zinc-800 px-5 py-1.5 text-sm font-medium text-white hover:bg-zinc-900"
            >
              {t('btn_cancel')}
            </button>
            <button
              type="button"
              onClick={() => {
                onSave({
                  bannerColor,
                  titleColor,
                  sectionName: sectionName.trim() || topic.sectionName,
                  title: title.trim() || topic.title,
                  lastUpdate,
                });
                onClose();
              }}
              className="rounded-none border border-red-800 bg-red-600 px-5 py-1.5 text-sm font-medium text-white hover:bg-red-700"
            >
              {t('btn_save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

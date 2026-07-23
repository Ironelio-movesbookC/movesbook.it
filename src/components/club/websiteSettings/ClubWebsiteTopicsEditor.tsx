'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { Eye, Settings, Trash2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  CLUB_WEBSITE_LANGUAGE_TABS,
  type ClubWebsiteLanguageCode,
} from '@/lib/clubWebsiteLanguages';
import type { ClubWebsiteTopic } from '@/lib/clubWebsiteTopics';
import {
  CLUB_WEBSITE_TOPICS_PATH,
  clubWebsiteTopicDisplayUrl,
  clubWebsiteTopicEditorUrl,
} from '@/lib/clubWebsiteSettingsPaths';
import ClubWebsiteAddTopicModal from '@/components/club/websiteSettings/ClubWebsiteAddTopicModal';
import ClubWebsiteSettingsSidebar from '@/components/club/websiteSettings/ClubWebsiteSettingsSidebar';
import { useClubWebsiteSettingsSidebar } from '@/components/club/websiteSettings/ClubWebsiteSettingsSidebarContext';
import ClubWebsiteLastUpdatePicker, {
  LEGACY_FIELD_CLASS,
} from '@/components/club/websiteSettings/ClubWebsiteLastUpdatePicker';
import ClubWebsiteTopicSettingsFormModal from '@/components/club/websiteSettings/ClubWebsiteTopicSettingsFormModal';
import ClubWebsiteTopicLinkActivated, {
  topicDirectLinkActivated,
} from '@/components/club/websiteSettings/ClubWebsiteTopicLinkActivated';
import {
  canClubWebsiteTopicHaveSubtopics,
  isClubWebsiteTopicSubtopic,
  topicToSettingsFormItem,
} from '@/lib/clubWebsiteTopics';

const CKEditorComponent = dynamic(() => import('@/components/news/CKEditor'), { ssr: false });

export default function ClubWebsiteTopicsEditor({
  clubId,
  clubDisplayName,
  adminDisplayName,
  clubType,
  adminCountry,
  adminLocality,
  logoImageUrl,
  initialTopicId,
}: {
  clubId: string;
  clubDisplayName: string;
  adminDisplayName: string;
  clubType?: string | null;
  adminCountry?: string | null;
  adminLocality?: string | null;
  logoImageUrl?: string | null;
  initialTopicId?: string | null;
}) {
  const { t } = useLanguage();
  const { topics: topicsApi } = useClubWebsiteSettingsSidebar();
  const { topics, hydrated, addTopic, addSubtopicUnder, updateTopic, removeTopic } = topicsApi;

  const [selectedId, setSelectedId] = useState<string | null>(initialTopicId ?? null);
  const [activeLang, setActiveLang] = useState<ClubWebsiteLanguageCode>('en');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [addTopicOpen, setAddTopicOpen] = useState(false);

  useEffect(() => {
    if (!hydrated) return;
    if (selectedId && topics.some((t) => t.id === selectedId)) return;
    setSelectedId(topics[0]?.id ?? null);
  }, [hydrated, topics, selectedId]);

  const selected = useMemo(
    () => topics.find((t) => t.id === selectedId) ?? null,
    [topics, selectedId]
  );

  const handleCreateTopic = useCallback(
    (name: string) => {
      const created = addTopic(name);
      if (created) {
        setSelectedId(created.id);
        if (typeof window !== 'undefined' && window.location.pathname !== CLUB_WEBSITE_TOPICS_PATH) {
          window.open(clubWebsiteTopicEditorUrl(created.id), '_blank', 'noopener,noreferrer');
        }
      }
    },
    [addTopic]
  );

  const handleAddTopic = useCallback(() => setAddTopicOpen(true), []);

  const patchSelected = useCallback(
    (patch: Partial<ClubWebsiteTopic>) => {
      if (!selectedId) return;
      updateTopic(selectedId, patch);
    },
    [selectedId, updateTopic]
  );

  const setContentForLang = (lang: string, html: string) => {
    if (!selected) return;
    patchSelected({
      contentsByLang: { ...selected.contentsByLang, [lang]: html },
    });
  };

  const setKeywordsForLang = (lang: string, value: string) => {
    if (!selected) return;
    patchSelected({
      keywordsByLang: { ...selected.keywordsByLang, [lang]: value },
    });
  };

  const openTopic = (id: string) => {
    setSelectedId(id);
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', clubWebsiteTopicEditorUrl(id));
    }
  };

  return (
    <div className="flex min-h-0 w-full flex-1 gap-0 border border-zinc-400 bg-zinc-200 shadow-sm">
      <ClubWebsiteSettingsSidebar
        adminDisplayName={adminDisplayName}
        clubDisplayName={clubDisplayName}
        clubType={clubType}
        adminCountry={adminCountry}
        adminLocality={adminLocality}
        logoImageUrl={logoImageUrl}
        selectedTopicId={selectedId ?? ''}
        onAddTopic={handleAddTopic}
        onSelectCustomTopic={(id) => openTopic(id)}
        highlightTopicsSection
        onSelectTopic={() => {}}
      />

      <div className="min-w-0 flex-1 flex flex-col bg-[#ececec]">
        {!selected ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center text-sm text-zinc-600">
            <p>{t('club_topic_empty_state')}</p>
            <button
              type="button"
              onClick={handleAddTopic}
              className="rounded-none border border-sky-700 bg-sky-600 px-4 py-2 text-white hover:bg-sky-700"
            >
              + {t('club_website_add_topic')}
            </button>
          </div>
        ) : (
          <>
            <div
              className="flex items-center border-b border-zinc-500"
              style={{ backgroundColor: selected.bannerColor }}
            >
              <input
                type="text"
                value={selected.title}
                onChange={(e) => {
                  const next = e.target.value;
                  patchSelected({
                    title: next,
                    name: next.trim() || selected.name,
                  });
                }}
                placeholder={t('club_website_title_placeholder')}
                className="min-w-0 flex-1 border-0 bg-transparent px-3 py-2 text-sm font-semibold outline-none"
                style={{ color: selected.titleColor }}
              />
              <div className="flex shrink-0 items-center border-l border-white/25">
                <label
                  className="flex cursor-pointer items-center gap-1 px-2 py-1.5 opacity-90 hover:opacity-100"
                  title={t('club_topic_color_banner')}
                >
                  <span className="sr-only">{t('club_topic_color_banner')}</span>
                  <input
                    type="color"
                    value={selected.bannerColor}
                    onChange={(e) => patchSelected({ bannerColor: e.target.value })}
                    className="h-6 w-7 cursor-pointer border border-white/40 bg-transparent p-0"
                    aria-label={t('club_topic_color_banner')}
                  />
                </label>
                <label
                  className="flex cursor-pointer items-center gap-1 border-l border-white/25 px-2 py-1.5 opacity-90 hover:opacity-100"
                  title={t('club_topic_color_title')}
                >
                  <span className="sr-only">{t('club_topic_color_title')}</span>
                  <input
                    type="color"
                    value={selected.titleColor}
                    onChange={(e) => patchSelected({ titleColor: e.target.value })}
                    className="h-6 w-7 cursor-pointer border border-white/40 bg-transparent p-0"
                    aria-label={t('club_topic_color_title')}
                  />
                </label>
                <a
                  href={clubWebsiteTopicDisplayUrl(selected.id, activeLang)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="border-l border-white/25 px-3 py-2 opacity-90 hover:opacity-100"
                  style={{ color: selected.titleColor }}
                  aria-label={t('club_topic_preview_members_aria')}
                  title={t('club_topic_preview_members_aria')}
                >
                  <Eye className="h-4 w-4" />
                </a>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(t('club_topic_delete_confirm'))) {
                      removeTopic(selected.id);
                      setSelectedId(null);
                    }
                  }}
                  className="px-3 py-2 opacity-90 hover:opacity-100"
                  style={{ color: selected.titleColor }}
                  aria-label={t('btn_delete')}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setSettingsOpen(true)}
                  className="border-l border-white/25 px-3 py-2 opacity-90 hover:opacity-100"
                  style={{ color: selected.titleColor }}
                  aria-label={t('club_topic_settings_title')}
                >
                  <Settings className="h-4 w-4" />
                </button>
              </div>
            </div>

            <p className="border-b border-zinc-300 bg-[#f8f8f8] px-3 py-1.5 text-[11px] text-zinc-600">
              {t('club_topic_members_display_hint')}
            </p>

            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-400 bg-[#e4e4e4] px-3 py-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-sm text-zinc-800">{t('club_website_section_label')} :</span>
                <input
                  type="text"
                  value={selected.sectionName}
                  onChange={(e) => patchSelected({ sectionName: e.target.value })}
                  className={`${LEGACY_FIELD_CLASS} w-48`}
                />
              </div>
              <ClubWebsiteTopicLinkActivated
                activated={topicDirectLinkActivated(
                  selected.contentDisplayMode,
                  selected.externalUrl
                )}
                url={selected.externalUrl}
              />
              <ClubWebsiteLastUpdatePicker
                value={selected.lastUpdate}
                onChange={(v) => patchSelected({ lastUpdate: v })}
              />
            </div>

            <div className="border-b border-zinc-400 bg-[#e8e8e8] px-2 pt-1">
              <div className="flex flex-wrap">
                {CLUB_WEBSITE_LANGUAGE_TABS.map((lang) => (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => setActiveLang(lang.code)}
                    className={`min-w-[2.25rem] border border-zinc-400 border-b-0 px-2.5 py-1 text-xs font-medium ${
                      activeLang === lang.code
                        ? 'border-red-600 bg-white text-zinc-900 ring-1 ring-red-600'
                        : 'bg-[#f5f5f5] text-zinc-600 hover:bg-white'
                    }`}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="min-h-[300px] flex-1 p-2">
              <p className="mb-1 px-1 text-[11px] text-zinc-600">
                {t('club_website_editing_topic')}: <strong>{selected.name}</strong>
                {' · '}
                {t('club_topic_lang')}: {activeLang}
              </p>
              <div className="club-website-ckeditor min-h-[280px] rounded-sm border border-zinc-400 bg-white shadow-sm">
                <CKEditorComponent
                  value={selected.contentsByLang[activeLang] ?? ''}
                  onChange={(html) => setContentForLang(activeLang, html)}
                  placeholder={t('club_website_editor_placeholder')}
                  id={`club-topic-editor-${selected.id}-${activeLang}`}
                />
              </div>
            </div>

            <div className="border-t border-zinc-400 px-3 py-3">
              <label className="mb-1 block text-sm text-zinc-800">
                {t('club_website_search_keywords')} ({activeLang}) :
              </label>
              <input
                type="text"
                value={selected.keywordsByLang[activeLang] ?? ''}
                onChange={(e) => setKeywordsForLang(activeLang, e.target.value)}
                className={`${LEGACY_FIELD_CLASS} w-full`}
                placeholder={t('club_website_search_keywords_placeholder')}
              />
            </div>

            <ClubWebsiteTopicSettingsFormModal
              item={topicToSettingsFormItem(selected)}
              open={settingsOpen}
              variant={isClubWebsiteTopicSubtopic(selected) ? 'subtopic' : 'topic'}
              onClose={() => setSettingsOpen(false)}
              onSave={(patch) => patchSelected(patch)}
              showAddSubtopic={canClubWebsiteTopicHaveSubtopics(selected)}
              onAddSubtopic={() => {
                const subName = window.prompt(t('club_topic_subtopic_prompt'));
                if (!subName?.trim()) return;
                const created = addSubtopicUnder(selected.id, subName.trim());
                if (created) {
                  setSelectedId(created.id);
                  setSettingsOpen(false);
                }
              }}
            />
          </>
        )}
      </div>

      <ClubWebsiteAddTopicModal
        open={addTopicOpen}
        onClose={() => setAddTopicOpen(false)}
        onCreate={handleCreateTopic}
      />
    </div>
  );
}

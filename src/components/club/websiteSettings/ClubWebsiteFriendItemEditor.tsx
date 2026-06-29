'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { Check, Eye, Settings, Trash2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  CLUB_WEBSITE_LANGUAGE_TABS,
  type ClubWebsiteLanguageCode,
} from '@/lib/clubWebsiteLanguages';
import type { ClubWebsiteFriendItem } from '@/lib/clubWebsiteFriendList';
import {
  canFriendItemHaveSubtopics,
  clearClubWebsiteFriendItemContent,
  friendItemToSettingsFormItem,
  getFriendItemSettingsVariant,
  type FriendItemDeleteConfirmKey,
} from '@/lib/clubWebsiteFriendList';
import { clubWebsiteFriendDisplayUrl } from '@/lib/clubWebsiteSettingsPaths';
import { personalWebsiteTopicDisplayUrl } from '@/lib/personalWebsiteSettingsPaths';
import ClubWebsiteLastUpdatePicker, {
  LEGACY_FIELD_CLASS,
} from '@/components/club/websiteSettings/ClubWebsiteLastUpdatePicker';
import ClubWebsiteTopicSettingsFormModal from '@/components/club/websiteSettings/ClubWebsiteTopicSettingsFormModal';

const CKEditorComponent = dynamic(() => import('@/components/news/CKEditor'), { ssr: false });

export default function ClubWebsiteFriendItemEditor({
  item,
  onUpdate,
  onDelete,
  onAddSubtopic,
  deleteConfirmKey = 'club_friend_delete_topic_confirm',
  focusContentToken = 0,
  displayUrlForItem,
}: {
  item: ClubWebsiteFriendItem;
  onUpdate: (patch: Partial<ClubWebsiteFriendItem>) => void;
  onDelete?: () => void;
  onAddSubtopic?: (parentId: string, name: string) => void;
  deleteConfirmKey?: FriendItemDeleteConfirmKey;
  /** Increment to scroll the CKEditor panel into view (sidebar document button). */
  focusContentToken?: number;
  displayUrlForItem?: (item: ClubWebsiteFriendItem, lang: string) => string;
}) {
  const { t } = useLanguage();
  const [activeLang, setActiveLang] = useState<ClubWebsiteLanguageCode>('en');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [saveAck, setSaveAck] = useState(false);
  const contentPanelRef = useRef<HTMLDivElement>(null);
  const saveAckTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const patch = useCallback((p: Partial<ClubWebsiteFriendItem>) => onUpdate(p), [onUpdate]);

  useEffect(() => {
    if (!focusContentToken) return;
    contentPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [focusContentToken, item.id]);

  useEffect(() => {
    return () => {
      if (saveAckTimerRef.current) clearTimeout(saveAckTimerRef.current);
    };
  }, []);

  const acknowledgeSave = () => {
    setSaveAck(true);
    if (saveAckTimerRef.current) clearTimeout(saveAckTimerRef.current);
    saveAckTimerRef.current = setTimeout(() => setSaveAck(false), 2000);
  };

  const openContentEditor = () => {
    if (item.contentDisplayMode === 'link') {
      patch({ contentDisplayMode: 'editor' });
    }
    contentPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const showCkEditor = item.contentDisplayMode === 'editor';
  const memberDisplayUrl = (lang: string) =>
    displayUrlForItem
      ? displayUrlForItem(item, lang)
      : clubWebsiteFriendDisplayUrl(item.id, lang);

  const setContentForLang = (lang: string, html: string) => {
    patch({ contentsByLang: { ...item.contentsByLang, [lang]: html } });
  };

  const setKeywordsForLang = (lang: string, value: string) => {
    patch({ keywordsByLang: { ...item.keywordsByLang, [lang]: value } });
  };

  return (
    <>
      <div
        className="flex items-center border-b border-zinc-500"
        style={{ backgroundColor: item.bannerColor }}
      >
        <input
          type="text"
          value={item.title}
          onChange={(e) => patch({ title: e.target.value })}
          placeholder={t('club_website_title_placeholder')}
          className="min-w-0 flex-1 border-0 bg-transparent px-3 py-2 text-sm font-semibold outline-none"
          style={{ color: item.titleColor }}
        />
        <div className="flex shrink-0 items-center border-l border-white/25">
          <a
            href={memberDisplayUrl(activeLang)}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-2 opacity-90 hover:opacity-100"
            style={{ color: item.titleColor }}
            aria-label={t('club_topic_preview_members_aria')}
          >
            <Eye className="h-4 w-4" />
          </a>
          {onDelete && item.id !== 'friends-root' ? (
            <button
              type="button"
              onClick={() => {
                if (window.confirm(t(deleteConfirmKey))) onDelete();
              }}
              className="px-3 py-2 opacity-90 hover:opacity-100"
              style={{ color: item.titleColor }}
              aria-label={t('btn_delete')}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="border-l border-white/25 px-3 py-2 opacity-90 hover:opacity-100"
            style={{ color: item.titleColor }}
            aria-label={t('club_topic_settings_title')}
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>

      <p className="border-b border-zinc-300 bg-[#f8f8f8] px-3 py-1.5 text-[11px] text-zinc-600">
        {t('club_topic_members_display_hint')}
      </p>

      {item.contentDisplayMode === 'link' && item.externalUrl ? (
        <p className="border-b border-zinc-300 bg-amber-50 px-3 py-2 text-xs text-zinc-700">
          {t('club_topic_link_mode_hint')}:{' '}
          <a
            href={item.externalUrl}
            target={item.openInSamePage ? '_self' : '_blank'}
            rel="noopener noreferrer"
            className="text-blue-700 underline"
          >
            {item.externalUrl}
          </a>
        </p>
      ) : null}

      {!showCkEditor ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 border-b border-zinc-300 bg-[#f0f0f0] p-8 text-center">
          <p className="text-sm text-zinc-600">{t('club_friend_link_mode_edit_hint')}</p>
          <button
            type="button"
            onClick={openContentEditor}
            className="rounded-none border border-sky-700 bg-sky-600 px-4 py-2 text-sm text-white hover:bg-sky-700"
          >
            {t('club_friend_open_content_editor')}
          </button>
        </div>
      ) : null}

      <div
        ref={contentPanelRef}
        id={`club-friend-editor-panel-${item.id}`}
        className={showCkEditor ? 'flex min-h-0 flex-1 flex-col' : 'hidden'}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-400 bg-[#e4e4e4] px-3 py-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-sm text-zinc-800">{t('club_website_section_label')} :</span>
            <input
              type="text"
              value={item.sectionName}
              onChange={(e) => patch({ sectionName: e.target.value })}
              className={`${LEGACY_FIELD_CLASS} w-48`}
            />
          </div>
          <ClubWebsiteLastUpdatePicker
            value={item.lastUpdate}
            onChange={(v) => patch({ lastUpdate: v })}
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
            {t('club_website_editing_topic')}: <strong>{item.name}</strong>
            {' · '}
            {t('club_topic_lang')}: {activeLang}
          </p>
          <div className="club-website-ckeditor min-h-[280px] rounded-sm border border-zinc-400 bg-white shadow-sm">
            <CKEditorComponent
              value={item.contentsByLang[activeLang] ?? ''}
              onChange={(html) => setContentForLang(activeLang, html)}
              placeholder={t('club_website_editor_placeholder')}
              id={`club-friend-editor-${item.id}-${activeLang}`}
            />
          </div>
        </div>

        <div className="border-t border-zinc-400 px-3 py-3">
          <label className="mb-1 block text-sm text-zinc-800">
            {t('club_website_search_keywords')} ({activeLang}) :
          </label>
          <input
            type="text"
            value={item.keywordsByLang[activeLang] ?? ''}
            onChange={(e) => setKeywordsForLang(activeLang, e.target.value)}
            className={`${LEGACY_FIELD_CLASS} w-full`}
            placeholder={t('club_website_search_keywords_placeholder')}
          />
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={acknowledgeSave}
              className="inline-flex items-center gap-2 rounded-none border border-zinc-500 bg-zinc-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-zinc-700"
            >
              {saveAck ? (
                <>
                  <Check className="h-4 w-4" />
                  {t('club_website_save_document_done')}
                </>
              ) : (
                t('club_website_save_document')
              )}
            </button>
          </div>
        </div>
      </div>

      <ClubWebsiteTopicSettingsFormModal
        item={friendItemToSettingsFormItem(item)}
        open={settingsOpen}
        variant={getFriendItemSettingsVariant(item)}
        onClose={() => setSettingsOpen(false)}
        onSave={(p) => patch(p)}
        showAddSubtopic={Boolean(onAddSubtopic) && canFriendItemHaveSubtopics(item)}
        onAddSubtopic={() => {
          const subName = window.prompt(t('club_topic_subtopic_prompt'));
          if (!subName?.trim() || !onAddSubtopic) return;
          onAddSubtopic(item.id, subName.trim());
        }}
        onDeleteContent={() => {
          const confirmKey =
            getFriendItemSettingsVariant(item) === 'subtopic'
              ? 'club_subtopic_delete_content_confirm'
              : 'club_topic_delete_content_confirm';
          if (window.confirm(t(confirmKey))) {
            patch(clearClubWebsiteFriendItemContent());
            setSettingsOpen(false);
          }
        }}
      />
    </>
  );
}

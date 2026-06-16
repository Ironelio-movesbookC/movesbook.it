'use client';

import { useEffect, useState } from 'react';
import { KeyRound, Star, User } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  normalizeTopicSettingsFields,
  type ClubWebsiteContentDisplayMode,
  type ClubWebsiteTopicSettingsFormItem,
  type ClubWebsiteTopicSettingsVariant,
} from '@/lib/clubWebsiteTopicSettingsFields';

const LEGACY_HEADER_RED = '#8b2942';
const LEGACY_SECTION_PURPLE = '#6b5b95';
const LEGACY_SECTION_DARK_RED = '#6b2940';
const LEGACY_STATUS_ON = '#88bb55';
const LEGACY_STATUS_OFF = '#cc4444';

export default function ClubWebsiteTopicSettingsFormModal({
  item,
  open,
  onClose,
  onSave,
  onAddSubtopic,
  onDeleteContent,
  showAddSubtopic = false,
  variant = 'topic',
}: {
  item: ClubWebsiteTopicSettingsFormItem;
  open: boolean;
  onClose: () => void;
  onSave: (patch: Partial<ClubWebsiteTopicSettingsFormItem & { title?: string }>) => void;
  onAddSubtopic?: () => void;
  onDeleteContent?: () => void;
  showAddSubtopic?: boolean;
  variant?: ClubWebsiteTopicSettingsVariant;
}) {
  const { t } = useLanguage();
  const normalized = normalizeTopicSettingsFields(item);

  const [activated, setActivated] = useState(item.activated);
  const [name, setName] = useState(item.name);
  const [showInClubDashboardTopics, setShowInClubDashboardTopics] = useState(
    normalized.showInClubDashboardTopics
  );
  const [contentDisplayMode, setContentDisplayMode] = useState<ClubWebsiteContentDisplayMode>(
    normalized.contentDisplayMode
  );
  const [externalUrl, setExternalUrl] = useState(normalized.externalUrl);
  const [openInSamePage, setOpenInSamePage] = useState(normalized.openInSamePage);
  const [audience, setAudience] = useState({ ...normalized.audience });

  useEffect(() => {
    if (!open) return;
    const n = normalizeTopicSettingsFields(item);
    setActivated(item.activated);
    setName(item.name);
    setShowInClubDashboardTopics(n.showInClubDashboardTopics);
    setContentDisplayMode(n.contentDisplayMode);
    setExternalUrl(n.externalUrl);
    setOpenInSamePage(n.openInSamePage);
    setAudience({ ...n.audience });
  }, [open, item]);

  if (!open) return null;

  const isSubtopic = variant === 'subtopic';
  const titleKey = isSubtopic ? 'club_subtopic_settings_title' : 'club_topic_settings_title';
  const enableKey = isSubtopic ? 'club_subtopic_enable' : 'club_topic_enable';
  const editNameKey = isSubtopic ? 'club_subtopic_edit_name' : 'club_topic_edit_name';

  const handleSave = () => {
    const patch: Partial<ClubWebsiteTopicSettingsFormItem & { title?: string }> = {
      activated,
      name: name.trim() || item.name,
      title: name.trim() || item.name,
      showInClubDashboardTopics,
      contentDisplayMode,
      externalUrl: externalUrl.trim(),
      openInSamePage,
    };
    if (!isSubtopic) {
      patch.audience = { ...audience };
    }
    onSave(patch);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[200] overflow-y-auto bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="club-topic-settings-form-title"
    >
      <div className="absolute left-[calc(300px+0.5rem)] top-12 w-full max-w-[16rem] overflow-hidden rounded border border-zinc-500 bg-[#f0f0f0] shadow-2xl">
        <div
          className="flex items-center justify-between px-3 py-2 text-sm font-semibold text-white"
          style={{ backgroundColor: LEGACY_HEADER_RED }}
        >
          <span id="club-topic-settings-form-title">{t(titleKey)}</span>
          {showAddSubtopic && onAddSubtopic ? (
            <button
              type="button"
              onClick={() => {
                onAddSubtopic();
              }}
              className="text-xs font-bold text-yellow-300 hover:underline"
            >
              +{t('club_topic_add_subtopic')}
            </button>
          ) : null}
        </div>

        <div className="space-y-0">
          <div className="flex items-center justify-between border-b border-zinc-300 bg-white px-3 py-2">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-900">
              <input
                type="checkbox"
                checked={activated}
                onChange={(e) => setActivated(e.target.checked)}
                className="h-4 w-4"
              />
              {t(enableKey)}
            </label>
            <span
              className="inline-block rounded-none border border-zinc-300"
              style={{
                width: 11,
                height: 11,
                minWidth: 11,
                minHeight: 11,
                backgroundColor: activated ? LEGACY_STATUS_ON : LEGACY_STATUS_OFF,
              }}
              aria-hidden
            />
          </div>

          <div className="border-b border-zinc-300 bg-white px-3 py-2">
            <label className="block text-sm text-zinc-900">
              <span className="mb-1 block">{t(editNameKey)}</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border border-zinc-400 bg-white px-2 py-1.5 text-zinc-900"
              />
            </label>
          </div>

          <div className="border-b border-zinc-300 bg-white px-3 py-2">
            <label className="flex cursor-pointer items-start gap-2 text-zinc-900">
              <input
                type="checkbox"
                checked={showInClubDashboardTopics}
                onChange={(e) => setShowInClubDashboardTopics(e.target.checked)}
                className="mt-0.5 h-3.5 w-3.5 shrink-0"
              />
              <span className="text-[11px] leading-snug">{t('club_topic_show_in_club_dashboard')}</span>
            </label>
          </div>

          <div>
            <div
              className="px-3 py-1.5 text-xs font-bold text-white"
              style={{ backgroundColor: LEGACY_SECTION_PURPLE }}
            >
              {t('club_topic_content_display_type')}
            </div>
            <div className="space-y-2 border-b border-zinc-300 bg-white px-3 py-2">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-900">
                <input
                  type="radio"
                  name={`content-mode-${item.id}`}
                  checked={contentDisplayMode === 'editor'}
                  onChange={() => setContentDisplayMode('editor')}
                />
                {t('club_topic_open_editor')}
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-900">
                <input
                  type="radio"
                  name={`content-mode-${item.id}`}
                  checked={contentDisplayMode === 'link'}
                  onChange={() => setContentDisplayMode('link')}
                />
                {t('club_topic_open_link')}
              </label>
              {contentDisplayMode === 'link' ? (
                <input
                  type="url"
                  value={externalUrl}
                  onChange={(e) => setExternalUrl(e.target.value)}
                  placeholder="https://"
                  className="w-full border border-zinc-400 bg-white px-2 py-1.5 text-sm text-zinc-900"
                />
              ) : null}
              <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-900">
                <input
                  type="checkbox"
                  checked={openInSamePage}
                  onChange={(e) => setOpenInSamePage(e.target.checked)}
                  className="h-4 w-4"
                />
                {t('club_topic_open_same_page')}
              </label>
            </div>
          </div>

          <div>
            <div
              className="px-3 py-1.5 text-xs font-bold text-white"
              style={{ backgroundColor: LEGACY_SECTION_DARK_RED }}
            >
              {t('club_topic_authorized_users')}
            </div>
            <div className="space-y-2 bg-white px-3 py-2">
              {isSubtopic ? (
                <p className="text-sm italic text-red-700">{t('club_subtopic_audience_inherited')}</p>
              ) : (
                <>
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-900">
                    <input
                      type="checkbox"
                      checked={audience.activeMembers}
                      onChange={(e) =>
                        setAudience((a) => ({ ...a, activeMembers: e.target.checked }))
                      }
                      className="h-4 w-4"
                    />
                    <Star className="h-4 w-4 text-amber-500" aria-hidden />
                    {t('club_topic_audience_active_members')}
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-900">
                    <input
                      type="checkbox"
                      checked={audience.authorizedMembers}
                      onChange={(e) =>
                        setAudience((a) => ({ ...a, authorizedMembers: e.target.checked }))
                      }
                      className="h-4 w-4"
                    />
                    <KeyRound className="h-4 w-4 text-zinc-600" aria-hidden />
                    {t('club_topic_audience_authorized_members')}
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-900">
                    <input
                      type="checkbox"
                      checked={audience.notActiveMembers}
                      onChange={(e) =>
                        setAudience((a) => ({ ...a, notActiveMembers: e.target.checked }))
                      }
                      className="h-4 w-4"
                    />
                    <User className="h-4 w-4 text-zinc-600" aria-hidden />
                    {t('club_topic_audience_not_active_members')}
                  </label>
                </>
              )}
            </div>
          </div>

          <div className="flex justify-center gap-2 border-t border-zinc-300 bg-[#e8e8e8] px-3 py-3">
            <button
              type="button"
              onClick={handleSave}
              className="rounded-none border border-zinc-700 bg-zinc-800 px-5 py-1.5 text-sm font-medium text-white hover:bg-zinc-900"
            >
              {t('btn_save')}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-none border border-zinc-700 bg-zinc-800 px-5 py-1.5 text-sm font-medium text-white hover:bg-zinc-900"
            >
              {t('btn_cancel')}
            </button>
          </div>
          {onDeleteContent ? (
            <div className="border-t border-zinc-300 bg-[#e8e8e8] px-3 pb-3">
              <button
                type="button"
                onClick={onDeleteContent}
                className="w-full rounded-none border border-red-900 bg-red-700 px-5 py-2 text-sm font-medium text-white hover:bg-red-800"
              >
                {t(isSubtopic ? 'club_subtopic_delete_content' : 'club_topic_delete_content')}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  isDefaultBachecaLabelName,
  isBachecaLabelDraftDirty,
} from '@/lib/clubBachecaLabels';
import { useClubBachecaLabels } from '@/hooks/useClubBachecaLabels';
import ClubWebsiteSettingsSidebar from '@/components/club/websiteSettings/ClubWebsiteSettingsSidebar';

const CKEditorComponent = dynamic(() => import('@/components/news/CKEditor'), { ssr: false });

const DEMO_EVENTS = [
  'Today is the day of the club meeting…',
  'Events about club members…',
  'Training session reminder…',
  'Open day for new members…',
];

export default function ClubBachecaEditor({
  clubId,
  clubDisplayName,
  adminDisplayName,
  clubType,
  adminCountry,
  adminLocality,
  logoImageUrl,
}: {
  clubId: string;
  clubDisplayName: string;
  adminDisplayName: string;
  clubType?: string | null;
  adminCountry?: string | null;
  adminLocality?: string | null;
  logoImageUrl?: string | null;
}) {
  const { t } = useLanguage();
  const { labels, savedLabels, setLabels, loading, saving, error, hydrated, applyLabel } =
    useClubBachecaLabels(clubId);
  const [selectedId, setSelectedId] = useState('bacheca-label-1');
  const [renameDraft, setRenameDraft] = useState('Tracking Workout');
  const [activateDraft, setActivateDraft] = useState(true);
  const [contentDraft, setContentDraft] = useState('');
  const [pendingSwitchId, setPendingSwitchId] = useState<string | null>(null);

  const selected = labels.find((l) => l.id === selectedId) ?? labels[0];
  const savedSelected = savedLabels.find((l) => l.id === selectedId);

  const currentDraft = useMemo(
    () => ({
      name: renameDraft,
      activated: activateDraft,
      content: contentDraft,
    }),
    [renameDraft, activateDraft, contentDraft],
  );

  const isCurrentLabelDirty = isBachecaLabelDraftDirty(savedSelected, currentDraft);

  const dirtyLabelIds = useMemo(() => {
    const ids = new Set<string>();
    for (const label of labels) {
      const saved = savedLabels.find((item) => item.id === label.id);
      if (label.id === selectedId) {
        if (isBachecaLabelDraftDirty(saved, currentDraft)) ids.add(label.id);
      } else if (
        saved &&
        (saved.name !== label.name ||
          saved.activated !== label.activated ||
          saved.content !== label.content)
      ) {
        ids.add(label.id);
      }
    }
    return ids;
  }, [labels, savedLabels, selectedId, currentDraft]);

  useEffect(() => {
    setSelectedId('bacheca-label-1');
  }, [clubId]);

  useEffect(() => {
    if (!hydrated) return;
    const initial = labels.find((l) => l.id === selectedId) ?? labels[0];
    if (!initial) return;
    setRenameDraft(initial.name);
    setActivateDraft(initial.activated);
    setContentDraft(initial.content);
  }, [clubId, hydrated]);

  const selectLabel = (id: string) => {
    if (id === selectedId) return;
    const updatedLabels = labels.map((l) =>
      l.id === selectedId
        ? {
            ...l,
            name: renameDraft.trim() || l.name,
            activated: activateDraft,
            content: contentDraft,
          }
        : l,
    );
    setLabels(updatedLabels);
    const next = updatedLabels.find((l) => l.id === id);
    if (next) {
      setRenameDraft(next.name);
      setActivateDraft(next.activated);
      setContentDraft(next.content);
    }
    setSelectedId(id);
  };

  const requestSelectLabel = (id: string) => {
    if (id === selectedId) return;
    if (isCurrentLabelDirty) {
      setPendingSwitchId(id);
      return;
    }
    selectLabel(id);
  };

  const discardCurrentLabelDraft = () => {
    if (!savedSelected) return;
    setLabels((prev) =>
      prev.map((l) => (l.id === selectedId ? savedSelected : l)),
    );
    setRenameDraft(savedSelected.name);
    setActivateDraft(savedSelected.activated);
    setContentDraft(savedSelected.content);
  };

  const handleDiscardAndSwitch = () => {
    if (!pendingSwitchId) return;
    discardCurrentLabelDraft();
    selectLabel(pendingSwitchId);
    setPendingSwitchId(null);
  };

  const handleSaveAndSwitch = async () => {
    if (!pendingSwitchId) return;
    const saved = await applyLabelSettings();
    if (!saved) return;
    selectLabel(pendingSwitchId);
    setPendingSwitchId(null);
  };

  const applyLabelSettings = async (): Promise<boolean> => {
    if (!selectedId) return false;
    const trimmed = renameDraft.trim();
    if (!trimmed) return false;

    const payload = {
      id: selectedId,
      name: trimmed,
      activated: activateDraft,
      content: contentDraft,
    };

    setLabels((prev) =>
      prev.map((l) => (l.id === selectedId ? { ...l, ...payload, name: trimmed } : l)),
    );
    return applyLabel(payload);
  };

  useEffect(() => {
    if (!isCurrentLabelDirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isCurrentLabelDirty]);

  const clearRenameDraft = () => {
    setRenameDraft('');
  };

  const updateContent = (html: string) => {
    setContentDraft(html);
    setLabels((prev) =>
      prev.map((l) => (l.id === selectedId ? { ...l, content: html } : l)),
    );
  };

  if (loading && !hydrated) {
    return (
      <div className="flex min-h-[320px] flex-1 items-center justify-center border border-zinc-400 bg-zinc-200">
        <Loader2 className="h-8 w-8 animate-spin text-teal-700" />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 w-full flex-1 gap-0 border border-zinc-400 bg-zinc-200 shadow-sm">
      <ClubWebsiteSettingsSidebar
        adminDisplayName={adminDisplayName}
        clubDisplayName={clubDisplayName}
        clubType={clubType}
        adminCountry={adminCountry}
        adminLocality={adminLocality}
        logoImageUrl={logoImageUrl}
        selectedTopicId="bacheca"
        highlightBacheca
        onSelectTopic={() => {}}
      />

      <div className="flex min-w-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col bg-[#f0f0f0]">
          <div className="border-b border-zinc-400 bg-white px-4 py-3">
            <h1 className="text-lg font-bold text-zinc-900">{t('club_bacheca_title')}</h1>
            <p className="mt-1 text-xs leading-snug text-zinc-600">{t('club_bacheca_intro')}</p>
            <p className="mt-1 text-xs leading-snug text-zinc-500">{t('club_bacheca_apply_hint')}</p>
            {error ? (
              <p className="mt-2 text-xs font-medium text-red-700" role="alert">
                {error}
              </p>
            ) : null}
          </div>

          <div className="border-b border-zinc-400 bg-[#e8e8e8] px-3 py-3">
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
              {labels.map((label) => {
                const isSelected = label.id === selectedId;
                const isDefault = isDefaultBachecaLabelName(label.name);
                const isDirty = dirtyLabelIds.has(label.id);
                return (
                  <button
                    key={label.id}
                    type="button"
                    onClick={() => requestSelectLabel(label.id)}
                    className={`relative min-h-[52px] rounded-none border px-1.5 py-2 text-center text-[11px] font-semibold leading-tight text-zinc-800 shadow-sm transition-colors ${
                      isSelected
                        ? 'border-sky-600 bg-gradient-to-b from-white to-[#c5d4e8] ring-2 ring-sky-500'
                        : 'border-zinc-500 bg-gradient-to-b from-[#f8f8f8] to-[#d4d4d4] hover:from-white hover:to-[#e0e0e0]'
                    } ${!label.activated ? 'opacity-75' : ''}`}
                    title={
                      isDirty
                        ? t('club_bacheca_unsaved_dot_title')
                        : isDefault
                          ? t('club_bacheca_default_label_hint')
                          : label.activated
                            ? t('club_bacheca_active_label_hint')
                            : t('club_bacheca_inactive_label_hint')
                    }
                  >
                    {isDirty ? (
                      <span
                        className="absolute right-1 top-1 h-2 w-2 rounded-full bg-amber-500 ring-1 ring-white"
                        aria-hidden
                      />
                    ) : null}
                    <span className="line-clamp-3">{label.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 border-b border-zinc-400 bg-[#ddd] px-3 py-2">
            {isCurrentLabelDirty ? (
              <p
                className="w-full rounded-sm border border-amber-400 bg-amber-50 px-2 py-1.5 text-xs font-medium text-amber-900"
                role="status"
              >
                {t('club_bacheca_unsaved_banner')}
              </p>
            ) : null}
            <label className="flex items-center gap-2 text-sm font-medium text-zinc-800">
              <input
                type="checkbox"
                checked={activateDraft}
                onChange={(e) => setActivateDraft(e.target.checked)}
                className="h-4 w-4"
              />
              {t('club_bacheca_activate')}
            </label>
            <span className="text-sm text-zinc-800">{t('club_bacheca_rename_label')}</span>
            <input
              type="text"
              value={renameDraft}
              onChange={(e) => setRenameDraft(e.target.value)}
              className="min-w-[12rem] flex-1 border border-zinc-400 bg-[#ffffd9] px-2 py-1 text-sm text-zinc-900"
            />
            <button
              type="button"
              onClick={() => void applyLabelSettings()}
              disabled={saving || !renameDraft.trim()}
              className={`rounded-none border px-4 py-1 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60 ${
                isCurrentLabelDirty
                  ? 'border-amber-600 bg-amber-600 ring-2 ring-amber-300 hover:bg-amber-700'
                  : 'border-zinc-500 bg-zinc-500 hover:bg-zinc-600'
              }`}
            >
              {saving ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('club_bacheca_apply')}
                </span>
              ) : (
                t('club_bacheca_apply')
              )}
            </button>
            <button
              type="button"
              onClick={clearRenameDraft}
              className="rounded-none border border-red-800 bg-red-700 px-4 py-1 text-sm font-medium text-white hover:bg-red-800"
            >
              {t('club_bacheca_clear')}
            </button>
          </div>

          <div className="min-h-[280px] flex-1 p-2">
            {selected ? (
              <p className="mb-1 px-1 text-[11px] text-zinc-600">
                {t('club_bacheca_editing_label')}: <strong>{selected.name}</strong>
                {isDefaultBachecaLabelName(selected.name) ? (
                  <span className="ml-2 text-amber-700">({t('club_bacheca_hidden_from_members')})</span>
                ) : !selected.activated ? (
                  <span className="ml-2 text-amber-700">({t('club_bacheca_inactive_label_hint')})</span>
                ) : null}
              </p>
            ) : null}
            <div className="club-website-ckeditor min-h-[280px] rounded-sm border border-zinc-400 bg-white shadow-sm">
              <CKEditorComponent
                value={contentDraft}
                onChange={updateContent}
                placeholder={t('club_bacheca_editor_placeholder')}
                id={`club-bacheca-editor-${selectedId}`}
              />
            </div>
          </div>
        </div>

        <aside className="w-[min(100%,200px)] shrink-0 border-l border-zinc-400 bg-[#2a2a2a] text-white">
          <div className="border-b border-zinc-500 bg-zinc-800 px-2 py-2 text-center text-xs font-bold tracking-wide">
            {t('club_bacheca_events_title')}
          </div>
          <ul className="space-y-0 p-1">
            {DEMO_EVENTS.map((line, i) => (
              <li
                key={i}
                className="border border-zinc-600 bg-zinc-700 px-2 py-2 text-[10px] leading-snug text-zinc-200"
              >
                {line}
              </li>
            ))}
          </ul>
        </aside>
      </div>

      {pendingSwitchId ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="club-bacheca-unsaved-dialog-title"
        >
          <div className="w-full max-w-md border border-zinc-400 bg-white p-4 shadow-lg">
            <h2 id="club-bacheca-unsaved-dialog-title" className="text-base font-bold text-zinc-900">
              {t('club_bacheca_unsaved_switch_title')}
            </h2>
            <p className="mt-2 text-sm leading-snug text-zinc-700">
              {t('club_bacheca_unsaved_switch_message')}
            </p>
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setPendingSwitchId(null)}
                className="border border-zinc-400 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
              >
                {t('club_bacheca_unsaved_stay')}
              </button>
              <button
                type="button"
                onClick={handleDiscardAndSwitch}
                className="border border-red-700 bg-red-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-800"
              >
                {t('club_bacheca_unsaved_discard_switch')}
              </button>
              <button
                type="button"
                onClick={() => void handleSaveAndSwitch()}
                disabled={saving || !renameDraft.trim()}
                className="border border-amber-600 bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t('club_bacheca_unsaved_save_switch')}
                  </span>
                ) : (
                  t('club_bacheca_unsaved_save_switch')
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

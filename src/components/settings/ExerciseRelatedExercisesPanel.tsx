'use client';

import React, { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import type { Exercise } from '@/constants/tools.constants';
import { mergeExerciseWithDefaults } from '@/constants/tools.constants';
import { SECTION_EXERCISE_MUSCLE_GROUPS } from '@/constants/sectionExercise.constants';
import { resolvePublicMediaUrl } from '@/lib/publicMediaUrl';

function getExerciseDisplayName(ex: Exercise, lang: string): string {
  const m = mergeExerciseWithDefaults(ex);
  if (lang === 'en') return (m.name || '').trim() || '—';
  return (m.nameByLanguage?.[lang] || m.name || '').trim() || '—';
}

function getExerciseMainArea(ex: Exercise): string {
  const m = mergeExerciseWithDefaults(ex);
  const fromTag = (m.muscleAreaPercentTags || []).find((t) => t.isMain)?.area?.trim();
  return (m.mainMuscleGroup || fromTag || m.muscleGroups?.[0] || '').trim();
}

type Props = {
  exercise: Exercise;
  allExercises: Exercise[];
  displayLang: string;
  onChange: (next: Exercise) => void;
  ui: (key: string) => string;
};

export default function ExerciseRelatedExercisesPanel({
  exercise: e,
  allExercises,
  displayLang,
  onChange,
  ui,
}: Props) {
  const [searchDraft, setSearchDraft] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [areaFilter, setAreaFilter] = useState('all');
  const [previewId, setPreviewId] = useState<string | null>(null);

  const selfId = (e.id || '').trim();
  const relatedIds = useMemo(
    () => new Set(e.relatedExerciseIds || []),
    [e.relatedExerciseIds]
  );

  const catalog = useMemo(
    () =>
      allExercises
        .map((raw) => mergeExerciseWithDefaults(raw))
        .filter((ex) => ex.id && ex.id !== selfId)
        .sort((a, b) => getExerciseDisplayName(a, displayLang).localeCompare(getExerciseDisplayName(b, displayLang))),
    [allExercises, selfId, displayLang]
  );

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return catalog.filter((ex) => {
      const area = getExerciseMainArea(ex);
      if (areaFilter !== 'all' && area !== areaFilter) return false;
      if (!q) return true;
      const name = getExerciseDisplayName(ex, displayLang).toLowerCase();
      const code = (ex.exerciseCode || '').toLowerCase();
      const en = (ex.name || '').toLowerCase();
      return name.includes(q) || code.includes(q) || en.includes(q);
    });
  }, [catalog, searchQuery, areaFilter, displayLang]);

  const previewExercise = useMemo(() => {
    const id = previewId || filtered.find((ex) => relatedIds.has(ex.id))?.id || filtered[0]?.id;
    if (!id) return null;
    return catalog.find((ex) => ex.id === id) ?? null;
  }, [previewId, filtered, relatedIds, catalog]);

  const applySearch = () => setSearchQuery(searchDraft);

  const toggleRelated = (id: string) => {
    const next = new Set(relatedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange({ ...e, relatedExerciseIds: Array.from(next) });
    setPreviewId(id);
  };

  const clearRelated = () => onChange({ ...e, relatedExerciseIds: [] });

  const selectAllVisible = () => {
    const next = new Set(relatedIds);
    filtered.forEach((ex) => next.add(ex.id));
    onChange({ ...e, relatedExerciseIds: Array.from(next) });
  };

  const deselectAllVisible = () => {
    const visibleIds = new Set(filtered.map((ex) => ex.id));
    const next = new Set(relatedIds);
    visibleIds.forEach((id) => next.delete(id));
    onChange({ ...e, relatedExerciseIds: Array.from(next) });
  };

  const picA = previewExercise?.pictureAMale?.trim() || '';
  const picB = previewExercise?.pictureBMale?.trim() || '';
  const picASrc = picA ? resolvePublicMediaUrl(picA) || picA : '';
  const picBSrc = picB ? resolvePublicMediaUrl(picB) || picB : '';

  return (
    <div className="space-y-4 rounded-xl border border-violet-200 bg-violet-50/30 p-4 shadow-sm">
      <div>
        <h4 className="text-sm font-bold uppercase tracking-wide text-violet-900">
          {ui('SectionExercise_RelatedTitle')}
        </h4>
        <p className="mt-1 text-xs leading-relaxed text-gray-700">{ui('SectionExercise_RelatedIntro')}</p>
      </div>

      <div className="flex min-h-[min(28rem,70vh)] flex-col gap-4 lg:flex-row lg:items-stretch">
        <div className="flex min-w-0 flex-1 flex-col space-y-3 rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[12rem] flex-1">
              <label className="mb-1 block text-xs font-semibold text-gray-600">
                {ui('SectionExercise_RelatedSearchLabel')}
              </label>
              <input
                type="search"
                value={searchDraft}
                onChange={(ev) => setSearchDraft(ev.target.value)}
                onKeyDown={(ev) => {
                  if (ev.key === 'Enter') {
                    ev.preventDefault();
                    setSearchQuery(searchDraft);
                  }
                }}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder={ui('SectionExercise_RelatedSearchPlaceholder')}
              />
            </div>
            <button
              type="button"
              onClick={applySearch}
              className="inline-flex items-center gap-1.5 rounded-lg bg-violet-700 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-800"
            >
              <Search className="h-4 w-4" aria-hidden />
              {ui('SectionExercise_RelatedSearchButton')}
            </button>
            <div className="w-full sm:w-auto sm:min-w-[10rem]">
              <label className="mb-1 block text-xs font-semibold text-gray-600">
                {ui('SectionExercise_RelatedAreaFilter')}
              </label>
              <select
                value={areaFilter}
                onChange={(ev) => {
                  setAreaFilter(ev.target.value);
                  setSearchQuery(searchDraft);
                }}
                className="w-full rounded-lg border border-gray-300 px-2 py-2 text-sm"
              >
                <option value="all">{ui('SectionExercise_RelatedAreaAll')}</option>
                {SECTION_EXERCISE_MUSCLE_GROUPS.map((area) => (
                  <option key={area} value={area}>
                    {area}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="rounded bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-900">
              {ui('SectionExercise_RelatedSelectedCount')} ({relatedIds.size})
            </span>
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                onClick={selectAllVisible}
                disabled={filtered.length === 0}
                className="rounded border border-violet-300 bg-violet-50 px-2 py-1 text-xs font-semibold text-violet-900 hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {ui('SectionExercise_RelatedSelectAllVisible')}
              </button>
              <button
                type="button"
                onClick={deselectAllVisible}
                disabled={filtered.length === 0}
                className="rounded border border-gray-300 bg-white px-2 py-1 text-xs font-semibold hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {ui('SectionExercise_RelatedDeselectVisible')}
              </button>
              <button
                type="button"
                onClick={clearRelated}
                disabled={relatedIds.size === 0}
                className="rounded border border-gray-300 bg-white px-2 py-1 text-xs font-semibold hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {ui('SectionExercise_RelatedClear')}
              </button>
            </div>
          </div>

          <p className="text-[11px] text-gray-500">{ui('SectionExercise_RelatedListHint')}</p>

          <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50/50 max-h-[min(22rem,50vh)]">
            {filtered.length === 0 ? (
              <p className="p-4 text-sm text-gray-500">{ui('SectionExercise_RelatedEmpty')}</p>
            ) : (
              <ul className="m-0 divide-y divide-gray-100 p-0">
                {filtered.map((ex) => {
                  const checked = relatedIds.has(ex.id);
                  const focused = previewExercise?.id === ex.id;
                  const area = getExerciseMainArea(ex) || '—';
                  return (
                    <li key={ex.id}>
                      <div
                        className={`flex cursor-pointer items-start gap-2 px-3 py-2 transition hover:bg-white ${
                          focused ? 'bg-violet-100/80 ring-1 ring-inset ring-violet-300' : ''
                        }`}
                        onClick={() => setPreviewId(ex.id)}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleRelated(ex.id)}
                          onClick={(ev) => ev.stopPropagation()}
                          className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300"
                          aria-label={`Link ${getExerciseDisplayName(ex, displayLang)}`}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-gray-900 break-words">
                            {getExerciseDisplayName(ex, displayLang)}
                          </p>
                          <p className="text-xs text-gray-600">
                            {area}
                            {(ex.exerciseCode || '').trim() ? ` · ${ex.exerciseCode}` : ''}
                          </p>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        <div className="flex w-full shrink-0 flex-col rounded-lg border border-gray-200 bg-white p-3 shadow-sm lg:w-64 xl:w-72">
          <p className="mb-1 text-xs font-bold uppercase tracking-wide text-gray-600">
            {ui('SectionExercise_RelatedPreviewTitle')}
          </p>
          <p className="mb-3 text-[11px] leading-snug text-gray-500">{ui('SectionExercise_RelatedPreviewHint')}</p>
          {previewExercise ? (
            <>
              <p className="mb-2 text-xs font-semibold text-gray-800 line-clamp-2">
                {getExerciseDisplayName(previewExercise, displayLang)}
              </p>
              <div className="space-y-3">
                <div>
                  <p className="mb-1 text-[10px] font-bold uppercase text-blue-700">
                    {ui('SectionExercise_PictureAMale')}
                  </p>
                  <div className="flex h-24 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                    {picASrc ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={picASrc} alt="" className="max-h-full max-w-full object-contain" />
                    ) : (
                      <span className="text-[10px] text-gray-400">No picture</span>
                    )}
                  </div>
                </div>
                <div>
                  <p className="mb-1 text-[10px] font-bold uppercase text-blue-700">
                    {ui('SectionExercise_PictureBMale')}
                  </p>
                  <div className="flex h-24 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                    {picBSrc ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={picBSrc} alt="" className="max-h-full max-w-full object-contain" />
                    ) : (
                      <span className="text-[10px] text-gray-400">No picture</span>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <p className="text-xs text-gray-500">{ui('SectionExercise_RelatedPreviewEmpty')}</p>
          )}
        </div>
      </div>
    </div>
  );
}

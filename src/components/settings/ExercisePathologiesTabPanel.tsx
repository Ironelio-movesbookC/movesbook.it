'use client';

import React, { useMemo, useRef, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import RichTextEditor from '@/components/settings/RichTextEditor';
import { resolvePublicMediaUrl } from '@/lib/publicMediaUrl';
import type { Exercise, ExercisePathologyCatalogItem } from '@/constants/tools.constants';
import {
  SUPPORTED_LANGUAGES,
  getPathologyDescriptionForLang,
  getPathologyNameForLang,
  supportedLanguagesPeriodAdminOrder,
} from '@/constants/tools.constants';

const TARGET_LANG_CODES = SUPPORTED_LANGUAGES.filter((l) => l.code !== 'en').map((l) => l.code);

function stripHtmlToPlain(html: string): string {
  if (!html) return '';
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function plainTranslationToEditorHtml(s: string): string {
  const t = (s || '').trim();
  if (!t) return '';
  const parts = t.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
  if (parts.length <= 1) return `<p>${t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`;
  return parts
    .map(
      (p) =>
        `<p>${p.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`
    )
    .join('');
}

async function fetchLabelTranslations(text: string): Promise<Record<string, string>> {
  const response = await fetch('/api/translate', {
    method: 'POST',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, targetLanguages: TARGET_LANG_CODES }),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Translation API returned ${response.status}: ${errorText.substring(0, 120)}`);
  }
  const data = await response.json();
  return data.translations && typeof data.translations === 'object' ? (data.translations as Record<string, string>) : {};
}

type Props = {
  exercise: Exercise;
  onChange: (next: Exercise) => void;
  pathologyOptions: ExercisePathologyCatalogItem[];
  pathologySelectSize: number;
  displayLang: string;
  ui: (key: string) => string;
  onSelectAll: () => void;
  onClear: () => void;
};

export default function ExercisePathologiesTabPanel({
  exercise: e,
  onChange,
  pathologyOptions,
  pathologySelectSize,
  displayLang,
  ui,
  onSelectAll,
  onClear,
}: Props) {
  const [infoTranslating, setInfoTranslating] = useState(false);
  const [infoTranslationsReady, setInfoTranslationsReady] = useState(false);
  const infoManualLocalesRef = useRef<HTMLDivElement | null>(null);
  const translationLanguages = useMemo(() => supportedLanguagesPeriodAdminOrder(), []);

  const selectedPathologies = useMemo(
    () =>
      pathologyOptions.filter((p) => (e.contraindicatedPathologyIds || []).includes(p.id)),
    [pathologyOptions, e.contraindicatedPathologyIds]
  );

  const getInfoForLang = (code: string) => {
    if (code === 'en') {
      return e.contraindicatedPathologiesInfoByLanguage?.en ?? e.contraindicatedPathologiesNote ?? '';
    }
    return (e.contraindicatedPathologiesInfoByLanguage || {})[code] ?? '';
  };

  const setInfoForLang = (code: string, html: string) => {
    const nextByLang = { ...(e.contraindicatedPathologiesInfoByLanguage || {}), [code]: html };
    onChange({
      ...e,
      contraindicatedPathologiesInfoByLanguage: nextByLang,
      ...(code === 'en' ? { contraindicatedPathologiesNote: html } : {}),
    });
  };

  const handleInfoTranslate = async () => {
    const enHtml = getInfoForLang('en');
    const plain = stripHtmlToPlain(enHtml);
    if (!plain) {
      window.alert('Enter English info & contraindications first, then press Translation.');
      return;
    }
    setInfoTranslationsReady(false);
    setInfoTranslating(true);
    try {
      const translations = await fetchLabelTranslations(plain);
      const record: Record<string, string> = { en: enHtml };
      for (const code of TARGET_LANG_CODES) {
        const raw = translations[code];
        if (typeof raw === 'string' && raw.trim()) {
          record[code] = plainTranslationToEditorHtml(raw.trim());
        }
      }
      if (Object.keys(record).length <= 1) {
        throw new Error('No translated values were returned by the translation service.');
      }
      onChange({
        ...e,
        contraindicatedPathologiesNote: enHtml,
        contraindicatedPathologiesInfoByLanguage: {
          ...(e.contraindicatedPathologiesInfoByLanguage || {}),
          ...record,
        },
      });
      setInfoTranslationsReady(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      window.alert(
        `Translation failed.\n\n${msg}\n\nYou can edit other languages manually. Same API as Settings → Language → Long texts.`
      );
    } finally {
      setInfoTranslating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-rose-200 bg-rose-50/60 p-3 text-sm text-gray-800">
        <p className="font-semibold text-rose-950">{ui('SectionExercise_PathologiesBannerTitle')}</p>
        <p className="mt-1 text-xs leading-relaxed text-gray-700">{ui('SectionExercise_PathologiesBannerBody')}</p>
      </div>

      <div className="flex flex-col gap-4 xl:flex-row xl:items-start">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <label className="text-xs font-bold uppercase tracking-wide text-gray-600">
              {ui('SectionExercise_PathologyTagsLabel')}{' '}
              <span className="font-normal normal-case text-gray-500">
                {ui('SectionExercise_PathologyTagsHint')}
              </span>
            </label>
            <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
              {ui('SectionExercise_EquipmentSelectedCount')} ({(e.contraindicatedPathologyIds || []).length})
            </span>
          </div>
          {pathologyOptions.length === 0 ? (
            <p className="text-sm text-amber-800">{ui('SectionExercise_PathologiesEmptyHint')}</p>
          ) : (
            <>
              <p className="mb-2 text-xs text-gray-600">{ui('SectionExercise_PathologiesMultiHint')}</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={onSelectAll}
                  className="rounded border border-gray-300 bg-white px-2 py-1 text-xs font-semibold hover:bg-gray-50"
                >
                  {ui('SectionExercise_CheckAll')}
                </button>
                <button
                  type="button"
                  onClick={onClear}
                  className="rounded border border-gray-300 bg-white px-2 py-1 text-xs font-semibold hover:bg-gray-50"
                >
                  {ui('SectionExercise_Clear')}
                </button>
              </div>
              <select
                multiple
                size={pathologySelectSize}
                value={e.contraindicatedPathologyIds || []}
                onChange={(ev) => {
                  const next = Array.from(ev.target.selectedOptions, (o) => o.value);
                  onChange({ ...e, contraindicatedPathologyIds: next });
                }}
                className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-2 py-1 text-sm shadow-inner"
                aria-label="Pathologies for which this exercise is not suggested"
              >
                {pathologyOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {getPathologyNameForLang(p, displayLang) || p.id}
                  </option>
                ))}
              </select>
            </>
          )}
        </div>

        <div className="w-full shrink-0 rounded-lg border border-gray-200 bg-gray-50/80 p-3 xl:w-56">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-600">
            {ui('SectionExercise_PathologiesPicturesLabel')}
          </p>
          {selectedPathologies.length === 0 ? (
            <p className="text-xs text-gray-500">{ui('SectionExercise_PathologiesPicturesEmpty')}</p>
          ) : (
            <ul className="m-0 max-h-64 list-none space-y-3 overflow-y-auto p-0">
              {selectedPathologies.map((p) => {
                const name = getPathologyNameForLang(p, displayLang) || p.id;
                const desc = getPathologyDescriptionForLang(p, displayLang);
                const src = p.picture ? resolvePublicMediaUrl(p.picture) || p.picture : '';
                return (
                  <li key={p.id} className="rounded-lg border border-white bg-white p-2 shadow-sm">
                    {src ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={src}
                        alt=""
                        className="mb-2 h-20 w-full rounded-md border border-gray-200 object-cover"
                      />
                    ) : (
                      <div className="mb-2 flex h-20 items-center justify-center rounded-md border border-dashed border-gray-300 bg-gray-50 text-[10px] text-gray-400">
                        No picture
                      </div>
                    )}
                    <p className="text-xs font-semibold text-gray-900 leading-snug break-words">{name}</p>
                    {desc ? (
                      <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-gray-600">{desc}</p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <div className="space-y-4 rounded-xl border border-rose-100 bg-white p-4 shadow-sm">
        <div>
          <h4 className="text-sm font-bold text-gray-900">{ui('SectionExercise_PathologiesInfoTitle')}</h4>
          <p className="mt-1 text-xs text-gray-600">{ui('SectionExercise_PathologiesInfoHelp')}</p>
        </div>

        <div className="rounded-xl border-2 border-blue-100 bg-gradient-to-b from-white to-slate-50 p-4 shadow-sm">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-gradient-to-r from-indigo-500 to-purple-500 px-3 py-1 text-sm font-bold text-white">
              EN
            </span>
            <span className="text-sm font-medium text-gray-700">English</span>
          </div>
          <p className="mb-3 text-xs text-gray-600">{ui('SectionExercise_RichEnglishHint')}</p>
          <RichTextEditor
            language="English"
            value={getInfoForLang('en')}
            onChange={(html) => setInfoForLang('en', html)}
            minHeight="12rem"
            placeholder={ui('SectionExercise_PathologiesNotesPlaceholder')}
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={infoTranslating}
              onClick={() => void handleInfoTranslate()}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {infoTranslating ? ui('SectionExercise_BtnTranslating') : ui('SectionExercise_BtnTranslation')}
            </button>
            <button
              type="button"
              onClick={() => setInfoTranslationsReady(true)}
              className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-slate-300"
            >
              {ui('SectionExercise_BtnSave')}
            </button>
            <button
              type="button"
              onClick={() => infoManualLocalesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50"
            >
              {ui('SectionExercise_BtnManualEdit')}
            </button>
          </div>
        </div>

        {infoTranslationsReady ? (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm font-medium text-emerald-900">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" aria-hidden />
            {ui('SectionExercise_TranslationsReadyBanner')}
          </div>
        ) : null}

        <div ref={infoManualLocalesRef} className="space-y-4">
          {translationLanguages
            .filter((l) => l.code !== 'en')
            .map((lang) => (
              <div key={`path-info-${lang.code}`} className="rounded-lg border-2 border-gray-200 bg-gray-50 p-4">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-gradient-to-r from-indigo-500 to-purple-500 px-3 py-1 text-sm font-bold text-white">
                    {lang.code.toUpperCase()}
                  </span>
                  <span className="text-sm font-medium text-gray-700">{lang.name}</span>
                </div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">
                  {ui('SectionExercise_PathologiesInfoTitle')}
                </label>
                <RichTextEditor
                  language={lang.name}
                  value={getInfoForLang(lang.code)}
                  onChange={(html) => setInfoForLang(lang.code, html)}
                  minHeight="10rem"
                  placeholder={ui('SectionExercise_RichPlaceholderLang').replace('{languageName}', lang.name)}
                />
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

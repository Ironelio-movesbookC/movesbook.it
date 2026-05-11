'use client';

import React, { type MutableRefObject, type ReactNode } from 'react';
import { CheckCircle2, ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';
import RichTextEditor from '@/components/settings/RichTextEditor';
import type { ExerciseFaqEntry } from '@/constants/tools.constants';
import { SUPPORTED_LANGUAGES } from '@/constants/tools.constants';
import {
  SECTION_EXERCISE_TAB_UI_KEYS,
  SECTION_EXERCISE_UI_DEFAULTS_EN,
} from '@/constants/sectionExerciseUiTranslations';

/** Bottom tab strip on the exercise input form (matches wireframe order). */
export type LowerFormTabId =
  | 'multimedia'
  | 'execution'
  | 'suggestions'
  | 'breathing'
  | 'mistakes'
  | 'faqs'
  | 'equipment'
  | 'pathologies';

export const LOWER_FORM_RICH_TABS: LowerFormTabId[] = ['execution', 'suggestions', 'breathing', 'mistakes'];

function languageFlagEmoji(code: string): string {
  const c = code.toLowerCase().split('-')[0];
  const map: Record<string, string> = {
    en: '🇬🇧',
    fr: '🇫🇷',
    it: '🇮🇹',
    de: '🇩🇪',
    es: '🇪🇸',
    pt: '🇵🇹',
    ru: '🇷🇺',
    hi: '🇮🇳',
    ja: '🇯🇵',
    id: '🇮🇩',
    zh: '🇨🇳',
    ar: '🇸🇦',
  };
  return map[c] || '🌐';
}

const LOWER_TAB_ORDER: LowerFormTabId[] = [
  'multimedia',
  'execution',
  'suggestions',
  'breathing',
  'mistakes',
  'faqs',
  'equipment',
  'pathologies',
];

/** Default English labels (API consumers); UI uses `sectionExerciseUi` when provided from translations. */
export const LOWER_TAB_LABELS: { id: LowerFormTabId; label: string }[] = LOWER_TAB_ORDER.map((id) => ({
  id,
  label: SECTION_EXERCISE_UI_DEFAULTS_EN[SECTION_EXERCISE_TAB_UI_KEYS[id]] ?? id,
}));

type Props = {
  lowerFormTab: LowerFormTabId;
  onLowerFormTabChange: (t: LowerFormTabId) => void;
  detailLabelTranslating: boolean;
  detailTranslationsReady: boolean;
  manualEditLocalesRef: MutableRefObject<HTMLDivElement | null>;
  getDetailRichValue: (code: string) => string;
  setDetailRichValue: (code: string, html: string) => void;
  onTranslate: () => void;
  onSaveBanner: () => void;
  onScrollManual: () => void;
  multimediaSlot: ReactNode;
  equipmentSlot: ReactNode;
  pathologiesSlot: ReactNode;
  exerciseFaqs: ExerciseFaqEntry[];
  onOpenFaqCreate: () => void;
  onOpenFaqEdit: (faqId: string) => void;
  removeFaqAt: (index: number) => void;
  moveFaq: (index: number, dir: -1 | 1) => void;
  /** When true, hide the duplicate pill row (parent provides primary navigation). */
  hideInlineTabButtons?: boolean;
  /** Resolved strings from Settings → Language → translations (`SectionExercise_*` keys). */
  sectionExerciseUi?: (dbKey: string) => string;
};

export default function ExerciseDetailLabelsPanel({
  lowerFormTab,
  onLowerFormTabChange,
  detailLabelTranslating,
  detailTranslationsReady,
  manualEditLocalesRef,
  getDetailRichValue,
  setDetailRichValue,
  onTranslate,
  onSaveBanner,
  onScrollManual,
  multimediaSlot,
  equipmentSlot,
  pathologiesSlot,
  exerciseFaqs,
  onOpenFaqCreate,
  onOpenFaqEdit,
  removeFaqAt,
  moveFaq,
  hideInlineTabButtons = false,
  sectionExerciseUi,
}: Props) {
  const tUi = sectionExerciseUi ?? ((k: string) => SECTION_EXERCISE_UI_DEFAULTS_EN[k] ?? k);

  const tabLabelsResolved = LOWER_TAB_ORDER.map((id) => ({
    id,
    label: tUi(SECTION_EXERCISE_TAB_UI_KEYS[id]),
  }));
  const faqQuestionPreview = (f: ExerciseFaqEntry) => {
    for (const { code } of SUPPORTED_LANGUAGES) {
      const v = (f.questionByLanguage || {})[code]?.trim();
      if (v) return v;
    }
    return '';
  };

  const faqAnswerPreview = (f: ExerciseFaqEntry) => {
    const strip = (s: string) => s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    for (const { code } of SUPPORTED_LANGUAGES) {
      const raw = (f.answerByLanguage || {})[code]?.trim();
      if (raw) {
        const t = strip(raw);
        if (!t) continue;
        return t.length > 200 ? `${t.slice(0, 197)}…` : t;
      }
    }
    return '';
  };
  const showRichEditors = LOWER_FORM_RICH_TABS.includes(lowerFormTab);

  const currentTabLabel = tabLabelsResolved.find((t) => t.id === lowerFormTab)?.label ?? '';

  return (
    <section id="ex-sec-lower-tabs" className="scroll-mt-20 space-y-3 rounded-xl border border-gray-200 bg-slate-50/50 p-4">
      <div>
        <h4 className="text-sm font-bold uppercase tracking-wide text-blue-800">
          {tUi('SectionExercise_PanelDetailsMultimediaTitle')}
        </h4>
        {hideInlineTabButtons && currentTabLabel ? (
          <p className="mt-1 text-xs font-semibold text-gray-600">
            {tUi('SectionExercise_CurrentSectionPrefix')}{' '}
            <span className="text-gray-900">{currentTabLabel}</span>
          </p>
        ) : null}
      </div>
      {!hideInlineTabButtons ? (
        <div className="flex flex-wrap gap-2 border-b border-gray-200 bg-white/80 pb-3 pt-1">
          {tabLabelsResolved.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => onLowerFormTabChange(id)}
              className={`rounded-lg px-3 py-2 text-xs font-semibold transition sm:text-sm ${
                lowerFormTab === id
                  ? 'bg-gray-900 text-white shadow'
                  : 'bg-gray-100 text-gray-800 ring-1 ring-gray-200 hover:bg-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}

      <div className="min-h-[12rem] rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
        {lowerFormTab === 'multimedia' ? multimediaSlot : null}
        {lowerFormTab === 'equipment' ? equipmentSlot : null}
        {lowerFormTab === 'pathologies' ? pathologiesSlot : null}

        {showRichEditors ? (
          <div className="space-y-4">
            {lowerFormTab === 'execution' ? (
              <div className="rounded-lg border-l-4 border-blue-600 bg-gradient-to-r from-blue-50/95 to-slate-50/90 p-4 shadow-sm">
                <h5 className="text-xs font-bold uppercase tracking-wide text-blue-900">
                  {tUi('SectionExercise_Label2Tag')}
                </h5>
                <p className="mt-1.5 text-base font-bold text-gray-900">{tUi('SectionExercise_Label2Title')}</p>
                <p className="mt-2 text-sm leading-relaxed text-gray-700">{tUi('SectionExercise_RichHelpParagraph')}</p>
              </div>
            ) : lowerFormTab === 'suggestions' ? (
              <div className="rounded-lg border-l-4 border-violet-600 bg-gradient-to-r from-violet-50/95 to-slate-50/90 p-4 shadow-sm">
                <h5 className="text-xs font-bold uppercase tracking-wide text-violet-900">
                  {tUi('SectionExercise_Label3Tag')}
                </h5>
                <p className="mt-1.5 text-base font-bold text-gray-900">{tUi('SectionExercise_Label3Title')}</p>
                <p className="mt-2 text-sm leading-relaxed text-gray-700">{tUi('SectionExercise_RichHelpParagraph')}</p>
              </div>
            ) : lowerFormTab === 'breathing' ? (
              <div className="rounded-lg border-l-4 border-teal-600 bg-gradient-to-r from-teal-50/95 to-slate-50/90 p-4 shadow-sm">
                <h5 className="text-xs font-bold uppercase tracking-wide text-teal-900">
                  {tUi('SectionExercise_Label4Tag')}
                </h5>
                <p className="mt-1.5 text-base font-bold text-gray-900">{tUi('SectionExercise_Label4Title')}</p>
                <p className="mt-2 text-sm leading-relaxed text-gray-700">{tUi('SectionExercise_RichHelpParagraph')}</p>
              </div>
            ) : lowerFormTab === 'mistakes' ? (
              <div className="rounded-lg border-l-4 border-amber-600 bg-gradient-to-r from-amber-50/95 to-slate-50/90 p-4 shadow-sm">
                <h5 className="text-xs font-bold uppercase tracking-wide text-amber-950">
                  {tUi('SectionExercise_Label5Tag')}
                </h5>
                <p className="mt-1.5 text-base font-bold text-gray-900">{tUi('SectionExercise_Label5Title')}</p>
                <p className="mt-2 text-sm leading-relaxed text-gray-700">{tUi('SectionExercise_RichHelpParagraph')}</p>
              </div>
            ) : (
              <p className="text-xs text-gray-600">{tUi('SectionExercise_RichWorkflowFallback')}</p>
            )}
            <div className="rounded-xl border-2 border-blue-100 bg-gradient-to-b from-white to-slate-50 p-4 shadow-sm">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="text-xl leading-none" aria-hidden>
                  {languageFlagEmoji('en')}
                </span>
                <h5 className="text-base font-bold text-gray-900">{tUi('SectionExercise_RichEnglishTitle')}</h5>
              </div>
              <p className="mb-3 text-xs text-gray-600">{tUi('SectionExercise_RichEnglishHint')}</p>
              <RichTextEditor
                language="English"
                value={getDetailRichValue('en')}
                onChange={(html) => setDetailRichValue('en', html)}
                minHeight="14rem"
                placeholder={tUi('SectionExercise_RichPlaceholderEn')}
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={detailLabelTranslating}
                  onClick={() => void onTranslate()}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {detailLabelTranslating
                    ? tUi('SectionExercise_BtnTranslating')
                    : tUi('SectionExercise_BtnTranslation')}
                </button>
                <button
                  type="button"
                  onClick={onSaveBanner}
                  className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-slate-300"
                >
                  {tUi('SectionExercise_BtnSave')}
                </button>
                <button
                  type="button"
                  onClick={onScrollManual}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50"
                >
                  {tUi('SectionExercise_BtnManualEdit')}
                </button>
              </div>
            </div>

            {detailTranslationsReady ? (
              <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm font-medium text-emerald-900">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" aria-hidden />
                {tUi('SectionExercise_TranslationsReadyBanner')}
              </div>
            ) : null}

            <div ref={manualEditLocalesRef} className="space-y-4">
              {SUPPORTED_LANGUAGES.filter((l) => l.code !== 'en').map((lang) => (
                <div
                  key={`detail-rich-${lowerFormTab}-${lang.code}`}
                  className="rounded-lg border-2 border-gray-200 bg-gray-50 p-4"
                >
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className="text-lg leading-none" aria-hidden>
                      {languageFlagEmoji(lang.code)}
                    </span>
                    <span className="text-sm font-bold text-gray-800">
                      {lang.name} ({lang.code.toUpperCase()})
                    </span>
                  </div>
                  <label className="mb-1 block text-xs font-semibold text-gray-600">
                    {tUi('SectionExercise_RichTranslationLabel')}
                  </label>
                  <RichTextEditor
                    language={lang.name}
                    value={getDetailRichValue(lang.code)}
                    onChange={(html) => setDetailRichValue(lang.code, html)}
                    minHeight="12rem"
                    placeholder={tUi('SectionExercise_RichPlaceholderLang').replace('{languageName}', lang.name)}
                  />
                  <div className="mt-1 text-xs text-gray-400">
                    {(getDetailRichValue(lang.code) || '').replace(/<[^>]+>/g, '').length}{' '}
                    {tUi('SectionExercise_RichCharsSuffix')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {lowerFormTab === 'faqs' ? (
          <div className="space-y-4">
            <div className="rounded-lg border-l-4 border-fuchsia-600 bg-gradient-to-r from-fuchsia-50/95 to-violet-50/80 p-4 shadow-sm">
              <h4 className="text-xs font-bold uppercase tracking-wide text-fuchsia-950">
                {tUi('SectionExercise_Label7Tag')}
              </h4>
              <p className="mt-1.5 text-base font-bold text-gray-900">{tUi('SectionExercise_Label7Title')}</p>
              <p className="mt-2 text-sm leading-relaxed text-gray-700">{tUi('SectionExercise_FaqIntroParagraph')}</p>
            </div>

            {exerciseFaqs.length === 0 ? (
              <p className="rounded-lg border border-dashed border-violet-300 bg-white px-4 py-6 text-center text-sm text-gray-600">
                {tUi('SectionExercise_FaqEmptyState')}
              </p>
            ) : (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-600">
                  {tUi('SectionExercise_FaqListHeading')} ({exerciseFaqs.length})
                </p>
                <ol className="m-0 list-none space-y-3 p-0">
                {exerciseFaqs.map((faq, faqIndex) => {
                  const preview = faqQuestionPreview(faq);
                  const answerPreview = faqAnswerPreview(faq);
                  return (
                    <li
                      key={faq.id}
                      className="relative overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm ring-1 ring-gray-100"
                    >
                      <div
                        className="absolute left-0 top-0 h-full w-1.5 bg-gradient-to-b from-violet-500 to-fuchsia-500"
                        aria-hidden
                      />
                      <div className="flex flex-col gap-3 pl-4 pr-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="mb-1 flex flex-wrap items-center gap-2">
                            <span className="inline-flex h-7 min-w-[1.75rem] items-center justify-center rounded-lg bg-violet-600 px-2 text-xs font-bold text-white">
                              {faqIndex + 1}
                            </span>
                            <span className="text-xs font-bold uppercase text-gray-500">
                              {tUi('SectionExercise_FaqBadge')}
                            </span>
                          </div>
                          <p className="text-sm font-semibold text-gray-900">
                            <span className="font-normal text-gray-500">{tUi('SectionExercise_FaqQuestionPrefix')}</span>
                            {preview || (
                              <span className="italic font-normal text-gray-400">
                                {tUi('SectionExercise_FaqNoQuestion')}
                              </span>
                            )}
                          </p>
                          <p
                            className="mt-1 line-clamp-2 text-xs leading-relaxed text-gray-600"
                            title={answerPreview || undefined}
                          >
                            <span className="font-semibold text-gray-500">
                              {tUi('SectionExercise_FaqAnswerPrefix')}
                            </span>
                            {answerPreview || (
                              <span className="font-normal italic text-gray-400">
                                {tUi('SectionExercise_FaqNoAnswer')}
                              </span>
                            )}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-1 sm:shrink-0">
                          <button
                            type="button"
                            title={tUi('SectionExercise_FaqMoveUp')}
                            disabled={faqIndex === 0}
                            onClick={() => moveFaq(faqIndex, -1)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <ChevronUp className="h-4 w-4" aria-hidden />
                          </button>
                          <button
                            type="button"
                            title={tUi('SectionExercise_FaqMoveDown')}
                            disabled={faqIndex === exerciseFaqs.length - 1}
                            onClick={() => moveFaq(faqIndex, 1)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <ChevronDown className="h-4 w-4" aria-hidden />
                          </button>
                          <button
                            type="button"
                            onClick={() => onOpenFaqEdit(faq.id)}
                            className="inline-flex h-8 items-center rounded-md border border-violet-300 bg-violet-50 px-3 text-xs font-semibold text-violet-900 hover:bg-violet-100"
                          >
                            {tUi('SectionExercise_FaqBtnEdit')}
                          </button>
                          <button
                            type="button"
                            title={tUi('SectionExercise_FaqDeleteTitle')}
                            onClick={() => removeFaqAt(faqIndex)}
                            className="inline-flex h-8 items-center gap-1 rounded-md border border-red-200 bg-white px-2 text-xs font-semibold text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden />
                            {tUi('SectionExercise_FaqBtnDelete')}
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
                </ol>
              </div>
            )}

            <button
              type="button"
              onClick={onOpenFaqCreate}
              title={tUi('SectionExercise_FaqAddAria')}
              aria-label={tUi('SectionExercise_FaqAddAria')}
              className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-violet-400 bg-violet-50/50 px-4 py-3 text-sm font-semibold text-violet-900 hover:bg-violet-100/80"
            >
              <Plus className="h-4 w-4 shrink-0" aria-hidden />
              {tUi('SectionExercise_FaqBtnAdd')}
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}

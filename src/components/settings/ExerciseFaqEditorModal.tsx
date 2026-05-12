'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { List, Pencil, X } from 'lucide-react';
import type { ExerciseFaqEntry } from '@/constants/tools.constants';
import { SUPPORTED_LANGUAGES } from '@/constants/tools.constants';

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

function cloneFaq(f: ExerciseFaqEntry): ExerciseFaqEntry {
  return {
    id: f.id,
    questionByLanguage: { ...(f.questionByLanguage || {}) },
    answerByLanguage: { ...(f.answerByLanguage || {}) },
  };
}

type Props = {
  open: boolean;
  mode: 'create' | 'edit';
  initialFaq: ExerciseFaqEntry;
  onSave: (payload: { faq: ExerciseFaqEntry; mode: 'create' | 'edit' }) => void;
  onCancel: () => void;
};

/** FAQs editor — Question uses per-language short fields; Answers use long RTE per locale (wireframe label 7). See `src/constants/exerciseEditorLayoutReference.ts`. */
export default function ExerciseFaqEditorModal({ open, mode, initialFaq, onSave, onCancel }: Props) {
  const [draft, setDraft] = useState<ExerciseFaqEntry>(() => cloneFaq(initialFaq));
  const [questionLocalesOpen, setQuestionLocalesOpen] = useState(false);
  const [applyLang, setApplyLang] = useState('en');
  const [applyText, setApplyText] = useState('');

  useEffect(() => {
    if (open) {
      setDraft(cloneFaq(initialFaq));
      setQuestionLocalesOpen(false);
      setApplyLang('en');
      setApplyText('');
    }
  }, [open, initialFaq]);

  const getQ = useCallback((code: string) => (draft.questionByLanguage || {})[code] ?? '', [draft.questionByLanguage]);
  const setQ = useCallback((code: string, value: string) => {
    setDraft((d) => ({
      ...d,
      questionByLanguage: { ...(d.questionByLanguage || {}), [code]: value },
    }));
  }, []);

  const getA = useCallback((code: string) => (draft.answerByLanguage || {})[code] ?? '', [draft.answerByLanguage]);
  const setA = useCallback((code: string, value: string) => {
    setDraft((d) => ({
      ...d,
      answerByLanguage: { ...(d.answerByLanguage || {}), [code]: value },
    }));
  }, []);

  const handleApplyRow = () => {
    const v = applyText.trim();
    if (!applyLang) return;
    setQ(applyLang, v);
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/55 p-3 sm:p-4" role="dialog">
        <div className="flex max-h-[min(92vh,820px)] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black/10">
          <div className="flex shrink-0 items-center justify-between bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-3 text-white">
            <div className="min-w-0 pr-2">
              <h2 className="text-base font-bold tracking-tight sm:text-lg">FAQs editor of the exercise</h2>
              <p className="mt-0.5 text-xs font-semibold text-white/90">
                Input form — label 7 · FAQs of the current exercise (question + reply in every supported language)
              </p>
            </div>
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg p-1.5 hover:bg-white/15"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4 sm:p-5">
            <div className="overflow-hidden rounded-lg border border-slate-200 shadow-sm">
              <div className="flex flex-col gap-0.5 bg-slate-800 px-3 py-2 text-white">
                <span className="text-xs font-bold uppercase tracking-wide">Question</span>
                <span className="text-[11px] font-normal text-white/80">
                  Short title per language — same role as PHP HTML document titles
                </span>
              </div>
              <div className="flex flex-col gap-2 bg-slate-50/80 p-3 sm:flex-row sm:items-center">
                <input
                  type="text"
                  value={getQ('en')}
                  onChange={(ev) => setQ('en', ev.target.value)}
                  className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-inner focus:outline-none focus:ring-2 focus:ring-slate-500"
                  placeholder="English question (short title)"
                />
                <button
                  type="button"
                  title="Edit question in all languages"
                  onClick={() => {
                    setApplyLang('en');
                    setApplyText(getQ('en'));
                    setQuestionLocalesOpen(true);
                  }}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-400 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100"
                >
                  <List className="h-4 w-4" aria-hidden />
                  <span className="hidden sm:inline">All languages</span>
                </button>
              </div>
            </div>

            <div className="overflow-hidden rounded-lg border border-teal-200 shadow-sm">
              <div className="flex flex-col gap-0.5 bg-gradient-to-r from-teal-600 to-cyan-600 px-3 py-2 text-white">
                <span className="text-xs font-bold uppercase tracking-wide">Answer</span>
                <span className="text-[11px] font-normal text-white/90">
                  Long text per language — same pattern as Language → Long phrases / Long texts
                </span>
              </div>
              <div className="space-y-4 bg-teal-50/40 p-3 sm:p-4">
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <div key={`faq-ans-${lang.code}`} className="rounded-lg border border-teal-100 bg-white p-3 shadow-sm">
                    <label className="mb-1.5 flex flex-wrap items-center gap-2 text-xs font-bold text-gray-800">
                      <span aria-hidden>{languageFlagEmoji(lang.code)}</span>
                      <span>
                        {lang.name} ({lang.code.toUpperCase()})
                      </span>
                    </label>
                    <textarea
                      rows={8}
                      value={getA(lang.code)}
                      onChange={(ev) => setA(lang.code, ev.target.value)}
                      className="w-full resize-y rounded-md border border-gray-300 px-3 py-2 font-sans text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                      placeholder={`Enter ${lang.name} long text translation…`}
                    />
                    <div className="mt-1 text-[11px] text-gray-400">
                      {(getA(lang.code) || '').length} characters
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-gray-200 bg-gray-100 px-4 py-3">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg bg-gray-300 px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-400"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onSave({ faq: draft, mode })}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Save FAQ
            </button>
          </div>
        </div>
      </div>

      {questionLocalesOpen ? (
        <div
          className="fixed inset-0 z-[130] flex items-center justify-center bg-black/50 p-3 sm:p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="flex max-h-[min(88vh,720px)] w-full max-w-xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
            <div className="flex shrink-0 items-center justify-between bg-slate-800 px-4 py-3 text-white">
              <span className="text-sm font-bold">Question</span>
              <button
                type="button"
                onClick={() => setQuestionLocalesOpen(false)}
                className="rounded p-1 hover:bg-white/10"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="border-b border-gray-200 bg-slate-50 px-4 py-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <div className="min-w-0 flex-1">
                  <label className="mb-1 block text-[11px] font-semibold text-gray-600">Language</label>
                  <select
                    value={applyLang}
                    onChange={(ev) => {
                      const c = ev.target.value;
                      setApplyLang(c);
                      setApplyText(getQ(c));
                    }}
                    className="w-full rounded-lg border border-gray-300 bg-white px-2 py-2 text-sm"
                  >
                    {SUPPORTED_LANGUAGES.map((l) => (
                      <option key={l.code} value={l.code}>
                        {languageFlagEmoji(l.code)} {l.code.toUpperCase()} — {l.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="min-w-0 flex-[2]">
                  <label className="mb-1 block text-[11px] font-semibold text-gray-600">Text</label>
                  <input
                    type="text"
                    value={applyText}
                    onChange={(ev) => setApplyText(ev.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    placeholder="Type then Apply to set that language"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleApplyRow}
                  className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-900"
                >
                  Apply
                </button>
              </div>
            </div>

            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-gray-100 bg-white px-4 py-2">
              <span className="text-xs font-semibold text-gray-500">Variable name</span>
              <div className="flex items-center gap-1.5 text-xs text-gray-600">
                <span className="hidden sm:inline">Standard key</span>
                <code className="rounded bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-800">question</code>
                <Pencil className="h-3.5 w-3.5 text-gray-400" aria-hidden />
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-xs font-bold uppercase text-gray-500">
                    <th className="py-2 pr-2">Lang</th>
                    <th className="py-2">Translation</th>
                  </tr>
                </thead>
                <tbody>
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <tr key={`q-row-${lang.code}`} className="border-b border-gray-100 align-top">
                      <td className="py-2 pr-2 whitespace-nowrap text-xs font-semibold text-gray-700">
                        <span className="mr-1" aria-hidden>
                          {languageFlagEmoji(lang.code)}
                        </span>
                        {lang.code}
                      </td>
                      <td className="py-2">
                        <input
                          type="text"
                          value={getQ(lang.code)}
                          onChange={(ev) => setQ(lang.code, ev.target.value)}
                          className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                          placeholder={`Question (${lang.name})`}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex shrink-0 justify-end gap-2 border-t border-gray-200 bg-gray-50 px-4 py-3">
              <button
                type="button"
                onClick={() => setQuestionLocalesOpen(false)}
                className="rounded-lg bg-gray-700 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-900"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => setQuestionLocalesOpen(false)}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

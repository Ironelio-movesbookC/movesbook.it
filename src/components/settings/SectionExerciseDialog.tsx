'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { List, X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  resolveSectionExerciseUi,
  type SectionExerciseTranslationRow,
} from '@/constants/sectionExerciseUiTranslations';
import ExerciseMachinesUsuallyUsedModal from '@/components/settings/ExerciseMachinesUsuallyUsedModal';
import ExerciseFaqEditorModal from '@/components/settings/ExerciseFaqEditorModal';
import ExerciseDetailLabelsPanel, {
  LOWER_FORM_RICH_TABS,
  type LowerFormTabId,
} from '@/components/settings/ExerciseDetailLabelsPanel';
import type {
  Exercise,
  ExerciseFaqEntry,
  ExercisePathologyCatalogItem,
  ExerciseTypology,
  MuscleAreaPercentTag,
  Sport,
} from '@/constants/tools.constants';
import {
  DEFAULT_SPORTS,
  SUPPORTED_LANGUAGES,
  normalizeMuscleAreaPercentTags,
  muscleInvolvementPercentTotal,
  normalizeExerciseFaqs,
  newExerciseFaqEntry,
} from '@/constants/tools.constants';
import {
  SECTION_EXERCISE_EQUIPMENT_TYPES,
  SECTION_EXERCISE_MUSCLE_GROUPS,
  SECTION_EXERCISE_SHARED_BY,
  SECTION_EXERCISE_TYPOLOGY_OPTIONS,
} from '@/constants/sectionExercise.constants';

// UX wireframes (layout reference): `src/constants/exerciseEditorLayoutReference.ts` — PNGs in `public/design/exercise-editor/`.

const VIDEO_INLINE_MAX_BYTES = 8 * 1024 * 1024;

/** Matches sticky top pills + lower tabs so the bar reflects the section you jumped to. */
type SectionExerciseTopNavHighlight = 'basics' | LowerFormTabId | 'label6' | 'more';

/** Same targets as Tools Settings / Language → Long texts (`/api/translate`). */
const EXERCISE_LABEL_TARGET_LANG_CODES = SUPPORTED_LANGUAGES.filter((l) => l.code !== 'en').map((l) => l.code);

function stripHtmlToPlain(html: string): string {
  if (!html) return '';
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function escapeHtmlPlain(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Turn translated plain text into simple HTML for `RichTextEditor`. */
function plainTranslationToEditorHtml(s: string): string {
  const t = (s || '').trim();
  if (!t) return '';
  const parts = t.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
  if (parts.length <= 1) return `<p>${escapeHtmlPlain(t)}</p>`;
  return parts.map((p) => `<p>${escapeHtmlPlain(p)}</p>`).join('');
}

async function fetchExerciseLabelTranslations(text: string): Promise<Record<string, string>> {
  const response = await fetch('/api/translate', {
    method: 'POST',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      targetLanguages: EXERCISE_LABEL_TARGET_LANG_CODES,
    }),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Translation API returned ${response.status}: ${errorText.substring(0, 120)}`);
  }
  const data = await response.json();
  return data.translations && typeof data.translations === 'object' ? (data.translations as Record<string, string>) : {};
}

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

type Props = {
  exercise: Exercise;
  onChange: (next: Exercise) => void;
  sports: Sport[];
  /** Technical Settings → Pathologies catalog (contraindication tags). */
  pathologyCatalog?: ExercisePathologyCatalogItem[];
  onSave: () => void;
  onCancel: () => void;
  title?: string;
};

/**
 * Add / edit exercise — main shell for Section Exercise (Label 1 + official media + lower tabs).
 * Layout targets the product wireframes: two-column basics, sticky nav mirroring tabs, red primary Save.
 * Checklist and wireframe asset filenames: `src/constants/exerciseEditorLayoutReference.ts` (PNG mockups in `public/design/exercise-editor/`).
 */
export default function SectionExerciseDialog({
  exercise: e,
  onChange,
  sports,
  pathologyCatalog = [],
  onSave,
  onCancel,
  title,
}: Props) {
  const [machinesModalOpen, setMachinesModalOpen] = useState(false);
  const [faqEditor, setFaqEditor] = useState<null | { mode: 'create' | 'edit'; faq: ExerciseFaqEntry }>(null);
  const [lowerFormTab, setLowerFormTab] = useState<LowerFormTabId>('multimedia');
  const [topNavHighlight, setTopNavHighlight] = useState<SectionExerciseTopNavHighlight>('multimedia');
  const [detailLabelTranslating, setDetailLabelTranslating] = useState(false);
  const [detailTranslationsReady, setDetailTranslationsReady] = useState(false);
  const manualEditLocalesRef = useRef<HTMLDivElement | null>(null);
  const scrollBodyRef = useRef<HTMLDivElement | null>(null);
  const [nameLanguagesModalOpen, setNameLanguagesModalOpen] = useState(false);
  const { currentLanguage } = useLanguage();
  const [sectionExerciseTranslations, setSectionExerciseTranslations] = useState<
    SectionExerciseTranslationRow[] | null
  >(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/admin/translations');
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (!data.success || !Array.isArray(data.translations) || cancelled) return;
        setSectionExerciseTranslations(data.translations as SectionExerciseTranslationRow[]);
      } catch {
        if (!cancelled) setSectionExerciseTranslations(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const ui = useCallback(
    (dbKey: string) => resolveSectionExerciseUi(sectionExerciseTranslations, currentLanguage, dbKey),
    [sectionExerciseTranslations, currentLanguage]
  );

  const selectLowerFormTab = (t: LowerFormTabId) => {
    setLowerFormTab(t);
    setTopNavHighlight(t);
    setDetailTranslationsReady(false);
  };

  const getEnglishHtmlForRichTab = (tab: LowerFormTabId): string => {
    if (tab === 'execution') return getExecutionForLang('en');
    if (tab === 'suggestions') return getExpertSuggestionsForLang('en');
    if (tab === 'breathing') return getBreathingForLang('en');
    if (tab === 'mistakes') return getMistakesForLang('en');
    return '';
  };

  const applyTranslationsToRichTab = (tab: LowerFormTabId, translations: Record<string, string>) => {
    const record: Record<string, string> = {};
    for (const code of EXERCISE_LABEL_TARGET_LANG_CODES) {
      const raw = translations[code];
      if (typeof raw === 'string' && raw.trim()) record[code] = plainTranslationToEditorHtml(raw.trim());
    }
    if (Object.keys(record).length === 0) {
      throw new Error('No translated values were returned by the translation service.');
    }
    if (tab === 'execution') {
      onChange({ ...e, executionByLanguage: { ...(e.executionByLanguage || {}), ...record } });
    } else if (tab === 'suggestions') {
      onChange({
        ...e,
        expertSuggestionsByLanguage: { ...(e.expertSuggestionsByLanguage || {}), ...record },
      });
    } else if (tab === 'breathing') {
      onChange({ ...e, breathingByLanguage: { ...(e.breathingByLanguage || {}), ...record } });
    } else if (tab === 'mistakes') {
      onChange({ ...e, mistakesByLanguage: { ...(e.mistakesByLanguage || {}), ...record } });
    }
  };

  const handleDetailLabelTranslate = async () => {
    if (!LOWER_FORM_RICH_TABS.includes(lowerFormTab)) return;
    const enHtml = getEnglishHtmlForRichTab(lowerFormTab);
    const plain = stripHtmlToPlain(enHtml);
    if (!plain) {
      window.alert('Enter English text in the source editor first, then press Translation.');
      return;
    }
    setDetailTranslationsReady(false);
    setDetailLabelTranslating(true);
    try {
      const translations = await fetchExerciseLabelTranslations(plain);
      applyTranslationsToRichTab(lowerFormTab, translations);
      setDetailTranslationsReady(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      window.alert(
        `Translation failed.\n\n${msg}\n\nYou can edit other languages manually. Same API as Settings → Language → Long texts.`
      );
    } finally {
      setDetailLabelTranslating(false);
    }
  };

  const handleDetailLabelSaveBanner = () => {
    setDetailTranslationsReady(true);
  };

  const scrollToManualLocales = () => {
    manualEditLocalesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const exerciseFaqs = useMemo(() => normalizeExerciseFaqs(e.exerciseFaqs || []), [e.exerciseFaqs]);

  const scrollToSection = useCallback((id: string) => {
    const container = scrollBodyRef.current;
    if (!container) return;
    const sel = `#${typeof CSS !== 'undefined' && typeof CSS.escape === 'function' ? CSS.escape(id) : id}`;
    const el = container.querySelector(sel);
    if (!el || !(el instanceof HTMLElement)) return;
    const pad = 10;
    const nextTop =
      el.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop - pad;
    container.scrollTo({ top: Math.max(0, nextTop), behavior: 'smooth' });
  }, []);

  const jumpToTopNavTarget = useCallback(
    (highlight: SectionExerciseTopNavHighlight, scrollId: string) => {
      setTopNavHighlight(highlight);
      requestAnimationFrame(() => scrollToSection(scrollId));
    },
    [scrollToSection]
  );

  const commitFaqs = (next: ExerciseFaqEntry[]) => {
    onChange({ ...e, exerciseFaqs: normalizeExerciseFaqs(next) });
  };

  const cloneExerciseFaqEntry = (row: ExerciseFaqEntry): ExerciseFaqEntry => ({
    id: row.id,
    questionByLanguage: { ...(row.questionByLanguage || {}) },
    answerByLanguage: { ...(row.answerByLanguage || {}) },
  });

  const openFaqCreate = () => {
    setFaqEditor({ mode: 'create', faq: newExerciseFaqEntry() });
  };

  const openFaqEdit = (faqId: string) => {
    const row = exerciseFaqs.find((x) => x.id === faqId);
    if (!row) return;
    setFaqEditor({ mode: 'edit', faq: cloneExerciseFaqEntry(row) });
  };

  const handleFaqEditorSave = ({ faq: saved, mode }: { faq: ExerciseFaqEntry; mode: 'create' | 'edit' }) => {
    if (mode === 'create') {
      commitFaqs([...exerciseFaqs, saved]);
    } else {
      commitFaqs(exerciseFaqs.map((x) => (x.id === saved.id ? saved : x)));
    }
    setFaqEditor(null);
  };

  const removeFaqAt = (index: number) => {
    commitFaqs(exerciseFaqs.filter((_, i) => i !== index));
  };

  const moveFaq = (index: number, dir: -1 | 1) => {
    const j = index + dir;
    if (j < 0 || j >= exerciseFaqs.length) return;
    const copy = [...exerciseFaqs];
    [copy[index], copy[j]] = [copy[j], copy[index]];
    commitFaqs(copy);
  };

  const muscleTags = useMemo(
    () => normalizeMuscleAreaPercentTags(e.muscleAreaPercentTags || []),
    [e.muscleAreaPercentTags]
  );

  const musclePercentSum = useMemo(() => muscleInvolvementPercentTotal(muscleTags), [muscleTags]);

  const mainAreaTrim = (muscleTags.find((t) => t.isMain)?.area ?? '').trim();

  const commitMuscleTags = (next: MuscleAreaPercentTag[]) => {
    onChange({ ...e, muscleAreaPercentTags: normalizeMuscleAreaPercentTags(next) });
  };

  const setMainMuscleArea = (area: string) => {
    const mapped = muscleTags.map((t) => (t.isMain ? { ...t, area } : t));
    const withoutDupSecondaries = mapped.filter(
      (t) => !(t.isMain === false && (t.area || '').trim() === area.trim() && area.trim() !== '')
    );
    onChange({
      ...e,
      muscleAreaPercentTags: normalizeMuscleAreaPercentTags(withoutDupSecondaries),
      mainMuscleGroup: area,
    });
  };

  const toggleSecondaryArea = (area: string) => {
    if (!mainAreaTrim) {
      window.alert('Choose the main muscular group first.');
      return;
    }
    if (area === mainAreaTrim) return;
    const exists = muscleTags.some((t) => !t.isMain && (t.area || '').trim() === area);
    if (exists) {
      commitMuscleTags(muscleTags.filter((t) => !(t.isMain === false && (t.area || '').trim() === area)));
    } else {
      commitMuscleTags([...muscleTags, { area, percent: 0, isMain: false }]);
    }
  };

  const availableSports = useMemo(
    () => (sports.length > 0 ? sports : DEFAULT_SPORTS),
    [sports]
  );

  const sportsSelectSize = useMemo(
    () => Math.min(12, Math.max(4, availableSports.length || 4)),
    [availableSports.length]
  );

  const pathologyOptions = useMemo(
    () => [...pathologyCatalog].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [pathologyCatalog]
  );

  const pathologySelectSize = useMemo(
    () => Math.min(12, Math.max(4, pathologyOptions.length || 4)),
    [pathologyOptions.length]
  );

  const selectAllPathologyTags = () => {
    onChange({ ...e, contraindicatedPathologyIds: pathologyOptions.map((p) => p.id) });
  };

  const clearPathologyTags = () => onChange({ ...e, contraindicatedPathologyIds: [] });

  const toggleLevel = (n: number) => {
    const cur = new Set(e.levels?.length ? e.levels : [1]);
    if (cur.has(n)) {
      if (cur.size <= 1) return;
      cur.delete(n);
    } else {
      cur.add(n);
    }
    onChange({ ...e, levels: Array.from(cur).sort((a, b) => a - b) });
  };

  const selectAllSports = () => {
    onChange({ ...e, sportsIndicated: availableSports.map((s) => s.name) });
  };

  const clearSports = () => onChange({ ...e, sportsIndicated: [] });

  const setNameForLang = (code: string, value: string) => {
    if (code === 'en') {
      onChange({ ...e, name: value });
      return;
    }
    onChange({
      ...e,
      nameByLanguage: { ...(e.nameByLanguage || {}), [code]: value },
    });
  };

  const getNameForLang = (code: string) => {
    if (code === 'en') return e.name;
    return (e.nameByLanguage || {})[code] ?? '';
  };

  const setExecutionForLang = (code: string, value: string) => {
    onChange({
      ...e,
      executionByLanguage: { ...(e.executionByLanguage || {}), [code]: value },
    });
  };

  const getExecutionForLang = (code: string) => (e.executionByLanguage || {})[code] ?? '';

  const setExpertSuggestionsForLang = (code: string, value: string) => {
    onChange({
      ...e,
      expertSuggestionsByLanguage: { ...(e.expertSuggestionsByLanguage || {}), [code]: value },
    });
  };

  const getExpertSuggestionsForLang = (code: string) => (e.expertSuggestionsByLanguage || {})[code] ?? '';

  const setBreathingForLang = (code: string, value: string) => {
    onChange({
      ...e,
      breathingByLanguage: { ...(e.breathingByLanguage || {}), [code]: value },
    });
  };

  const getBreathingForLang = (code: string) => (e.breathingByLanguage || {})[code] ?? '';

  const setMistakesForLang = (code: string, value: string) => {
    onChange({
      ...e,
      mistakesByLanguage: { ...(e.mistakesByLanguage || {}), [code]: value },
    });
  };

  const getMistakesForLang = (code: string) => (e.mistakesByLanguage || {})[code] ?? '';

  const getDetailRichValue = (code: string) => {
    switch (lowerFormTab) {
      case 'execution':
        return getExecutionForLang(code);
      case 'suggestions':
        return getExpertSuggestionsForLang(code);
      case 'breathing':
        return getBreathingForLang(code);
      case 'mistakes':
        return getMistakesForLang(code);
      default:
        return '';
    }
  };

  const setDetailRichValue = (code: string, html: string) => {
    switch (lowerFormTab) {
      case 'execution':
        setExecutionForLang(code, html);
        break;
      case 'suggestions':
        setExpertSuggestionsForLang(code, html);
        break;
      case 'breathing':
        setBreathingForLang(code, html);
        break;
      case 'mistakes':
        setMistakesForLang(code, html);
        break;
      default:
        break;
    }
  };

  const navPillInactive =
    'rounded-full border border-gray-300 bg-white px-3 py-1 text-xs font-semibold text-gray-700 hover:border-blue-500 hover:bg-blue-50 hover:text-blue-900';
  const navPillActive =
    'rounded-full border border-blue-600 bg-blue-600 px-3 py-1 text-xs font-semibold text-white shadow-sm';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
      <div className="my-8 w-full max-w-5xl rounded-2xl bg-white p-6 shadow-xl max-h-[min(92vh,900px)] flex flex-col">
        <div className="flex-shrink-0 mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-4">
          <h3 className="text-2xl font-bold text-gray-900">{title ?? ui('SectionExercise_DialogTitleDefault')}</h3>
          <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-gray-800">
            <input
              type="checkbox"
              checked={e.enabled !== false}
              onChange={(ev) => onChange({ ...e, enabled: ev.target.checked })}
              className="h-5 w-5 rounded border-gray-300"
            />
            {ui('SectionExercise_CheckboxAvailable')}
          </label>
        </div>

        <div className="sticky top-0 z-30 -mx-1 mb-3 flex flex-wrap gap-1 border-b border-gray-200 bg-white pb-2 pt-1 shadow-sm">
          <button
            type="button"
            onClick={() => jumpToTopNavTarget('basics', 'ex-sec-basics')}
            className={topNavHighlight === 'basics' ? navPillActive : navPillInactive}
          >
            {ui('SectionExercise_NavBasics')}
          </button>
          {(
            [
              ['multimedia', 'SectionExercise_NavMultimedia'],
              ['execution', 'SectionExercise_NavExecution'],
              ['suggestions', 'SectionExercise_NavSuggestions'],
              ['breathing', 'SectionExercise_NavBreathing'],
              ['mistakes', 'SectionExercise_NavMistakes'],
              ['faqs', 'SectionExercise_NavFaqs'],
              ['equipment', 'SectionExercise_NavEquipment'],
              ['pathologies', 'SectionExercise_NavPathologies'],
            ] as const
          ).map(([tid, uiKey]) => (
            <button
              key={tid}
              type="button"
              onClick={() => {
                selectLowerFormTab(tid);
                const scrollId = tid === 'multimedia' ? 'ex-sec-label1-media' : 'ex-sec-lower-tabs';
                requestAnimationFrame(() => scrollToSection(scrollId));
              }}
              className={topNavHighlight === tid ? navPillActive : navPillInactive}
            >
              {ui(uiKey)}
            </button>
          ))}
          <button
            type="button"
            onClick={() => jumpToTopNavTarget('label6', 'ex-sec-label6')}
            className={topNavHighlight === 'label6' ? navPillActive : navPillInactive}
          >
            {ui('SectionExercise_NavMuscles')}
          </button>
          <button
            type="button"
            onClick={() => jumpToTopNavTarget('more', 'ex-sec-more')}
            className={topNavHighlight === 'more' ? navPillActive : navPillInactive}
          >
            {ui('SectionExercise_NavMore')}
          </button>
        </div>

        <div
          ref={scrollBodyRef}
          className="min-h-0 flex-1 space-y-8 overflow-y-auto overflow-x-hidden pr-1 text-gray-800"
        >
          <section id="ex-sec-basics" className="scroll-mt-3 space-y-4">
            <div>
              <h4 className="text-sm font-bold uppercase tracking-wide text-blue-700">
                {ui('SectionExercise_Label1CoreTitle')}
              </h4>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-600">
                    Typology of exercise
                  </label>
                  <select
                    value={e.typology || ''}
                    onChange={(ev) => {
                      const v = ev.target.value as ExerciseTypology | '';
                      onChange({ ...e, typology: v, category: v || e.category });
                    }}
                    className="w-full rounded-lg border-2 border-sky-200 bg-sky-50/30 px-3 py-2 text-sm"
                  >
                    <option value="">— Select —</option>
                    {SECTION_EXERCISE_TYPOLOGY_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <label className="text-xs font-bold uppercase tracking-wide text-gray-600">
                      Sports indicated
                    </label>
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                      Selected ({(e.sportsIndicated || []).length})
                    </span>
                  </div>
                  <p className="mb-2 text-xs text-gray-600">
                    Hold <kbd className="rounded border border-gray-300 bg-gray-50 px-1">Ctrl</kbd> /{' '}
                    <kbd className="rounded border border-gray-300 bg-gray-50 px-1">⌘</kbd> and click to select several
                    sports.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={selectAllSports}
                      className="rounded border border-gray-300 bg-white px-2 py-1 text-xs font-semibold hover:bg-gray-50"
                    >
                      Check all sports
                    </button>
                    <button
                      type="button"
                      onClick={clearSports}
                      className="rounded border border-gray-300 bg-white px-2 py-1 text-xs font-semibold hover:bg-gray-50"
                    >
                      Clear
                    </button>
                  </div>
                  {sports.length === 0 && (
                    <p className="mt-2 text-sm text-amber-700">
                      Sports catalog is empty in Tools Settings. Showing default sports list.
                    </p>
                  )}
                  <select
                    multiple
                    size={sportsSelectSize}
                    value={e.sportsIndicated || []}
                    onChange={(ev) => {
                      const next = Array.from(ev.target.selectedOptions, (o) => o.value);
                      onChange({ ...e, sportsIndicated: next });
                    }}
                    className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-2 py-1 text-sm shadow-inner"
                    aria-label="Sports indicated for this exercise"
                  >
                    {availableSports.map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-600">
                    Type of equipments <span className="font-normal normal-case text-gray-500">(one only)</span>
                  </label>
                  <select
                    value={e.equipmentType || ''}
                    onChange={(ev) => {
                      const v = ev.target.value;
                      onChange({ ...e, equipmentType: v, equipment: v ? [v] : [] });
                    }}
                    className="w-full rounded-lg border-2 border-sky-200 bg-sky-50/30 px-3 py-2 text-sm"
                  >
                    <option value="">— Select —</option>
                    {SECTION_EXERCISE_EQUIPMENT_TYPES.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-4 lg:min-w-0">
                <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-600">
                    {ui('SectionExercise_CodeLabel')} <span className="text-red-600">*</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <input
                      type="text"
                      value={e.exerciseCode || ''}
                      onChange={(ev) => onChange({ ...e, exerciseCode: ev.target.value })}
                      className="min-w-[8rem] flex-1 rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm"
                      placeholder={ui('SectionExercise_ReferenceCodePlaceholder')}
                    />
                    <button
                      type="button"
                      title={ui('SectionExercise_EditMultilingualNamesTitle')}
                      onClick={() => setNameLanguagesModalOpen(true)}
                      className="inline-flex shrink-0 items-center justify-center rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-gray-700 hover:bg-gray-100"
                    >
                      <List className="h-4 w-4" aria-hidden />
                    </button>
                  </div>
                </div>

                <div className="rounded-lg border-2 border-emerald-200 bg-emerald-50/40 p-3">
                  <label className="mb-1 block text-xs font-bold uppercase text-emerald-900">
                    Main muscular group <span className="font-normal normal-case text-emerald-800">(one only)</span>
                  </label>
                  <select
                    value={muscleTags.find((t) => t.isMain)?.area ?? ''}
                    onChange={(ev) => setMainMuscleArea(ev.target.value)}
                    className="w-full rounded-md border border-emerald-300 bg-white px-2 py-2 text-sm"
                  >
                    <option value="">— Select —</option>
                    {SECTION_EXERCISE_MUSCLE_GROUPS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="rounded-lg border-2 border-amber-200 bg-amber-50/50 p-3">
                  <label className="mb-2 block text-xs font-bold uppercase text-amber-900">
                    Secondary muscular groups
                  </label>
                  <div className="max-h-40 space-y-1.5 overflow-y-auto rounded border border-amber-100/80 bg-white/90 p-2">
                    {SECTION_EXERCISE_MUSCLE_GROUPS.map((m) => {
                      if (mainAreaTrim && m === mainAreaTrim) return null;
                      const checked = muscleTags.some((t) => !t.isMain && (t.area || '').trim() === m);
                      return (
                        <label key={`sec-muscle-${m}`} className="flex cursor-pointer items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleSecondaryArea(m)}
                            disabled={!mainAreaTrim}
                            className="h-4 w-4 rounded border-gray-300 disabled:opacity-40"
                          />
                          <span>{m}</span>
                        </label>
                      );
                    })}
                  </div>
                  <p className="mt-2 text-xs text-gray-700">
                    Set each area&apos;s <span className="font-semibold">%</span> under{' '}
                    <button
                      type="button"
                      onClick={() => scrollToSection('ex-sec-label6')}
                      className="font-semibold text-blue-700 underline"
                    >
                      {ui('SectionExercise_BasicsJumpLabel6')}
                    </button>{' '}
                    (all areas together = 100%).
                  </p>
                </div>
                </div>

                <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-gray-600">
                    Level <span className="font-normal normal-case text-gray-500">(one or more, 1–5)</span>
                  </label>
                  <div className="flex flex-wrap gap-3">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <label key={n} className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                        <input
                          type="checkbox"
                          checked={(e.levels || [1]).includes(n)}
                          onChange={() => toggleLevel(n)}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                        Level {n}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-gray-600">
                    {ui('SectionExercise_SharingLabel')}
                  </label>
                  <select
                    value={e.sharedBy || 'MY_LIBRARY'}
                    onChange={(ev) => onChange({ ...e, sharedBy: ev.target.value as Exercise['sharedBy'] })}
                    className="mb-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  >
                    {SECTION_EXERCISE_SHARED_BY.map(({ value, label }) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <label className="mb-1 block text-xs font-semibold text-gray-600">
                    {ui('SectionExercise_SharedByUsernameLabel')}
                  </label>
                  <input
                    type="text"
                    value={e.sharedByUsername || ''}
                    onChange={(ev) => onChange({ ...e, sharedByUsername: ev.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    placeholder={
                      e.sharedBy === 'MOVESBOOK'
                        ? ui('SectionExercise_SharedByMovesbookPlaceholder')
                        : ui('SectionExercise_SharedByGenericPlaceholder')
                    }
                  />
                </div>
              </div>

              <div className="space-y-4 rounded-xl border-2 border-indigo-200 bg-gradient-to-b from-white to-indigo-50/40 p-4 shadow-sm lg:col-span-2">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h5 className="text-sm font-bold uppercase tracking-wide text-indigo-900">
                      {ui('SectionExercise_NameSectionTitle')}
                    </h5>
                    <p className="mt-1 text-xs leading-relaxed text-gray-700">{ui('SectionExercise_NameSectionHint')}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNameLanguagesModalOpen(true)}
                    className="shrink-0 rounded-lg border border-indigo-300 bg-white px-4 py-2 text-xs font-semibold text-indigo-900 shadow-sm hover:bg-indigo-50"
                  >
                    {ui('SectionExercise_NameFullScreenEditor')}
                  </button>
                </div>

                <div className="flex flex-wrap items-start gap-3">
                  <span className="pt-2 text-2xl leading-none shrink-0" title={ui('SectionExercise_NameEnglishTitle')} aria-hidden>
                    {languageFlagEmoji('en')}
                  </span>
                  <div className="min-w-0 flex-1 space-y-1">
                    <label htmlFor="exercise-name-en" className="text-xs font-bold text-gray-800">
                      {ui('SectionExercise_NameEnglishRequired')}{' '}
                      <span className="font-normal text-red-600">
                        {ui('SectionExercise_NameEnglishRequiredSuffix')}
                      </span>
                    </label>
                    <textarea
                      id="exercise-name-en"
                      value={e.name}
                      onChange={(ev) => onChange({ ...e, name: ev.target.value })}
                      rows={2}
                      className="w-full resize-y rounded-lg border-2 border-indigo-300 bg-white px-4 py-3 text-base leading-snug text-gray-900 shadow-inner placeholder:text-gray-400 min-h-[3.25rem]"
                      placeholder={ui('SectionExercise_NameEnglishPlaceholder')}
                    />
                  </div>
                </div>

                <div className="border-t border-indigo-200/80 pt-4">
                  <p className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-700">
                    {ui('SectionExercise_NameTranslationsHeading')}{' '}
                    <span className="font-normal normal-case text-gray-600">
                      {ui('SectionExercise_NameTranslationsOptional')}
                    </span>
                  </p>
                  <div className="grid max-h-[min(28rem,55vh)] grid-cols-1 gap-4 overflow-y-auto pr-1 sm:grid-cols-2 xl:grid-cols-3">
                    {SUPPORTED_LANGUAGES.filter((l) => l.code !== 'en').map((lang) => (
                      <div key={`name-lang-${lang.code}`} className="space-y-1">
                        <label className="flex items-center gap-2 text-xs font-semibold text-gray-800">
                          <span aria-hidden>{languageFlagEmoji(lang.code)}</span>
                          <span className="truncate">
                            {lang.name} <span className="font-normal text-gray-500">({lang.code})</span>
                          </span>
                        </label>
                        <textarea
                          value={getNameForLang(lang.code)}
                          onChange={(ev) => setNameForLang(lang.code, ev.target.value)}
                          rows={2}
                          className="w-full resize-y rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm leading-snug text-gray-900 placeholder:text-gray-400 min-h-[2.75rem]"
                          placeholder={`${lang.name} — ${ui('SectionExercise_NameModalPlaceholderLang')}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div
              id="ex-sec-label1-media"
              className="scroll-mt-24 space-y-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
            >
              <h5 className="text-xs font-bold uppercase tracking-wide text-gray-700">
                {ui('SectionExercise_OfficialPicturesTitle')}
              </h5>
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="rounded-lg border border-gray-200 p-3">
                  <h6 className="mb-2 text-sm font-bold text-gray-800">{ui('SectionExercise_GenderMale')}</h6>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-gray-600">
                        {ui('SectionExercise_PictureAMale')}
                      </label>
                      <input
                        type="url"
                        value={e.pictureAMale || ''}
                        onChange={(ev) => onChange({ ...e, pictureAMale: ev.target.value })}
                        className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
                        placeholder={ui('SectionExercise_ImageUrlPlaceholder')}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-gray-600">
                        {ui('SectionExercise_PictureBMale')}
                      </label>
                      <input
                        type="url"
                        value={e.pictureBMale || ''}
                        onChange={(ev) => onChange({ ...e, pictureBMale: ev.target.value })}
                        className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
                        placeholder={ui('SectionExercise_ImageUrlPlaceholder')}
                      />
                    </div>
                  </div>
                  <label className="mb-1 mt-3 block text-xs font-semibold text-gray-600">
                    {ui('SectionExercise_OfficialVideoUrlLabel')}
                  </label>
                  <input
                    type="url"
                    value={e.officialVideoUrl || ''}
                    onChange={(ev) => onChange({ ...e, officialVideoUrl: ev.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    placeholder={ui('SectionExercise_OfficialVideoUrlPlaceholder')}
                  />
                  <label className="mb-1 mt-2 block text-xs font-semibold text-gray-600">
                    {ui('SectionExercise_OfficialVideoLocalLabel')}
                  </label>
                  <input
                    type="file"
                    accept="video/*"
                    className="text-sm"
                    onChange={(ev) => {
                      const file = ev.target.files?.[0];
                      if (!file) {
                        onChange({ ...e, officialVideoDataUrl: '' });
                        return;
                      }
                      if (file.size > VIDEO_INLINE_MAX_BYTES) {
                        window.alert('Video must be 8 MB or smaller for inline storage. Use a URL instead.');
                        ev.target.value = '';
                        return;
                      }
                      const reader = new FileReader();
                      reader.onload = () =>
                        onChange({
                          ...e,
                          officialVideoDataUrl: typeof reader.result === 'string' ? reader.result : '',
                        });
                      reader.readAsDataURL(file);
                    }}
                  />
                </div>
                <div className="rounded-lg border border-gray-200 p-3">
                  <h6 className="mb-2 text-sm font-bold text-gray-800">{ui('SectionExercise_GenderFemale')}</h6>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-gray-600">
                        {ui('SectionExercise_PictureAFemale')}
                      </label>
                      <input
                        type="url"
                        value={e.pictureAFemale || ''}
                        onChange={(ev) => onChange({ ...e, pictureAFemale: ev.target.value })}
                        className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
                        placeholder={ui('SectionExercise_ImageUrlPlaceholder')}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-gray-600">
                        {ui('SectionExercise_PictureBFemale')}
                      </label>
                      <input
                        type="url"
                        value={e.pictureBFemale || ''}
                        onChange={(ev) => onChange({ ...e, pictureBFemale: ev.target.value })}
                        className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
                        placeholder={ui('SectionExercise_ImageUrlPlaceholder')}
                      />
                    </div>
                  </div>
                  <label className="mb-1 mt-3 block text-xs font-semibold text-gray-600">
                    {ui('SectionExercise_OfficialVideoUrlLabel')}
                  </label>
                  <input
                    type="url"
                    value={e.officialVideoUrlFemale || ''}
                    onChange={(ev) => onChange({ ...e, officialVideoUrlFemale: ev.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    placeholder={ui('SectionExercise_OfficialVideoUrlPlaceholder')}
                  />
                  <label className="mb-1 mt-2 block text-xs font-semibold text-gray-600">
                    {ui('SectionExercise_OfficialVideoLocalLabel')}
                  </label>
                  <input
                    type="file"
                    accept="video/*"
                    className="text-sm"
                    onChange={(ev) => {
                      const file = ev.target.files?.[0];
                      if (!file) {
                        onChange({ ...e, officialVideoDataUrlFemale: '' });
                        return;
                      }
                      if (file.size > VIDEO_INLINE_MAX_BYTES) {
                        window.alert('Video must be 8 MB or smaller for inline storage. Use a URL instead.');
                        ev.target.value = '';
                        return;
                      }
                      const reader = new FileReader();
                      reader.onload = () =>
                        onChange({
                          ...e,
                          officialVideoDataUrlFemale:
                            typeof reader.result === 'string' ? reader.result : '',
                        });
                      reader.readAsDataURL(file);
                    }}
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">
                  {ui('SectionExercise_ReferenceUrl1')}
                </label>
                <input
                  type="url"
                  value={e.referenceUrl1 || ''}
                  onChange={(ev) => onChange({ ...e, referenceUrl1: ev.target.value })}
                  className="mb-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  placeholder={ui('SectionExercise_ReferencePlaceholder1')}
                />
                <label className="mb-1 block text-xs font-semibold text-gray-600">
                  {ui('SectionExercise_ReferenceUrl2')}
                </label>
                <input
                  type="url"
                  value={e.referenceUrl2 || ''}
                  onChange={(ev) => onChange({ ...e, referenceUrl2: ev.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  placeholder={ui('SectionExercise_ReferencePlaceholder2')}
                />
              </div>
            </div>
          </section>

          <ExerciseDetailLabelsPanel
            hideInlineTabButtons
            sectionExerciseUi={ui}
            lowerFormTab={lowerFormTab}
            onLowerFormTabChange={selectLowerFormTab}
            detailLabelTranslating={detailLabelTranslating}
            detailTranslationsReady={detailTranslationsReady}
            manualEditLocalesRef={manualEditLocalesRef}
            getDetailRichValue={getDetailRichValue}
            setDetailRichValue={setDetailRichValue}
            onTranslate={handleDetailLabelTranslate}
            onSaveBanner={handleDetailLabelSaveBanner}
            onScrollManual={scrollToManualLocales}
            multimediaSlot={
              <div className="space-y-3 rounded-lg border border-dashed border-gray-300 bg-gray-50/80 p-4 text-sm text-gray-700">
                <p>{ui('SectionExercise_MultimediaIntro')}</p>
                <button
                  type="button"
                  onClick={() => scrollToSection('ex-sec-label1-media')}
                  className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
                >
                  {ui('SectionExercise_MultimediaJumpButton')}
                </button>
                <p className="text-xs text-gray-600">{ui('SectionExercise_MultimediaFootnote')}</p>
              </div>
            }
            equipmentSlot={
              <div className="space-y-3">
                <p className="text-sm text-gray-700">{ui('SectionExercise_EquipmentIntro')}</p>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setMachinesModalOpen(true)}
                    className="rounded-lg bg-violet-700 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-800"
                  >
                    {ui('SectionExercise_EquipmentSelectMachines')}
                  </button>
                  <span className="text-sm font-semibold text-violet-900">
                    {ui('SectionExercise_EquipmentSelectedCount')} ({(e.usualSportMachineIds || []).length})
                  </span>
                </div>
              </div>
            }
            pathologiesSlot={
              <div className="space-y-4">
                <div className="rounded-lg border border-rose-200 bg-rose-50/60 p-3 text-sm text-gray-800">
                  <p className="font-semibold text-rose-950">{ui('SectionExercise_PathologiesBannerTitle')}</p>
                  <p className="mt-1 text-xs leading-relaxed text-gray-700">
                    {ui('SectionExercise_PathologiesBannerBody')}
                  </p>
                </div>
                <div>
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
                          onClick={selectAllPathologyTags}
                          className="rounded border border-gray-300 bg-white px-2 py-1 text-xs font-semibold hover:bg-gray-50"
                        >
                          {ui('SectionExercise_CheckAll')}
                        </button>
                        <button
                          type="button"
                          onClick={clearPathologyTags}
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
                            {(p.name || '').trim() || p.id}
                          </option>
                        ))}
                      </select>
                    </>
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-800">
                    {ui('SectionExercise_PathologiesNotesLabel')}
                  </label>
                  <p className="mb-2 text-xs text-gray-600">{ui('SectionExercise_PathologiesNotesHelp')}</p>
                  <textarea
                    value={e.contraindicatedPathologiesNote || ''}
                    onChange={(ev) => onChange({ ...e, contraindicatedPathologiesNote: ev.target.value })}
                    rows={6}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    placeholder={ui('SectionExercise_PathologiesNotesPlaceholder')}
                  />
                </div>
              </div>
            }
            exerciseFaqs={exerciseFaqs}
            onOpenFaqCreate={openFaqCreate}
            onOpenFaqEdit={openFaqEdit}
            removeFaqAt={removeFaqAt}
            moveFaq={moveFaq}
          />

          <section id="ex-sec-label6" className="space-y-4">
            <div className="rounded-lg border-l-4 border-indigo-700 bg-gradient-to-r from-indigo-50/95 to-slate-50/90 p-4 shadow-sm">
              <h4 className="text-xs font-bold uppercase tracking-wide text-indigo-900">{ui('SectionExercise_Label6Tag')}</h4>
              <p className="mt-1.5 text-base font-bold text-gray-900">{ui('SectionExercise_Label6Title')}</p>
              <p className="mt-2 text-sm leading-relaxed text-gray-700">{ui('SectionExercise_Label6Intro')}</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-800">
                <li>{ui('SectionExercise_Label6Bullet1')}</li>
                <li>{ui('SectionExercise_Label6Bullet2')}</li>
              </ul>
              <p className="mt-2 text-xs text-gray-600">{ui('SectionExercise_Label6Footnote')}</p>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2 text-sm text-amber-950">
              {ui('SectionExercise_MusclesTotal')} <span className="font-bold tabular-nums">{musclePercentSum}%</span>
              {musclePercentSum !== 100 ? (
                <span className="ml-2 text-red-700">{ui('SectionExercise_MusclesAdjust')}</span>
              ) : (
                <span className="ml-2 text-green-700">{ui('SectionExercise_MusclesOkMark')}</span>
              )}
            </div>
            <div className="space-y-3">
              {muscleTags.map((row, idx) => {
                const takenElsewhere = new Set(
                  muscleTags
                    .filter((t, j) => j !== idx && (t.area || '').trim())
                    .map((t) => t.area.trim())
                );
                const areaOptions = SECTION_EXERCISE_MUSCLE_GROUPS.filter(
                  (a) => !takenElsewhere.has(a) || a === row.area
                );
                if (row.isMain) {
                  return (
                    <div
                      key={`muscle-main-${idx}`}
                      className="flex flex-wrap items-end gap-3 rounded-lg border-2 border-blue-200 bg-blue-50/50 p-3"
                    >
                      <div className="min-w-[10rem] flex-1">
                        <label className="mb-1 block text-xs font-semibold text-gray-600">
                          {ui('SectionExercise_MusclesMainRowLabel')}
                        </label>
                        <select
                          value={row.area}
                          onChange={(ev) => {
                            const area = ev.target.value;
                            commitMuscleTags(
                              muscleTags.map((t, j) => (j === idx ? { ...t, area } : t))
                            );
                          }}
                          className="w-full rounded-md border border-gray-300 bg-white px-2 py-2 text-sm"
                        >
                          <option value="">— Select —</option>
                          {areaOptions.map((m) => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="w-24">
                        <label className="mb-1 block text-xs font-semibold text-gray-600">
                          {ui('SectionExercise_MusclesPercentLabel')}
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={row.percent || ''}
                          onChange={(ev) => {
                            const v = Math.max(0, Math.min(100, Math.round(parseInt(ev.target.value, 10) || 0)));
                            commitMuscleTags(muscleTags.map((t, j) => (j === idx ? { ...t, percent: v } : t)));
                          }}
                          className="w-full rounded-md border border-gray-300 bg-white px-2 py-2 text-sm tabular-nums"
                        />
                      </div>
                      <span className="mb-2 rounded bg-blue-600 px-2 py-1 text-xs font-bold uppercase text-white">
                        {ui('SectionExercise_MusclesMainBadge')}
                      </span>
                    </div>
                  );
                }
                return (
                  <div
                    key={`muscle-other-${idx}`}
                    className="flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3"
                  >
                    <div className="min-w-[10rem] flex-1">
                      <label className="mb-1 block text-xs font-semibold text-gray-600">
                        {ui('SectionExercise_MusclesTaggedRowLabel')}
                      </label>
                      <select
                        value={row.area}
                        onChange={(ev) => {
                          const area = ev.target.value;
                          commitMuscleTags(muscleTags.map((t, j) => (j === idx ? { ...t, area } : t)));
                        }}
                        className="w-full rounded-md border border-gray-300 bg-white px-2 py-2 text-sm"
                      >
                        <option value="">— Select —</option>
                        {areaOptions.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="w-24">
                      <label className="mb-1 block text-xs font-semibold text-gray-600">
                        {ui('SectionExercise_MusclesPercentLabel')}
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={row.percent || ''}
                        onChange={(ev) => {
                          const v = Math.max(0, Math.min(100, Math.round(parseInt(ev.target.value, 10) || 0)));
                          commitMuscleTags(muscleTags.map((t, j) => (j === idx ? { ...t, percent: v } : t)));
                        }}
                        className="w-full rounded-md border border-gray-300 bg-white px-2 py-2 text-sm tabular-nums"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => commitMuscleTags(muscleTags.filter((_, j) => j !== idx))}
                      className="mb-2 rounded border border-red-300 bg-white px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50"
                    >
                      {ui('SectionExercise_MusclesRemove')}
                    </button>
                  </div>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() =>
                commitMuscleTags([...muscleTags, { area: '', percent: 0, isMain: false }])
              }
              className="rounded-lg border border-dashed border-gray-400 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              {ui('SectionExercise_MusclesAddRow')}
            </button>
          </section>

          <section id="ex-sec-more">
            <h4 className="text-sm font-bold uppercase tracking-wide text-blue-700 mb-2">{ui('SectionExercise_MoreTitle')}</h4>
            <p className="mb-2 text-xs text-gray-600">{ui('SectionExercise_MoreHelp')}</p>
            <textarea
              value={e.description}
              onChange={(ev) => onChange({ ...e, description: ev.target.value })}
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
              placeholder={ui('SectionExercise_MorePlaceholder')}
            />
          </section>

          <section className="rounded-lg border border-amber-200 bg-amber-50/60 px-4 py-3">
            <h4 className="text-sm font-bold uppercase tracking-wide text-amber-900">
              {ui('SectionExercise_DeleteGuardTitle')}
            </h4>
            <p className="mt-1 text-xs text-gray-700">{ui('SectionExercise_DeleteGuardHelp')}</p>
            <input
              type="password"
              autoComplete="new-password"
              value={e.deleteGuardPassword || ''}
              onChange={(ev) => onChange({ ...e, deleteGuardPassword: ev.target.value })}
              className="mt-2 w-full max-w-md rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder={ui('SectionExercise_DeleteGuardPlaceholder')}
            />
          </section>
        </div>

        <div className="mt-6 flex flex-shrink-0 flex-wrap gap-3 border-t border-gray-200 pt-4">
          <button
            type="button"
            onClick={onSave}
            className="flex-1 min-w-[8rem] rounded-lg bg-red-600 px-6 py-3 font-semibold text-white shadow-sm hover:bg-red-700"
          >
            {e.id ? ui('SectionExercise_BtnSave') : ui('SectionExercise_BtnAdd')}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 min-w-[8rem] rounded-lg bg-slate-800 px-6 py-3 font-semibold text-white hover:bg-slate-900"
          >
            {ui('SectionExercise_BtnCancel')}
          </button>
        </div>

        <ExerciseMachinesUsuallyUsedModal
          open={machinesModalOpen}
          initialSelectedIds={e.usualSportMachineIds || []}
          onClose={() => setMachinesModalOpen(false)}
          onSave={(ids) => onChange({ ...e, usualSportMachineIds: ids })}
        />

        {faqEditor ? (
          <ExerciseFaqEditorModal
            open
            mode={faqEditor.mode}
            initialFaq={faqEditor.faq}
            onSave={handleFaqEditorSave}
            onCancel={() => setFaqEditor(null)}
          />
        ) : null}

        {nameLanguagesModalOpen ? (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4" role="dialog">
            <div className="flex max-h-[min(88vh,800px)] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
              <div className="flex shrink-0 items-center justify-between border-b bg-slate-800 px-4 py-3 text-white">
                <span className="text-sm font-bold">{ui('SectionExercise_NameModalTitle')}</span>
                <button
                  type="button"
                  onClick={() => setNameLanguagesModalOpen(false)}
                  className="rounded p-1 hover:bg-white/10"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
                <p className="text-xs text-gray-600">{ui('SectionExercise_NameModalHint')}</p>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <div key={`name-all-${lang.code}`}>
                      <label className="mb-1 flex items-center gap-2 text-xs font-semibold text-gray-700">
                        <span aria-hidden>{languageFlagEmoji(lang.code)}</span>
                        {lang.code.toUpperCase()} — {lang.name}
                      </label>
                      <textarea
                        value={getNameForLang(lang.code)}
                        onChange={(ev) => setNameForLang(lang.code, ev.target.value)}
                        rows={lang.code === 'en' ? 3 : 2}
                        className="w-full resize-y rounded-lg border border-gray-300 px-3 py-2.5 text-sm leading-snug min-h-[2.75rem]"
                        placeholder={
                          lang.code === 'en'
                            ? ui('SectionExercise_NameModalPlaceholderEn')
                            : `${ui('SectionExercise_NameModalPlaceholderLang')} (${lang.code})`
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex shrink-0 justify-end gap-2 border-t border-gray-200 bg-gray-50 px-4 py-3">
                <button
                  type="button"
                  onClick={() => setNameLanguagesModalOpen(false)}
                  className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-900"
                >
                  {ui('SectionExercise_NameModalDone')}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

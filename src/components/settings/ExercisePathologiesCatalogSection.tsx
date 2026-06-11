'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { ChevronDown, ChevronUp, Globe, Pencil, Plus, Trash2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { resolvePublicMediaUrl } from '@/lib/publicMediaUrl';
import {
  SUPPORTED_LANGUAGES,
  getPathologyDescriptionForLang,
  getPathologyNameForLang,
  normalizePathologyCatalogItem,
  supportedLanguagesPeriodAdminOrder,
  type ExercisePathologyCatalogItem,
} from '@/constants/tools.constants';

type Props = {
  pathologies: ExercisePathologyCatalogItem[];
  setPathologies: React.Dispatch<React.SetStateAction<ExercisePathologyCatalogItem[]>>;
};

const TARGET_LANG_CODES = SUPPORTED_LANGUAGES.filter((l) => l.code !== 'en').map((l) => l.code);
const NAME_MAX = 30;
const DESC_MAX = 255;

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

function newPathologyId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `path-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
}

function clonePathology(item: ExercisePathologyCatalogItem): ExercisePathologyCatalogItem {
  return {
    ...item,
    nameByLanguage: { ...(item.nameByLanguage || {}) },
    descriptionByLanguage: { ...(item.descriptionByLanguage || {}) },
  };
}

function PathologyPicturePreview({ src, alt }: { src: string; alt: string }) {
  const resolved = resolvePublicMediaUrl(src) || src;
  return (
    <Image
      src={resolved}
      alt={alt}
      width={56}
      height={56}
      className="h-14 w-14 rounded-lg border border-gray-200 object-cover"
      unoptimized
    />
  );
}

function PathologyEntryModal({
  mode,
  initial,
  order,
  onSave,
  onCancel,
}: {
  mode: 'create' | 'edit';
  initial: ExercisePathologyCatalogItem;
  order: number;
  onSave: (item: ExercisePathologyCatalogItem) => void;
  onCancel: () => void;
}) {
  const translationLanguages = useMemo(() => supportedLanguagesPeriodAdminOrder(), []);
  const [draft, setDraft] = useState(() => clonePathology(initial));
  const [translatingField, setTranslatingField] = useState<'name' | 'description' | null>(null);

  useEffect(() => {
    setDraft(clonePathology(initial));
    setTranslatingField(null);
  }, [initial]);

  const getName = (code: string) => {
    if (code === 'en') return draft.nameByLanguage?.en ?? draft.name ?? '';
    return (draft.nameByLanguage || {})[code] ?? '';
  };

  const getDescription = (code: string) => {
    if (code === 'en') return draft.descriptionByLanguage?.en ?? draft.description ?? '';
    return (draft.descriptionByLanguage || {})[code] ?? '';
  };

  const setName = (code: string, value: string) => {
    const trimmed = value.slice(0, NAME_MAX);
    setDraft((d) => {
      const nameByLanguage = { ...(d.nameByLanguage || {}), [code]: trimmed };
      return {
        ...d,
        name: code === 'en' ? trimmed : d.name,
        nameByLanguage,
      };
    });
  };

  const setDescription = (code: string, value: string) => {
    const trimmed = value.slice(0, DESC_MAX);
    setDraft((d) => {
      const descriptionByLanguage = { ...(d.descriptionByLanguage || {}), [code]: trimmed };
      return {
        ...d,
        description: code === 'en' ? trimmed : d.description,
        descriptionByLanguage,
      };
    });
  };

  const applyTranslations = (
    field: 'name' | 'description',
    en: string,
    translations: Record<string, string>
  ) => {
    const record: Record<string, string> = { en };
    for (const code of TARGET_LANG_CODES) {
      const raw = translations[code];
      if (typeof raw === 'string' && raw.trim()) {
        record[code] = field === 'name' ? raw.trim().slice(0, NAME_MAX) : raw.trim().slice(0, DESC_MAX);
      }
    }
    if (Object.keys(record).length <= 1) {
      throw new Error('No translated values were returned by the translation service.');
    }
    setDraft((d) => {
      if (field === 'name') {
        return { ...d, name: en, nameByLanguage: { ...(d.nameByLanguage || {}), ...record } };
      }
      return {
        ...d,
        description: en,
        descriptionByLanguage: { ...(d.descriptionByLanguage || {}), ...record },
      };
    });
  };

  const handleTranslate = async (field: 'name' | 'description') => {
    const en = (field === 'name' ? getName('en') : getDescription('en')).trim();
    if (!en) {
      window.alert(
        field === 'name'
          ? 'Enter English pathology name first, then press Translation.'
          : 'Enter English description first, then press Translation.'
      );
      return;
    }
    setTranslatingField(field);
    try {
      const translations = await fetchLabelTranslations(en);
      applyTranslations(field, en, translations);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      window.alert(
        `Translation failed.\n\n${msg}\n\nYou can edit other languages manually. Same API as Settings → Language → Long texts.`
      );
    } finally {
      setTranslatingField(null);
    }
  };

  const handleSave = () => {
    const normalized = normalizePathologyCatalogItem({ ...draft, order }, order);
    if (!normalized.name.trim()) {
      window.alert('English pathology name is required.');
      return;
    }
    onSave(normalized);
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl sm:p-8">
        <h3 className="mb-6 text-2xl font-bold text-gray-900">
          {mode === 'create' ? 'Add pathology tag' : 'Edit pathology tag'}
        </h3>

        <div className="mb-6 rounded-lg border-2 border-blue-300 bg-blue-50 p-3">
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 shrink-0 text-blue-700" aria-hidden />
            <span className="text-sm font-semibold text-blue-900">
              Edit in all languages simultaneously — changes save to all language fields at once!
            </span>
          </div>
        </div>

        <div className="mb-6 space-y-4">
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Picture <span className="font-normal text-gray-500">(same for all languages)</span>
            </label>
            <div className="flex items-center gap-3">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onloadend = () => {
                    setDraft((d) => ({ ...d, picture: (reader.result as string) || '' }));
                  };
                  reader.readAsDataURL(file);
                }}
                className="flex-1 cursor-pointer rounded-lg border border-gray-300 px-4 py-2 text-sm file:mr-4 file:cursor-pointer file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {draft.picture ? (
                <PathologyPicturePreview src={draft.picture} alt="Pathology preview" />
              ) : null}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <h4 className="border-b pb-2 text-lg font-semibold text-gray-800">Translations</h4>

          {translationLanguages.map((lang) => (
            <div key={lang.code} className="rounded-lg border-2 border-gray-200 bg-gray-50 p-4">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-gradient-to-r from-indigo-500 to-purple-500 px-3 py-1 text-sm font-bold text-white">
                  {lang.code.toUpperCase()}
                </span>
                <span className="text-sm font-medium text-gray-700">{lang.name}</span>
                {lang.code === 'en' ? (
                  <div className="ml-auto flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={translatingField !== null}
                      onClick={() => void handleTranslate('name')}
                      className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {translatingField === 'name' ? 'Translating…' : 'Translation (name)'}
                    </button>
                    <button
                      type="button"
                      disabled={translatingField !== null}
                      onClick={() => void handleTranslate('description')}
                      className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {translatingField === 'description' ? 'Translating…' : 'Translation (description)'}
                    </button>
                  </div>
                ) : null}
              </div>

              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-600">
                    Name of the pathology <span className="font-normal text-gray-400">(max {NAME_MAX} chars)</span>
                  </label>
                  <input
                    type="text"
                    value={getName(lang.code)}
                    onChange={(ev) => setName(lang.code, ev.target.value)}
                    placeholder={`Enter ${lang.name} name…`}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    maxLength={NAME_MAX}
                  />
                  <div className="mt-0.5 text-xs text-gray-400">{getName(lang.code).length}/{NAME_MAX}</div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-600">
                    Description <span className="font-normal text-gray-400">(max {DESC_MAX} chars)</span>
                  </label>
                  <textarea
                    value={getDescription(lang.code)}
                    onChange={(ev) => setDescription(lang.code, ev.target.value)}
                    placeholder={`Enter ${lang.name} description…`}
                    rows={2}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    maxLength={DESC_MAX}
                  />
                  <div className="mt-0.5 text-xs text-gray-400">
                    {getDescription(lang.code).length}/{DESC_MAX}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 flex gap-3">
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 rounded-lg bg-rose-600 px-6 py-3 font-semibold text-white transition hover:bg-rose-700"
          >
            Save
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-lg bg-gray-200 px-6 py-3 font-semibold text-gray-700 transition hover:bg-gray-300"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ExercisePathologiesCatalogSection({ pathologies, setPathologies }: Props) {
  const { currentLanguage } = useLanguage();
  const uiLang = (currentLanguage || 'en').toLowerCase().split('-')[0];
  const sorted = [...pathologies].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const [editor, setEditor] = useState<null | { mode: 'create' | 'edit'; item: ExercisePathologyCatalogItem }>(
    null
  );

  const reorder = (from: number, to: number) => {
    if (to < 0 || to >= sorted.length) return;
    const copy = [...sorted];
    const [row] = copy.splice(from, 1);
    copy.splice(to, 0, row);
    setPathologies(copy.map((p, i) => ({ ...p, order: i })));
  };

  const openCreate = () => {
    setEditor({
      mode: 'create',
      item: normalizePathologyCatalogItem(
        { id: newPathologyId(), name: '', nameByLanguage: {}, description: '', descriptionByLanguage: {} },
        sorted.length
      ),
    });
  };

  const openEdit = (item: ExercisePathologyCatalogItem) => {
    setEditor({ mode: 'edit', item: clonePathology(item) });
  };

  const handleEditorSave = (saved: ExercisePathologyCatalogItem) => {
    setPathologies((prev) => {
      const idx = prev.findIndex((p) => p.id === saved.id);
      if (idx >= 0) {
        const next = prev.map((p) => (p.id === saved.id ? saved : p));
        return next.map((p, i) => ({ ...p, order: i }));
      }
      const next = [...prev, saved];
      return next.map((p, i) => ({ ...p, order: i }));
    });
    setEditor(null);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-rose-200 bg-gradient-to-r from-rose-50 to-white p-6 shadow-sm">
        <h3 className="text-lg font-bold text-gray-900">Pathologies (contraindications catalog)</h3>
        <p className="mt-2 text-sm text-gray-700">
          Same layout as <span className="font-semibold">Common Daily Actions</span>: one picture per tag, name and
          description in every supported language. In{' '}
          <span className="font-semibold">Technical Settings → Exercise Bank</span>, exercises multi-tag these entries.
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-sm font-bold uppercase tracking-wide text-rose-800">Catalog entries</h4>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Add
          </button>
        </div>

        {sorted.length === 0 ? (
          <p className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center text-sm text-gray-600">
            No pathology tags yet. Press <span className="font-semibold">Add</span> to create the first one.
          </p>
        ) : (
          <ul className="m-0 list-none space-y-2 p-0">
            {sorted.map((row, idx) => {
              const displayName = getPathologyNameForLang(row, uiLang) || '—';
              const displayDesc = getPathologyDescriptionForLang(row, uiLang);
              return (
                <li
                  key={row.id}
                  className="flex flex-col gap-2 rounded-lg border border-gray-100 bg-gray-50/80 p-3 sm:flex-row sm:items-start"
                >
                  <span className="shrink-0 text-xs font-bold text-gray-500 sm:pt-1">#{idx + 1}</span>
                  <div className="min-w-0 flex-1">
                    {row.picture ? (
                      <div className="mb-2">
                        <PathologyPicturePreview src={row.picture} alt={displayName} />
                      </div>
                    ) : null}
                    <p className="text-sm font-semibold text-gray-900 break-words">{displayName}</p>
                    {displayDesc ? (
                      <p className="mt-1 line-clamp-2 text-sm text-gray-600">{displayDesc}</p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-1 sm:pt-0.5">
                    <button
                      type="button"
                      title="Edit"
                      onClick={() => openEdit(row)}
                      className="inline-flex items-center gap-1 rounded border border-rose-300 bg-white px-2 py-2 text-xs font-semibold text-rose-800 hover:bg-rose-50"
                    >
                      <Pencil className="h-4 w-4" aria-hidden />
                      Edit
                    </button>
                    <button
                      type="button"
                      title="Move up"
                      disabled={idx === 0}
                      onClick={() => reorder(idx, idx - 1)}
                      className="rounded border border-gray-300 bg-white p-2 hover:bg-gray-50 disabled:opacity-40"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      title="Move down"
                      disabled={idx === sorted.length - 1}
                      onClick={() => reorder(idx, idx + 1)}
                      className="rounded border border-gray-300 bg-white p-2 hover:bg-gray-50 disabled:opacity-40"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      title="Delete"
                      onClick={() =>
                        setPathologies((prev) => {
                          const next = prev.filter((p) => p.id !== row.id);
                          return next.map((p, i) => ({ ...p, order: i }));
                        })
                      }
                      className="rounded border border-red-200 bg-white p-2 text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {editor ? (
        <PathologyEntryModal
          mode={editor.mode}
          initial={editor.item}
          order={editor.mode === 'create' ? sorted.length : (sorted.find((p) => p.id === editor.item.id)?.order ?? 0)}
          onSave={handleEditorSave}
          onCancel={() => setEditor(null)}
        />
      ) : null}
    </div>
  );
}

'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { Edit2, Trash2, ChefHat } from 'lucide-react';
import RichTextEditor from '@/components/settings/RichTextEditor';
import { FLAG_FILES, ITEMS_PER_PAGE } from '@/constants/language.constants';
import { SUPPORTED_LANGUAGES } from '@/constants/tools.constants';
import { getAuthHeaders, getJsonAuthHeaders } from '@/utils/auth.utils';
import {
  parseTranslations,
  resolveLocalizedLabel,
  TranslationMap,
} from '@/lib/foodDatabaseTranslations';
import {
  hasRichTextContent,
  plainTextToRichHtml,
  richTextToPlainText,
} from '@/utils/richTextTranslation';

export interface RecipeInstructionRow {
  id: string;
  legacyId: number | null;
  name: string;
  nameTranslations?: string | null;
  sectionId: string;
  section: { id: string; name: string; nameTranslations?: string | null };
  preparationTranslations?: string | null;
  description?: string | null;
}

interface AdminRecipeInstructionsPanelProps {
  sections: { id: string; name: string; nameTranslations?: string | null }[];
  displayLanguage?: string;
  onMessage?: (type: 'ok' | 'err', text: string) => void;
  /** When set, open the rich-text editor for this recipe once loaded. */
  openRecipeId?: string | null;
  /** Bumped to re-open the editor for the same recipe (e.g. from Edit Recipe modal). */
  openNonce?: number;
  onOpenRecipeHandled?: () => void;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function flagSrc(code: string): string {
  const file = FLAG_FILES[code] || `${code}.png`;
  return `/flags/${file}`;
}

export default function AdminRecipeInstructionsPanel({
  sections,
  displayLanguage = 'en',
  onMessage,
  openRecipeId = null,
  openNonce = 0,
  onOpenRecipeHandled,
}: AdminRecipeInstructionsPanelProps) {
  const [recipes, setRecipes] = useState<RecipeInstructionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sectionFilter, setSectionFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<'list' | 'editor'>('list');
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeInstructionRow | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [englishText, setEnglishText] = useState('');
  const [translations, setTranslations] = useState<TranslationMap>({});
  const [translateReady, setTranslateReady] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadRecipes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/food-database/recipes', { headers: getAuthHeaders() });
      const data = await res.json();
      if (res.ok) setRecipes(data.recipes || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRecipes();
  }, [loadRecipes]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return recipes.filter((r) => {
      if (sectionFilter !== 'all' && r.sectionId !== sectionFilter) return false;
      if (!q) return true;
      const prep = parseTranslations(r.preparationTranslations);
      const haystack = [
        r.name,
        r.section?.name,
        ...Object.values(prep),
        r.description || '',
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [recipes, searchQuery, sectionFilter]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, sectionFilter]);

  const paginated = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, page]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));

  const openEditor = useCallback((recipe: RecipeInstructionRow, index: number) => {
    const prep = parseTranslations(recipe.preparationTranslations);
    const en = prep.en || recipe.description || '';
    setSelectedRecipe(recipe);
    setSelectedIndex(index);
    setEnglishText(en);
    setTranslations({ ...prep, ...(en ? { en } : {}) });
    setTranslateReady(Object.keys(prep).filter((k) => k !== 'en' && prep[k]?.trim()).length > 0);
    setViewMode('editor');
  }, []);

  useEffect(() => {
    if (!openRecipeId || loading) return;
    const recipe = recipes.find((r) => r.id === openRecipeId);
    if (!recipe) {
      onOpenRecipeHandled?.();
      return;
    }
    const index = recipes.findIndex((r) => r.id === openRecipeId);
    openEditor(recipe, index >= 0 ? index : 0);
    onOpenRecipeHandled?.();
  }, [openRecipeId, openNonce, loading, recipes, onOpenRecipeHandled, openEditor]);

  const handleAutoTranslate = async () => {
    if (!hasRichTextContent(englishText)) {
      alert('Please enter English preparation text first');
      return;
    }

    const plainSource = richTextToPlainText(englishText);
    if (!plainSource) {
      alert('Please enter English preparation text first');
      return;
    }

    setIsTranslating(true);
    setTranslateReady(false);

    try {
      const targetLanguages = SUPPORTED_LANGUAGES.filter((l) => l.code !== 'en').map((l) => l.code);

      const response = await fetch('/api/translate', {
        method: 'POST',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: plainSource, targetLanguages }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Translation API returned ${response.status}: ${errorText.substring(0, 120)}`);
      }

      const data = await response.json();
      if (!data.translations) {
        throw new Error('Invalid translation response — no translations field found');
      }

      const trans = data.translations as Record<string, unknown>;
      const updated: TranslationMap = { ...translations, en: englishText };

      targetLanguages.forEach((lang) => {
        const incoming = trans[lang];
        if (typeof incoming === 'string' && incoming.trim() !== '') {
          updated[lang] = plainTextToRichHtml(incoming);
        } else if (!updated[lang]) {
          updated[lang] = '';
        }
      });

      setTranslations(updated);
      setTranslateReady(true);

      const missingLanguages = targetLanguages.filter((lang) => {
        const v = trans[lang];
        return typeof v !== 'string' || v.trim() === '';
      });
      if (missingLanguages.length > 0) {
        alert(
          `Translation completed with partial results.\n\nMissing: ${missingLanguages.join(', ')}\nYou can fill them manually and Save.`
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      alert(`Translation failed.\n\n${message}\n\nUse Manual Edit to enter text per language.`);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleManualEdit = () => {
    setTranslateReady(true);
  };

  const handleSave = async () => {
    if (!selectedRecipe) return;
    setSaving(true);
    try {
      const merged = { ...translations, en: englishText };
      const res = await fetch(`/api/admin/food-database/recipes/${selectedRecipe.id}`, {
        method: 'PUT',
        headers: getJsonAuthHeaders(),
        body: JSON.stringify({
          preparationTranslations: merged,
          description: stripHtml(englishText) || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Save failed');
      }
      onMessage?.('ok', 'Preparation instructions saved.');
      await loadRecipes();
      setViewMode('list');
      setSelectedRecipe(null);
    } catch (e: unknown) {
      onMessage?.('err', e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteInstructions = async (recipe: RecipeInstructionRow) => {
    if (!confirm(`Clear preparation instructions for "${recipe.name}"?`)) return;
    const res = await fetch(`/api/admin/food-database/recipes/${recipe.id}`, {
      method: 'PUT',
      headers: getJsonAuthHeaders(),
      body: JSON.stringify({ preparationTranslations: {}, description: null }),
    });
    if (res.ok) {
      onMessage?.('ok', 'Instructions cleared.');
      await loadRecipes();
    }
  };

  const localizedName = (r: RecipeInstructionRow) =>
    resolveLocalizedLabel(r.name, r.nameTranslations, displayLanguage);

  const localizedSection = (r: RecipeInstructionRow) =>
    resolveLocalizedLabel(r.section.name, r.section.nameTranslations, displayLanguage);

  if (loading && recipes.length === 0) {
    return <p className="text-sm text-gray-500 py-8">Loading recipe instructions…</p>;
  }

  if (viewMode === 'editor' && selectedRecipe) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4 bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg border border-blue-200">
          <button
            type="button"
            onClick={() => {
              setViewMode('list');
              setSelectedRecipe(null);
            }}
            className="flex items-center gap-2 px-6 py-3 bg-white text-gray-700 font-semibold rounded-lg border-2 border-gray-300 hover:border-gray-400"
          >
            <span className="text-xl">←</span>
            Back to List
          </button>
          <div className="flex-1">
            <div className="text-sm text-gray-600">Editing preparation for:</div>
            <div className="text-lg font-bold text-red-700">{localizedName(selectedRecipe)}</div>
            <div className="text-xs text-gray-500">{localizedSection(selectedRecipe)}</div>
          </div>
        </div>

        <div className="bg-white border border-gray-300 p-6 rounded-lg">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-xl p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg overflow-hidden relative">
                <Image src={flagSrc('en')} alt="English" fill sizes="32px" className="object-cover" />
              </div>
              <div>
                <h4 className="font-bold text-gray-900 text-lg">English (Source)</h4>
                <p className="text-sm text-gray-600">
                  Enter preparation steps in English — same workflow as Language Long Texts
                </p>
              </div>
            </div>

            <RichTextEditor
              value={englishText}
              onChange={(v) => {
                setEnglishText(v);
                setTranslations((prev) => ({ ...prev, en: v }));
              }}
              placeholder="Type preparation instructions here…"
              minHeight="200px"
              language="English"
            />

            <div className="flex flex-wrap gap-3 mt-4">
              <button
                type="button"
                onClick={handleAutoTranslate}
                disabled={isTranslating || !hasRichTextContent(englishText)}
                className="px-8 py-3 font-bold rounded border-2 border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isTranslating ? 'Translating…' : 'Translate'}
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="px-8 py-3 font-bold rounded border-2 border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button
                type="button"
                onClick={handleManualEdit}
                className="px-8 py-3 font-bold rounded border-2 border-gray-300 bg-white hover:bg-gray-50"
              >
                Manual Edit
              </button>
            </div>
          </div>

          {translateReady && (
            <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded mb-6">
              <p className="text-sm text-green-900 font-semibold">
                Translations ready! Review and edit if needed.
              </p>
            </div>
          )}

          <div className="space-y-6">
            {SUPPORTED_LANGUAGES.filter((l) => l.code !== 'en').map((lang) => (
              <div key={lang.code} className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gradient-to-r from-gray-100 to-gray-200 px-6 py-3 flex items-center gap-3 border-b">
                  <div className="w-6 h-6 rounded overflow-hidden relative">
                    <Image
                      src={flagSrc(lang.code)}
                      alt={lang.name}
                      fill
                      sizes="24px"
                      className="object-cover"
                    />
                  </div>
                  <span className="font-bold text-gray-900 text-lg">{lang.name}</span>
                </div>
                <div className="p-4 bg-white">
                  <RichTextEditor
                    value={translations[lang.code] || ''}
                    onChange={(v) => setTranslations((prev) => ({ ...prev, [lang.code]: v }))}
                    placeholder={`${lang.name} translation…`}
                    minHeight="150px"
                    language={lang.name}
                  />
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="bg-[#c0392b] text-white font-semibold px-8 py-2 rounded-sm disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save all languages'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-gray-300 p-4 rounded">
        <div className="flex items-center gap-3">
          <ChefHat className="w-6 h-6 text-gray-700" />
          <h3 className="text-lg font-bold text-gray-900">Recipe Preparation Instructions</h3>
        </div>
        <p className="text-xs text-gray-500">Long-text editor — same criteria as Language Long Texts</p>
      </div>

      <div className="bg-white border border-gray-300 p-4 rounded">
        <div className="flex flex-wrap items-center gap-4">
          <label className="font-semibold text-gray-700 whitespace-nowrap">Search Instructions:</label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by recipe name or content…"
            className="flex-1 min-w-[200px] px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="px-4 py-2 bg-gray-500 text-white font-semibold rounded hover:bg-gray-600"
            >
              Clear
            </button>
          )}
          <div className="text-sm text-gray-600">
            Found: <span className="font-bold">{filtered.length}</span> recipe
            {filtered.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setSectionFilter('all')}
          className={`px-4 py-2 font-semibold text-sm transition ${
            sectionFilter === 'all' ? 'bg-gray-700 text-white' : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
          }`}
        >
          All sections
        </button>
        {sections.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSectionFilter(s.id)}
            className={`px-4 py-2 font-semibold text-sm transition ${
              sectionFilter === s.id ? 'bg-gray-700 text-white' : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
            }`}
          >
            {resolveLocalizedLabel(s.name, s.nameTranslations, displayLanguage)}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white border border-gray-300 p-12 text-center rounded-lg">
          <div className="text-6xl mb-4">📝</div>
          <h3 className="text-xl font-bold text-gray-700 mb-2">No Recipe Instructions Found</h3>
          <p className="text-gray-600">
            {searchQuery
              ? 'No recipes match your search.'
              : 'Add recipes in the Recipes tab, then enter preparation steps here.'}
          </p>
        </div>
      ) : (
        <>
          {filtered.length > ITEMS_PER_PAGE && (
            <div className="flex items-center justify-between bg-white border border-gray-300 p-4 rounded-lg text-sm">
              <span>
                Showing {(page - 1) * ITEMS_PER_PAGE + 1} to{' '}
                {Math.min(page * ITEMS_PER_PAGE, filtered.length)} of {filtered.length}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="px-4 py-2 bg-gray-600 text-white rounded disabled:bg-gray-300"
                >
                  ← Previous
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-4 py-2 bg-gray-600 text-white rounded disabled:bg-gray-300"
                >
                  Next →
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4">
            {paginated.map((recipe, i) => {
              const globalIndex = (page - 1) * ITEMS_PER_PAGE + i;
              const prep = parseTranslations(recipe.preparationTranslations);
              const raw = prep.en || recipe.description || Object.values(prep)[0] || '';
              const preview =
                stripHtml(raw).length > 150 ? `${stripHtml(raw).substring(0, 150)}…` : stripHtml(raw);
              const langCount = Object.values(prep).filter((v) => v?.trim()).length;

              return (
                <div
                  key={recipe.id}
                  className="bg-white border-2 border-gray-200 rounded-lg p-5 hover:border-blue-400 hover:shadow-lg transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">📝</span>
                        <h3 className="text-lg font-bold text-red-700 truncate">{localizedName(recipe)}</h3>
                      </div>
                      <p className="text-sm text-gray-700 mb-3 leading-relaxed">
                        {preview || (
                          <span className="italic text-gray-400">No preparation text yet</span>
                        )}
                      </p>
                      <div className="flex flex-wrap items-center gap-3 text-xs">
                        <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 font-medium">
                          🌍 {langCount} language{langCount !== 1 ? 's' : ''}
                        </span>
                        <span className="px-3 py-1 rounded-full bg-purple-100 text-purple-700 font-medium">
                          📂 {localizedSection(recipe)}
                        </span>
                        <span className="text-gray-500">
                          #{globalIndex + 1} of {filtered.length}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => openEditor(recipe, globalIndex)}
                        className="inline-flex items-center justify-center gap-1 px-6 py-2 rounded-lg bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700"
                      >
                        <Edit2 className="w-4 h-4" />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteInstructions(recipe)}
                        className="inline-flex items-center justify-center gap-1 px-6 py-2 rounded-lg bg-red-600 text-white font-semibold text-sm hover:bg-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

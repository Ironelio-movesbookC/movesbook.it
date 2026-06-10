'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronDown,
  Eye,
  Edit2,
  Trash2,
  List,
  Languages,
  ChefHat,
  Upload,
  Database,
  Plus,
  X,
  Image as ImageIcon,
} from 'lucide-react';
import { getAuthHeaders, getJsonAuthHeaders } from '@/utils/auth.utils';
import DietBuilderNutrientGrid from '@/components/nutrition/modals/DietBuilderNutrientGrid';
import AdminEditFoodForm, { FoodEditItem } from '@/components/admin/AdminEditFoodForm';
import AdminEditRecipeForm, { RecipeEditItem, recipeToSavePayload } from '@/components/admin/AdminEditRecipeForm';
import AdminRecipeInstructionsPanel from '@/components/admin/AdminRecipeInstructionsPanel';
import AdminFoodTranslationsModal from '@/components/admin/AdminFoodTranslationsModal';
import {
  buildTranslationsFromEnglish,
  FOOD_LANG_FLAGS,
  getSupportedFoodLanguages,
  parseTranslations,
  resolveLocalizedLabel,
  TranslationMap,
} from '@/lib/foodDatabaseTranslations';
import Image from 'next/image';
import { dbRowToNutrients } from '@/lib/foodDatabase.types';
import { NUTRIENT_DISPLAY_COLUMNS } from '@/utils/nutritionMealTotals';

interface FoodSection {
  id: string;
  legacyId: number | null;
  name: string;
  nameTranslations?: string | null;
  displayOrder: number;
  _count?: { foods: number; recipes: number };
}

interface FoodItem {
  id: string;
  legacyId: number | null;
  sectionId: string;
  name: string;
  isLiquid: boolean;
  calories: number;
  proteins: number;
  carbohydrates: number;
  fats: number;
  fiber: number;
  section: { id: string; name: string; legacyId: number | null };
  [key: string]: unknown;
}

interface FoodRecipe {
  id: string;
  legacyId: number | null;
  name: string;
  description: string | null;
  nameTranslations?: string | null;
  preparationTranslations?: string | null;
  sectionId: string;
  section: { id: string; name: string };
  components: { name: string; grams: number }[];
  calories: number;
  proteins: number;
  carbohydrates: number;
  fats: number;
}

type TabId = 'foods' | 'recipes' | 'instructions';

function fmt(n: number) {
  return n % 1 === 0 ? n.toFixed(0) : n.toFixed(2);
}

interface AdminFoodDatabasePanelProps {
  /** When true, omit duplicate System Dashboard header (used inside global-settings). */
  embedded?: boolean;
}

export default function AdminFoodDatabasePanel({ embedded = false }: AdminFoodDatabasePanelProps) {
  const [tab, setTab] = useState<TabId>('foods');
  const [sections, setSections] = useState<FoodSection[]>([]);
  const [items, setItems] = useState<FoodItem[]>([]);
  const [recipes, setRecipes] = useState<FoodRecipe[]>([]);
  const [sectionFilter, setSectionFilter] = useState('all');
  const [activeSectionFilter, setActiveSectionFilter] = useState('all');
  const [language, setLanguage] = useState('en');
  const [displayLanguage, setDisplayLanguage] = useState('en');
  const [showImages, setShowImages] = useState(false);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [viewItem, setViewItem] = useState<FoodItem | null>(null);
  const [editItem, setEditItem] = useState<FoodEditItem | null>(null);
  const [editRecipe, setEditRecipe] = useState<RecipeEditItem | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [savingRecipe, setSavingRecipe] = useState(false);
  const [foodLangTarget, setFoodLangTarget] = useState<FoodItem | null>(null);
  const [savingLang, setSavingLang] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadSections = useCallback(async () => {
    const res = await fetch('/api/admin/food-database/sections', { headers: getAuthHeaders() });
    const data = await res.json();
    if (res.ok) setSections(data.sections || []);
  }, []);

  const loadItems = useCallback(async () => {
    const params = new URLSearchParams();
    if (activeSectionFilter !== 'all') params.set('sectionId', activeSectionFilter);
    const res = await fetch(`/api/admin/food-database/items?${params}`, { headers: getAuthHeaders() });
    const data = await res.json();
    if (res.ok) setItems(data.items || []);
  }, [activeSectionFilter]);

  const loadRecipes = useCallback(async () => {
    const params = new URLSearchParams();
    if (activeSectionFilter !== 'all') params.set('sectionId', activeSectionFilter);
    const res = await fetch(`/api/admin/food-database/recipes?${params}`, { headers: getAuthHeaders() });
    const data = await res.json();
    if (res.ok) setRecipes(data.recipes || []);
  }, [activeSectionFilter]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      await loadSections();
      await loadItems();
      await loadRecipes();
    } finally {
      setLoading(false);
    }
  }, [loadSections, loadItems, loadRecipes]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (tab === 'foods') loadItems();
    else loadRecipes();
  }, [tab, activeSectionFilter, loadItems, loadRecipes]);

  const foodLanguages = useMemo(() => getSupportedFoodLanguages(), []);

  const localizedSectionName = useCallback(
    (section: { name: string; nameTranslations?: string | null }) =>
      resolveLocalizedLabel(section.name, section.nameTranslations, displayLanguage),
    [displayLanguage]
  );

  const localizedFoodName = useCallback(
    (item: FoodItem) =>
      resolveLocalizedLabel(item.name, item.nameTranslations as string | undefined, displayLanguage),
    [displayLanguage]
  );

  const localizedRecipeName = useCallback(
    (recipe: FoodRecipe) =>
      resolveLocalizedLabel(recipe.name, recipe.nameTranslations, displayLanguage),
    [displayLanguage]
  );

  const filteredItems = useMemo(() => items, [items]);

  const filteredRecipes = useMemo(() => recipes, [recipes]);

  const handleProceed = () => {
    setActiveSectionFilter(sectionFilter);
    setDisplayLanguage(language);
  };

  const handleImportBundled = async (replace = false) => {
    setImporting(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/food-database/import', {
        method: 'POST',
        headers: getJsonAuthHeaders(),
        body: JSON.stringify({ source: 'bundled', replaceExisting: replace }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Import failed');
      setMessage({
        type: 'ok',
        text: `Imported: ${data.result.foodsCreated} foods, ${data.result.recipesCreated} recipes, ${data.result.sectionsCreated} sections.`,
      });
      await refresh();
    } catch (e: any) {
      setMessage({ type: 'err', text: e.message || 'Import failed' });
    } finally {
      setImporting(false);
    }
  };

  const handleFileImport = async (file: File) => {
    setImporting(true);
    setMessage(null);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const res = await fetch('/api/admin/food-database/import', {
        method: 'POST',
        headers: getJsonAuthHeaders(),
        body: JSON.stringify({ data, replaceExisting: false }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Import failed');
      setMessage({ type: 'ok', text: 'Custom JSON imported successfully.' });
      await refresh();
    } catch (e: any) {
      setMessage({ type: 'err', text: e.message || 'Invalid JSON file' });
    } finally {
      setImporting(false);
    }
  };

  const handleDelete = async (item: FoodItem) => {
    if (!confirm(`Delete "${item.name}"?`)) return;
    const res = await fetch(`/api/admin/food-database/items/${item.id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (res.ok) {
      setItems((prev) => prev.filter((i) => i.id !== item.id));
    }
  };

  const openEdit = async (item: FoodItem) => {
    if (!item.id) {
      setEditItem({
        id: '',
        sectionId: sections[0]?.id || '',
        name: '',
        isLiquid: false,
        imageUrl: null,
        calories: 0,
        proteins: 0,
        carbohydrates: 0,
        fats: 0,
        fiber: 0,
      });
      return;
    }
    const res = await fetch(`/api/admin/food-database/items/${item.id}`, { headers: getAuthHeaders() });
    const data = await res.json();
    if (res.ok && data.item) {
      setEditItem(data.item as FoodEditItem);
    } else {
      setEditItem({ ...item } as FoodEditItem);
    }
  };

  const handleSaveEdit = async () => {
    if (!editItem) return;
    setSavingEdit(true);
    const per100 = dbRowToNutrients(editItem as unknown as Record<string, unknown>);
    const isNew = !editItem.id;

    try {
      const res = await fetch(
        isNew ? '/api/admin/food-database/items' : `/api/admin/food-database/items/${editItem.id}`,
        {
          method: isNew ? 'POST' : 'PUT',
          headers: getJsonAuthHeaders(),
          body: JSON.stringify({
            sectionId: editItem.sectionId,
            name: editItem.name,
            isLiquid: editItem.isLiquid,
            imageUrl: editItem.imageUrl ?? null,
            nameTranslations: editItem.nameTranslations
              ? parseTranslations(editItem.nameTranslations as string)
              : buildTranslationsFromEnglish(editItem.name),
            per100,
          }),
        }
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Save failed');
      }
      setEditItem(null);
      setMessage({ type: 'ok', text: isNew ? 'Food added.' : 'Food saved.' });
      await loadItems();
      await loadSections();
    } catch (e: unknown) {
      setMessage({ type: 'err', text: e instanceof Error ? e.message : 'Save failed' });
    } finally {
      setSavingEdit(false);
    }
  };

  const openFoodLanguages = async (item: FoodItem) => {
    const res = await fetch(`/api/admin/food-database/items/${item.id}`, { headers: getAuthHeaders() });
    const data = await res.json();
    setFoodLangTarget(res.ok && data.item ? data.item : item);
  };

  const saveFoodLanguages = async (map: TranslationMap) => {
    if (!foodLangTarget?.id) return;
    setSavingLang(true);
    try {
      const res = await fetch(`/api/admin/food-database/items/${foodLangTarget.id}`, {
        method: 'PUT',
        headers: getJsonAuthHeaders(),
        body: JSON.stringify({
          name: map.en || foodLangTarget.name,
          nameTranslations: map,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Save failed');
      }
      setFoodLangTarget(null);
      setMessage({ type: 'ok', text: 'Food name translations saved.' });
      await loadItems();
    } catch (e: unknown) {
      setMessage({ type: 'err', text: e instanceof Error ? e.message : 'Save failed' });
    } finally {
      setSavingLang(false);
    }
  };

  const openEditRecipe = async (recipe?: FoodRecipe) => {
    if (!recipe?.id) {
      setEditRecipe({
        id: '',
        sectionId: sections[0]?.id || '',
        name: '',
        description: '',
        components: [{ name: '', grams: 0 }],
        calories: 0,
        proteins: 0,
        carbohydrates: 0,
        fats: 0,
        fiber: 0,
      });
      return;
    }
    const res = await fetch(`/api/admin/food-database/recipes/${recipe.id}`, { headers: getAuthHeaders() });
    const data = await res.json();
    if (res.ok && data.recipe) {
      setEditRecipe(data.recipe as RecipeEditItem);
    }
  };

  const handleSaveRecipe = async () => {
    if (!editRecipe) return;
    setSavingRecipe(true);
    const isNew = !editRecipe.id;
    const payload = recipeToSavePayload(editRecipe);
    try {
      const res = await fetch(
        isNew ? '/api/admin/food-database/recipes' : `/api/admin/food-database/recipes/${editRecipe.id}`,
        {
          method: isNew ? 'POST' : 'PUT',
          headers: getJsonAuthHeaders(),
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Save failed');
      }
      setEditRecipe(null);
      setMessage({ type: 'ok', text: isNew ? 'Recipe added.' : 'Recipe saved.' });
      await loadRecipes();
    } catch (e: unknown) {
      setMessage({ type: 'err', text: e instanceof Error ? e.message : 'Save failed' });
    } finally {
      setSavingRecipe(false);
    }
  };

  const handleDeleteRecipe = async (recipe: FoodRecipe) => {
    if (!confirm(`Delete recipe "${recipe.name}"?`)) return;
    const res = await fetch(`/api/admin/food-database/recipes/${recipe.id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (res.ok) {
      setRecipes((prev) => prev.filter((r) => r.id !== recipe.id));
    }
  };

  return (
    <div className={`h-full flex flex-col ${embedded ? '' : 'bg-gray-100'}`}>
      {!embedded && (
        <div className="bg-[#a51d2d] text-white py-2 font-bold text-center text-xl uppercase shadow-md border-b-4 border-[#800000]">
          System Dashboard
        </div>
      )}

      <div className={`flex-1 bg-white p-4 sm:p-6 overflow-auto ${embedded ? '' : ''}`}>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-semibold text-gray-800">
              {tab === 'foods' ? 'Food Items' : tab === 'recipes' ? 'Recipes' : 'Recipe Instructions'}
            </span>

            <div className="relative">
              <select
                value={sectionFilter}
                onChange={(e) => setSectionFilter(e.target.value)}
                className="appearance-none border border-gray-300 bg-white px-3 py-1.5 pr-8 text-sm rounded-sm min-w-[160px]"
              >
                <option value="all">Select Food Section</option>
                {sections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <div className="relative">
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="appearance-none border border-gray-300 bg-white pl-2 pr-8 py-1.5 text-sm rounded-sm min-w-[72px]"
              >
                {foodLanguages.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {FOOD_LANG_FLAGS[lang.code] || '🌐'} {lang.code === 'en' ? 'En' : lang.code.toUpperCase()}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-[#c0392b] absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <button
              type="button"
              onClick={handleProceed}
              className="bg-[#c0392b] text-white px-4 py-1.5 text-sm font-semibold rounded-sm hover:bg-[#a93226]"
            >
              Proceed
            </button>

            <button
              type="button"
              onClick={() => setShowImages((v) => !v)}
              title={showImages ? 'Hide pictures' : 'Show pictures'}
              className={`border rounded-sm p-1.5 ${
                showImages ? 'border-[#c0392b] bg-red-50 text-[#c0392b]' : 'border-gray-300 bg-white text-gray-600'
              }`}
            >
              <ImageIcon className="w-5 h-5" />
            </button>

            <button
              type="button"
              disabled={importing}
              onClick={() => handleImportBundled(false)}
              className="flex items-center gap-1 border border-gray-300 bg-gray-50 px-3 py-1.5 text-sm rounded-sm hover:bg-gray-100 disabled:opacity-50"
              title="Import bundled Movesbook food database"
            >
              <Database className="w-4 h-4" />
              Import database
            </button>

            <button
              type="button"
              disabled={importing}
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-1 border border-gray-300 bg-gray-50 px-3 py-1.5 text-sm rounded-sm hover:bg-gray-100 disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              Upload JSON
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFileImport(f);
                e.target.value = '';
              }}
            />
          </div>

          {tab !== 'instructions' && (
            <button
              type="button"
              className="bg-black text-white px-4 py-1.5 text-sm font-semibold rounded-sm flex items-center gap-1"
              onClick={() =>
                tab === 'foods'
                  ? openEdit({
                      id: '',
                      legacyId: null,
                      sectionId: sections[0]?.id || '',
                      name: '',
                      isLiquid: false,
                      calories: 0,
                      proteins: 0,
                      carbohydrates: 0,
                      fats: 0,
                      fiber: 0,
                      section: { id: '', name: '', legacyId: null },
                    } as FoodItem)
                  : openEditRecipe()
              }
            >
              <Plus className="w-4 h-4" />
              {tab === 'foods' ? 'Add New Food' : 'Add New Recipe'}
            </button>
          )}
        </div>

        <div className="flex gap-2 mb-4 border-b">
            {(['foods', 'recipes', 'instructions'] as TabId[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
                  tab === t ? 'border-purple-600 text-purple-700' : 'border-transparent text-gray-500'
                }`}
              >
                {t === 'foods' ? 'Food Items' : t === 'recipes' ? 'Recipes' : 'Recipe Instructions'}
              </button>
            ))}
        </div>

        {message && (
          <div
            className={`mb-4 px-3 py-2 text-sm rounded ${
              message.type === 'ok' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
            }`}
          >
            {message.text}
          </div>
        )}

        <p className="mb-3 text-xs text-gray-500">
          List language:{' '}
          <span className="font-medium text-gray-700">
            {FOOD_LANG_FLAGS[displayLanguage] || '🌐'}{' '}
            {foodLanguages.find((l) => l.code === displayLanguage)?.name || displayLanguage.toUpperCase()}
          </span>
          {activeSectionFilter !== 'all' && (
            <>
              {' '}
              · Section:{' '}
              <span className="font-medium text-gray-700">
                {localizedSectionName(sections.find((s) => s.id === activeSectionFilter) || { name: '—' })}
              </span>
            </>
          )}
        </p>

        {loading && tab !== 'instructions' ? (
          <p className="text-gray-500 text-sm">Loading…</p>
        ) : tab === 'instructions' ? (
          <AdminRecipeInstructionsPanel
            sections={sections}
            displayLanguage={displayLanguage}
            onMessage={(type, text) => setMessage({ type, text })}
          />
        ) : tab === 'foods' ? (
          filteredItems.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-gray-300 rounded-lg">
              <p className="text-gray-600 mb-4">No food items in the database yet.</p>
              <button
                type="button"
                disabled={importing}
                onClick={() => handleImportBundled(true)}
                className="bg-purple-600 text-white px-5 py-2 rounded text-sm font-semibold hover:bg-purple-700"
              >
                Import bundled database
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto border border-gray-300">
              <table className="w-full text-sm border-collapse min-w-[900px]">
                <thead>
                  <tr className="bg-gray-100 border-b border-gray-300">
                    <th className="border border-gray-300 px-2 py-2 text-left font-bold">Id</th>
                    {showImages && (
                      <th className="border border-gray-300 px-2 py-2 text-center font-bold w-14">Pic</th>
                    )}
                    <th className="border border-gray-300 px-2 py-2 text-left font-bold">Food Section</th>
                    <th className="border border-gray-300 px-2 py-2 text-left font-bold">Food Name</th>
                    <th className="border border-gray-300 px-2 py-2 text-right font-bold">Calories</th>
                    <th className="border border-gray-300 px-2 py-2 text-right font-bold">Protein</th>
                    <th className="border border-gray-300 px-2 py-2 text-right font-bold">Carbs</th>
                    <th className="border border-gray-300 px-2 py-2 text-right font-bold">Fat</th>
                    <th className="border border-gray-300 px-2 py-2 text-center font-bold w-[200px]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item, idx) => (
                    <tr key={item.id} className="even:bg-gray-50 hover:bg-blue-50/40">
                      <td className="border border-gray-300 px-2 py-1.5">{item.legacyId ?? idx + 1}</td>
                      {showImages && (
                        <td className="border border-gray-300 px-2 py-1.5 text-center">
                          {item.imageUrl ? (
                            <div className="relative w-10 h-10 mx-auto rounded overflow-hidden border border-gray-200">
                              <Image
                                src={String(item.imageUrl)}
                                alt={localizedFoodName(item)}
                                fill
                                className="object-cover"
                                unoptimized
                              />
                            </div>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                      )}
                      <td className="border border-gray-300 px-2 py-1.5">
                        {item.section ? localizedSectionName(item.section) : '—'}
                      </td>
                      <td className="border border-gray-300 px-2 py-1.5 font-medium" title={item.name}>
                        {localizedFoodName(item)}
                      </td>
                      <td className="border border-gray-300 px-2 py-1.5 text-right">{fmt(item.calories)}</td>
                      <td className="border border-gray-300 px-2 py-1.5 text-right">{fmt(item.proteins)}</td>
                      <td className="border border-gray-300 px-2 py-1.5 text-right">{fmt(item.carbohydrates)}</td>
                      <td className="border border-gray-300 px-2 py-1.5 text-right">{fmt(item.fats)}</td>
                      <td className="border border-gray-300 px-2 py-1.5">
                        <div className="flex flex-wrap justify-center gap-1">
                          <ActionBtn label="View" icon={Eye} onClick={() => setViewItem(item)} />
                          <ActionBtn label="Edit" icon={Edit2} onClick={() => openEdit(item)} />
                          <ActionBtn label="Delete" icon={Trash2} onClick={() => handleDelete(item)} danger />
                          <ActionBtn label="Languages" icon={Languages} onClick={() => openFoodLanguages(item)} />
                          <ActionBtn label="Nutrients" icon={List} onClick={() => setViewItem(item)} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : filteredRecipes.length === 0 ? (
          <div className="text-center py-12 text-gray-500 border border-dashed rounded-lg space-y-3">
            <p>No recipes yet. Import the bundled database or add a new recipe.</p>
            <button
              type="button"
              onClick={() => openEditRecipe()}
              className="bg-purple-600 text-white px-4 py-2 rounded text-sm font-semibold"
            >
              Add New Recipe
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto border border-gray-300">
            <table className="w-full text-sm border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border px-2 py-2 text-left">Id</th>
                  <th className="border px-2 py-2 text-left">Section</th>
                  <th className="border px-2 py-2 text-left">Recipe</th>
                  <th className="border px-2 py-2 text-right">Cal</th>
                  <th className="border px-2 py-2 text-left">Ingredients</th>
                  <th className="border px-2 py-2 text-center w-[220px]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecipes.map((r, idx) => (
                  <tr key={r.id} className="even:bg-gray-50">
                    <td className="border px-2 py-1.5">{r.legacyId ?? idx + 1}</td>
                    <td className="border px-2 py-1.5">{localizedSectionName(r.section)}</td>
                    <td className="border px-2 py-1.5 font-medium" title={r.name}>
                      {localizedRecipeName(r)}
                    </td>
                    <td className="border px-2 py-1.5 text-right">{fmt(r.calories)}</td>
                    <td className="border px-2 py-1.5 text-xs">
                      {r.components.map((c) => `${c.name} (${c.grams}g)`).join(', ')}
                    </td>
                    <td className="border px-2 py-1.5">
                      <div className="flex flex-wrap justify-center gap-1">
                        <ActionBtn label="Edit" icon={Edit2} onClick={() => openEditRecipe(r)} />
                        <ActionBtn label="Delete" icon={Trash2} onClick={() => handleDeleteRecipe(r)} danger />
                        <ActionBtn label="Prep" icon={ChefHat} onClick={() => openEditRecipe(r)} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {viewItem && (
        <NutrientModal item={viewItem} onClose={() => setViewItem(null)} />
      )}

      {editItem && (
        <AdminEditFoodForm
          item={editItem}
          sections={sections}
          isNew={!editItem.id}
          saving={savingEdit}
          onChange={setEditItem}
          onClose={() => setEditItem(null)}
          onSave={handleSaveEdit}
        />
      )}

      {editRecipe && (
        <AdminEditRecipeForm
          recipe={editRecipe}
          sections={sections}
          isNew={!editRecipe.id}
          saving={savingRecipe}
          onChange={setEditRecipe}
          onClose={() => setEditRecipe(null)}
          onSave={handleSaveRecipe}
        />
      )}

      {foodLangTarget && (
        <AdminFoodTranslationsModal
          isOpen
          title="Food Name"
          translations={buildTranslationsFromEnglish(
            foodLangTarget.name,
            parseTranslations(foodLangTarget.nameTranslations as string | undefined)
          )}
          onClose={() => setFoodLangTarget(null)}
          saving={savingLang}
          onSave={saveFoodLanguages}
        />
      )}
    </div>
  );
}

function ActionBtn({
  label,
  icon: Icon,
  onClick,
  danger,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      onClick={onClick}
      className={`inline-flex items-center gap-0.5 px-2 py-0.5 text-[11px] border rounded ${
        danger
          ? 'border-red-300 text-red-700 hover:bg-red-50'
          : 'border-gray-300 text-gray-700 hover:bg-gray-100'
      }`}
    >
      <Icon className="w-3 h-3" />
      {label}
    </button>
  );
}

function NutrientModal({ item, onClose }: { item: FoodItem; onClose: () => void }) {
  const nutrients = dbRowToNutrients(item as unknown as Record<string, unknown>);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[85vh] overflow-auto p-4">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="font-bold text-lg">{item.name}</h3>
            <p className="text-sm text-gray-500">{item.section?.name} — per 100g</p>
          </div>
          <button type="button" onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>
        <DietBuilderNutrientGrid
          rows={[{ id: item.id, name: item.name, grams: 100, nutrients }]}
          maxHeight="400px"
        />
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          {NUTRIENT_DISPLAY_COLUMNS.map((col) => (
            <div key={col.key} className="bg-gray-50 px-2 py-1 rounded">
              <span className="text-gray-500">{col.label}: </span>
              <span className="font-medium">{nutrients[col.key] || '—'}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

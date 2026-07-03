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
import AdminRecipeDetailsExpand from '@/components/admin/AdminRecipeDetailsExpand';
import AdminFoodTranslationsModal from '@/components/admin/AdminFoodTranslationsModal';
import {
  buildTranslationsFromEnglish,
  FOOD_LANG_FLAGS,
  getSupportedFoodLanguages,
  parseTranslations,
  resolveLocalizedLabel,
  TranslationMap,
} from '@/lib/foodDatabaseTranslations';
import { dbRowToNutrients, resolveFoodImageUrl } from '@/lib/foodDatabase.types';
import { NUTRIENT_DISPLAY_COLUMNS, formatNutrient, getNutrientColumnBgClass } from '@/utils/nutritionMealTotals';
import {
  getFoodDatabaseSource,
  type FoodDatabaseSourceId,
} from '@/constants/foodDatabaseSources';
import AdminFoodDatabaseSourceMenu from '@/components/admin/AdminFoodDatabaseSourceMenu';
import AdminFoodDatabaseSettings from '@/components/admin/AdminFoodDatabaseSettings';
import AdminFoodDatabasePagination from '@/components/admin/AdminFoodDatabasePagination';

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
  components: { name: string; grams: number; foodItemId?: string | null }[];
  calories: number;
  proteins: number;
  carbohydrates: number;
  fats: number;
}

type TabId = 'foods' | 'recipes' | 'instructions' | 'settings';

type SourceLoadOpts = {
  sourceId?: FoodDatabaseSourceId;
  accessMode?: 'import' | 'live';
  page?: number;
  pageSize?: number;
};

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
  const [importingSourceId, setImportingSourceId] = useState<FoodDatabaseSourceId | null>(null);
  const [selectingSource, setSelectingSource] = useState(false);
  const [activeSourceId, setActiveSourceId] = useState<FoodDatabaseSourceId>('movesbook_bundled');
  const [activeSourceLabel, setActiveSourceLabel] = useState<string | null>(null);
  const [activeAccessMode, setActiveAccessMode] = useState<'import' | 'live'>('import');
  const [catalogSources, setCatalogSources] = useState<
    {
      id: FoodDatabaseSourceId;
      label: string;
      description: string;
      accessMode: 'import' | 'live';
      configured?: boolean;
      missingEnv?: string[];
      importStatus?: {
        imported: boolean;
        importedAt: string | null;
        foodCount: number;
        recipeCount: number;
        summary: string | null;
      };
    }[]
  >([]);
  const [sourceStatuses, setSourceStatuses] = useState<
    Record<string, { configured: boolean; missingEnv?: string[]; importStatus?: { imported: boolean; foodCount: number; recipeCount: number } }>
  >({});
  const [liveSearchQuery, setLiveSearchQuery] = useState('');
  const [foodsPage, setFoodsPage] = useState(1);
  const [foodsPageSize, setFoodsPageSize] = useState(50);
  const [foodsTotal, setFoodsTotal] = useState(0);
  const [recipesPage, setRecipesPage] = useState(1);
  const [recipesPageSize, setRecipesPageSize] = useState(25);
  const [recipesTotal, setRecipesTotal] = useState(0);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [viewItem, setViewItem] = useState<FoodItem | null>(null);
  const [editItem, setEditItem] = useState<FoodEditItem | null>(null);
  const [editRecipe, setEditRecipe] = useState<RecipeEditItem | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [savingRecipe, setSavingRecipe] = useState(false);
  const [foodLangTarget, setFoodLangTarget] = useState<FoodItem | null>(null);
  const [savingLang, setSavingLang] = useState(false);
  const [pendingInstructionsRecipeId, setPendingInstructionsRecipeId] = useState<string | null>(null);
  const [instructionsOpenNonce, setInstructionsOpenNonce] = useState(0);
  const [expandedRecipeId, setExpandedRecipeId] = useState<string | null>(null);
  const [expandedRecipeTab, setExpandedRecipeTab] = useState<'ingredients' | 'preparation'>('ingredients');
  const [expandedRecipeCombined, setExpandedRecipeCombined] = useState(false);
  const [allFoodItems, setAllFoodItems] = useState<FoodItem[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadSections = useCallback(async (opts?: SourceLoadOpts) => {
    const sid = opts?.sourceId ?? activeSourceId;
    const mode = opts?.accessMode ?? activeAccessMode;
    const params = new URLSearchParams();
    if (mode !== 'live') params.set('sourceId', sid);
    const res = await fetch(`/api/admin/food-database/sections?${params}`, { headers: getAuthHeaders() });
    const data = await res.json();
    if (res.ok) setSections(data.sections || []);
  }, [activeSourceId, activeAccessMode]);

  const loadItems = useCallback(async (opts?: SourceLoadOpts) => {
    const sid = opts?.sourceId ?? activeSourceId;
    const mode = opts?.accessMode ?? activeAccessMode;
    const page = opts?.page ?? foodsPage;
    const pageSize = opts?.pageSize ?? foodsPageSize;
    const params = new URLSearchParams();
    if (activeSectionFilter !== 'all') params.set('sectionId', activeSectionFilter);
    params.set('sourceId', sid);
    params.set('page', String(page));
    params.set('pageSize', String(pageSize));
    if (mode === 'live' && liveSearchQuery.trim().length >= 2) {
      params.set('q', liveSearchQuery.trim());
    }
    const res = await fetch(`/api/admin/food-database/items?${params}`, { headers: getAuthHeaders() });
    const data = await res.json();
    if (res.ok) {
      setItems(data.items || []);
      setFoodsTotal(data.total ?? 0);
    }
  }, [activeSectionFilter, activeSourceId, activeAccessMode, liveSearchQuery, foodsPage, foodsPageSize]);

  const loadRecipes = useCallback(async (opts?: SourceLoadOpts) => {
    const sid = opts?.sourceId ?? activeSourceId;
    const page = opts?.page ?? recipesPage;
    const pageSize = opts?.pageSize ?? recipesPageSize;
    const params = new URLSearchParams();
    if (activeSectionFilter !== 'all') params.set('sectionId', activeSectionFilter);
    params.set('sourceId', sid);
    params.set('page', String(page));
    params.set('pageSize', String(pageSize));
    const res = await fetch(`/api/admin/food-database/recipes?${params}`, { headers: getAuthHeaders() });
    const data = await res.json();
    if (res.ok) {
      setRecipes(data.recipes || []);
      setRecipesTotal(data.total ?? 0);
    }
  }, [activeSectionFilter, activeSourceId, recipesPage, recipesPageSize]);

  const loadAllFoodItems = useCallback(async (opts?: SourceLoadOpts) => {
    const sid = opts?.sourceId ?? activeSourceId;
    const params = new URLSearchParams();
    params.set('sourceId', sid);
    params.set('all', '1');
    const res = await fetch(`/api/admin/food-database/items?${params}`, { headers: getAuthHeaders() });
    const data = await res.json();
    if (res.ok) setAllFoodItems(data.items || []);
  }, [activeSourceId]);

  const refresh = useCallback(async (opts?: SourceLoadOpts) => {
    setLoading(true);
    try {
      await loadSections(opts);
      await loadItems(opts);
      await loadRecipes(opts);
    } finally {
      setLoading(false);
    }
  }, [loadSections, loadItems, loadRecipes]);

  const loadSourceCatalog = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/food-database/sources', { headers: getAuthHeaders() });
      const data = await res.json();
      if (!res.ok) return null;
      setActiveSourceId(data.activeSourceId || 'movesbook_bundled');
      setActiveSourceLabel(data.activeSourceLabel || null);
      setActiveAccessMode(data.activeSource?.accessMode || 'import');
      setCatalogSources(data.sources || []);
      const map: Record<string, { configured: boolean; missingEnv?: string[]; importStatus?: { imported: boolean; foodCount: number; recipeCount: number } }> = {};
      for (const source of data.sources || []) {
        map[source.id] = {
          configured: source.configured,
          missingEnv: source.missingEnv,
          importStatus: source.importStatus,
        };
      }
      setSourceStatuses(map);
      return data as {
        activeSourceId: FoodDatabaseSourceId;
        activeSource?: { accessMode?: 'import' | 'live' };
        activeSourceLabel?: string;
      };
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const catalog = await loadSourceCatalog();
      if (cancelled) return;
      const sid = (catalog?.activeSourceId || 'movesbook_bundled') as FoodDatabaseSourceId;
      const mode = catalog?.activeSource?.accessMode || 'import';
      await refresh({ sourceId: sid, accessMode: mode });
    })();
    return () => {
      cancelled = true;
    };
  }, [loadSourceCatalog, refresh]);

  useEffect(() => {
    if (tab === 'foods') loadItems();
    else if (tab === 'recipes') {
      loadRecipes();
      loadAllFoodItems();
    }
  }, [
    tab,
    activeSectionFilter,
    activeSourceId,
    activeAccessMode,
    liveSearchQuery,
    foodsPage,
    foodsPageSize,
    recipesPage,
    recipesPageSize,
    loadItems,
    loadRecipes,
    loadAllFoodItems,
  ]);

  useEffect(() => {
    setFoodsPage(1);
    setRecipesPage(1);
  }, [activeSourceId, activeAccessMode, activeSectionFilter]);

  useEffect(() => {
    setFoodsPage(1);
  }, [liveSearchQuery]);

  useEffect(() => {
    if (activeAccessMode === 'live' && tab === 'foods') {
      const timer = window.setTimeout(() => loadItems(), 300);
      return () => window.clearTimeout(timer);
    }
  }, [liveSearchQuery, activeAccessMode, tab, loadItems]);

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
    setFoodsPage(1);
    setRecipesPage(1);
  };

  const handleSelectSource = async (sourceId: FoodDatabaseSourceId) => {
    setSelectingSource(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/food-database/sources', {
        method: 'PUT',
        headers: getJsonAuthHeaders(),
        body: JSON.stringify({ sourceId }),
      });
      const data = await res.json();
      if (res.status === 409) {
        setMessage({ type: 'err', text: data.details || data.error });
        setTab('settings');
        return;
      }
      if (!res.ok) throw new Error(data.details || data.error || 'Select failed');

      setActiveSourceId(data.activeSourceId);
      setActiveSourceLabel(data.activeSourceLabel);
      setActiveAccessMode(data.activeSource?.accessMode || 'import');
      setLiveSearchQuery('');
      setMessage({
        type: 'ok',
        text:
          data.activeSource?.accessMode === 'live'
            ? `Now reading ${data.activeSourceLabel} live — use search to find foods.`
            : `Now viewing ${data.activeSourceLabel} from local storage.`,
      });
      await refresh({
        sourceId: data.activeSourceId,
        accessMode: data.activeSource?.accessMode || 'import',
      });
    } catch (e: unknown) {
      setMessage({ type: 'err', text: e instanceof Error ? e.message : 'Select failed' });
    } finally {
      setSelectingSource(false);
    }
  };

  const handleImportSource = async (sourceId: FoodDatabaseSourceId, replaceExisting: boolean) => {
    if (replaceExisting && !confirm('Replace all foods/recipes previously imported from this source?')) {
      return;
    }

    setImporting(true);
    setImportingSourceId(sourceId);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/food-database/sources', {
        method: 'POST',
        headers: getJsonAuthHeaders(),
        body: JSON.stringify({ sourceId, replaceExisting }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.details || data.error || 'Import failed');

      const importedId = (data.activeSourceId || data.sourceId) as FoodDatabaseSourceId;
      const importedSource = data.activeSource ?? getFoodDatabaseSource(importedId);

      setActiveSourceId(importedId);
      setActiveSourceLabel(data.activeSourceLabel ?? importedSource?.label ?? importedId);
      setActiveAccessMode(importedSource?.accessMode ?? 'import');
      setActiveSectionFilter('all');
      setSectionFilter('all');
      setFoodsPage(1);
      setTab('foods');

      setMessage({
        type: 'ok',
        text:
          data.message +
          (data.warnings?.length ? ` (${data.warnings.join(' ')})` : '') +
          ' — now viewing this database.',
      });
      await loadSourceCatalog();
      await refresh({ sourceId: importedId, accessMode: importedSource?.accessMode ?? 'import' });
    } catch (e: unknown) {
      setMessage({ type: 'err', text: e instanceof Error ? e.message : 'Import failed' });
    } finally {
      setImporting(false);
      setImportingSourceId(null);
    }
  };

  const handleImportBundled = async (replace = false) => {
    await handleImportSource('movesbook_bundled', replace);
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
        components: [],
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

  const openPreparationEditor = useCallback(
    async (recipeId: string) => {
      if (editRecipe?.id === recipeId) {
        const payload = recipeToSavePayload(editRecipe);
        try {
          await fetch(`/api/admin/food-database/recipes/${recipeId}`, {
            method: 'PUT',
            headers: getJsonAuthHeaders(),
            body: JSON.stringify(payload),
          });
          await loadRecipes();
        } catch {
          // Open editor even if sync fails — user can still edit saved content
        }
      }

      setEditRecipe(null);
      setExpandedRecipeId(null);
      setTab('instructions');
      setPendingInstructionsRecipeId(null);
      setInstructionsOpenNonce((n) => n + 1);
      window.setTimeout(() => {
        setPendingInstructionsRecipeId(recipeId);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 0);
    },
    [editRecipe, loadRecipes]
  );

  const toggleRecipeDetails = useCallback(
    (recipeId: string, mode: 'title' | 'preparation') => {
      if (mode === 'title') {
        if (expandedRecipeId === recipeId && expandedRecipeCombined) {
          setExpandedRecipeId(null);
          setExpandedRecipeCombined(false);
          return;
        }
        setExpandedRecipeId(recipeId);
        setExpandedRecipeTab('ingredients');
        setExpandedRecipeCombined(true);
        return;
      }

      if (
        expandedRecipeId === recipeId &&
        expandedRecipeTab === 'preparation' &&
        !expandedRecipeCombined
      ) {
        setExpandedRecipeId(null);
        return;
      }
      setExpandedRecipeId(recipeId);
      setExpandedRecipeTab('preparation');
      setExpandedRecipeCombined(false);
    },
    [expandedRecipeId, expandedRecipeTab, expandedRecipeCombined]
  );

  const handleExpandedTabChange = useCallback((tab: 'ingredients' | 'preparation') => {
    setExpandedRecipeTab(tab);
    setExpandedRecipeCombined(false);
  }, []);

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
    <div className={`h-full flex flex-col w-full min-w-0 admin-food-db-panel ${embedded ? '' : 'bg-gray-100'}`}>
      {!embedded && (
        <div className="bg-[#a51d2d] text-white py-2 font-bold text-center text-xl uppercase shadow-md border-b-4 border-[#800000]">
          System Dashboard
        </div>
      )}

      <div className="flex-1 bg-white p-4 sm:p-6 overflow-auto w-full min-w-0">
        <AdminFoodDatabaseSourceMenu
          activeSourceId={activeSourceId}
          sourceStatuses={sourceStatuses}
          selecting={selectingSource}
          importingId={importingSourceId}
          onSelect={handleSelectSource}
          onImport={(sourceId) => handleImportSource(sourceId, false)}
        />

        {activeSourceLabel && (
          <p className="mb-4 text-sm text-slate-600">
            Active database: <span className="font-semibold text-indigo-800">{activeSourceLabel}</span>
            {activeAccessMode === 'live' && (
              <span className="ml-2 text-xs rounded bg-emerald-100 text-emerald-800 px-2 py-0.5 font-medium">
                Live read
              </span>
            )}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-semibold text-gray-800">
              {tab === 'foods'
                ? 'Food Items'
                : tab === 'recipes'
                  ? 'Recipes'
                  : tab === 'instructions'
                    ? 'Recipe Instructions'
                    : 'Food & Recipes Settings'}
            </span>

            {activeAccessMode !== 'live' && (
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
            )}

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

          {tab !== 'instructions' && tab !== 'settings' && activeAccessMode !== 'live' && (
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
            {(['foods', 'recipes', 'instructions', 'settings'] as TabId[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
                  tab === t ? 'border-purple-600 text-purple-700' : 'border-transparent text-gray-500'
                }`}
              >
                {t === 'foods'
                  ? 'Food Items'
                  : t === 'recipes'
                    ? 'Recipes'
                    : t === 'instructions'
                      ? 'Recipe Instructions'
                      : 'Settings'}
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

        {loading && tab !== 'instructions' && tab !== 'settings' ? (
          <p className="text-gray-500 text-sm">Loading…</p>
        ) : tab === 'settings' ? (
          <AdminFoodDatabaseSettings
            sources={catalogSources}
            importingId={importingSourceId}
            onImport={handleImportSource}
            onImportBundled={handleImportBundled}
          />
        ) : tab === 'instructions' ? (
          <AdminRecipeInstructionsPanel
            sections={sections}
            displayLanguage={displayLanguage}
            onMessage={(type, text) => setMessage({ type, text })}
            openRecipeId={pendingInstructionsRecipeId}
            openNonce={instructionsOpenNonce}
            onOpenRecipeHandled={() => setPendingInstructionsRecipeId(null)}
          />
        ) : tab === 'foods' ? (
          <div>
            {activeAccessMode === 'live' && (
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <label className="flex flex-1 min-w-[240px] flex-col gap-1 text-xs font-medium text-gray-600">
                  Search live database
                  <input
                    type="search"
                    value={liveSearchQuery}
                    onChange={(e) => setLiveSearchQuery(e.target.value)}
                    placeholder="Type at least 2 characters…"
                    className="border border-gray-300 rounded-sm px-3 py-2 text-sm"
                  />
                </label>
                <p className="text-xs text-emerald-700 self-end pb-2">
                  Results are read directly from {activeSourceLabel} — not stored locally.
                </p>
              </div>
            )}
            {filteredItems.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-gray-300 rounded-lg">
              <p className="text-gray-600 mb-4">
                {activeAccessMode === 'live'
                  ? liveSearchQuery.trim().length < 2
                    ? 'Enter a search term to query this live database.'
                    : 'No foods matched your search.'
                  : 'No food items for this database yet.'}
              </p>
              {activeAccessMode !== 'live' && (
                <button
                  type="button"
                  disabled={importing}
                  onClick={() => handleImportSource(activeSourceId, false)}
                  className="bg-purple-600 text-white px-5 py-2 rounded text-sm font-semibold hover:bg-purple-700 disabled:opacity-50"
                >
                  {importingSourceId === activeSourceId ? 'Importing…' : 'Import this database'}
                </button>
              )}
            </div>
          ) : (
            <div className="w-full min-w-0 border border-gray-300 flex flex-col">
              <AdminFoodDatabasePagination
                page={foodsPage}
                pageSize={foodsPageSize}
                total={foodsTotal}
                onPageChange={setFoodsPage}
                onPageSizeChange={(size) => {
                  setFoodsPageSize(size);
                  setFoodsPage(1);
                }}
              />
              <div className="w-full min-w-0 overflow-auto max-h-[min(65vh,720px)]">
              <table className="text-sm border-collapse w-max">
                <thead className="sticky top-0 z-[3]">
                  <tr className="border-b border-gray-300">
                    <th className="border border-gray-300 px-2 py-2 text-left font-bold bg-white sticky left-0 z-[2]">Id</th>
                    {showImages && (
                      <th className="border border-gray-300 px-2 py-2 text-center font-bold w-14 bg-white">Pic</th>
                    )}
                    <th className="border border-gray-300 px-2 py-2 text-left font-bold bg-white min-w-[120px]">Food Section</th>
                    <th className="border border-gray-300 px-2 py-2 text-left font-bold bg-white min-w-[200px]">Food Name</th>
                    {NUTRIENT_DISPLAY_COLUMNS.map((col) => (
                      <th
                        key={col.key}
                        className={`border border-gray-300 px-2 py-2 text-right font-bold whitespace-nowrap min-w-[3rem] ${getNutrientColumnBgClass(col.key)}`}
                      >
                        {col.short || col.label}
                      </th>
                    ))}
                    <th className="border border-gray-300 px-2 py-2 text-center font-bold bg-white sticky right-0 z-[2] min-w-[200px] shadow-[-4px_0_4px_-2px_rgba(0,0,0,0.08)]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item, idx) => {
                    const nutrients = dbRowToNutrients(item as unknown as Record<string, unknown>);
                    return (
                    <tr key={item.id} className="hover:bg-blue-50/40">
                      <td className="border border-gray-300 px-2 py-1.5 bg-white sticky left-0 z-[1]">
                        {item.legacyId ?? '—'}
                      </td>
                      {showImages && (
                        <td className="border border-gray-300 px-2 py-1.5 text-center">
                          {item.imageUrl ? (
                            <div className="w-10 h-10 mx-auto rounded overflow-hidden border border-gray-200">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={resolveFoodImageUrl(String(item.imageUrl)) || String(item.imageUrl)}
                                alt={localizedFoodName(item)}
                                className="w-full h-full object-cover"
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
                      <td className="border border-gray-300 px-2 py-1.5 font-medium bg-white" title={item.name}>
                        {localizedFoodName(item)}
                      </td>
                      {NUTRIENT_DISPLAY_COLUMNS.map((col) => (
                        <td
                          key={col.key}
                          className={`border border-gray-300 px-2 py-1.5 text-right whitespace-nowrap ${getNutrientColumnBgClass(col.key)}`}
                        >
                          {formatNutrient(nutrients[col.key], col.key)}
                        </td>
                      ))}
                      <td className="border border-gray-300 px-2 py-1.5 bg-white sticky right-0 z-[1] shadow-[-4px_0_4px_-2px_rgba(0,0,0,0.08)]">
                        <div className="flex flex-wrap justify-center gap-1">
                          <ActionBtn label="View" icon={Eye} onClick={() => setViewItem(item)} />
                          {item.isLive ? (
                            <span className="text-[10px] text-emerald-700 font-medium px-1">Read-only</span>
                          ) : (
                            <>
                              <ActionBtn label="Edit" icon={Edit2} onClick={() => openEdit(item)} />
                              <ActionBtn label="Delete" icon={Trash2} onClick={() => handleDelete(item)} danger />
                              <ActionBtn label="Languages" icon={Languages} onClick={() => openFoodLanguages(item)} />
                              <ActionBtn label="Nutrients" icon={List} onClick={() => setViewItem(item)} />
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
              </div>
              <AdminFoodDatabasePagination
                page={foodsPage}
                pageSize={foodsPageSize}
                total={foodsTotal}
                onPageChange={setFoodsPage}
                onPageSizeChange={(size) => {
                  setFoodsPageSize(size);
                  setFoodsPage(1);
                }}
              />
            </div>
          )}
          </div>
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
          <div className="border border-gray-300 flex flex-col">
            <AdminFoodDatabasePagination
              page={recipesPage}
              pageSize={recipesPageSize}
              total={recipesTotal}
              onPageChange={setRecipesPage}
              onPageSizeChange={(size) => {
                setRecipesPageSize(size);
                setRecipesPage(1);
              }}
            />
          <div className="overflow-x-auto overflow-y-auto max-h-[min(65vh,720px)]">
            <table className="w-full text-sm border-collapse min-w-[800px]">
              <thead className="sticky top-0 z-[2] bg-gray-100">
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
                {filteredRecipes.map((r, idx) => {
                  const isExpanded = expandedRecipeId === r.id;
                  const foodLookup = allFoodItems.length > 0 ? allFoodItems : items;
                  return (
                    <React.Fragment key={r.id}>
                      <tr className="even:bg-gray-50">
                        <td className="border px-2 py-1.5">{r.legacyId ?? idx + 1}</td>
                        <td className="border px-2 py-1.5">{localizedSectionName(r.section)}</td>
                        <td className="border px-2 py-1.5" title={r.name}>
                          <button
                            type="button"
                            onClick={() => toggleRecipeDetails(r.id, 'title')}
                            className={`font-medium text-left w-full ${
                              isExpanded
                                ? 'text-[#0066cc] underline'
                                : 'hover:text-[#0066cc] hover:underline'
                            }`}
                          >
                            {localizedRecipeName(r)}
                          </button>
                        </td>
                        <td className="border px-2 py-1.5 text-right">{fmt(r.calories)}</td>
                        <td className="border px-2 py-1.5 text-xs">
                          {r.components.map((c) => `${c.name} (${c.grams}g)`).join(', ')}
                        </td>
                        <td className="border px-2 py-1.5">
                          <div className="flex flex-wrap justify-center gap-1">
                            <ActionBtn label="Edit" icon={Edit2} onClick={() => openEditRecipe(r)} />
                            <ActionBtn label="Delete" icon={Trash2} onClick={() => handleDeleteRecipe(r)} danger />
                            <ActionBtn
                              label="Prep"
                              icon={ChefHat}
                              onClick={() => toggleRecipeDetails(r.id, 'preparation')}
                            />
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan={6} className="border border-gray-300 p-0">
                            <AdminRecipeDetailsExpand
                              components={r.components}
                              foodItems={foodLookup}
                              preparationTranslations={r.preparationTranslations}
                              description={r.description}
                              displayLanguage={displayLanguage}
                              activeTab={expandedRecipeTab}
                              onTabChange={handleExpandedTabChange}
                              showCombined={expandedRecipeCombined}
                              onOpenPreparation={() => openPreparationEditor(r.id)}
                            />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
            <AdminFoodDatabasePagination
              page={recipesPage}
              pageSize={recipesPageSize}
              total={recipesTotal}
              onPageChange={setRecipesPage}
              onPageSizeChange={(size) => {
                setRecipesPageSize(size);
                setRecipesPage(1);
              }}
            />
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
          displayLanguage={displayLanguage}
          isNew={!editRecipe.id}
          saving={savingRecipe}
          onChange={setEditRecipe}
          onClose={() => setEditRecipe(null)}
          onSave={handleSaveRecipe}
          onOpenPreparation={openPreparationEditor}
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

  React.useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="relative bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[85vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-2 right-2 z-30 p-1.5 hover:bg-gray-100 rounded bg-white border border-gray-200 shadow-sm"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="p-4 pt-10 min-w-0 overflow-auto max-h-[85vh]">
          <DietBuilderNutrientGrid
            rows={[{ id: item.id, name: item.name, grams: 100, nutrients }]}
            maxHeight="calc(85vh - 3rem)"
          />
        </div>
      </div>
    </div>
  );
}

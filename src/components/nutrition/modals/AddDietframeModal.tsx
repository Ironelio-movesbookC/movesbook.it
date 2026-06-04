'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  X,
  Search,
  Star,
  UtensilsCrossed,
  ShoppingBasket,
  Scale,
  Archive,
  ChevronRight,
  Globe,
} from 'lucide-react';
import {
  FOOD_CATALOG,
  FOOD_SECTIONS,
  FoodCatalogItem,
  scaleNutrients,
  amountToGrams,
} from '@/data/nutritionFoodCatalog';
import { NUTRITION_TERMINOLOGY } from '@/config/nutrition.constants';
import {
  MEAL_LABELS,
  MEAL_SLOT_COUNT,
  sumNutrientTotals,
  formatNutrient,
} from '@/utils/nutritionMealTotals';
import {
  buildDietframeApiPayload,
  cartLineToPayload,
  DietBuilderCartLine,
  DietframeAmountUnit,
} from '@/utils/dietframePayload';
import DietBuilderNutrientGrid from '@/components/nutrition/modals/DietBuilderNutrientGrid';
import {
  DietArchiveEntry,
  DietArchiveFilter,
  deleteDietArchiveEntries,
  filterArchiveEntries,
  formatArchiveDate,
  loadDietArchive,
  loadFavoriteFoodIds,
  saveDietArchiveEntry,
  saveFavoriteFoodIds,
  sumArchiveNutrients,
} from '@/utils/dietBuilderArchive';
import {
  ALL_FOODS_RECIPES_SECTION,
  buildSectionOptions,
  catalogItemSearchText,
  localizeCatalog,
} from '@/lib/dietBuilderCatalog';
import {
  getToolsProfileLanguageDisplayName,
  resolveProfileLanguageCodeForToolsLoad,
} from '@/utils/toolsProfileLanguage';

interface AddDietframeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payloads: ReturnType<typeof buildDietframeApiPayload>[]) => void | Promise<void>;
  meal: { id: string; sessionNumber?: number; name?: string | null };
  mealLabel?: string;
  isSaving?: boolean;
}

const UNITS: { value: DietframeAmountUnit; label: string }[] = [
  { value: 'g', label: 'g' },
  { value: 'oz', label: 'oz' },
  { value: 'lb', label: 'lb' },
  { value: 'ml', label: 'ml' },
  { value: 'pc', label: 'pc' },
];

function newCartId() {
  return `cart-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function AddDietframeModal({
  isOpen,
  onClose,
  onSave,
  meal,
  mealLabel: mealLabelProp,
  isSaving = false,
}: AddDietframeModalProps) {
  const fixedMealLabel =
    mealLabelProp ||
    MEAL_LABELS[meal.sessionNumber ?? 1] ||
    meal.name ||
    NUTRITION_TERMINOLOGY.meal;

  const [profileLang, setProfileLang] = useState('en');
  const [section, setSection] = useState<string>(ALL_FOODS_RECIPES_SECTION);
  const [foodCatalog, setFoodCatalog] = useState<FoodCatalogItem[]>(FOOD_CATALOG);
  const [sectionMeta, setSectionMeta] = useState<{ name: string; nameTranslations?: string | null }[]>([]);
  const [search, setSearch] = useState('');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [highlightedFood, setHighlightedFood] = useState<FoodCatalogItem | null>(null);
  const [amount, setAmount] = useState('100');
  const [unit, setUnit] = useState<DietframeAmountUnit>('g');
  const [cart, setCart] = useState<DietBuilderCartLine[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [archiveFilter, setArchiveFilter] = useState<DietArchiveFilter>('list');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [archiveEntries, setArchiveEntries] = useState<DietArchiveEntry[]>([]);
  const [archiveSelection, setArchiveSelection] = useState<Set<string>>(new Set());
  const [showTotalsModal, setShowTotalsModal] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const lang = resolveProfileLanguageCodeForToolsLoad();
    setProfileLang(lang);
    setFavoriteIds(loadFavoriteFoodIds());
    setArchiveEntries(loadDietArchive());

    fetch(`/api/food-database/catalog?lang=${encodeURIComponent(lang)}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.catalog) && data.catalog.length > 0) {
          setFoodCatalog(localizeCatalog(data.catalog, lang));
          setSectionMeta(Array.isArray(data.sections) ? data.sections : []);
        } else {
          setFoodCatalog(localizeCatalog(FOOD_CATALOG, lang));
          setSectionMeta([]);
        }
      })
      .catch(() => {
        setFoodCatalog(localizeCatalog(FOOD_CATALOG, lang));
        setSectionMeta([]);
      });
  }, [isOpen]);

  const sectionOptions = useMemo(
    () => buildSectionOptions(foodCatalog, profileLang, sectionMeta),
    [foodCatalog, profileLang, sectionMeta]
  );

  const filteredFoods = useMemo(() => {
    const q = search.trim().toLowerCase();
    return foodCatalog.filter((item) => {
      if (section !== ALL_FOODS_RECIPES_SECTION) {
        if (item.sectionName) {
          if (item.sectionName !== section) return false;
        } else if (item.section !== section) return false;
      }
      if (favoritesOnly && !favoriteIds.includes(item.id)) return false;
      if (!q) return true;
      return catalogItemSearchText(item).includes(q);
    });
  }, [foodCatalog, section, search, favoritesOnly, favoriteIds]);

  const parsedAmount = parseFloat(amount.replace(',', '.'));
  const previewGrams = highlightedFood && parsedAmount > 0 ? amountToGrams(parsedAmount, unit) : 0;
  const previewNutrients =
    highlightedFood && previewGrams > 0 ? scaleNutrients(highlightedFood.per100, previewGrams) : null;

  const cartTotal = useMemo(() => sumNutrientTotals(cart.map((c) => c.nutrients)), [cart]);
  const cartAllSelected = cart.length > 0 && cart.every((c) => c.selected);

  const visibleArchive = useMemo(
    () => filterArchiveEntries(archiveEntries, archiveFilter, dateFrom || undefined, dateTo || undefined),
    [archiveEntries, archiveFilter, dateFrom, dateTo]
  );
  const archiveTotals = useMemo(() => sumArchiveNutrients(visibleArchive), [visibleArchive]);

  const resetBuilder = useCallback(() => {
    setCart([]);
    setHighlightedFood(null);
    setAmount('100');
    setUnit('g');
    setError(null);
  }, []);

  const handleConfirmAdd = () => {
    setError(null);
    if (!highlightedFood) {
      setError('Select a food or recipe from the list.');
      return;
    }
    if (!parsedAmount || parsedAmount <= 0) {
      setError('Enter a valid quantity.');
      return;
    }
    const grams = amountToGrams(parsedAmount, unit);
    if (grams <= 0) {
      setError('Enter a valid quantity.');
      return;
    }
    const nutrients = scaleNutrients(highlightedFood.per100, grams);
    setCart((prev) => [
      ...prev,
      {
        id: newCartId(),
        catalogItem: highlightedFood,
        name: highlightedFood.name,
        amount: parsedAmount,
        unit,
        grams,
        nutrients,
        selected: false,
      },
    ]);
  };

  const handleSave = async () => {
    setError(null);
    if (cart.length === 0) {
      setError('Add at least one food before saving.');
      return;
    }
    const payloads = cart.map((line) => cartLineToPayload(line, meal.id));
    const entry: DietArchiveEntry = {
      id: `archive-${Date.now()}`,
      savedAt: new Date().toISOString(),
      mealLabel: fixedMealLabel,
      nutritionMealId: meal.id,
      totalGrams: cart.reduce((s, c) => s + c.grams, 0),
      foodDescription: cart.map((c) => `${c.name} (${c.amount}${c.unit})`).join(', '),
      nutrients: cartTotal,
      lines: cart.map((c) => ({ name: c.name, grams: c.grams, unit: c.unit })),
    };
    try {
      await onSave(payloads);
      saveDietArchiveEntry(entry);
      setArchiveEntries(loadDietArchive());
      resetBuilder();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save.');
    }
  };

  const toggleCartSelect = (id: string) => {
    setCart((prev) => prev.map((c) => (c.id === id ? { ...c, selected: !c.selected } : c)));
  };

  const toggleCartAll = (checked: boolean) => {
    setCart((prev) => prev.map((c) => ({ ...c, selected: checked })));
  };

  const deleteCartSelected = () => {
    setCart((prev) => prev.filter((c) => !c.selected));
  };

  const setCartSelectedAsFav = () => {
    const ids = new Set(favoriteIds);
    cart.filter((c) => c.selected).forEach((c) => ids.add(c.catalogItem.id));
    const next = Array.from(ids);
    setFavoriteIds(next);
    saveFavoriteFoodIds(next);
  };

  const toggleArchiveSelect = (id: string) => {
    setArchiveSelection((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const deleteArchiveSelected = () => {
    if (archiveSelection.size === 0) return;
    deleteDietArchiveEntries(Array.from(archiveSelection));
    setArchiveSelection(new Set());
    setArchiveEntries(loadDietArchive());
  };

  if (!isOpen) return null;

  const langDisplay = getToolsProfileLanguageDisplayName(profileLang);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-2 sm:p-4 backdrop-blur-sm">
      <div className="flex max-h-[96vh] w-full max-w-7xl flex-col overflow-hidden rounded-2xl bg-slate-50 shadow-2xl ring-1 ring-slate-200">
        {/* Header — A: meal */}
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
              <UtensilsCrossed size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-slate-900">Diet Builder</h2>
              <p className="text-xs text-slate-500">Select foods, set quantity, save to your meal plan</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="hidden items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 sm:inline-flex">
              <Globe size={12} />
              {langDisplay}
            </span>
            <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
              <span className="font-semibold text-slate-700">Meal</span>
              <select
                className="rounded-lg border-0 bg-transparent py-0 pl-1 pr-6 text-sm font-medium text-slate-900 focus:ring-0"
                value={meal.sessionNumber ?? 1}
                disabled
                title="Meal is set from the planner row"
              >
                {Array.from({ length: MEAL_SLOT_COUNT }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {MEAL_LABELS[i + 1]}
                  </option>
                ))}
              </select>
            </label>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
              {fixedMealLabel}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              aria-label="Close"
            >
              <X size={22} />
            </button>
          </div>
        </div>

        {/* B + D */}
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-hidden p-4 lg:grid-cols-2">
          {/* B — food / recipe picker */}
          <section className="flex min-h-[300px] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-600 text-xs font-bold text-white">
                B
              </span>
              <h3 className="text-sm font-semibold text-slate-800">Food &amp; recipe database</h3>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-3">
              <label className="flex min-w-[140px] flex-1 items-center gap-2 text-xs font-medium text-slate-600">
                Section
                <select
                  value={section}
                  onChange={(e) => setSection(e.target.value)}
                  className="flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-800 shadow-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                >
                  {sectionOptions.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={() => setFavoritesOnly((v) => !v)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  favoritesOnly
                    ? 'bg-amber-100 text-amber-900 ring-1 ring-amber-300'
                    : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Star size={13} className={favoritesOnly ? 'fill-amber-500 text-amber-500' : ''} />
                Favorites
              </button>
            </div>

            <div className="relative border-b border-slate-100 px-4 py-3">
              <Search size={16} className="pointer-events-none absolute left-7 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search food or recipe…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100"
              />
            </div>

            <ul className="min-h-0 flex-1 overflow-y-auto">
              {filteredFoods.length === 0 ? (
                <li className="px-4 py-10 text-center text-sm text-slate-500">
                  No items match your filters
                </li>
              ) : (
                filteredFoods.map((item) => {
                  const selected = highlightedFood?.id === item.id;
                  const isRecipe = item.kind === 'recipe';
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => setHighlightedFood(item)}
                        className={`flex w-full items-center gap-3 border-b border-slate-50 px-4 py-2.5 text-left transition ${
                          selected
                            ? 'bg-amber-50 ring-1 ring-inset ring-amber-200'
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        <span
                          className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                            isRecipe
                              ? 'bg-violet-100 text-violet-700'
                              : 'bg-sky-100 text-sky-700'
                          }`}
                        >
                          {isRecipe ? 'Recipe' : 'Food'}
                        </span>
                        <span className={`min-w-0 flex-1 truncate text-sm ${selected ? 'font-semibold text-slate-900' : 'text-slate-700'}`}>
                          {item.name}
                        </span>
                        <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium tabular-nums text-slate-600">
                          {item.per100.calories.toFixed(0)} kcal
                          <span className="text-slate-400">/100g</span>
                        </span>
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
            <div className="border-t border-slate-100 px-4 py-2 text-[11px] text-slate-400">
              {filteredFoods.length} item{filteredFoods.length !== 1 ? 's' : ''} · names in {langDisplay}
            </div>
          </section>

          {/* D — cart */}
          <section className="flex min-h-[300px] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-600 text-xs font-bold text-white">
                  D
                </span>
                <h3 className="text-sm font-semibold text-slate-800">Current meal</h3>
                {cart.length > 0 && (
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                    {cart.length} item{cart.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={resetBuilder}
                className="text-xs font-medium text-slate-500 underline-offset-2 hover:text-red-600 hover:underline"
              >
                Reset
              </button>
            </div>

            <div className="min-h-0 flex-1 p-3">
              {cart.length === 0 ? (
                <div className="flex h-full min-h-[180px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-200 bg-slate-50/80 p-6 text-center">
                  <ShoppingBasket className="text-slate-300" size={32} />
                  <p className="text-sm font-medium text-slate-500">No entries yet</p>
                  <p className="text-xs text-slate-400">Pick a food, set quantity (C), then add to meal</p>
                </div>
              ) : (
                <DietBuilderNutrientGrid
                  rows={cart.map((c) => ({
                    id: c.id,
                    selected: c.selected,
                    name: c.name,
                    grams: c.grams,
                    nutrients: c.nutrients,
                  }))}
                  totalRow={cartTotal}
                  showCheckbox
                  onToggleSelect={toggleCartSelect}
                  onToggleAll={toggleCartAll}
                  allSelected={cartAllSelected}
                  maxHeight="100%"
                />
              )}
            </div>

            <div className="flex flex-wrap items-center gap-4 border-t border-slate-100 px-4 py-2.5 text-xs">
              <button
                type="button"
                onClick={deleteCartSelected}
                className="font-medium text-slate-600 hover:text-red-600"
              >
                Delete selected
              </button>
              <button
                type="button"
                onClick={setCartSelectedAsFav}
                className="font-medium text-slate-600 hover:text-amber-700"
              >
                Mark selected as favorite
              </button>
            </div>
          </section>
        </div>

        {/* C — quantity */}
        <div className="shrink-0 border-t border-slate-200 bg-white px-5 py-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-600 text-xs font-bold text-white">
                C
              </span>
              <span className="text-sm font-semibold text-slate-800">Quantity</span>
            </div>

            <div className="flex items-center gap-2">
              <Scale size={16} className="text-slate-400" />
              <input
                type="text"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-24 rounded-xl border border-slate-200 px-3 py-2 text-sm tabular-nums shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                placeholder="250"
                aria-label="Amount"
              />
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value as DietframeAmountUnit)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              >
                {UNITS.map((u) => (
                  <option key={u.value} value={u.value}>
                    {u.label}
                  </option>
                ))}
              </select>
            </div>

            {previewNutrients && (
              <div className="rounded-xl bg-emerald-50 px-4 py-2 text-sm text-emerald-900 ring-1 ring-emerald-100">
                <span className="font-medium">Calories:</span>{' '}
                <strong className="tabular-nums">{formatNutrient(previewNutrients.calories, 'calories')}</strong>
                {previewGrams > 0 && (
                  <span className="ml-2 text-emerald-700/70">({previewGrams.toFixed(1)} g)</span>
                )}
              </div>
            )}

            {highlightedFood && (
              <p className="text-xs text-slate-500">
                Selected: <span className="font-medium text-slate-700">{highlightedFood.name}</span>
              </p>
            )}

            <button
              type="button"
              onClick={handleConfirmAdd}
              disabled={!highlightedFood}
              className="ml-auto inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Add to meal
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* E — archive */}
        <section className="shrink-0 border-t border-slate-200 bg-white">
          <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-5 py-2.5">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-600 text-xs font-bold text-white">
              E
            </span>
            <Archive size={14} className="text-slate-500" />
            <h3 className="text-sm font-semibold text-slate-800">Saved meals archive</h3>
          </div>

          <div className="flex flex-wrap items-center gap-2 px-5 py-3">
            {(['day', 'week', 'list'] as DietArchiveFilter[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setArchiveFilter(mode)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition ${
                  archiveFilter === mode
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {mode === 'list' ? 'List' : mode}
              </button>
            ))}
            <span className="hidden text-slate-300 sm:inline">|</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs shadow-sm"
              title="From date"
            />
            <span className="text-xs text-slate-400">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs shadow-sm"
              title="To date"
            />
            <button
              type="button"
              onClick={() => setArchiveFilter('list')}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Go
            </button>
            <button
              type="button"
              onClick={() => setShowTotalsModal(true)}
              className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-amber-600"
            >
              Totals
            </button>
            <button
              type="button"
              onClick={deleteArchiveSelected}
              className="ml-auto text-xs font-medium text-red-600 hover:text-red-700"
            >
              Delete selected
            </button>
          </div>

          <div className="max-h-[160px] overflow-y-auto px-5 pb-3">
            {visibleArchive.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-400">No archived meals for this filter</p>
            ) : (
              <DietBuilderNutrientGrid
                compact
                maxHeight="140px"
                showCheckbox
                prefixHeaders={['Date', 'Meal']}
                rows={visibleArchive.map((e) => ({
                  id: e.id,
                  selected: archiveSelection.has(e.id),
                  name: e.foodDescription,
                  grams: e.totalGrams,
                  nutrients: e.nutrients,
                  prefixCells: [formatArchiveDate(e.savedAt), e.mealLabel],
                }))}
                onToggleSelect={toggleArchiveSelect}
              />
            )}
          </div>
        </section>

        {error && (
          <div className="shrink-0 border-t border-red-100 bg-red-50 px-5 py-2.5 text-sm text-red-700">{error}</div>
        )}

        <div className="flex shrink-0 justify-end gap-3 border-t border-slate-200 bg-white px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || cart.length === 0}
            className="rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isSaving ? 'Saving…' : 'Save meal'}
          </button>
        </div>
      </div>

      {showTotalsModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="max-h-[80vh] w-full max-w-4xl overflow-auto rounded-2xl bg-white p-5 shadow-2xl ring-1 ring-slate-200">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-bold text-slate-900">
                Archive totals —{' '}
                {archiveFilter === 'day' ? 'Today' : archiveFilter === 'week' ? 'This week' : 'Filtered list'} (
                {visibleArchive.length} entries)
              </h3>
              <button
                type="button"
                onClick={() => setShowTotalsModal(false)}
                className="rounded-lg p-1.5 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>
            <DietBuilderNutrientGrid
              rows={[
                {
                  id: 'totals',
                  name: 'Combined total',
                  grams: visibleArchive.reduce((s, e) => s + e.totalGrams, 0),
                  nutrients: archiveTotals,
                },
              ]}
              maxHeight="320px"
            />
          </div>
        </div>
      )}
    </div>
  );
}

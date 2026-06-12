'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Search, Star, ShoppingBasket, Scale, ChevronRight } from 'lucide-react';
import {
  FOOD_CATALOG,
  FoodCatalogItem,
  amountToGrams,
  scaleNutrients,
} from '@/data/nutritionFoodCatalog';
import DietBuilderNutrientGrid from '@/components/nutrition/modals/DietBuilderNutrientGrid';
import {
  ALL_FOODS_RECIPES_SECTION,
  buildSectionOptions,
  catalogItemSearchText,
  localizeCatalog,
} from '@/lib/dietBuilderCatalog';
import { formatNutrient, sumNutrientTotals } from '@/utils/nutritionMealTotals';
import {
  DietBuilderCartLine,
  DietframeAmountUnit,
} from '@/utils/dietframePayload';
import {
  getToolsProfileLanguageDisplayName,
} from '@/utils/toolsProfileLanguage';
import {
  loadFavoriteFoodIds,
  saveFavoriteFoodIds,
} from '@/utils/dietBuilderArchive';

const UNITS: { value: DietframeAmountUnit; label: string }[] = [
  { value: 'g', label: 'g' },
  { value: 'oz', label: 'oz' },
  { value: 'lb', label: 'lb' },
  { value: 'ml', label: 'ml' },
  { value: 'pc', label: 'pc' },
];

export interface DietBuilderFoodPickerConfig {
  cartTitle?: string;
  addButtonLabel?: string;
  emptyCartHint?: string;
  databaseTitle?: string;
  foodsOnly?: boolean;
  excludeIds?: string[];
}

interface DietBuilderFoodPickerProps {
  displayLanguage: string;
  cart: DietBuilderCartLine[];
  onCartChange: (cart: DietBuilderCartLine[]) => void;
  config?: DietBuilderFoodPickerConfig;
}

function newCartId() {
  return `cart-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function DietBuilderFoodPicker({
  displayLanguage,
  cart,
  onCartChange,
  config = {},
}: DietBuilderFoodPickerProps) {
  const {
    cartTitle = 'Current meal',
    addButtonLabel = 'Add to meal',
    emptyCartHint = 'Pick a food, set quantity (C), then add to meal',
    databaseTitle = 'Food & recipe database',
    foodsOnly = false,
    excludeIds = [],
  } = config;

  const [foodCatalog, setFoodCatalog] = useState<FoodCatalogItem[]>(FOOD_CATALOG);
  const [sectionMeta, setSectionMeta] = useState<{ name: string; nameTranslations?: string | null }[]>([]);
  const [section, setSection] = useState<string>(ALL_FOODS_RECIPES_SECTION);
  const [search, setSearch] = useState('');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [highlightedFood, setHighlightedFood] = useState<FoodCatalogItem | null>(null);
  const [amount, setAmount] = useState('100');
  const [unit, setUnit] = useState<DietframeAmountUnit>('g');
  const [error, setError] = useState<string | null>(null);

  const langDisplay = getToolsProfileLanguageDisplayName(displayLanguage);

  useEffect(() => {
    setFavoriteIds(loadFavoriteFoodIds());
    fetch(`/api/food-database/catalog?lang=${encodeURIComponent(displayLanguage)}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.catalog) && data.catalog.length > 0) {
          setFoodCatalog(localizeCatalog(data.catalog, displayLanguage));
          setSectionMeta(Array.isArray(data.sections) ? data.sections : []);
        } else {
          setFoodCatalog(localizeCatalog(FOOD_CATALOG, displayLanguage));
          setSectionMeta([]);
        }
      })
      .catch(() => {
        setFoodCatalog(localizeCatalog(FOOD_CATALOG, displayLanguage));
        setSectionMeta([]);
      });
  }, [displayLanguage]);

  const catalogForPicker = useMemo(() => {
    let items = foodCatalog;
    if (foodsOnly) items = items.filter((item) => item.kind !== 'recipe');
    if (excludeIds.length > 0) {
      const excluded = new Set(excludeIds);
      items = items.filter((item) => !excluded.has(item.id));
    }
    return items;
  }, [foodCatalog, foodsOnly, excludeIds]);

  const sectionOptions = useMemo(
    () => buildSectionOptions(catalogForPicker, displayLanguage, sectionMeta),
    [catalogForPicker, displayLanguage, sectionMeta]
  );

  const filteredFoods = useMemo(() => {
    const q = search.trim().toLowerCase();
    return catalogForPicker.filter((item) => {
      if (section !== ALL_FOODS_RECIPES_SECTION) {
        if (item.sectionName) {
          if (item.sectionName !== section) return false;
        } else if (item.section !== section) return false;
      }
      if (favoritesOnly && !favoriteIds.includes(item.id)) return false;
      if (!q) return true;
      return catalogItemSearchText(item).includes(q);
    });
  }, [catalogForPicker, section, search, favoritesOnly, favoriteIds]);

  const parsedAmount = parseFloat(amount.replace(',', '.'));
  const previewGrams =
    highlightedFood && parsedAmount > 0 ? amountToGrams(parsedAmount, unit) : 0;
  const previewNutrients =
    highlightedFood && previewGrams > 0
      ? scaleNutrients(highlightedFood.per100, previewGrams)
      : null;

  const cartTotal = useMemo(() => sumNutrientTotals(cart.map((c) => c.nutrients)), [cart]);
  const cartAllSelected = cart.length > 0 && cart.every((c) => c.selected);

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
    onCartChange([
      ...cart,
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

  const toggleCartSelect = (id: string) => {
    onCartChange(cart.map((c) => (c.id === id ? { ...c, selected: !c.selected } : c)));
  };

  const toggleCartAll = (checked: boolean) => {
    onCartChange(cart.map((c) => ({ ...c, selected: checked })));
  };

  const deleteCartSelected = () => {
    onCartChange(cart.filter((c) => !c.selected));
  };

  const setCartSelectedAsFav = () => {
    const ids = new Set(favoriteIds);
    cart.filter((c) => c.selected).forEach((c) => ids.add(c.catalogItem.id));
    const next = Array.from(ids);
    setFavoriteIds(next);
    saveFavoriteFoodIds(next);
  };

  const resetCart = () => {
    onCartChange([]);
    setHighlightedFood(null);
    setAmount('100');
    setError(null);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-hidden lg:grid-cols-2">
        {/* B — food / recipe picker */}
        <section className="flex min-h-[300px] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-3">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-600 text-xs font-bold text-white">
              B
            </span>
            <h3 className="text-sm font-semibold text-slate-800">{databaseTitle}</h3>
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
            <Search
              size={16}
              className="pointer-events-none absolute left-7 top-1/2 -translate-y-1/2 text-slate-400"
            />
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
              <li className="px-4 py-10 text-center text-sm text-slate-500">No items match your filters</li>
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
                          isRecipe ? 'bg-violet-100 text-violet-700' : 'bg-sky-100 text-sky-700'
                        }`}
                      >
                        {isRecipe ? 'Recipe' : 'Food'}
                      </span>
                      <span
                        className={`min-w-0 flex-1 truncate text-sm ${
                          selected ? 'font-semibold text-slate-900' : 'text-slate-700'
                        }`}
                      >
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
              <h3 className="text-sm font-semibold text-slate-800">{cartTitle}</h3>
              {cart.length > 0 && (
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                  {cart.length} item{cart.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={resetCart}
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
                <p className="text-xs text-slate-400">{emptyCartHint}</p>
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
              <strong className="tabular-nums">
                {formatNutrient(previewNutrients.calories, 'calories')}
              </strong>
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
            {addButtonLabel}
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {error && (
        <div className="shrink-0 border-t border-red-100 bg-red-50 px-5 py-2.5 text-sm text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}

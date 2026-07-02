'use client';

import React, { useEffect, useMemo, useState } from 'react';
import DietBuilderNutrientGrid from '@/components/nutrition/modals/DietBuilderNutrientGrid';
import {
  buildRecipeIngredientGrid,
  buildRecipeIngredientGridFromCatalog,
  RecipeComponentInput,
} from '@/lib/adminRecipeIngredients';
import { parseTranslations } from '@/lib/foodDatabaseTranslations';
import { FOOD_CATALOG, FoodCatalogItem } from '@/data/nutritionFoodCatalog';
import { localizeCatalog } from '@/lib/dietBuilderCatalog';

export type RecipeDetailTab = 'ingredients' | 'preparation';

interface AdminRecipeDetailsExpandProps {
  components: RecipeComponentInput[];
  foodItems: { id: string; name: string; [key: string]: unknown }[];
  preparationTranslations?: string | null;
  description?: string | null;
  displayLanguage: string;
  activeTab: RecipeDetailTab;
  onTabChange: (tab: RecipeDetailTab) => void;
  /** When true (title click), show ingredients + preparation together. */
  showCombined?: boolean;
  onOpenPreparation?: () => void;
}

export default function AdminRecipeDetailsExpand({
  components,
  foodItems,
  preparationTranslations,
  description,
  displayLanguage,
  activeTab,
  onTabChange,
  showCombined = false,
  onOpenPreparation,
}: AdminRecipeDetailsExpandProps) {
  const [catalog, setCatalog] = useState<FoodCatalogItem[]>([]);
  const [catalogReady, setCatalogReady] = useState(false);

  useEffect(() => {
    fetch(`/api/food-database/catalog?lang=${encodeURIComponent(displayLanguage)}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.catalog) && data.catalog.length > 0) {
          setCatalog(localizeCatalog(data.catalog, displayLanguage));
        } else {
          setCatalog(localizeCatalog(FOOD_CATALOG, displayLanguage));
        }
      })
      .catch(() => setCatalog(localizeCatalog(FOOD_CATALOG, displayLanguage)))
      .finally(() => setCatalogReady(true));
  }, [displayLanguage]);

  const { rows, total } = useMemo(() => {
    if (catalogReady && catalog.length > 0) {
      return buildRecipeIngredientGridFromCatalog(components, catalog);
    }
    return buildRecipeIngredientGrid(components, foodItems);
  }, [components, catalog, catalogReady, foodItems]);

  const preparationHtml = useMemo(() => {
    const prep = parseTranslations(preparationTranslations);
    const code = displayLanguage || 'en';
    return prep[code] || prep.en || description || '';
  }, [preparationTranslations, description, displayLanguage]);

  const hasPreparation = preparationHtml.replace(/<[^>]*>/g, '').trim().length > 0;
  const hasComponents = components.length > 0;

  const showIngredients = showCombined || activeTab === 'ingredients';
  const showPreparation = showCombined || activeTab === 'preparation';

  const ingredientsPanel = hasComponents ? (
    <div className="w-full min-w-0 overflow-x-auto">
      <DietBuilderNutrientGrid
        rows={rows}
        totalRow={total}
        maxHeight="none"
        nameColumnLabel="Ingredients"
        stickyLeadColumns
      />
    </div>
  ) : (
    <p className="text-sm text-gray-500 py-8 text-center px-4">
      No ingredients listed for this recipe.
    </p>
  );

  const preparationPanel = (
    <div className="p-4 space-y-4">
      {hasPreparation ? (
        <div
          className="prose prose-sm max-w-none bg-white border border-gray-200 rounded p-4"
          dangerouslySetInnerHTML={{ __html: preparationHtml }}
        />
      ) : (
        <p className="text-sm text-gray-500 py-4 text-center">No preparation instructions yet.</p>
      )}
      {onOpenPreparation && (
        <div className="flex justify-center border-t border-gray-200 pt-4">
          <button
            type="button"
            onClick={onOpenPreparation}
            className="text-[#0066cc] underline font-medium text-sm"
          >
            Preparation in the languages supported
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="bg-white border-t-2 border-gray-400">
      <div className="flex border-b border-gray-300">
        <button
          type="button"
          onClick={() => onTabChange('ingredients')}
          className={`px-6 py-2.5 text-sm font-semibold border-r border-gray-300 transition ${
            showCombined || activeTab === 'ingredients'
              ? 'bg-gray-900 text-white'
              : 'bg-gradient-to-b from-gray-100 to-gray-200 text-gray-800 hover:from-gray-200 hover:to-gray-300'
          }`}
        >
          Ingredients
        </button>
        <button
          type="button"
          onClick={() => onTabChange('preparation')}
          className={`px-6 py-2.5 text-sm font-semibold transition ${
            !showCombined && activeTab === 'preparation'
              ? 'bg-gray-900 text-white'
              : 'bg-gradient-to-b from-gray-100 to-gray-200 text-gray-800 hover:from-gray-200 hover:to-gray-300'
          }`}
        >
          Preparation
        </button>
      </div>

      <div className="max-h-[min(70vh,640px)] overflow-y-auto">
        {showIngredients && (
          <section className={showCombined && showPreparation ? 'border-b border-gray-200' : undefined}>
            {ingredientsPanel}
          </section>
        )}
        {showPreparation && <section>{preparationPanel}</section>}
      </div>
    </div>
  );
}

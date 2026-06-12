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

type DetailTab = 'ingredients' | 'preparation';

interface AdminRecipeDetailsExpandProps {
  components: RecipeComponentInput[];
  foodItems: { id: string; name: string; [key: string]: unknown }[];
  preparationTranslations?: string | null;
  description?: string | null;
  displayLanguage: string;
  activeTab: DetailTab;
  onTabChange: (tab: DetailTab) => void;
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

  return (
    <div className="bg-white border-t-2 border-gray-400">
      <div className="flex border-b border-gray-300">
        <button
          type="button"
          onClick={() => onTabChange('ingredients')}
          className={`px-6 py-2.5 text-sm font-semibold border-r border-gray-300 transition ${
            activeTab === 'ingredients'
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
            activeTab === 'preparation'
              ? 'bg-gray-900 text-white'
              : 'bg-gradient-to-b from-gray-100 to-gray-200 text-gray-800 hover:from-gray-200 hover:to-gray-300'
          }`}
        >
          Preparation
        </button>
      </div>

      {activeTab === 'ingredients' ? (
        components.length === 0 ? (
          <p className="text-sm text-gray-500 py-8 text-center">No ingredients listed for this recipe.</p>
        ) : (
          <div className="w-full min-w-0 overflow-x-auto">
            <DietBuilderNutrientGrid
              rows={rows}
              totalRow={total}
              maxHeight="none"
              nameColumnLabel="Ingredients"
              stickyLeadColumns
            />
          </div>
        )
      ) : (
        <div className="p-4">
          {hasPreparation ? (
            <div
              className="prose prose-sm max-w-none bg-white border border-gray-200 rounded p-4"
              dangerouslySetInnerHTML={{ __html: preparationHtml }}
            />
          ) : (
            <div className="text-sm text-gray-500 py-8 text-center space-y-2">
              <p>No preparation instructions yet.</p>
              {onOpenPreparation && (
                <button
                  type="button"
                  onClick={onOpenPreparation}
                  className="text-[#0066cc] underline font-medium"
                >
                  Preparation in the languages supported
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

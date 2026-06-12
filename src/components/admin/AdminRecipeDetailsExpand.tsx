'use client';

import React, { useMemo } from 'react';
import DietBuilderNutrientGrid from '@/components/nutrition/modals/DietBuilderNutrientGrid';
import { buildRecipeIngredientGrid, RecipeComponentInput } from '@/lib/adminRecipeIngredients';
import { parseTranslations } from '@/lib/foodDatabaseTranslations';

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
  const { rows, total } = useMemo(
    () => buildRecipeIngredientGrid(components, foodItems),
    [components, foodItems]
  );

  const preparationHtml = useMemo(() => {
    const prep = parseTranslations(preparationTranslations);
    const code = displayLanguage || 'en';
    return prep[code] || prep.en || description || '';
  }, [preparationTranslations, description, displayLanguage]);

  const hasPreparation = preparationHtml.replace(/<[^>]*>/g, '').trim().length > 0;

  return (
    <div className="border-t-2 border-gray-300 bg-gray-50">
      <div className="flex border-b border-gray-300">
        <button
          type="button"
          onClick={() => onTabChange('ingredients')}
          className={`px-5 py-2 text-sm font-semibold border-r border-gray-300 ${
            activeTab === 'ingredients'
              ? 'bg-gray-700 text-white'
              : 'bg-gradient-to-b from-gray-100 to-gray-200 text-gray-800 hover:from-gray-200 hover:to-gray-300'
          }`}
        >
          Ingredients
        </button>
        <button
          type="button"
          onClick={() => onTabChange('preparation')}
          className={`px-5 py-2 text-sm font-semibold ${
            activeTab === 'preparation'
              ? 'bg-gray-700 text-white'
              : 'bg-gradient-to-b from-gray-100 to-gray-200 text-gray-800 hover:from-gray-200 hover:to-gray-300'
          }`}
        >
          Preparation
        </button>
      </div>

      <div className="p-3">
        {activeTab === 'ingredients' ? (
          components.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">No ingredients listed for this recipe.</p>
          ) : (
            <DietBuilderNutrientGrid
              rows={rows}
              totalRow={total}
              compact
              maxHeight="none"
              nameColumnLabel="Ingredients"
            />
          )
        ) : hasPreparation ? (
          <div
            className="prose prose-sm max-w-none bg-white border border-gray-200 rounded p-4"
            dangerouslySetInnerHTML={{ __html: preparationHtml }}
          />
        ) : (
          <div className="text-sm text-gray-500 py-6 text-center space-y-2">
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
    </div>
  );
}

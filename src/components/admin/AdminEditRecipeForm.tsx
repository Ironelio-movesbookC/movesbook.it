'use client';

import React, { useState } from 'react';
import { X, Languages, ChefHat, UtensilsCrossed, Globe } from 'lucide-react';
import { dbRowToNutrients, nutrientsToDb } from '@/lib/foodDatabase.types';
import {
  buildTranslationsFromEnglish,
  parseTranslations,
  TranslationMap,
} from '@/lib/foodDatabaseTranslations';
import AdminFoodTranslationsModal from '@/components/admin/AdminFoodTranslationsModal';
import AdminRecipeIngredientBuilder from '@/components/admin/AdminRecipeIngredientBuilder';
import type { FoodEditSection } from '@/components/admin/AdminEditFoodForm';
import { NutrientTotals } from '@/utils/nutritionMealTotals';
import { getToolsProfileLanguageDisplayName } from '@/utils/toolsProfileLanguage';

export interface RecipeComponent {
  name: string;
  grams: number;
  foodItemId?: string | null;
}

export interface RecipeEditItem {
  id: string;
  sectionId: string;
  name: string;
  description?: string | null;
  nameTranslations?: string | null;
  preparationTranslations?: string | null;
  components: RecipeComponent[];
  [key: string]: unknown;
}

interface AdminEditRecipeFormProps {
  recipe: RecipeEditItem;
  sections: FoodEditSection[];
  displayLanguage?: string;
  isNew?: boolean;
  saving?: boolean;
  onChange: (recipe: RecipeEditItem) => void;
  onClose: () => void;
  onSave: () => void;
  onOpenPreparation?: (recipeId: string) => void;
}

export default function AdminEditRecipeForm({
  recipe,
  sections,
  displayLanguage = 'en',
  isNew = false,
  saving = false,
  onChange,
  onClose,
  onSave,
  onOpenPreparation,
}: AdminEditRecipeFormProps) {
  const [nameLangOpen, setNameLangOpen] = useState(false);
  const [savingLang, setSavingLang] = useState(false);

  const nameTranslations = parseTranslations(recipe.nameTranslations);
  const prepTranslations = parseTranslations(recipe.preparationTranslations);
  const prepEn = prepTranslations.en || recipe.description || '';
  const canOpenPreparation = !!recipe.id && !!onOpenPreparation;
  const langDisplay = getToolsProfileLanguageDisplayName(displayLanguage);

  const hasIngredients =
    recipe.components.length > 0 && recipe.components.some((c) => (Number(c.grams) || 0) > 0);

  const sectionLabel =
    sections.find((s) => s.id === recipe.sectionId)?.name || '—';

  const handleIngredientsChange = (components: RecipeComponent[], totalNutrients: NutrientTotals) => {
    onChange({
      ...recipe,
      components,
      ...nutrientsToDb(totalNutrients),
    });
  };

  const persistNameTranslations = async (map: TranslationMap) => {
    onChange({
      ...recipe,
      nameTranslations: JSON.stringify(map),
      ...(map.en ? { name: map.en } : {}),
    });
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-2 sm:p-4 backdrop-blur-sm">
        <div className="flex max-h-[96vh] w-full max-w-7xl flex-col overflow-hidden rounded-2xl bg-slate-50 shadow-2xl ring-1 ring-slate-200">
          {/* Header — same pattern as Diet Builder */}
          <div className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4">
            <div className="flex min-w-0 flex-wrap items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600 text-white shadow-sm">
                <UtensilsCrossed size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold tracking-tight text-slate-900">
                  {isNew ? 'Add Recipe' : 'Edit Recipe'}
                </h2>
                <p className="text-xs text-slate-500">
                  Select foods, set quantity, build the recipe — same workflow as Diet Builder
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="hidden items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 sm:inline-flex">
                <Globe size={12} />
                {langDisplay}
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

          {/* Recipe metadata strip */}
          <div className="shrink-0 border-b border-slate-200 bg-white px-5 py-3">
            <div className="flex flex-wrap items-end gap-4">
              <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                Food Section
                <select
                  value={recipe.sectionId}
                  onChange={(e) => onChange({ ...recipe, sectionId: e.target.value })}
                  className="min-w-[160px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm"
                >
                  {sections.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex min-w-[200px] flex-1 flex-col gap-1 text-xs font-medium text-slate-600">
                Recipe Name
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    value={recipe.name}
                    onChange={(e) =>
                      onChange({
                        ...recipe,
                        name: e.target.value.toUpperCase(),
                        nameTranslations: JSON.stringify(
                          buildTranslationsFromEnglish(e.target.value, nameTranslations)
                        ),
                      })
                    }
                    className="flex-1 min-w-[180px] rounded-lg border border-slate-200 px-3 py-2 text-sm uppercase shadow-sm"
                    placeholder="RICE AND PEAS"
                  />
                  <button
                    type="button"
                    onClick={() => setNameLangOpen(true)}
                    className="inline-flex items-center gap-1 text-xs text-violet-700 underline"
                  >
                    <Languages className="w-3.5 h-3.5" />
                    Other languages
                  </button>
                </div>
              </label>

              {recipe.name.trim() && (
                <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-800">
                  {recipe.name || sectionLabel}
                </span>
              )}
            </div>
          </div>

          {/* B + D + C — Diet Builder picker */}
          <div className="min-h-0 flex-1 overflow-hidden p-4">
            <AdminRecipeIngredientBuilder
              components={recipe.components}
              displayLanguage={displayLanguage}
              onChange={handleIngredientsChange}
            />
          </div>

          {/* Preparation */}
          <div className="shrink-0 border-t border-slate-200 bg-white px-5 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-800">Preparation</p>
                <p className="text-xs text-slate-500">
                  {!recipe.id
                    ? 'Save the recipe with ingredients first, then add preparation instructions.'
                    : prepEn.trim()
                      ? 'Instructions saved.'
                      : 'No preparation instructions yet.'}
                </p>
              </div>
              <button
                type="button"
                disabled={!canOpenPreparation}
                onClick={() => onOpenPreparation?.(recipe.id)}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-violet-700 hover:bg-violet-50 disabled:opacity-40"
              >
                <ChefHat className="w-4 h-4" />
                Preparation in the languages supported
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-3 border-t border-slate-200 bg-white px-5 py-4">
            {!hasIngredients && (
              <p className="mr-auto text-xs text-amber-700">
                Add at least one food with quantity before saving.
              </p>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={saving || !recipe.name.trim() || !hasIngredients}
              className="rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {saving ? 'Saving…' : 'Save recipe'}
            </button>
          </div>
        </div>
      </div>

      <AdminFoodTranslationsModal
        isOpen={nameLangOpen}
        title="Recipe Name"
        translations={buildTranslationsFromEnglish(recipe.name, nameTranslations)}
        onClose={() => setNameLangOpen(false)}
        saving={savingLang}
        onSave={async (map) => {
          setSavingLang(true);
          await persistNameTranslations(map);
          setSavingLang(false);
          setNameLangOpen(false);
        }}
      />
    </>
  );
}

export function recipeToSavePayload(recipe: RecipeEditItem) {
  const nutrientTotals = dbRowToNutrients(recipe as unknown as Record<string, unknown>);
  return {
    sectionId: recipe.sectionId,
    name: recipe.name,
    description: recipe.description,
    components: recipe.components,
    per100: nutrientTotals,
    nameTranslations: recipe.nameTranslations
      ? parseTranslations(recipe.nameTranslations)
      : buildTranslationsFromEnglish(recipe.name),
    preparationTranslations: recipe.preparationTranslations
      ? parseTranslations(recipe.preparationTranslations)
      : recipe.description
        ? { en: recipe.description }
        : {},
  };
}

'use client';

import React, { useState } from 'react';
import { X, Languages, ChefHat } from 'lucide-react';
import { dbRowToNutrients } from '@/lib/foodDatabase.types';
import {
  buildTranslationsFromEnglish,
  parseTranslations,
  TranslationMap,
} from '@/lib/foodDatabaseTranslations';
import AdminFoodTranslationsModal from '@/components/admin/AdminFoodTranslationsModal';
import type { FoodEditSection } from '@/components/admin/AdminEditFoodForm';

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
  isNew?: boolean;
  saving?: boolean;
  onChange: (recipe: RecipeEditItem) => void;
  onClose: () => void;
  onSave: () => void;
  onOpenPreparation?: (recipeId: string) => void;
}

function FormRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <tr>
      <td className="py-2 pr-4 align-top whitespace-nowrap">
        <span className="text-[#0066cc] font-medium text-sm">{label}</span>
      </td>
      <td className="py-2 w-full">{children}</td>
    </tr>
  );
}

export default function AdminEditRecipeForm({
  recipe,
  sections,
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

  const updateComponents = (components: RecipeComponent[]) => {
    onChange({ ...recipe, components });
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
      <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 overflow-y-auto py-8 px-4">
        <div className="bg-white w-full max-w-[720px] shadow-lg border border-gray-200">
          <div className="flex items-center justify-between px-6 pt-5 pb-2 border-b">
            <h2 className="text-xl font-normal">{isNew ? 'Add Recipe' : 'Edit Recipe'}</h2>
            <button type="button" onClick={onClose} aria-label="Close">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="px-6 py-5">
            <table className="w-full border-collapse">
              <tbody>
                <FormRow label="Food Section">
                  <select
                    value={recipe.sectionId}
                    onChange={(e) => onChange({ ...recipe, sectionId: e.target.value })}
                    className="w-full max-w-md border border-gray-300 rounded-sm px-2 py-1.5 text-sm"
                  >
                    {sections.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </FormRow>

                <FormRow label="Recipe Name">
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
                      className="flex-1 min-w-[200px] border border-gray-300 rounded-sm px-2 py-1.5 text-sm uppercase"
                    />
                    <button
                      type="button"
                      onClick={() => setNameLangOpen(true)}
                      className="inline-flex items-center gap-1 text-sm text-[#0066cc] underline"
                    >
                      <Languages className="w-4 h-4" />
                      Other languages
                    </button>
                  </div>
                </FormRow>

                <FormRow label="Ingredients">
                  <div className="space-y-2">
                    {recipe.components.map((c, idx) => (
                      <div key={idx} className="flex gap-2">
                        <input
                          type="text"
                          value={c.name}
                          onChange={(e) => {
                            const next = [...recipe.components];
                            next[idx] = { ...c, name: e.target.value };
                            updateComponents(next);
                          }}
                          className="flex-1 border border-gray-300 rounded-sm px-2 py-1 text-sm"
                          placeholder="Food name"
                        />
                        <input
                          type="number"
                          value={c.grams}
                          onChange={(e) => {
                            const next = [...recipe.components];
                            next[idx] = { ...c, grams: parseFloat(e.target.value) || 0 };
                            updateComponents(next);
                          }}
                          className="w-24 border border-gray-300 rounded-sm px-2 py-1 text-sm"
                          placeholder="g"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            updateComponents(recipe.components.filter((_, i) => i !== idx))
                          }
                          className="text-red-600 text-xs px-2"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() =>
                        updateComponents([...recipe.components, { name: '', grams: 0 }])
                      }
                      className="text-sm text-[#0066cc] underline"
                    >
                      + Add ingredient
                    </button>
                  </div>
                </FormRow>

                <FormRow label="Preparation">
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">
                      {!recipe.id
                        ? 'Save the recipe first, then edit preparation in the supported languages.'
                        : prepEn.trim()
                          ? 'Instructions saved. Open the preparation editor to update or translate them.'
                          : 'No preparation instructions yet.'}
                    </p>
                    <button
                      type="button"
                      disabled={!canOpenPreparation}
                      onClick={() => onOpenPreparation?.(recipe.id)}
                      className="inline-flex items-center gap-1 text-sm text-[#0066cc] underline disabled:text-gray-400 disabled:no-underline disabled:cursor-not-allowed"
                    >
                      <ChefHat className="w-4 h-4" />
                      Preparation in the languages supported
                    </button>
                  </div>
                </FormRow>
              </tbody>
            </table>

            <div className="mt-6">
              <button
                type="button"
                onClick={onSave}
                disabled={saving || !recipe.name.trim()}
                className="bg-[#c0392b] hover:bg-[#a93226] disabled:opacity-50 text-white font-semibold px-8 py-2 rounded-sm text-sm"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
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
  return {
    sectionId: recipe.sectionId,
    name: recipe.name,
    description: recipe.description,
    components: recipe.components,
    per100: dbRowToNutrients(recipe as unknown as Record<string, unknown>),
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

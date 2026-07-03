'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FOOD_CATALOG } from '@/data/nutritionFoodCatalog';
import DietBuilderFoodPicker from '@/components/nutrition/modals/DietBuilderFoodPicker';
import { localizeCatalog } from '@/lib/dietBuilderCatalog';
import {
  RecipeComponentInput,
  cartLinesToComponents,
  componentsToCartLines,
  recipeNutrientsFromCart,
} from '@/lib/adminRecipeIngredients';
import { NutrientTotals } from '@/utils/nutritionMealTotals';
import { DietBuilderCartLine } from '@/utils/dietframePayload';

interface AdminRecipeIngredientBuilderProps {
  components: RecipeComponentInput[];
  displayLanguage?: string;
  onChange: (components: RecipeComponentInput[], totalNutrients: NutrientTotals) => void;
}

export default function AdminRecipeIngredientBuilder({
  components,
  displayLanguage = 'en',
  onChange,
}: AdminRecipeIngredientBuilderProps) {
  const [foodCatalog, setFoodCatalog] = useState(FOOD_CATALOG);
  const [catalogReady, setCatalogReady] = useState(false);
  const [cart, setCart] = useState<DietBuilderCartLine[]>([]);

  useEffect(() => {
    fetch(`/api/food-database/catalog?lang=${encodeURIComponent(displayLanguage)}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.catalog) && data.catalog.length > 0) {
          setFoodCatalog(localizeCatalog(data.catalog, displayLanguage));
        } else {
          setFoodCatalog(localizeCatalog(FOOD_CATALOG, displayLanguage));
        }
      })
      .catch(() => setFoodCatalog(localizeCatalog(FOOD_CATALOG, displayLanguage)))
      .finally(() => setCatalogReady(true));
  }, [displayLanguage]);

  const componentsKey = useMemo(() => JSON.stringify(components), [components]);

  useEffect(() => {
    if (!catalogReady) return;
    setCart(componentsToCartLines(components, foodCatalog));
  }, [catalogReady, foodCatalog, components, componentsKey]);

  const handleCartChange = useCallback(
    (lines: DietBuilderCartLine[]) => {
      setCart(lines);
      onChange(cartLinesToComponents(lines), recipeNutrientsFromCart(lines));
    },
    [onChange]
  );

  return (
    <DietBuilderFoodPicker
      displayLanguage={displayLanguage}
      cart={cart}
      onCartChange={handleCartChange}
      config={{
        cartTitle: 'Recipe ingredients',
        addButtonLabel: 'Add to recipe',
        emptyCartHint: 'Pick a food, set quantity (C), then add to recipe',
        databaseTitle: 'Food database',
        foodsOnly: true,
      }}
    />
  );
}

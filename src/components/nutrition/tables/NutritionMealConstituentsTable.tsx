'use client';

import React from 'react';
import {
  MEAL_LABELS,
  NUTRIENT_DISPLAY_COLUMNS,
  computeMealNutrients,
  extractMealFoodLines,
  formatNutrient,
  isMealEnabled,
} from '@/utils/nutritionMealTotals';

interface NutritionMealConstituentsTableProps {
  meal: any;
  mealIndex: number;
  enabled?: boolean;
  onToggleEnabled?: (enabled: boolean) => void;
}

export default function NutritionMealConstituentsTable({
  meal,
  mealIndex,
  enabled: enabledProp,
  onToggleEnabled,
}: NutritionMealConstituentsTableProps) {
  const slot = meal?.sessionNumber ?? mealIndex + 1;
  const mealLabel = MEAL_LABELS[slot] || `Meal ${slot}`;
  const enabled = enabledProp ?? isMealEnabled(meal);
  const nutrients = computeMealNutrients(meal);
  const foodLines = extractMealFoodLines(meal);

  return (
    <div className="border border-gray-200 border-t-0 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse min-w-[1200px]">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-200 px-2 py-1 text-left w-12">No</th>
              <th className="border border-gray-200 px-2 py-1 text-left w-24">Match</th>
              {NUTRIENT_DISPLAY_COLUMNS.map((col) => (
                <th key={col.key} className="border border-gray-200 px-1 py-1 text-center whitespace-nowrap">
                  {col.short || col.label}
                </th>
              ))}
              <th className="border border-gray-200 px-2 py-1 text-left min-w-[220px]">
                Content of the meal
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className={enabled ? 'bg-white' : 'bg-gray-50 opacity-60'}>
              <td className="border border-gray-200 px-2 py-2 text-center font-bold">{slot}</td>
              <td className="border border-gray-200 px-2 py-2 text-center text-red-600 font-semibold whitespace-nowrap">
                {meal?.completionRate != null
                  ? `${Math.round(meal.completionRate)}%`
                  : enabled
                    ? '—'
                    : 'off'}
              </td>
              {NUTRIENT_DISPLAY_COLUMNS.map((col) => (
                <td key={col.key} className="border border-gray-200 px-1 py-2 text-center font-medium">
                  {enabled ? formatNutrient(nutrients[col.key], col.key) : '—'}
                </td>
              ))}
              <td className="border border-gray-200 px-2 py-2 align-top">
                <div className="flex flex-col gap-2">
                  {foodLines.length === 0 ? (
                    <span className="text-gray-400 italic">No foods planned</span>
                  ) : (
                    foodLines.map((line, idx) => (
                      <div key={line.id} className="flex gap-2 items-center">
                        <input
                          type="text"
                          readOnly
                          value={line.name}
                          className="flex-1 border border-gray-300 rounded px-2 py-1 text-[11px] bg-gray-50"
                          placeholder={`Course ${idx + 1}`}
                        />
                        <span className="text-[11px] text-gray-600 whitespace-nowrap shrink-0">
                          {line.amount}
                          {line.unit !== 'pc' ? line.unit : ''}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="flex items-center gap-3 px-3 py-2 border-t border-gray-200 bg-gray-50 text-xs">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => onToggleEnabled?.(e.target.checked)}
            className="w-4 h-4"
          />
          <span className="font-semibold">Enable {mealLabel}</span>
        </label>
        <span className="text-gray-500">
          Disabled meals are excluded from the day totals in the summary row.
        </span>
      </div>
    </div>
  );
}

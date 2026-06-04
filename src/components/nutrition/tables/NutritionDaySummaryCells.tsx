'use client';

import React from 'react';
import {
  MEAL_HEADER_COLORS,
  MEAL_LABELS,
  NUTRIENT_DISPLAY_COLUMNS,
  NutrientTotals,
  formatNutrient,
} from '@/utils/nutritionMealTotals';

interface NutritionDaySummaryCellsProps {
  /** slot 0 = day total, 1–4 = meal slots */
  slot: number;
  nutrients: NutrientTotals;
  enabled?: boolean;
}

/** Three table cells matching workout Sport / Duration / Main work layout. */
export default function NutritionDaySummaryCells({
  slot,
  nutrients,
  enabled = true,
}: NutritionDaySummaryCellsProps) {
  const colors =
    slot === 0
      ? { bg: 'bg-slate-200', sub: 'bg-slate-100' }
      : MEAL_HEADER_COLORS[slot] || MEAL_HEADER_COLORS[1];

  const title =
    slot === 0 ? 'Total of the day' : MEAL_LABELS[slot] || `Meal ${slot}`;

  const primary = NUTRIENT_DISPLAY_COLUMNS[0];
  const secondary = NUTRIENT_DISPLAY_COLUMNS[1];
  const tertiary = NUTRIENT_DISPLAY_COLUMNS[2];

  const show = enabled && (nutrients.calories > 0 || nutrients.proteins > 0);

  return (
    <>
      <td className={`border border-gray-200 px-1 py-1 text-xs text-left ${colors.sub} text-black`}>
        <span className="font-semibold text-[10px] leading-tight block">{title}</span>
        {!show && <span className="text-gray-400">—</span>}
      </td>
      <td className={`border border-gray-200 px-1 py-1 text-xs text-center ${colors.sub} text-black`}>
        {show ? (
          <div className="leading-tight">
            <div className="font-bold text-base">
              {formatNutrient(nutrients[primary.key], primary.key)}
            </div>
            <div className="mt-0.5 font-semibold text-[10px] text-gray-700">
              {secondary.short}: {formatNutrient(nutrients[secondary.key], secondary.key)}
            </div>
          </div>
        ) : (
          '—'
        )}
      </td>
      <td
        className={`border border-gray-200 px-1 py-1 text-xs text-left ${colors.sub} text-black font-semibold`}
      >
        {show ? (
          <div className="text-[10px] leading-snug">
            <div>
              {tertiary.short}: {formatNutrient(nutrients[tertiary.key], tertiary.key)}
            </div>
            <div>
              {NUTRIENT_DISPLAY_COLUMNS[3].short}:{' '}
              {formatNutrient(nutrients[NUTRIENT_DISPLAY_COLUMNS[3].key], NUTRIENT_DISPLAY_COLUMNS[3].key)}
            </div>
          </div>
        ) : (
          '—'
        )}
      </td>
    </>
  );
}

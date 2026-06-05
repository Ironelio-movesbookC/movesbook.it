'use client';

import React from 'react';
import {
  EMPTY_NUTRIENT_TOTALS,
  NUTRIENT_DISPLAY_COLUMNS,
  NutrientTotals,
  formatNutrient,
} from '@/utils/nutritionMealTotals';

export interface DietBuilderGridRow {
  id: string;
  selected?: boolean;
  name: string;
  grams: number;
  nutrients: NutrientTotals;
  /** Extra columns e.g. Date, Meal, Food description */
  prefixCells?: React.ReactNode[];
  suffixCells?: React.ReactNode[];
}

interface DietBuilderNutrientGridProps {
  rows: DietBuilderGridRow[];
  totalRow?: NutrientTotals;
  showCheckbox?: boolean;
  onToggleSelect?: (id: string) => void;
  onToggleAll?: (checked: boolean) => void;
  allSelected?: boolean;
  prefixHeaders?: string[];
  suffixHeaders?: string[];
  compact?: boolean;
  maxHeight?: string;
}

/** Horizontally scrollable nutrient table — Grams, Cal, Pro, Carb, Fats, Fiber, vitamins, minerals. */
export default function DietBuilderNutrientGrid({
  rows,
  totalRow,
  showCheckbox = false,
  onToggleSelect,
  onToggleAll,
  allSelected = false,
  prefixHeaders = [],
  suffixHeaders = [],
  compact = false,
  maxHeight = '220px',
}: DietBuilderNutrientGridProps) {
  const cellClass = compact
    ? 'border border-gray-300 px-1.5 py-1 text-[11px] whitespace-nowrap'
    : 'border border-gray-300 px-2 py-1.5 text-xs whitespace-nowrap';

  return (
    <div className="overflow-x-auto overflow-y-auto border border-gray-300 rounded" style={{ maxHeight }}>
      <table className="border-collapse min-w-full text-left">
        <thead className="bg-gray-100 sticky top-0 z-10">
          <tr>
            {showCheckbox && (
              <th className={`${cellClass} text-center w-8`}>
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(e) => onToggleAll?.(e.target.checked)}
                  title="Select all"
                />
              </th>
            )}
            {prefixHeaders.map((h) => (
              <th key={h} className={`${cellClass} font-bold bg-gray-100`}>
                {h}
              </th>
            ))}
            <th className={`${cellClass} font-bold`}>Name</th>
            <th className={`${cellClass} font-bold text-right`}>Grams</th>
            {NUTRIENT_DISPLAY_COLUMNS.map((col) => (
              <th key={col.key} className={`${cellClass} font-bold text-right`}>
                {col.short || col.label}
              </th>
            ))}
            {suffixHeaders.map((h) => (
              <th key={h} className={`${cellClass} font-bold bg-gray-100 sticky right-0`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={
                  (showCheckbox ? 1 : 0) +
                  prefixHeaders.length +
                  2 +
                  NUTRIENT_DISPLAY_COLUMNS.length +
                  suffixHeaders.length
                }
                className={`${cellClass} text-center text-gray-500 py-6`}
              >
                No items
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.id} className="hover:bg-blue-50/50 even:bg-gray-50/50">
                {showCheckbox && (
                  <td className={`${cellClass} text-center`}>
                    <input
                      type="checkbox"
                      checked={!!row.selected}
                      onChange={() => onToggleSelect?.(row.id)}
                    />
                  </td>
                )}
                {row.prefixCells?.map((cell, i) => (
                  <td key={i} className={cellClass}>
                    {cell}
                  </td>
                ))}
                <td className={`${cellClass} font-medium max-w-[180px] truncate`} title={row.name}>
                  {row.name}
                </td>
                <td className={`${cellClass} text-right`}>{row.grams.toFixed(1)}</td>
                {NUTRIENT_DISPLAY_COLUMNS.map((col) => (
                  <td key={col.key} className={`${cellClass} text-right`}>
                    {formatNutrient(row.nutrients[col.key], col.key)}
                  </td>
                ))}
                {row.suffixCells?.map((cell, i) => (
                  <td key={i} className={`${cellClass} bg-white`}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))
          )}
          {totalRow && rows.length > 0 && (
            <tr className="bg-yellow-50 font-bold border-t-2 border-gray-400">
              {showCheckbox && <td className={cellClass} />}
              {prefixHeaders.map((_, i) => (
                <td key={i} className={cellClass} />
              ))}
              <td className={cellClass}>Total</td>
              <td className={`${cellClass} text-right`}>
                {rows.reduce((s, r) => s + r.grams, 0).toFixed(1)}
              </td>
              {NUTRIENT_DISPLAY_COLUMNS.map((col) => (
                <td key={col.key} className={`${cellClass} text-right`}>
                  {formatNutrient(totalRow[col.key], col.key)}
                </td>
              ))}
              {suffixHeaders.map((_, i) => (
                <td key={i} className={cellClass} />
              ))}
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function emptyGridTotal(): NutrientTotals {
  return { ...EMPTY_NUTRIENT_TOTALS };
}

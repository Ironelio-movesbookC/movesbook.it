'use client';

import React from 'react';
import {
  EMPTY_NUTRIENT_TOTALS,
  NUTRIENT_DISPLAY_COLUMNS,
  NutrientTotals,
  formatNutrient,
  getNutrientColumnBgClass,
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
  nameColumnLabel?: string;
  /** Pin Ingredients + Grams when scrolling horizontally (recipe list expand). */
  stickyLeadColumns?: boolean;
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
  nameColumnLabel = 'Name',
  stickyLeadColumns = false,
}: DietBuilderNutrientGridProps) {
  const cellClass = compact
    ? 'border border-gray-300 px-1.5 py-1 text-[11px] whitespace-nowrap'
    : 'border border-gray-300 px-2 py-1.5 text-xs whitespace-nowrap';

  const stickyNameClass = stickyLeadColumns
    ? 'sticky left-0 z-[2] bg-white shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)] min-w-[140px]'
    : 'bg-white';
  const stickyGramsClass = stickyLeadColumns
    ? 'sticky left-[140px] z-[2] bg-white shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)]'
    : 'bg-white';

  const stickyOmegaClass =
    'sticky right-0 z-20 shadow-[-4px_0_4px_-2px_rgba(0,0,0,0.12)]';

  const nutrientCellClass = (key: keyof NutrientTotals, extra = '') =>
    `${cellClass} text-right min-w-[2.75rem] ${getNutrientColumnBgClass(key)} ${
      key === 'omega3' ? stickyOmegaClass : ''
    } ${extra}`.trim();

  return (
    <div
      className="w-full min-w-0 overflow-x-auto overflow-y-auto border border-gray-300 rounded"
      style={{ maxHeight }}
    >
      <table className="border-collapse w-max text-left">
        <thead className="sticky top-0 z-10">
          <tr>
            {showCheckbox && (
              <th className={`${cellClass} text-center w-8 bg-white`}>
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(e) => onToggleAll?.(e.target.checked)}
                  title="Select all"
                />
              </th>
            )}
            {prefixHeaders.map((h) => (
              <th key={h} className={`${cellClass} font-bold bg-white`}>
                {h}
              </th>
            ))}
            <th className={`${cellClass} font-bold ${stickyNameClass}`}>{nameColumnLabel}</th>
            <th className={`${cellClass} font-bold text-right ${stickyGramsClass}`}>Grams</th>
            {NUTRIENT_DISPLAY_COLUMNS.map((col) => (
              <th key={col.key} className={`${nutrientCellClass(col.key)} font-bold`}>
                {col.short || col.label}
              </th>
            ))}
            {suffixHeaders.map((h) => (
              <th key={h} className={`${cellClass} font-bold bg-white sticky right-0`}>
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
                className={`${cellClass} text-center text-gray-500 py-6 bg-white`}
              >
                No items
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.id}>
                {showCheckbox && (
                  <td className={`${cellClass} text-center bg-white`}>
                    <input
                      type="checkbox"
                      checked={!!row.selected}
                      onChange={() => onToggleSelect?.(row.id)}
                    />
                  </td>
                )}
                {row.prefixCells?.map((cell, i) => (
                  <td key={i} className={`${cellClass} bg-white`}>
                    {cell}
                  </td>
                ))}
                <td
                  className={`${cellClass} font-medium max-w-[200px] truncate ${stickyNameClass}`}
                  title={row.name}
                >
                  {row.name}
                </td>
                <td className={`${cellClass} text-right ${stickyGramsClass}`}>
                  {row.grams.toFixed(1)}
                </td>
                {NUTRIENT_DISPLAY_COLUMNS.map((col) => (
                  <td key={col.key} className={nutrientCellClass(col.key)}>
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
            <tr className="font-bold border-t-2 border-gray-400">
              {showCheckbox && <td className={`${cellClass} bg-white`} />}
              {prefixHeaders.map((_, i) => (
                <td key={i} className={`${cellClass} bg-white`} />
              ))}
              <td className={`${cellClass} ${stickyNameClass}`}>Total</td>
              <td className={`${cellClass} text-right ${stickyGramsClass}`}>
                {rows.reduce((s, r) => s + r.grams, 0).toFixed(1)}
              </td>
              {NUTRIENT_DISPLAY_COLUMNS.map((col) => (
                <td key={col.key} className={nutrientCellClass(col.key, 'font-bold')}>
                  {formatNutrient(totalRow[col.key], col.key)}
                </td>
              ))}
              {suffixHeaders.map((_, i) => (
                <td key={i} className={`${cellClass} bg-white`} />
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

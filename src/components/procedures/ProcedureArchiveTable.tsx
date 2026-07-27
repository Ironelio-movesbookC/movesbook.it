'use client';

import React from 'react';
import type { Column, Member } from './types';

type Props = {
  columns: Column[];
  rows: Member[];
  selectedId?: string | null;
  selectedIds?: Set<string>;
  showCheckboxes?: boolean;
  /** Hide header "select all" (use for single-select rows). Default true when multi. */
  showSelectAll?: boolean;
  onRowClick?: (row: Member) => void;
  onRowDoubleClick?: (row: Member) => void;
  onToggleCheck?: (row: Member, checked: boolean) => void;
  onToggleCheckAll?: (checked: boolean) => void;
  loading?: boolean;
  emptyMessage?: string;
};

export default function ProcedureArchiveTable({
  columns,
  rows,
  selectedId,
  selectedIds,
  showCheckboxes,
  showSelectAll = true,
  onRowClick,
  onRowDoubleClick,
  onToggleCheck,
  onToggleCheckAll,
  loading,
  emptyMessage = 'No records found.',
}: Props) {
  if (loading) {
    return <p className="py-8 text-center text-gray-500">Loading...</p>;
  }

  if (rows.length === 0) {
    return <p className="py-8 text-center text-gray-500">{emptyMessage}</p>;
  }

  const allChecked =
    showCheckboxes &&
    showSelectAll &&
    rows.length > 0 &&
    rows.every((r) => r.id && selectedIds?.has(r.id));
  const someChecked =
    showCheckboxes && showSelectAll && rows.some((r) => r.id && selectedIds?.has(r.id));

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="min-w-full text-sm">
        <thead className="bg-teal-800 text-white">
          <tr>
            {showCheckboxes && (
              <th className="w-10 px-2 py-2 text-left">
                {showSelectAll ? (
                  <input
                    type="checkbox"
                    checked={Boolean(allChecked)}
                    ref={(el) => {
                      if (el) el.indeterminate = Boolean(someChecked && !allChecked);
                    }}
                    onChange={(e) => onToggleCheckAll?.(e.target.checked)}
                    aria-label="Select all"
                  />
                ) : (
                  <span className="sr-only">Select</span>
                )}
              </th>
            )}
            {columns.map((col) => (
              <th key={String(col.key)} className="whitespace-nowrap px-3 py-2 text-left">
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const isSelected =
              (selectedId != null && row.id === selectedId) ||
              (row.id != null && selectedIds?.has(row.id));
            const isChecked =
              (row.id != null && selectedIds?.has(row.id)) ||
              (selectedId != null && row.id === selectedId);
            return (
              <tr
                key={row.id ?? `${row.name}-${row.insertDate}`}
                className={`cursor-pointer border-t hover:bg-teal-50 ${
                  isSelected ? 'bg-amber-100 ring-1 ring-inset ring-amber-300' : 'bg-white'
                }`}
                onClick={() => onRowClick?.(row)}
                onDoubleClick={() => onRowDoubleClick?.(row)}
              >
                {showCheckboxes && (
                  <td
                    className="px-2 py-2"
                    onClick={(e) => e.stopPropagation()}
                    onDoubleClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => row.id && onToggleCheck?.(row, e.target.checked)}
                      aria-label={`Select ${row.name ?? row.id}`}
                    />
                  </td>
                )}
                {columns.map((col) => (
                  <td key={String(col.key)} className="whitespace-nowrap px-3 py-2 text-gray-800">
                    {col.render
                      ? col.render(row[col.key], row)
                      : ((row[col.key] as React.ReactNode) ?? '-')}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

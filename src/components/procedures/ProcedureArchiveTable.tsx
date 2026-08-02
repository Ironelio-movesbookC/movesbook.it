'use client';

import React from 'react';
import type { Column, Member } from './types';

type Props = {
  columns: Column[];
  rows: Member[];
  selectedId?: string | null;
  onRowClick?: (row: Member) => void;
  onRowDoubleClick?: (row: Member) => void;
  loading?: boolean;
  emptyMessage?: string;
  /** Multi-select checkboxes (Archive of Deadlines → pay more). */
  selectable?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (row: Member) => void;
  onToggleSelectAll?: (checked: boolean) => void;
};

export default function ProcedureArchiveTable({
  columns,
  rows,
  selectedId,
  onRowClick,
  onRowDoubleClick,
  loading,
  emptyMessage = 'No records found.',
  selectable,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
}: Props) {
  if (loading) {
    return <p className="text-gray-500 py-8 text-center">Loading...</p>;
  }

  if (rows.length === 0) {
    return <p className="text-gray-500 py-8 text-center">{emptyMessage}</p>;
  }

  const selectableRows = rows.filter((r) => r.id && (r.rest ?? 0) > 0);
  const allSelectableChecked =
    selectableRows.length > 0 &&
    selectableRows.every((r) => r.id && selectedIds?.has(r.id));

  return (
    <div className="border rounded-lg overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-teal-800 text-white">
          <tr>
            {selectable && (
              <th className="px-2 py-2 w-10">
                <input
                  type="checkbox"
                  checked={allSelectableChecked}
                  onChange={(e) => onToggleSelectAll?.(e.target.checked)}
                  aria-label="Select all with Rest > 0"
                  onClick={(e) => e.stopPropagation()}
                />
              </th>
            )}
            {columns.map((col) => (
              <th key={String(col.key)} className="px-3 py-2 text-left whitespace-nowrap">
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const isSelected = selectedId && row.id === selectedId;
            const isChecked = Boolean(row.id && selectedIds?.has(row.id));
            const canCheck = (row.rest ?? 0) > 0;
            return (
              <tr
                key={row.id ?? `${row.name}-${row.insertDate}`}
                className={`border-t cursor-pointer hover:bg-teal-50 ${
                  isChecked ? 'bg-amber-50' : isSelected ? 'bg-amber-100' : 'bg-white'
                }`}
                onClick={() => onRowClick?.(row)}
                onDoubleClick={() => onRowDoubleClick?.(row)}
              >
                {selectable && (
                  <td className="px-2 py-2" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      disabled={!canCheck}
                      onChange={() => row.id && canCheck && onToggleSelect?.(row)}
                      aria-label={`Select ${row.name ?? row.id}`}
                    />
                  </td>
                )}
                {columns.map((col) => (
                  <td key={String(col.key)} className="px-3 py-2 text-gray-800 whitespace-nowrap">
                    {col.render
                      ? col.render(row[col.key], row)
                      : (row[col.key] as React.ReactNode) ?? '-'}
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

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
};

export default function ProcedureArchiveTable({
  columns,
  rows,
  selectedId,
  onRowClick,
  onRowDoubleClick,
  loading,
  emptyMessage = 'No records found.',
}: Props) {
  if (loading) {
    return <p className="text-gray-500 py-8 text-center">Loading...</p>;
  }

  if (rows.length === 0) {
    return <p className="text-gray-500 py-8 text-center">{emptyMessage}</p>;
  }

  return (
    <div className="border rounded-lg overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-teal-800 text-white">
          <tr>
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
            return (
              <tr
                key={row.id ?? `${row.name}-${row.insertDate}`}
                className={`border-t cursor-pointer hover:bg-teal-50 ${
                  isSelected ? 'bg-amber-100' : 'bg-white'
                }`}
                onClick={() => onRowClick?.(row)}
                onDoubleClick={() => onRowDoubleClick?.(row)}
              >
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

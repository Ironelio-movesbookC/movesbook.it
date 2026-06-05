/**
 * Table Column Configuration Modal
 * Allows users to customize which columns are visible in the workout tables
 */

'use client';

import React from 'react';
import { X, Eye, EyeOff, RotateCcw } from 'lucide-react';
import { ColumnConfig } from '@/config/nutrition-table.columns.config';

interface TableColumnConfigProps {
  isOpen: boolean;
  onClose: () => void;
  columns: ColumnConfig[];
  onToggleColumn: (columnId: string) => void;
  onResetToDefault: () => void;
  tableTitle: string;
}

export default function TableColumnConfig({
  isOpen,
  onClose,
  columns,
  onToggleColumn,
  onResetToDefault,
  tableTitle
}: TableColumnConfigProps) {
  if (!isOpen) return null;

  const visibleCount = columns.filter(c => c.visible).length;
  const totalCount = columns.length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-blue-600 text-white px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Configure {tableTitle} Columns</h2>
            <p className="text-sm text-blue-100 mt-1">
              {visibleCount} of {totalCount} columns visible
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-blue-700 rounded p-2"
          >
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Click on a column to toggle its visibility. Required columns cannot be hidden.
            </p>
            <button
              onClick={onResetToDefault}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded"
            >
              <RotateCcw size={16} />
              Reset to Default
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {columns.map((column) => (
              <button
                key={column.id}
                onClick={() => !column.required && onToggleColumn(column.id)}
                disabled={column.required}
                className={`
                  flex items-center justify-between p-3 rounded border-2 transition-all
                  ${column.visible 
                    ? 'border-green-500 bg-green-50' 
                    : 'border-gray-300 bg-gray-50'
                  }
                  ${column.required 
                    ? 'opacity-75 cursor-not-allowed' 
                    : 'hover:shadow-md cursor-pointer'
                  }
                `}
              >
                <div className="flex items-center gap-3">
                  {column.visible ? (
                    <Eye size={20} className="text-green-600" />
                  ) : (
                    <EyeOff size={20} className="text-gray-400" />
                  )}
                  <div className="text-left">
                    <div className="font-semibold text-sm">{column.label}</div>
                    <div className="text-xs text-gray-500">
                      {column.required ? 'Required' : column.dataKey}
                    </div>
                  </div>
                </div>
                {column.visible && (
                  <div className="text-green-600 font-bold">✓</div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex justify-between items-center border-t">
          <div className="text-sm text-gray-600">
            Changes are saved automatically
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}


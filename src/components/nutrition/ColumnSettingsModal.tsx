'use client';

import { useState, useEffect } from 'react';
import { X, Eye, EyeOff, RotateCcw, GripVertical, Check } from 'lucide-react';
import { ColumnDefinition, getColumnsForTable } from '@/types/columnSettings';

interface ColumnSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  tableType: 'day' | 'workout' | 'nutritionFood' | 'nutritionComponent';
  visibleColumns: string[];
  columnOrder: string[];
  onSave: (visibleColumns: string[], columnOrder: string[]) => void;
  onReset: () => void;
}

export default function ColumnSettingsModal({
  isOpen,
  onClose,
  tableType,
  visibleColumns: initialVisible,
  columnOrder: initialOrder,
  onSave,
  onReset
}: ColumnSettingsModalProps) {
  const [visibleColumns, setVisibleColumns] = useState<string[]>(initialVisible);
  const [columnOrder, setColumnOrder] = useState<string[]>(initialOrder);
  const [columns, setColumns] = useState<ColumnDefinition[]>([]);

  useEffect(() => {
    if (isOpen) {
      const allColumns = getColumnsForTable(tableType);
      setColumns(allColumns);
      setVisibleColumns(initialVisible);
      setColumnOrder(initialOrder);
    }
  }, [isOpen, tableType, initialVisible, initialOrder]);

  const toggleColumn = (columnId: string) => {
    const column = columns.find(c => c.id === columnId);
    if (column?.required) return; // Can't toggle required columns

    setVisibleColumns(prev => {
      if (prev.includes(columnId)) {
        return prev.filter(id => id !== columnId);
      } else {
        return [...prev, columnId];
      }
    });
  };

  const moveColumnUp = (columnId: string) => {
    const index = columnOrder.indexOf(columnId);
    if (index > 0) {
      const newOrder = [...columnOrder];
      [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
      setColumnOrder(newOrder);
    }
  };

  const moveColumnDown = (columnId: string) => {
    const index = columnOrder.indexOf(columnId);
    if (index < columnOrder.length - 1) {
      const newOrder = [...columnOrder];
      [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
      setColumnOrder(newOrder);
    }
  };

  const handleSave = () => {
    onSave(visibleColumns, columnOrder);
    onClose();
  };

  const handleReset = () => {
    onReset();
    onClose();
  };

  const showAllColumns = () => {
    setVisibleColumns(columns.map(c => c.id));
  };

  const hideOptionalColumns = () => {
    setVisibleColumns(columns.filter(c => c.required).map(c => c.id));
  };

  if (!isOpen) return null;

  const getTableTitle = () => {
    switch (tableType) {
      case 'day': return 'Day Row';
      case 'workout': return 'Meal';
      case 'nutritionFood': return 'Dietframe';
      case 'nutritionComponent': return 'Dietlap';
    }
  };

  const visibleCount = visibleColumns.length;
  const totalCount = columns.length;

  return (
    <div 
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100000] p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Column Settings</h2>
              <p className="text-indigo-200 text-sm mt-1">
                {getTableTitle()} Table • {visibleCount}/{totalCount} columns visible
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={showAllColumns}
              className="flex items-center gap-2 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg transition-colors text-sm"
            >
              <Eye size={14} />
              Show All
            </button>
            <button
              onClick={hideOptionalColumns}
              className="flex items-center gap-2 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg transition-colors text-sm"
            >
              <EyeOff size={14} />
              Hide Optional
            </button>
            <button
              onClick={() => {
                // Clear localStorage and reset
                localStorage.removeItem('workout_column_settings');
                handleReset();
              }}
              className="flex items-center gap-2 px-3 py-1.5 bg-red-500/80 hover:bg-red-500 rounded-lg transition-colors text-sm ml-auto"
              title="Clear all saved settings and reset to default"
            >
              <RotateCcw size={14} />
              Force Reset
            </button>
          </div>
        </div>

        {/* Column List */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-2">
            {columnOrder.map((columnId, index) => {
              const column = columns.find(c => c.id === columnId);
              if (!column) return null;

              const isVisible = visibleColumns.includes(columnId);
              const isRequired = column.required;

              return (
                <div
                  key={columnId}
                  className={`border rounded-lg p-4 transition-all ${
                    isVisible
                      ? 'bg-white border-indigo-200 shadow-sm'
                      : 'bg-gray-50 border-gray-200 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Drag Handle */}
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => moveColumnUp(columnId)}
                        disabled={index === 0}
                        className="text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Move up"
                      >
                        <span className="text-xs">▲</span>
                      </button>
                      <GripVertical size={16} className="text-gray-400" />
                      <button
                        onClick={() => moveColumnDown(columnId)}
                        disabled={index === columnOrder.length - 1}
                        className="text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Move down"
                      >
                        <span className="text-xs">▼</span>
                      </button>
                    </div>

                    {/* Visibility Toggle */}
                    <button
                      onClick={() => toggleColumn(columnId)}
                      disabled={isRequired}
                      className={`flex-shrink-0 w-10 h-10 rounded-lg border-2 flex items-center justify-center transition-colors ${
                        isVisible
                          ? 'bg-indigo-600 border-indigo-600 text-white'
                          : 'bg-white border-gray-300 text-gray-400'
                      } ${isRequired ? 'opacity-50 cursor-not-allowed' : 'hover:border-indigo-400'}`}
                      title={isRequired ? 'Required column' : isVisible ? 'Hide column' : 'Show column'}
                    >
                      {isVisible ? <Check size={20} /> : <EyeOff size={20} />}
                    </button>

                    {/* Column Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">{column.label}</h3>
                        {isRequired && (
                          <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">
                            Required
                          </span>
                        )}
                      </div>
                      {column.description && (
                        <p className="text-sm text-gray-500 mt-1">{column.description}</p>
                      )}
                    </div>

                    {/* Order Badge */}
                    <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                      <span className="text-xs font-bold text-gray-600">{index + 1}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Help Text */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-2">💡 Tips</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Click the checkbox to show/hide columns</li>
              <li>• Use ▲ ▼ buttons to reorder columns</li>
              <li>• Required columns cannot be hidden</li>
              <li>• Changes apply instantly after saving</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 bg-gray-50 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {visibleCount} of {totalCount} columns visible
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


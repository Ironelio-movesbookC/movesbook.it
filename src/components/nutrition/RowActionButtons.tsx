/**
 * Reusable Edit/Options/Delete button trio for workout table rows
 * Used for Day, NutritionMeal, NutritionFood, and NutritionComponent rows
 */

import React, { useState } from 'react';

interface RowActionButtonsProps {
  rowType: 'day' | 'workout' | 'nutritionFood' | 'nutritionComponent';
  rowId: string;
  rowData: any;
  onEdit: () => void;
  onDelete: () => void;
  optionsMenuItems?: Array<{
    label: string;
    onClick: () => void;
    className?: string;
    disabled?: boolean;
  }>;
}

export default function RowActionButtons({
  rowType,
  rowId,
  rowData,
  onEdit,
  onDelete,
  optionsMenuItems = []
}: RowActionButtonsProps) {
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);

  return (
    <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
      {/* Edit Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onEdit();
        }}
        className="px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-xs font-medium"
        title={`Edit ${rowType}`}
      >
        Edit
      </button>

      {/* Options Dropdown */}
      <div className="relative">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsOptionsOpen(!isOptionsOpen);
          }}
          className="px-2 py-1 bg-gray-500 hover:bg-gray-600 text-white rounded text-xs font-medium"
          title={`${rowType} options`}
        >
          Options
        </button>

        {isOptionsOpen && optionsMenuItems.length > 0 && (
          <div
            className="absolute right-0 top-full mt-1 bg-white border-2 border-gray-400 rounded shadow-2xl z-[9999] min-w-[140px]"
            onClick={(e) => e.stopPropagation()}
          >
            {optionsMenuItems.map((item, index) => (
              <button
                key={index}
                onClick={() => {
                  item.onClick();
                  setIsOptionsOpen(false);
                }}
                disabled={item.disabled}
                className={item.className || 'w-full px-3 py-2 text-left text-xs hover:bg-gray-50'}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Delete Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="px-2 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-xs font-medium"
        title={`Delete ${rowType}`}
      >
        Delete
      </button>
    </div>
  );
}


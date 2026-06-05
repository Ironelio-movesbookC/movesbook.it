'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';

export type DragAction = 'copy' | 'move' | 'switch';
export type DropPosition = 'before' | 'after' | 'append';

interface DragDropConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (action: DragAction, position?: DropPosition) => void;
  dragType: 'workout' | 'nutritionFood';
  hasConflict: boolean;
  conflictMessage?: string;
  showPositionChoice?: boolean;
}

export default function DragDropConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  dragType,
  hasConflict,
  conflictMessage,
  showPositionChoice = false
}: DragDropConfirmModalProps) {
  const [selectedAction, setSelectedAction] = useState<DragAction>('move');
  const [selectedPosition, setSelectedPosition] = useState<DropPosition>('before');
  const [confirmConflict, setConfirmConflict] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (hasConflict && !confirmConflict) {
      alert('Please confirm that you want to replace the existing item');
      return;
    }
    
    onConfirm(selectedAction, showPositionChoice ? selectedPosition : undefined);
    onClose();
    
    // Reset state
    setSelectedAction('move');
    setSelectedPosition('before');
    setConfirmConflict(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[999999]">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">
            {dragType === 'workout' ? 'Move Workout' : 'Move NutritionFood'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        {/* Action Selection */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            What do you want to do?
          </label>
          <div className="space-y-2">
            <label className="flex items-center p-3 border border-gray-300 rounded hover:bg-gray-50 cursor-pointer">
              <input
                type="radio"
                name="action"
                value="copy"
                checked={selectedAction === 'copy'}
                onChange={(e) => setSelectedAction(e.target.value as DragAction)}
                className="mr-3"
              />
              <div>
                <div className="font-medium text-gray-900">Copy</div>
                <div className="text-xs text-gray-500">Create a duplicate</div>
              </div>
            </label>

            <label className="flex items-center p-3 border border-gray-300 rounded hover:bg-gray-50 cursor-pointer">
              <input
                type="radio"
                name="action"
                value="move"
                checked={selectedAction === 'move'}
                onChange={(e) => setSelectedAction(e.target.value as DragAction)}
                className="mr-3"
              />
              <div>
                <div className="font-medium text-gray-900">Move</div>
                <div className="text-xs text-gray-500">Relocate to new position</div>
              </div>
            </label>

            {dragType === 'workout' && (
              <label className="flex items-center p-3 border border-gray-300 rounded hover:bg-gray-50 cursor-pointer">
                <input
                  type="radio"
                  name="action"
                  value="switch"
                  checked={selectedAction === 'switch'}
                  onChange={(e) => setSelectedAction(e.target.value as DragAction)}
                  className="mr-3"
                />
                <div>
                  <div className="font-medium text-gray-900">Switch</div>
                  <div className="text-xs text-gray-500">Swap positions</div>
                </div>
              </label>
            )}
          </div>
        </div>

        {/* Position Selection (for nutritionFoods) */}
        {showPositionChoice && (
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Where to place it?
            </label>
            <div className="space-y-2">
              <label className="flex items-center p-3 border border-gray-300 rounded hover:bg-gray-50 cursor-pointer">
                <input
                  type="radio"
                  name="position"
                  value="before"
                  checked={selectedPosition === 'before'}
                  onChange={(e) => setSelectedPosition(e.target.value as DropPosition)}
                  className="mr-3"
                />
                <div className="font-medium text-gray-900">Before</div>
              </label>

              <label className="flex items-center p-3 border border-gray-300 rounded hover:bg-gray-50 cursor-pointer">
                <input
                  type="radio"
                  name="position"
                  value="after"
                  checked={selectedPosition === 'after'}
                  onChange={(e) => setSelectedPosition(e.target.value as DropPosition)}
                  className="mr-3"
                />
                <div className="font-medium text-gray-900">After</div>
              </label>
            </div>
          </div>
        )}

        {/* Conflict Warning */}
        {hasConflict && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
            <div className="flex items-start">
              <div className="flex-shrink-0 text-yellow-600 mr-2">⚠️</div>
              <div>
                <div className="text-sm font-semibold text-yellow-900 mb-1">
                  Conflict Detected
                </div>
                <div className="text-xs text-yellow-800 mb-2">
                  {conflictMessage || `A ${dragType} already exists at this location`}
                </div>
                <label className="flex items-center text-sm">
                  <input
                    type="checkbox"
                    checked={confirmConflict}
                    onChange={(e) => setConfirmConflict(e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-yellow-900">
                    I confirm to replace the existing {dragType}
                  </span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 text-gray-700 font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}


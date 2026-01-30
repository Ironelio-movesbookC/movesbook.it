'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

// 2026-01-22 14:45 UTC - Helper to strip circuit metadata tags from content
const stripCircuitTags = (content: string | null | undefined): string => {
  if (!content) return '';
  return content
    .replace(/\[CIRCUIT_DATA\][\s\S]*?\[\/CIRCUIT_DATA\]/g, '')
    .replace(/\[CIRCUIT_META\][\s\S]*?\[\/CIRCUIT_META\]/g, '')
    .trim();
};

interface SetWorkTypeModalProps {
  moveframe: any;
  onClose: () => void;
  onSave: (workType: 'NONE' | 'MAIN' | 'SECONDARY') => Promise<void>;
}

export default function SetWorkTypeModal({ moveframe, onClose, onSave }: SetWorkTypeModalProps) {
  const [selectedType, setSelectedType] = useState<'NONE' | 'MAIN' | 'SECONDARY'>(
    moveframe.workType || 'NONE'
  );
  const [isSaving, setIsSaving] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';
    
    return () => {
      setMounted(false);
      document.body.style.overflow = 'unset';
    };
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(selectedType);
      onClose();
    } catch (error) {
      console.error('Failed to save work type:', error);
      alert('Failed to save work type. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!mounted) return null;

  const modalContent = (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 m-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-4 text-gray-900">
          Set Work Type for Moveframe {moveframe.letter}
        </h2>
        
        <div className="mb-6">
          <p className="text-sm text-gray-600 mb-4">
            Sport: <span className="font-semibold">{moveframe.sport}</span>
          </p>
          <div className="text-sm text-gray-600 mb-4">
            Description: {(() => {
              const cleanDescription = stripCircuitTags(moveframe.description);
              return cleanDescription && cleanDescription.includes('<') ? (
                <div className="font-semibold inline-block" dangerouslySetInnerHTML={{ __html: cleanDescription }} />
              ) : (
                <span className="font-semibold">{cleanDescription || 'No description'}</span>
              );
            })()}
          </div>
        </div>

        <div className="space-y-3 mb-6">
          <label className="flex items-center p-3 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
            <input
              type="radio"
              name="workType"
              value="MAIN"
              checked={selectedType === 'MAIN'}
              onChange={() => setSelectedType('MAIN')}
              className="w-4 h-4 text-blue-600"
            />
            <div className="ml-3">
              <div className="font-semibold text-gray-900">Main Work</div>
              <div className="text-xs text-gray-500">Primary focus of this sport in the day</div>
            </div>
          </label>

          <label className="flex items-center p-3 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
            <input
              type="radio"
              name="workType"
              value="SECONDARY"
              checked={selectedType === 'SECONDARY'}
              onChange={() => setSelectedType('SECONDARY')}
              className="w-4 h-4 text-green-600"
            />
            <div className="ml-3">
              <div className="font-semibold text-gray-900">Secondary Work</div>
              <div className="text-xs text-gray-500">Secondary focus of this sport in the day</div>
            </div>
          </label>

          <label className="flex items-center p-3 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
            <input
              type="radio"
              name="workType"
              value="NONE"
              checked={selectedType === 'NONE'}
              onChange={() => setSelectedType('NONE')}
              className="w-4 h-4 text-gray-600"
            />
            <div className="ml-3">
              <div className="font-semibold text-gray-900">None (Reset)</div>
              <div className="text-xs text-gray-500">Remove work type designation</div>
            </div>
          </label>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}


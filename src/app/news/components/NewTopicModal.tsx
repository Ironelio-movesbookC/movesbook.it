'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface NewTopicModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string) => void | Promise<void>;
  /** When set, modal is in edit mode: prefill name, show Delete/Save/Cancel */
  editingTopic: string | null;
  /** Called when user clicks Delete (only in edit mode) */
  onDelete?: () => void | Promise<void>;
  existingTopics: string[];
}

export default function NewTopicModal({
  isOpen,
  onClose,
  onSave,
  editingTopic,
  onDelete,
  existingTopics,
}: NewTopicModalProps) {
  const isEdit = editingTopic != null;
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setName(isEdit ? editingTopic : '');
      setError('');
    }
  }, [isOpen, isEdit, editingTopic]);

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Topic name is required.');
      return;
    }
    const lower = trimmed.toLowerCase();
    const others = isEdit ? existingTopics.filter((t) => t !== editingTopic) : existingTopics;
    if (others.some((t) => t.trim().toLowerCase() === lower)) {
      setError('A topic with this name already exists.');
      return;
    }
    setError('');
    const result = onSave(trimmed);
    if (result && typeof (result as Promise<void>).then === 'function') {
      await (result as Promise<void>);
    }
    onClose();
  };

  const handleDelete = async () => {
    const result = onDelete?.();
    if (result && typeof (result as Promise<void>).then === 'function') {
      await (result as Promise<void>);
    }
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
    if (e.key === 'Enter') handleSave();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="topic-modal-title"
    >
      <div
        className="bg-white rounded-xl shadow-xl max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 id="topic-modal-title" className="text-lg font-semibold text-gray-900">
            {isEdit ? 'Edit topic' : 'New topic'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <label htmlFor="topic-name-input" className="block text-sm font-medium text-gray-700 mb-2">
          Topic name
        </label>
        <input
          id="topic-name-input"
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError('');
          }}
          placeholder="e.g. Technology, Health"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-gray-900 placeholder-gray-400"
          autoFocus
        />
        {error && (
          <p className="mt-2 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        <div className="flex gap-2 mt-6 justify-between">
          <div className="flex gap-2">
            {isEdit && onDelete && (
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2 rounded-lg border border-red-300 bg-white text-red-600 hover:bg-red-50 font-medium transition-colors"
              >
                Delete
              </button>
            )}
          </div>
          <div className="flex gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white font-medium transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

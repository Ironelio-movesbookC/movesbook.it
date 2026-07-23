'use client';

import { useState, useEffect } from 'react';

interface CreateOgpNewsGroupModalProps {
  topics: string[];
  defaultTopic?: string | null;
  selectedCount: number;
  saving?: boolean;
  error?: string | null;
  /** When set, name already exists — user can change name or confirm merge. */
  existingNameConflict?: boolean;
  onCancel: () => void;
  onSave: (payload: { name: string; topic: string; confirmExisting: boolean }) => void | Promise<void>;
}

export default function CreateOgpNewsGroupModal({
  topics,
  defaultTopic,
  selectedCount,
  saving = false,
  error = null,
  existingNameConflict = false,
  onCancel,
  onSave,
}: CreateOgpNewsGroupModalProps) {
  const [name, setName] = useState('');
  const [topic, setTopic] = useState(
    () => (defaultTopic && topics.includes(defaultTopic) ? defaultTopic : topics[0] ?? '')
  );

  // Keep selection valid if the topics list changes; do not overwrite the user's pick.
  useEffect(() => {
    setTopic((prev) => {
      if (prev && topics.includes(prev)) return prev;
      if (defaultTopic && topics.includes(defaultTopic)) return defaultTopic;
      return topics[0] ?? '';
    });
  }, [defaultTopic, topics]);

  const canSubmit = name.trim().length > 0 && !!topic && selectedCount > 0 && !saving;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-ogp-group-title"
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-slate-800 text-white text-center py-3 px-4">
          <h2 id="create-ogp-group-title" className="text-base font-semibold">
            Create a new group of OG News
          </h2>
        </div>

        <div className="p-4 flex flex-col gap-4 min-h-0 overflow-y-auto">
          <div>
            <label htmlFor="ogp-group-name" className="block text-sm text-gray-800 mb-1.5">
              Give a name to the group
            </label>
            <input
              id="ogp-group-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-800 rounded px-3 py-2 text-sm text-gray-900 bg-white outline-none focus:ring-2 focus:ring-slate-400"
              autoFocus
              disabled={saving}
            />
          </div>

          <div>
            <p className="block text-sm text-gray-800 mb-1.5">
              Select a topic for this group
            </p>
            <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto pr-1">
              {topics.map((t) => {
                const selected = t === topic;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTopic(t)}
                    disabled={saving}
                    className={`w-full text-left px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                      selected
                        ? 'bg-orange-200 border-orange-300 text-gray-900'
                        : 'bg-gray-100 border-gray-200 text-gray-800 hover:bg-gray-200'
                    }`}
                    aria-pressed={selected}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>

          <p className="text-xs text-gray-500">
            {selectedCount} OGP News selected
            {topic ? ` · will be saved under “${topic}”` : ''}
          </p>

          {existingNameConflict && (
            <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded px-3 py-2">
              A group with this name already exists. Change the name, or press Save again to add the
              selected OGP News to the existing group (duplicates will be updated).
            </p>
          )}

          {error && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
              {error}
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-gray-200 bg-gray-50">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="px-4 py-2 rounded border border-gray-300 bg-white text-gray-800 text-sm font-medium hover:bg-gray-100 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={() =>
              onSave({ name: name.trim(), topic, confirmExisting: existingNameConflict })
            }
            className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

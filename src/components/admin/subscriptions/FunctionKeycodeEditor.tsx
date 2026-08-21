'use client';

import { useState } from 'react';
import { Pencil } from 'lucide-react';
import type { FunctionSettingsTab } from '@/types/adminFunctionSettings';
import {
  getFunctionKeycode,
  setFunctionKeycode,
  validateKeycodeFormat,
} from '@/lib/admin/functionKeycodes';

type FunctionKeycodeEditorProps = {
  tab: FunctionSettingsTab;
  functionId: number;
  compact?: boolean;
};

export default function FunctionKeycodeEditor({
  tab,
  functionId,
  compact = false,
}: FunctionKeycodeEditorProps) {
  const [keycode, setKeycode] = useState(() => getFunctionKeycode(tab, functionId));
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');

  const openEdit = () => {
    setDraft(keycode);
    setError('');
    setEditing(true);
  };

  const closeEdit = () => {
    setEditing(false);
    setError('');
  };

  const save = () => {
    const formatError = validateKeycodeFormat(draft);
    if (formatError) {
      setError(formatError);
      return;
    }

    const result = setFunctionKeycode(tab, functionId, draft);
    if (!result.ok) {
      setError(result.error);
      return;
    }

    setKeycode(result.keycode);
    closeEdit();
  };

  if (editing) {
    return (
      <div className={compact ? 'space-y-1' : 'space-y-2'}>
        <div className="flex flex-wrap items-center gap-1">
          <input
            type="text"
            value={draft}
            maxLength={10}
            onChange={(e) => {
              setDraft(e.target.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 10));
              setError('');
            }}
            placeholder="KEYCODE"
            className="w-24 border border-gray-400 bg-[#fffacd] px-2 py-0.5 text-xs font-mono uppercase"
            autoFocus
          />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              save();
            }}
            className="bg-[#333] px-2 py-0.5 text-[10px] font-bold text-white hover:bg-black"
          >
            Save
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              closeEdit();
            }}
            className="border border-gray-400 bg-white px-2 py-0.5 text-[10px] font-bold text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
        {error ? <p className="text-[10px] font-medium text-red-600">{error}</p> : null}
        <p className="text-[10px] text-gray-500">Max 10 alphanumeric · unique across Movesbook</p>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-1 ${compact ? '' : 'mt-1'}`}>
      <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">Key</span>
      <span className="min-w-[52px] font-mono text-[10px] font-bold text-gray-800">
        {keycode || '—'}
      </span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          openEdit();
        }}
        className="inline-flex items-center gap-0.5 rounded border border-gray-400 bg-white px-1.5 py-0.5 text-[10px] font-bold text-gray-700 hover:bg-gray-50"
        aria-label="Edit keycode"
      >
        <Pencil className="h-3 w-3 text-[#f0ad4e]" />
        Edit
      </button>
    </div>
  );
}

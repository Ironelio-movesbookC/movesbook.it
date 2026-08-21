'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { clubApiFetch } from '@/lib/club/servicePurchasesClient';

type MemberGroupSummary = {
  id: string;
  name: string;
  memberCount: number;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  selectedGroupId: string | null;
  onSelect: (group: MemberGroupSummary | null) => void;
};

export default function ChatMemberGroupSelectModal({
  isOpen,
  onClose,
  selectedGroupId,
  onSelect,
}: Props) {
  const [groups, setGroups] = useState<MemberGroupSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pendingId, setPendingId] = useState<string | null>(selectedGroupId);

  useEffect(() => {
    if (!isOpen) return;
    setPendingId(selectedGroupId);
    setError('');
    setLoading(true);
    clubApiFetch<{ groups: MemberGroupSummary[] }>('/api/club/member-groups')
      .then((res) => setGroups(res.groups))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load groups'))
      .finally(() => setLoading(false));
  }, [isOpen, selectedGroupId]);

  if (!isOpen) return null;

  function handleSave() {
    const group = groups.find((g) => g.id === pendingId) ?? null;
    onSelect(group);
    onClose();
  }

  function handleClear() {
    onSelect(null);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-md flex-col rounded-md border border-[#ccc] bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#ddd] bg-[#e8f5e9] px-4 py-3">
          <h2 className="text-base font-semibold text-gray-900">Select member group</h2>
          <button type="button" onClick={onClose} className="rounded p-1 text-gray-500 hover:bg-black/5">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {loading ? (
            <p className="text-sm text-gray-500">Loading groups…</p>
          ) : error ? (
            <p className="text-sm text-red-600">{error}</p>
          ) : groups.length === 0 ? (
            <p className="text-sm text-gray-600">
              No groups yet. Create groups in Archive — Members using &quot;Save as a group&quot;.
            </p>
          ) : (
            <ul className="space-y-2">
              {groups.map((group) => (
                <li key={group.id}>
                  <label className="flex cursor-pointer items-center gap-3 rounded border border-gray-200 px-3 py-2 hover:bg-gray-50">
                    <input
                      type="radio"
                      name="member-group"
                      checked={pendingId === group.id}
                      onChange={() => setPendingId(group.id)}
                      className="h-4 w-4"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium text-gray-900">{group.name}</span>
                      <span className="text-xs text-gray-500">
                        {group.memberCount} member{group.memberCount === 1 ? '' : 's'}
                      </span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-[#ddd] px-4 py-3">
          {selectedGroupId ? (
            <button
              type="button"
              onClick={handleClear}
              className="mr-auto rounded border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50"
            >
              Clear selection
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-[#ccc] px-3 py-1.5 text-sm hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!pendingId || loading}
            className="rounded bg-[#8b1a1a] px-3 py-1.5 text-sm text-white hover:bg-[#6e1414] disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useCallback, useMemo, useState } from 'react';
import { UserPlus } from 'lucide-react';
import ClubArchivePage from '@/components/club/archives/ClubArchivePage';
import AddMemberModal from '@/components/AddMemberModal';
import { useClubWorkspace } from '@/contexts/ClubWorkspaceContext';
import { getAuthHeaders, withSelectedClubId } from '@/lib/club/servicePurchasesClient';
import type { Column, Member } from '@/types/clubTable';

function memberTypeBadge(value: unknown) {
  const label = String(value ?? 'Standard').trim() || 'Standard';
  const lower = label.toLowerCase();
  const className =
    lower.includes('premium') || lower.includes('gold')
      ? 'bg-violet-100 text-violet-800'
      : lower.includes('vip')
        ? 'bg-amber-100 text-amber-800'
        : 'bg-gray-100 text-gray-700';
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${className}`}>
      {label}
    </span>
  );
}

const columns: Column[] = [
  {
    key: 'checked',
    header: (
      <span className="inline-flex w-4 justify-center" aria-hidden>
        □
      </span>
    ),
    render: () => (
      <input type="checkbox" className="h-4 w-4 rounded border-gray-300" aria-label="Select member" />
    ),
  },
  {
    key: 'image',
    header: 'Image',
    render: (value) =>
      value ? (
        <img
          src={String(value)}
          alt=""
          className="mx-auto h-10 w-10 rounded-full object-cover"
        />
      ) : (
        <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-xs text-gray-400">
          —
        </span>
      ),
  },
  { key: 'surname', header: 'Surname' },
  { key: 'name', header: 'Name' },
  { key: 'gender', header: 'Gender' },
  { key: 'dateOfBirth', header: 'Date of Birth' },
  { key: 'operator', header: 'Operator' },
  {
    key: 'memberType',
    header: 'Member Type',
    render: (value) => memberTypeBadge(value),
  },
  {
    key: 'localCity',
    header: 'Local City',
    render: (value, row) => String(value || row.Localcity || '-'),
  },
  { key: 'phone', header: 'Phone' },
  {
    key: 'insertDate',
    header: 'Insert Date',
    render: (_value, row: Member) =>
      String(row.insertDateDisplay || row.insertDate || '-'),
  },
];

export default function MemberListPage() {
  const { selectedClubId: contextClubId } = useClubWorkspace();
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [addError, setAddError] = useState('');

  const clubId = useMemo(() => {
    if (contextClubId) return contextClubId;
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('selectedClub');
  }, [contextClubId]);

  const handleAddExistingUser = useCallback(
    async (data: { username: string; password: string }) => {
      setAddError('');
      const resolvedClubId =
        clubId ||
        (typeof window !== 'undefined' ? localStorage.getItem('selectedClub') : null);
      if (!resolvedClubId) {
        throw new Error('Select a club under My clubs before adding members.');
      }

      const response = await fetch(
        withSelectedClubId(`/api/clubs/${encodeURIComponent(resolvedClubId)}/members/add`),
        {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            username: data.username,
            password: data.password,
          }),
        }
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          typeof payload.error === 'string' ? payload.error : 'Failed to add member'
        );
      }

      setRefreshKey((k) => k + 1);
    },
    [clubId]
  );

  return (
    <div>
      {addError ? (
        <p className="mb-2 px-4 text-sm text-red-600">{addError}</p>
      ) : null}
      <ClubArchivePage
        title="Archive — Members"
        archiveType="members"
        columns={columns}
        refreshKey={refreshKey}
        footerHint="Live data from club members in the database."
        headerAction={
          <button
            type="button"
            onClick={() => {
              setAddError('');
              setShowAddMemberModal(true);
            }}
            className="inline-flex items-center gap-1.5 rounded bg-white px-3 py-1.5 text-sm font-semibold text-teal-800 hover:bg-teal-50"
          >
            <UserPlus className="h-4 w-4" />
            Add a member
          </button>
        }
      />

      <AddMemberModal
        isOpen={showAddMemberModal}
        onClose={() => setShowAddMemberModal(false)}
        entityType="club"
        onAddExistingUser={handleAddExistingUser}
      />
    </div>
  );
}

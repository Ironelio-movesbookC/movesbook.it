'use client';

import { useCallback, useMemo, useState } from 'react';
import { UserPlus } from 'lucide-react';
import ClubMemberArchivePage, { memberTypeBadge } from '@/components/club/members/ClubMemberArchivePage';
import AddMemberModal from '@/components/AddMemberModal';
import { useClubWorkspace } from '@/contexts/ClubWorkspaceContext';
import { getAuthHeaders, withSelectedClubId } from '@/lib/club/servicePurchasesClient';
import type { Column } from '@/types/clubTable';

const columns: Column[] = [
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
    render: (_value, row) => String(row.insertDateDisplay || row.insertDate || '-'),
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
      <ClubMemberArchivePage
        columns={columns}
        refreshKey={refreshKey}
        footerHint="Live data from club members in the database."
        addMemberAction={
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

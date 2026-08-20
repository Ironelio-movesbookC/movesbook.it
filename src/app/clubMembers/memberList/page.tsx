'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { UserPlus } from 'lucide-react';
import ClubMemberArchivePage, { memberTypeBadge } from '@/components/club/members/ClubMemberArchivePage';
import AddMemberModal from '@/components/AddMemberModal';
import ClubMemberArchiveHeader from './components/status';
import { clubApiFetch, getAuthHeaders, withSelectedClubId } from '@/lib/club/servicePurchasesClient';
import {
  computeClubMemberCapacity,
  type ClubMemberCapacityStats,
} from '@/lib/club/clubMemberCapacity';
import {
  getUsersAvailableFirstSubscription,
  getUsersAvailableRenewal,
} from '@/lib/admin/subscriptionManageableUsers';
import { SUBSCRIPTION_SETTINGS_UPDATED_EVENT } from '@/lib/admin/subscriptionSettingsMock';
import { useClubWorkspace } from '@/contexts/ClubWorkspaceContext';
import type { Column, Member } from '@/types/clubTable';
import { staffRowTextClass } from '@/lib/club/clubStaff.constants';

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
  {
    key: 'operator',
    header: 'Operator',
    render: (value, row) => {
      const label = String(value ?? 'Member');
      const colorClass = staffRowTextClass({
        staffType: String(row.staffType ?? ''),
        role: String(row.staffRole ?? ''),
      });
      return <span className={colorClass}>{label}</span>;
    },
  },
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

type MemberCapacityResponse = {
  subscriptionSettingId: number | null;
  capacity: ClubMemberCapacityStats;
};

export default function MemberListPage() {
  const { selectedClubId: contextClubId } = useClubWorkspace();
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [addError, setAddError] = useState('');
  const [capacityPayload, setCapacityPayload] = useState<MemberCapacityResponse | null>(null);
  const [settingsRevision, setSettingsRevision] = useState(0);

  const clubId = useMemo(() => {
    if (contextClubId) return contextClubId;
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('selectedClub');
  }, [contextClubId]);

  const loadCapacity = useCallback(async () => {
    if (!clubId) {
      setCapacityPayload(null);
      return;
    }
    try {
      const response = await clubApiFetch<MemberCapacityResponse>(
        `/api/club/member-capacity?clubId=${encodeURIComponent(clubId)}`,
      );
      setCapacityPayload(response);
    } catch {
      setCapacityPayload(null);
    }
  }, [clubId]);

  useEffect(() => {
    void loadCapacity();
  }, [loadCapacity, refreshKey]);

  useEffect(() => {
    const refresh = () => setSettingsRevision((value) => value + 1);
    window.addEventListener(SUBSCRIPTION_SETTINGS_UPDATED_EVENT, refresh);
    window.addEventListener('focus', refresh);
    return () => {
      window.removeEventListener(SUBSCRIPTION_SETTINGS_UPDATED_EVENT, refresh);
      window.removeEventListener('focus', refresh);
    };
  }, []);

  const capacity = useMemo(() => {
    void settingsRevision;
    if (!capacityPayload?.capacity) return null;

    const base = capacityPayload.capacity;
    const subscriptionSettingId = capacityPayload.subscriptionSettingId;
    if (!subscriptionSettingId) return base;

    return computeClubMemberCapacity({
      membersAdded: base.membersAdded,
      membersPurchasedBase: base.membersPurchasedBase,
      subscriptionSettingId,
      subscriptionPhase: base.subscriptionPhase,
      subscriptionEndDate: base.subscriptionEndDateIso
        ? new Date(`${base.subscriptionEndDateIso}T12:00:00.000Z`)
        : null,
      usersAllowanceFirst: getUsersAvailableFirstSubscription(subscriptionSettingId),
      usersAllowanceRenewal: getUsersAvailableRenewal(subscriptionSettingId),
    });
  }, [capacityPayload, settingsRevision]);

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
        },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          typeof payload.error === 'string' ? payload.error : 'Failed to add member',
        );
      }

      setRefreshKey((k) => k + 1);
    },
    [clubId],
  );

  return (
    <div className="w-full h-full flex flex-col p-4 gap-4">
      {capacity ? (
        <ClubMemberArchiveHeader
          capacity={capacity}
          onPurchaseMembers={() => {
            window.alert('Purchase members — additional slot packs will be added to Members purchased.');
          }}
          onStatusAccounts={() => {
            window.alert('Status accounts — member account status overview.');
          }}
        />
      ) : null}

      {!capacity && clubId ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Loading member capacity from your subscription version…
        </div>
      ) : null}

      {!clubId ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Select a club workspace to view member capacity from your subscription version.
        </div>
      ) : null}

      {addError ? (
        <p className="text-sm text-red-600">{addError}</p>
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

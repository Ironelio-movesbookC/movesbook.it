'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarClock, Edit, Trash2, View } from 'lucide-react';
import ClubMemberArchiveHeader from './components/status';
import MembersTable from '@/components/club/ui/table';
import { fetchClubArchive } from '@/lib/club/archives/clubArchiveClient';
import { clubApiFetch } from '@/lib/club/servicePurchasesClient';
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

const icons = (...Icons: React.ElementType[]) => (
  <div className="flex gap-2 justify-center">
    {Icons.map((Icon, i) => (
      <Icon key={i} className="w-4 h-4 cursor-pointer hover:text-blue-500" />
    ))}
  </div>
);

const formatDate = (value: unknown) => {
  if (!value) return '-';
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString();
};

const memberTypeColumn: Column = {
  key: 'memberType',
  header: 'Member Type',
  render: (value) => {
    const label = String(value ?? '-');
    const styles: Record<string, string> = {
      Premium: 'bg-purple-100 text-purple-700',
      Gold: 'bg-yellow-100 text-yellow-700',
      Standard: 'bg-gray-100 text-gray-700',
      Basic: 'bg-gray-100 text-gray-700',
    };

    return (
      <span className={`px-2 py-1 rounded text-xs ${styles[label] || 'bg-gray-100 text-gray-700'}`}>
        {label}
      </span>
    );
  },
};

const columns: Column[] = [
  {
    key: 'image',
    header: 'Image',
    render: (value) =>
      value ? (
        <img
          src={String(value)}
          alt="profile"
          className="w-10 h-10 rounded-full mx-auto object-cover"
        />
      ) : (
        <div className="w-10 h-10 rounded-full mx-auto bg-gray-200" />
      ),
  },
  { key: 'surname', header: 'Surname' },
  { key: 'name', header: 'Name' },
  { key: 'gender', header: 'Gender' },
  {
    key: 'dateOfBirth',
    header: 'Date of Birth',
    render: (value) => formatDate(value),
  },
  { key: 'operator', header: 'Operator' },
  memberTypeColumn,
  { key: 'Localcity', header: 'Local City' },
  { key: 'phone', header: 'Phone' },
  {
    key: 'insertDate',
    header: 'Insert Date',
    render: (value) => formatDate(value),
  },
  { key: 'options', header: 'Options' },
];

function mapArchiveRow(row: Member): Member {
  const memberType = row.memberType ?? '-';
  return {
    ...row,
    id: row.id,
    image: row.image || undefined,
    gender: row.gender ?? '-',
    dateOfBirth: row.dateOfBirth ?? '',
    memberType,
    typology: memberType,
    Localcity: row.Localcity ?? '-',
    phone: row.phone ?? '-',
    insertDate: row.insertDate ?? '',
    operator: row.operator ?? '-',
    casual: row.casual ?? '',
    options: icons(View, Edit, CalendarClock, Trash2),
  };
}

type MemberCapacityResponse = {
  subscriptionSettingId: number | null;
  capacity: ClubMemberCapacityStats;
};

export default function MemberListPage() {
  const { selectedClubId } = useClubWorkspace();
  const [data, setData] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [totalMembers, setTotalMembers] = useState(0);
  const [capacityPayload, setCapacityPayload] = useState<MemberCapacityResponse | null>(null);
  const [settingsRevision, setSettingsRevision] = useState(0);

  const clubId =
    selectedClubId ??
    (typeof window !== 'undefined' ? localStorage.getItem('selectedClub') : null);

  const loadMembers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchClubArchive('members', { page: 1, pageSize: 500 });
      setTotalMembers(res.total);
      setData((res.items as Member[]).map(mapArchiveRow));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load members');
      setData([]);
      setTotalMembers(0);
    } finally {
      setLoading(false);
    }
  }, []);

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
    void loadMembers();
  }, [loadMembers]);

  useEffect(() => {
    void loadCapacity();
  }, [loadCapacity, totalMembers]);

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
      membersAdded: totalMembers,
      membersPurchasedBase: base.membersPurchasedBase,
      subscriptionSettingId,
      subscriptionPhase: base.subscriptionPhase,
      subscriptionEndDate: base.subscriptionEndDateIso
        ? new Date(`${base.subscriptionEndDateIso}T12:00:00.000Z`)
        : null,
      usersAllowanceFirst: getUsersAvailableFirstSubscription(subscriptionSettingId),
      usersAllowanceRenewal: getUsersAvailableRenewal(subscriptionSettingId),
    });
  }, [capacityPayload, settingsRevision, totalMembers]);

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

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {!capacity && !loading ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Select a club workspace to view member capacity from your subscription version.
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-lg border border-gray-200 bg-white px-4 py-8 text-center text-gray-500">
          Loading members...
        </div>
      ) : (
        <MembersTable columns={columns} tableData={data} />
      )}
    </div>
  );
}

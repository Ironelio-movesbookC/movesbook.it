'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarClock, Edit, Trash2, View } from 'lucide-react';
import MemberStats from './components/status';
import MembersTable from '@/components/club/ui/table';
import { fetchClubArchive } from '@/lib/club/archives/clubArchiveClient';
import type { Column, Member } from '@/types/clubTable';

const DEFAULT_MAX_MEMBERS = 50;

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

export default function MemberListPage() {
  const [data, setData] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [totalMembers, setTotalMembers] = useState(0);

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

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const maxMembers = useMemo(
    () => Math.max(DEFAULT_MAX_MEMBERS, totalMembers),
    [totalMembers]
  );

  return (
    <div className="w-full h-full flex flex-col p-4 gap-4">
      <MemberStats maxMembers={maxMembers} currentMembers={totalMembers} />

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

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

'use client';

import { useEffect, useMemo, useState } from 'react';
import { fetchClubArchive } from '@/lib/club/archives/clubArchiveClient';

type ParentRow = {
  key: string;
  surname: string;
  name: string;
  birthDate: string;
  fiscalCode: string;
  mail: string;
  phone: string;
  country: string;
  location: string;
  province: string;
  memberLabel: string;
  slot: string;
};

type Props = {
  clubId: string;
};

export default function AthletesParentsArchive({ clubId }: Props) {
  const [rows, setRows] = useState<ParentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!clubId) {
        setLoading(false);
        setError('Select a club first.');
        return;
      }
      try {
        setLoading(true);
        setError('');
        const data = await fetchClubArchive('parents', {
          pageSize: 500,
          clubId,
        });
        if (!cancelled) {
          setRows((data.items as unknown as ParentRow[]) || []);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clubId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.surname, r.name, r.mail, r.phone, r.fiscalCode, r.memberLabel, r.location]
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [rows, search]);

  if (loading) {
    return <p className="py-6 text-sm text-gray-500">Loading athletes&apos; parents…</p>;
  }

  if (error) {
    return <p className="py-6 text-sm text-red-600">{error}</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Athletes&apos; parents</h2>
          <p className="text-sm text-gray-600">
            Parents/tutors filled on member profiles ({filtered.length} shown).
          </p>
        </div>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-gray-700">Search</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            placeholder="Name, mail, member…"
          />
        </label>
      </div>

      {filtered.length === 0 ? (
        <p className="rounded border border-dashed border-gray-300 bg-white px-4 py-8 text-center text-sm text-gray-500">
          No parents/tutors found yet. Add them on underage member profiles (Parents tab).
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-600">
              <tr>
                <th className="px-3 py-2">Surname</th>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Birthdate</th>
                <th className="px-3 py-2">Fiscal code</th>
                <th className="px-3 py-2">Mail</th>
                <th className="px-3 py-2">Phone</th>
                <th className="px-3 py-2">Location</th>
                <th className="px-3 py-2">Member</th>
                <th className="px-3 py-2">Slot</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.key} className="border-t border-gray-100">
                  <td className="px-3 py-2">{r.surname || '—'}</td>
                  <td className="px-3 py-2">{r.name || '—'}</td>
                  <td className="px-3 py-2">{r.birthDate || '—'}</td>
                  <td className="px-3 py-2">{r.fiscalCode || '—'}</td>
                  <td className="px-3 py-2">{r.mail || '—'}</td>
                  <td className="px-3 py-2">{r.phone || '—'}</td>
                  <td className="px-3 py-2">{r.location || '—'}</td>
                  <td className="px-3 py-2">{r.memberLabel}</td>
                  <td className="px-3 py-2">{r.slot}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

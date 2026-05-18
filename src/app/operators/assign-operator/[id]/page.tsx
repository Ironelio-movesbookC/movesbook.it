'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Eye, User, UserMinus, UserPlus } from 'lucide-react';
import { persistOperatorNavContext } from '@/lib/operatorSubNav';

type StaffItem = {
  id: string;
  username: string;
  name: string;
  country: string;
  email: string;
  imageUrl: string | null;
  lastLogin: string;
};

const isDataUrl = (src?: string | null) =>
  typeof src === 'string' && src.startsWith('data:image/');

export default function AssignOperatorPage() {
  const params = useParams();
  const coAdminId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [coAdmin, setCoAdmin] = useState<StaffItem | null>(null);
  const [assigned, setAssigned] = useState<StaffItem[]>([]);
  const [candidates, setCandidates] = useState<StaffItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    if (!coAdminId) return;
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) {
        setError('Admin session not found. Please login again.');
        return;
      }
      const res = await fetch(`/api/admin/co-admins/${coAdminId}/operator-links`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to load');
      setCoAdmin(data.coAdmin ?? null);
      setAssigned(Array.isArray(data.assignedOperators) ? data.assignedOperators : []);
      setCandidates(Array.isArray(data.candidates) ? data.candidates : []);
      setSelectedIds(new Set());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [coAdminId]);

  useEffect(() => {
    persistOperatorNavContext('CO_ADMIN');
    void load();
  }, [load]);

  const toggleCandidate = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAssign = async () => {
    if (selectedIds.size === 0) {
      setError('Select at least one operator to assign.');
      return;
    }
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`/api/admin/co-admins/${coAdminId}/operator-links`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ operatorIds: Array.from(selectedIds) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to assign operators');
      setSuccess(
        selectedIds.size === 1
          ? 'Operator assigned successfully.'
          : `${selectedIds.size} operators assigned successfully.`,
      );
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to assign');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async (operatorId: string) => {
    if (!window.confirm('Remove this operator from the co-admin?')) return;
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(
        `/api/admin/co-admins/${coAdminId}/operator-links/${operatorId}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to remove');
      setSuccess('Operator removed.');
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to remove');
    } finally {
      setSubmitting(false);
    }
  };

  const renderAvatar = (row: StaffItem) => (
    <div className="w-10 h-10 rounded overflow-hidden bg-gray-200 border border-gray-300 flex items-center justify-center flex-shrink-0">
      {row.imageUrl ? (
        isDataUrl(row.imageUrl) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={row.imageUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <Image src={row.imageUrl} alt="" width={40} height={40} className="object-cover w-full h-full" />
        )
      ) : (
        <User className="w-5 h-5 text-gray-500" />
      )}
    </div>
  );

  return (
    <div className="min-h-full bg-gray-100">
      <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">
        <div className="bg-white rounded border border-gray-300 p-4">
          <h1 className="text-lg font-bold text-gray-900">Assign Operators</h1>
          <p className="text-sm text-red-600 mt-1">
            One or more operators can be assigned to this co-admin.
          </p>
          {coAdmin && (
            <p className="text-sm text-gray-700 mt-2">
              Co-admin: <span className="font-semibold">{coAdmin.name}</span> ({coAdmin.username})
            </p>
          )}
        </div>

        {(error || success || loading) && (
          <div
            className={`rounded border px-4 py-3 text-sm ${
              error
                ? 'border-red-200 bg-red-50 text-red-700'
                : success
                  ? 'border-green-200 bg-green-50 text-green-700'
                  : 'border-gray-200 bg-white text-gray-700'
            }`}
          >
            {error || success || 'Loading…'}
          </div>
        )}

        {!loading && assigned.length > 0 && (
          <section className="bg-white rounded border border-gray-300 overflow-hidden">
            <div className="px-4 py-3 bg-gray-200 border-b border-gray-300 font-semibold text-gray-800">
              Operators assigned to this co-admin
            </div>
            <div className="divide-y divide-gray-200">
              {assigned.map((row) => (
                <div
                  key={row.id}
                  className="flex flex-wrap items-center gap-3 px-4 py-3 justify-between"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {renderAvatar(row)}
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900">{row.name}</p>
                      <p className="text-sm text-gray-600">
                        {row.username} · {row.country}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Link
                      href={`/operators/profile/${row.id}`}
                      onClick={() => persistOperatorNavContext('OPERATOR')}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#4f4f4f] hover:bg-[#3d3d3d] text-white text-sm rounded"
                    >
                      <Eye className="w-4 h-4" /> Profile
                    </Link>
                    <button
                      type="button"
                      onClick={() => void handleRemove(row.id)}
                      disabled={submitting}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-sm rounded"
                    >
                      <UserMinus className="w-4 h-4" /> Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {!loading && (
          <section className="bg-white rounded border border-gray-300 overflow-hidden">
            <div className="px-4 py-3 bg-gray-200 border-b border-gray-300 font-semibold text-gray-800">
              Select operators to assign
            </div>
            <div className="divide-y divide-gray-200 max-h-[420px] overflow-y-auto">
              {candidates.length === 0 ? (
                <p className="p-4 text-sm text-gray-600">
                  {assigned.length > 0
                    ? 'All operators are already assigned to this co-admin.'
                    : 'No operators available.'}
                </p>
              ) : (
                candidates.map((row) => (
                  <label
                    key={row.id}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.has(row.id)}
                      onChange={() => toggleCandidate(row.id)}
                      className="rounded border-gray-400"
                    />
                    {renderAvatar(row)}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900">{row.name}</p>
                      <p className="text-sm text-gray-600">
                        {row.username} · {row.country}
                      </p>
                    </div>
                  </label>
                ))
              )}
            </div>
            <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
              <button
                type="button"
                onClick={() => void handleAssign()}
                disabled={submitting || selectedIds.size === 0}
                className="inline-flex items-center gap-1 px-4 py-2 bg-[#4f4f4f] hover:bg-[#3d3d3d] disabled:opacity-60 text-white text-sm rounded"
              >
                <UserPlus className="w-4 h-4" />
                Assign selected ({selectedIds.size})
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

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
  assignmentDateDisplay?: string;
};

const isDataUrl = (src?: string | null) =>
  typeof src === 'string' && src.startsWith('data:image/');

export default function AssignCoAdminPage() {
  const params = useParams();
  const operatorId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [operator, setOperator] = useState<StaffItem | null>(null);
  const [assigned, setAssigned] = useState<StaffItem | null>(null);
  const [candidates, setCandidates] = useState<StaffItem[]>([]);
  const [selectedId, setSelectedId] = useState('');

  const load = useCallback(async () => {
    if (!operatorId) return;
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) {
        setError('Admin session not found. Please login again.');
        return;
      }
      const res = await fetch(`/api/admin/operators/${operatorId}/co-admin-link`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to load');
      setOperator(data.operator ?? null);
      setAssigned(data.assignedCoAdmin ?? null);
      setCandidates(Array.isArray(data.candidates) ? data.candidates : []);
      setSelectedId(data.assignedCoAdmin?.id ?? '');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [operatorId]);

  useEffect(() => {
    persistOperatorNavContext('OPERATOR');
    void load();
  }, [load]);

  const handleAssign = async () => {
    if (!selectedId) {
      setError('Select a co-admin to assign.');
      return;
    }
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`/api/admin/operators/${operatorId}/co-admin-link`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ coAdminId: selectedId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to assign co-admin');
      setSuccess('Co-admin assigned successfully.');
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to assign');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async () => {
    if (!assigned) return;
    if (!window.confirm('Remove the co-admin assigned to this operator?')) return;
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`/api/admin/operators/${operatorId}/co-admin-link`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to remove');
      setSuccess('Co-admin removed.');
      setSelectedId('');
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to remove');
    } finally {
      setSubmitting(false);
    }
  };

  const renderAvatar = (row: StaffItem) => (
    <div className="w-12 h-12 rounded overflow-hidden bg-gray-200 border border-gray-300 flex items-center justify-center flex-shrink-0">
      {row.imageUrl ? (
        isDataUrl(row.imageUrl) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={row.imageUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <Image src={row.imageUrl} alt="" width={48} height={48} className="object-cover w-full h-full" />
        )
      ) : (
        <User className="w-6 h-6 text-gray-500" />
      )}
    </div>
  );

  return (
    <div className="min-h-full bg-gray-100">
      <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">
        <div className="bg-white rounded border border-gray-300 p-4">
          <h1 className="text-lg font-bold text-gray-900">Assign a Co-admin</h1>
          <p className="text-sm text-red-600 mt-1">
            Only one co-admin can be assigned to each operator.
          </p>
          {operator && (
            <p className="text-sm text-gray-700 mt-2">
              Operator: <span className="font-semibold">{operator.name}</span> ({operator.username})
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

        {assigned && !loading && (
          <section className="bg-white rounded border border-gray-300 p-4 space-y-3">
            <h2 className="font-semibold text-gray-800">Assigned co-admin</h2>
            <div className="flex flex-wrap items-center gap-4 justify-between">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {renderAvatar(assigned)}
                <div>
                  <p className="font-semibold text-gray-900">{assigned.name}</p>
                  <p className="text-sm text-gray-600">{assigned.username}</p>
                  <p className="text-sm text-gray-500">{assigned.country}</p>
                </div>
              </div>
              <p className="text-sm text-gray-700 shrink-0 px-2 min-w-[140px]">
                <span className="text-gray-500">Date assignment: </span>
                <span className="font-medium">{assigned.assignmentDateDisplay ?? '—'}</span>
              </p>
              <div className="flex gap-2 flex-shrink-0">
                <Link
                  href={`/operators/profile/${assigned.id}`}
                  onClick={() => persistOperatorNavContext('CO_ADMIN')}
                  className="inline-flex items-center gap-1 px-3 py-2 bg-[#4f4f4f] hover:bg-[#3d3d3d] text-white text-sm rounded"
                >
                  <Eye className="w-4 h-4" /> View profile
                </Link>
                <button
                  type="button"
                  onClick={() => void handleRemove()}
                  disabled={submitting}
                  className="inline-flex items-center gap-1 px-3 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-sm rounded"
                >
                  <UserMinus className="w-4 h-4" /> Remove
                </button>
              </div>
            </div>
          </section>
        )}

        {!loading && (
          <section className="bg-white rounded border border-gray-300 overflow-hidden">
            <div className="px-4 py-3 bg-gray-200 border-b border-gray-300 font-semibold text-gray-800">
              {assigned ? 'Change co-admin' : 'Select a co-admin to assign'}
            </div>
            <div className="divide-y divide-gray-200 max-h-[420px] overflow-y-auto">
              {candidates.length === 0 ? (
                <p className="p-4 text-sm text-gray-600">No co-admins available.</p>
              ) : (
                candidates.map((row) => (
                  <label
                    key={row.id}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="coadmin"
                      value={row.id}
                      checked={selectedId === row.id}
                      onChange={() => setSelectedId(row.id)}
                      className="rounded-full border-gray-400"
                    />
                    {renderAvatar(row)}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900">{row.name}</p>
                      <p className="text-sm text-gray-600">{row.username} · {row.country}</p>
                    </div>
                  </label>
                ))
              )}
            </div>
            <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
              <button
                type="button"
                onClick={() => void handleAssign()}
                disabled={submitting || !selectedId}
                className="inline-flex items-center gap-1 px-4 py-2 bg-[#4f4f4f] hover:bg-[#3d3d3d] disabled:opacity-60 text-white text-sm rounded"
              >
                <UserPlus className="w-4 h-4" />
                {assigned ? 'Update assignment' : 'Assign co-admin'}
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

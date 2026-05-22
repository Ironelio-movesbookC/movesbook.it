'use client';

import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { User, Eye, Settings, Trash2, Link2, UserPlus, X, Search } from 'lucide-react';
import { persistOperatorNavContext } from '@/lib/operatorSubNav';

const PAGE_SIZE = 10;

type CustomerRow = {
  assignmentId: string;
  movesbookUserId: string | null;
  username: string;
  name: string;
  country: string;
  language: string;
  lastLogin: string;
  imageUrl?: string | null;
  source: 'direct' | 'operator';
  viaOperatorName: string;
  canRemove: boolean;
};

type CandidateUser = {
  id: string;
  username: string;
  name: string;
  country: string;
  language: string;
  lastLoginDisplay: string;
  imageUrl: string | null;
};

type LinkedCoAdmin = {
  id: string;
  name: string;
  username: string;
};

const isDataUrl = (src?: string | null) =>
  typeof src === 'string' && src.startsWith('data:image/');

export default function MyCustomersPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [staffName, setStaffName] = useState('');
  const [roleLabel, setRoleLabel] = useState('Operator');
  const [isCoAdmin, setIsCoAdmin] = useState(false);
  const [linkedCoAdmin, setLinkedCoAdmin] = useState<LinkedCoAdmin | null>(null);
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [candidates, setCandidates] = useState<CandidateUser[]>([]);
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());

  const loadCustomers = useCallback(async () => {
    if (!id) return;
    setListError('');
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) {
        setListError('Admin session not found.');
        setCustomers([]);
        return;
      }
      const res = await fetch(`/api/admin/operators/${id}/assigned-users`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to load assigned users');

      setStaffName(String(data.staffName ?? ''));
      const kind = String(data.staffKind ?? 'OPERATOR').toUpperCase();
      const coAdminView = kind === 'CO_ADMIN';
      setIsCoAdmin(coAdminView);
      setRoleLabel(coAdminView ? 'Co-Admin' : 'Operator');
      setLinkedCoAdmin(data.linkedCoAdmin ?? null);
      persistOperatorNavContext(coAdminView ? 'CO_ADMIN' : 'OPERATOR', { kind: 'myCustomers' });

      const users = Array.isArray(data?.users) ? data.users : [];
      setCustomers(
        users.map(
          (u: {
            assignmentId: string;
            movesbookUserId?: string | null;
            username: string;
            name: string;
            country: string;
            language: string;
            lastLoginDisplay: string;
            imageUrl?: string | null;
            source: 'direct' | 'operator';
            viaOperatorName: string;
            canRemove: boolean;
          }) => ({
            assignmentId: u.assignmentId,
            movesbookUserId: u.movesbookUserId ?? null,
            username: u.username,
            name: u.name,
            country: u.country || '—',
            language: u.language || '—',
            lastLogin: u.lastLoginDisplay || '—',
            imageUrl: u.imageUrl,
            source: u.source,
            viaOperatorName: u.viaOperatorName || '—',
            canRemove: Boolean(u.canRemove),
          }),
        ),
      );
      setCurrentPage(1);
    } catch (e: unknown) {
      setListError(e instanceof Error ? e.message : 'Failed to load');
      setCustomers([]);
    }
  }, [id]);

  useEffect(() => {
    setLoading(true);
    void loadCustomers().finally(() => setLoading(false));
  }, [loadCustomers]);

  const totalPages = Math.max(1, Math.ceil(customers.length / PAGE_SIZE));
  const pageRows = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return customers.slice(start, start + PAGE_SIZE);
  }, [customers, currentPage]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const loadCandidates = useCallback(
    async (q: string) => {
      if (!id) return;
      setCandidatesLoading(true);
      try {
        const token = localStorage.getItem('adminToken');
        if (!token) return;
        const params = new URLSearchParams();
        if (q.trim()) params.set('q', q.trim());
        const res = await fetch(
          `/api/admin/operators/${id}/assigned-users/candidates?${params}`,
          { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' },
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || 'Failed to search users');
        setCandidates(Array.isArray(data.candidates) ? data.candidates : []);
      } catch {
        setCandidates([]);
      } finally {
        setCandidatesLoading(false);
      }
    },
    [id],
  );

  useEffect(() => {
    if (!modalOpen) return;
    const t = window.setTimeout(() => void loadCandidates(searchQuery), 300);
    return () => window.clearTimeout(t);
  }, [modalOpen, searchQuery, loadCandidates]);

  const openCustomerDetails = (row: CustomerRow) => {
    const userId = row.movesbookUserId;
    if (userId) {
      router.push(`/subscriptionuserlists/historyuser/${userId}`);
      return;
    }
    router.push(`/subscriptionuserlists/historyuser/${row.assignmentId}`);
  };

  const openCustomerHistoryStatus = (row: CustomerRow) => {
    const userId = row.movesbookUserId;
    if (userId) {
      router.push(`/subscriptionuserlists/historystatus/${userId}`);
      return;
    }
    router.push(`/subscriptionuserlists/historystatus/${row.assignmentId}`);
  };

  const toggleUser = (userId: string) => {
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const openModal = () => {
    setFormError('');
    setSearchQuery('');
    setSelectedUserIds(new Set());
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setFormError('');
    setSearchQuery('');
    setSelectedUserIds(new Set());
  };

  const handleAssignSubmit = async () => {
    if (selectedUserIds.size === 0) {
      setFormError('Select at least one user to assign.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) {
        setFormError('Admin session not found.');
        return;
      }
      const res = await fetch(`/api/admin/operators/${id}/assigned-users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userIds: Array.from(selectedUserIds) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to assign users');

      closeModal();
      await loadCustomers();
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row: CustomerRow) => {
    if (!row.canRemove) return;
    if (!window.confirm(`Remove assigned user "${row.username}"?`)) return;
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) {
        setListError('Admin session not found.');
        return;
      }
      const res = await fetch(
        `/api/admin/operators/${id}/assigned-users/${row.assignmentId}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to delete');
      await loadCustomers();
    } catch (e: unknown) {
      setListError(e instanceof Error ? e.message : 'Delete failed');
    }
  };

  const listTitle = isCoAdmin
    ? 'Users assigned to co-admin'
    : 'Users assigned to operator';

  return (
    <div className="min-h-full bg-gray-100">
      <div className="flex items-center gap-3 px-4 py-3 bg-gray-200 border-b border-gray-300">
        <span className="text-red-600 font-medium">{roleLabel}</span>
        <input
          type="text"
          value={staffName}
          readOnly
          className="px-3 py-1.5 border border-gray-400 rounded bg-white text-gray-900 w-48 max-w-[240px]"
          title="Staff account for this page"
        />
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-100 border border-amber-200 rounded text-gray-800 font-medium">
                <Link2 className="w-5 h-5 text-amber-700 flex-shrink-0" />
                <span>{listTitle}</span>
              </div>
              {isCoAdmin ? (
                <button
                  type="button"
                  onClick={openModal}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white border-2 border-red-600 text-red-600 rounded font-medium hover:bg-red-50 transition"
                >
                  <UserPlus className="w-5 h-5 flex-shrink-0" />
                  Assign a new user
                </button>
              ) : null}
              {!isCoAdmin && linkedCoAdmin ? (
                <span className="text-sm text-gray-700">
                  …and assigned also to{' '}
                  <span className="font-semibold text-red-600">{linkedCoAdmin.name}</span>
                </span>
              ) : null}
            </div>
            {isCoAdmin ? (
              <p className="text-sm text-gray-600">
                Direct assignments show &quot;Direct association&quot;. Users assigned to your
                operators appear with the operator name in the Via operator column.
              </p>
            ) : null}
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="px-3 py-1.5 border border-gray-400 rounded bg-white text-gray-700 text-sm hover:bg-gray-50 disabled:opacity-50"
            >
              Prev
            </button>
            <button
              type="button"
              className="px-3 py-1.5 border border-gray-600 bg-gray-600 text-white rounded text-sm"
            >
              {currentPage}
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="px-3 py-1.5 border border-gray-400 rounded bg-white text-gray-700 text-sm hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>

        {listError ? (
          <div className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {listError}
          </div>
        ) : null}

        <div className="overflow-x-auto rounded-b border border-gray-300 border-t-0 bg-white shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-teal-700 text-white">
                <th className="px-4 py-3 font-semibold text-sm w-12">Image</th>
                <th className="px-4 py-3 font-semibold text-sm">UserName</th>
                <th className="px-4 py-3 font-semibold text-sm">Name</th>
                {isCoAdmin ? (
                  <th className="px-4 py-3 font-semibold text-sm">Via operator</th>
                ) : null}
                <th className="px-4 py-3 font-semibold text-sm">Country</th>
                <th className="px-4 py-3 font-semibold text-sm">Language</th>
                <th className="px-4 py-3 font-semibold text-sm">Last Login</th>
                <th className="px-4 py-3 font-semibold text-sm">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={isCoAdmin ? 8 : 7} className="px-4 py-8 text-center text-gray-500">
                    Loading…
                  </td>
                </tr>
              ) : pageRows.length === 0 ? (
                <tr>
                  <td colSpan={isCoAdmin ? 8 : 7} className="px-4 py-8 text-center text-gray-500">
                    {isCoAdmin
                      ? 'No users assigned yet. Use "Assign a new user" to select Movesbook users.'
                      : 'No users assigned yet.'}
                  </td>
                </tr>
              ) : (
                pageRows.map((row) => (
                  <tr key={`${row.assignmentId}-${row.viaOperatorName}`} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="w-10 h-10 rounded overflow-hidden bg-gray-200 flex items-center justify-center">
                        {row.imageUrl ? (
                          isDataUrl(row.imageUrl) ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={row.imageUrl}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Image
                              src={row.imageUrl}
                              alt={row.name}
                              width={40}
                              height={40}
                              className="object-cover w-full h-full"
                            />
                          )
                        ) : (
                          <User className="w-5 h-5 text-gray-500" />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => openCustomerDetails(row)}
                        className="text-red-600 hover:text-red-700 hover:underline font-medium"
                      >
                        {row.username}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-gray-800">{row.name}</td>
                    {isCoAdmin ? (
                      <td className="px-4 py-3 text-gray-700 text-sm">{row.viaOperatorName}</td>
                    ) : null}
                    <td className="px-4 py-3 text-gray-700">{row.country}</td>
                    <td className="px-4 py-3 font-bold text-gray-800">{row.language}</td>
                    <td className="px-4 py-3 text-gray-600">{row.lastLogin}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openCustomerDetails(row)}
                          className="p-1.5 text-gray-500 hover:text-teal-600 hover:bg-teal-50 rounded"
                          title="View details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openCustomerHistoryStatus(row)}
                          className="p-1.5 text-gray-500 hover:text-teal-600 hover:bg-teal-50 rounded"
                          title="History and settings"
                        >
                          <Settings className="w-4 h-4" />
                        </button>
                        {row.canRemove ? (
                          <button
                            type="button"
                            onClick={() => void handleDelete(row)}
                            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                            title="Remove assignment"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-lg border border-gray-300 shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Assign users</h2>
              <button type="button" onClick={closeModal} className="p-1 rounded hover:bg-gray-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 border-b border-gray-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by username or name…"
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded bg-white text-gray-900"
                />
              </div>
              {formError ? (
                <p className="mt-2 text-sm text-red-600">{formError}</p>
              ) : (
                <p className="mt-2 text-sm text-gray-600">
                  Select one or more Movesbook users to assign directly to this {roleLabel.toLowerCase()}.
                </p>
              )}
            </div>
            <div className="flex-1 overflow-y-auto min-h-[200px] max-h-[50vh] divide-y divide-gray-100">
              {candidatesLoading ? (
                <p className="p-4 text-sm text-gray-500">Searching…</p>
              ) : candidates.length === 0 ? (
                <p className="p-4 text-sm text-gray-500">No users found.</p>
              ) : (
                candidates.map((u) => (
                  <label
                    key={u.id}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedUserIds.has(u.id)}
                      onChange={() => toggleUser(u.id)}
                      className="rounded border-gray-400"
                    />
                    <div className="w-9 h-9 rounded bg-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {u.imageUrl ? (
                        isDataUrl(u.imageUrl) ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={u.imageUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Image
                            src={u.imageUrl}
                            alt=""
                            width={36}
                            height={36}
                            className="object-cover w-full h-full"
                          />
                        )
                      ) : (
                        <User className="w-4 h-4 text-gray-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900">{u.name}</p>
                      <p className="text-sm text-gray-600">
                        {u.username} · {u.country || '—'}
                      </p>
                    </div>
                  </label>
                ))
              )}
            </div>
            <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-200 bg-gray-50">
              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="px-4 py-2 border border-gray-400 rounded text-gray-800 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleAssignSubmit()}
                disabled={saving || selectedUserIds.size === 0}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
              >
                {saving
                  ? 'Assigning…'
                  : `Assign selected (${selectedUserIds.size})`}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

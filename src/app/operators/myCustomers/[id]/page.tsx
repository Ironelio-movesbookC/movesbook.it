'use client';

import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { User, Eye, Settings, Trash2, Link2, UserPlus, X } from 'lucide-react';
import { OperatorNavBar } from '@/components/operators/OperatorNavBar';
import { COUNTRIES } from '@/lib/news/countries';

const LANGUAGE_OPTIONS = [
  'English',
  'Italian',
  'French',
  'German',
  'Spanish',
  'Portuguese',
  'Dutch',
  'Finnish',
  'Swedish',
  'Norwegian',
  'Danish',
  'Polish',
  'Greek',
  'Russian',
  'Turkish',
  'Arabic',
  'Chinese',
  'Japanese',
  'Korean',
  'Hindi',
] as const;

const PAGE_SIZE = 10;

interface CustomerRow {
  id: string;
  username: string;
  name: string;
  imageUrl?: string | null;
  country: string;
  language: string;
  lastLogin: string;
}

const isDataUrl = (src?: string | null) =>
  typeof src === 'string' && src.startsWith('data:image/');

export default function MyCustomersPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [operatorName, setOperatorName] = useState('');
  const [roleLabel, setRoleLabel] = useState('Operator');
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formName, setFormName] = useState('');
  const [formCountry, setFormCountry] = useState('');
  const [formLanguage, setFormLanguage] = useState('English');
  const [formLastLogin, setFormLastLogin] = useState('');
  const [formFile, setFormFile] = useState<File | null>(null);

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
      const users = Array.isArray(data?.users) ? data.users : [];
      setCustomers(
        users.map((u: { id: string; username: string; name: string; country: string; language: string; lastLoginDisplay: string; imageUrl?: string | null }) => ({
          id: u.id,
          username: u.username,
          name: u.name,
          country: u.country || '—',
          language: u.language || '—',
          lastLogin: u.lastLoginDisplay || '—',
          imageUrl: u.imageUrl,
        })),
      );
      setCurrentPage(1);
    } catch (e: unknown) {
      setListError(e instanceof Error ? e.message : 'Failed to load');
      setCustomers([]);
    }
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    async function loadStaff() {
      if (!id) return;
      setLoading(true);
      try {
        const token = localStorage.getItem('adminToken');
        if (!token) return;
        const res = await fetch(`/api/admin/operators/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || cancelled) return;
        const o = data?.operator || {};
        const full = `${String(o.name ?? '')} ${String(o.surname ?? '')}`.trim();
        setOperatorName(full || String(o.username ?? ''));
        const kind = String(o.kind ?? '').toUpperCase();
        setRoleLabel(kind === 'CO_ADMIN' ? 'Co-Admin' : 'Operator');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadStaff();
    void loadCustomers();
    return () => {
      cancelled = true;
    };
  }, [id, loadCustomers]);

  const totalPages = Math.max(1, Math.ceil(customers.length / PAGE_SIZE));
  const pageRows = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return customers.slice(start, start + PAGE_SIZE);
  }, [customers, currentPage]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const openCustomerDetails = (customerId: string) => {
    router.push(`/subscriptionuserlists/historyuser/${customerId}`);
  };

  const openCustomerHistoryStatus = (customerId: string) => {
    router.push(`/subscriptionuserlists/historystatus/${customerId}`);
  };

  const resetForm = () => {
    setFormUsername('');
    setFormName('');
    setFormCountry('');
    setFormLanguage('English');
    setFormLastLogin('');
    setFormFile(null);
    setFormError('');
  };

  const closeModal = () => {
    setModalOpen(false);
    resetForm();
  };

  const handleAssignSubmit = async () => {
    setFormError('');
    if (!formUsername.trim() || !formName.trim()) {
      setFormError('Username and name are required.');
      return;
    }
    setSaving(true);
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) {
        setFormError('Admin session not found.');
        return;
      }
      const form = new FormData();
      form.set('username', formUsername.trim());
      form.set('name', formName.trim());
      form.set('country', formCountry.trim());
      form.set('language', formLanguage.trim());
      if (formLastLogin.trim()) form.set('lastLogin', formLastLogin.trim());
      if (formFile) form.set('file', formFile);

      const res = await fetch(`/api/admin/operators/${id}/assigned-users`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to assign user');

      closeModal();
      await loadCustomers();
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (userId: string, username: string) => {
    if (!window.confirm(`Remove assigned user "${username}"?`)) return;
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) {
        setListError('Admin session not found.');
        return;
      }
      const res = await fetch(`/api/admin/operators/${id}/assigned-users/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to delete');
      await loadCustomers();
    } catch (e: unknown) {
      setListError(e instanceof Error ? e.message : 'Delete failed');
    }
  };

  return (
    <div className="min-h-full bg-gray-100">
      <div className="flex items-center gap-3 px-4 py-3 bg-gray-200 border-b border-gray-300">
        <span className="text-red-600 font-medium">{roleLabel}</span>
        <input
          type="text"
          value={operatorName}
          onChange={(e) => setOperatorName(e.target.value)}
          readOnly
          className="px-3 py-1.5 border border-gray-400 rounded bg-white text-gray-900 w-48 max-w-[240px]"
          title="Operator / co-admin for this page"
        />
      </div>

      <OperatorNavBar operatorId={id} activeTabId="customers" variant={{ kind: 'myCustomers' }} />

      <div className="max-w-6xl mx-auto px-6 py-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-100 border border-amber-200 rounded text-gray-800 font-medium">
              <Link2 className="w-5 h-5 text-amber-700 flex-shrink-0" />
              <span>Users assigned to operator</span>
            </div>
            <button
              type="button"
              onClick={() => {
                resetForm();
                setModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border-2 border-red-600 text-red-600 rounded font-medium hover:bg-red-50 transition"
            >
              <UserPlus className="w-5 h-5 flex-shrink-0" />
              Assign a new user
            </button>
          </div>
          <div className="flex items-center gap-2">
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
        </div>

        {listError ? (
          <div className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{listError}</div>
        ) : null}

        <div className="overflow-x-auto rounded-b border border-gray-300 border-t-0 bg-white shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-teal-700 text-white">
                <th className="px-4 py-3 font-semibold text-sm w-12">Image</th>
                <th className="px-4 py-3 font-semibold text-sm">UserName</th>
                <th className="px-4 py-3 font-semibold text-sm">Name</th>
                <th className="px-4 py-3 font-semibold text-sm">Country</th>
                <th className="px-4 py-3 font-semibold text-sm">Language</th>
                <th className="px-4 py-3 font-semibold text-sm">Last Login</th>
                <th className="px-4 py-3 font-semibold text-sm">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    Loading…
                  </td>
                </tr>
              ) : pageRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    No users assigned yet. Use &quot;Assign a new user&quot; to add one.
                  </td>
                </tr>
              ) : (
                pageRows.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" aria-hidden />
                        <div className="w-10 h-10 rounded overflow-hidden bg-gray-200 flex items-center justify-center flex-shrink-0">
                          {row.imageUrl ? (
                            isDataUrl(row.imageUrl) ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={row.imageUrl}
                                alt=""
                                width={40}
                                height={40}
                                className="object-cover w-full h-full"
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
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => openCustomerDetails(row.id)}
                        className="text-red-600 hover:text-red-700 hover:underline font-medium"
                      >
                        {row.username}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-gray-800">{row.name}</td>
                    <td className="px-4 py-3 text-gray-700">{row.country}</td>
                    <td className="px-4 py-3 font-bold text-gray-800">{row.language}</td>
                    <td className="px-4 py-3 text-gray-600">{row.lastLogin}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openCustomerDetails(row.id)}
                          className="p-1.5 text-gray-500 hover:text-teal-600 hover:bg-teal-50 rounded transition"
                          title="View details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openCustomerHistoryStatus(row.id)}
                          className="p-1.5 text-gray-500 hover:text-teal-600 hover:bg-teal-50 rounded transition"
                          title="History and settings"
                        >
                          <Settings className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(row.id, row.username)}
                          className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition"
                          title="Remove assignment"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
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
          aria-labelledby="assign-user-title"
        >
          <div className="bg-white rounded-lg border border-gray-300 shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-100">
              <h2 id="assign-user-title" className="text-lg font-semibold text-gray-900">
                Assign a new user
              </h2>
              <button
                type="button"
                onClick={closeModal}
                className="p-1 rounded hover:bg-gray-200 text-gray-600"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              {formError ? (
                <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</div>
              ) : null}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Profile image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFormFile(e.target.files?.[0] ?? null)}
                  className="block w-full text-sm text-gray-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username *</label>
                <input
                  type="text"
                  value={formUsername}
                  onChange={(e) => setFormUsername(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded bg-white text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded bg-white text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                <select
                  value={formCountry}
                  onChange={(e) => setFormCountry(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded bg-white text-gray-900"
                >
                  <option value="">Select country</option>
                  {COUNTRIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
                <select
                  value={formLanguage}
                  onChange={(e) => setFormLanguage(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded bg-white text-gray-900"
                >
                  {LANGUAGE_OPTIONS.map((lang) => (
                    <option key={lang} value={lang}>
                      {lang}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last login</label>
                <input
                  type="datetime-local"
                  value={formLastLogin}
                  onChange={(e) => setFormLastLogin(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded bg-white text-gray-900"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-200 bg-gray-50">
              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="px-4 py-2 border border-gray-400 rounded text-gray-800 hover:bg-gray-100 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleAssignSubmit()}
                disabled={saving}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

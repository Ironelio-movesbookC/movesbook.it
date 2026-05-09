'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import {
  Filter,
  ChevronDown,
  Eye,
  Settings,
  Trash2,
  User,
} from 'lucide-react';

interface AssignedStaffRow {
  id: string;
  username: string;
  name: string;
  imageUrl?: string | null;
  country?: string | null;
  staffLinked?: string | null;
  lastLogin?: string | null;
  kind?: 'OPERATOR' | 'CO_ADMIN';
  regions?: string | null;
}

export default function UsersAssignedStaffPage() {
  const router = useRouter();
  const [rows, setRows] = useState<AssignedStaffRow[]>([]);
  const [filterValue, setFilterValue] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>('');

  const openProfile = (id: string) => router.push(`/operators/profile/${id}`);
  const openSettings = (id: string) => router.push(`/operators/settings/${id}`);

  const isDataUrl = (src?: string | null) =>
    typeof src === 'string' && src.startsWith('data:image/');

  const handleProceed = () => {
    // TODO: apply filter + search and refetch or filter client-side
  };

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let base = rows;
    if (filterValue === 'coadmin') base = base.filter((r) => r.kind === 'CO_ADMIN');
    if (filterValue === 'operator') base = base.filter((r) => r.kind === 'OPERATOR');
    if (!q) return base;
    return base.filter((r) => `${r.username} ${r.name} ${r.country ?? ''}`.toLowerCase().includes(q));
  }, [filterValue, rows, searchQuery]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setLoadError('');
      try {
        const token = localStorage.getItem('adminToken');
        if (!token) {
          setLoadError('Admin session not found. Please login again.');
          setRows([]);
          return;
        }

        const res = await fetch('/api/admin/staff-accounts', {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || 'Failed to load staff');
        if (!cancelled) setRows(Array.isArray(data?.staff) ? data.staff : []);
      } catch (e: any) {
        if (!cancelled) {
          setLoadError(e?.message || 'Failed to load staff');
          setRows([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-full bg-gray-50">
      <div className="max-w-[1800px] mx-auto px-6 py-6">
        {/* Header: blue banner + silhouette icon + title */}
        <div className="flex items-stretch gap-0 mb-6 rounded overflow-hidden border border-gray-200 shadow-sm">
          <div className="flex items-center justify-center w-28 sm:w-32 bg-gray-800 text-white flex-shrink-0">
            <User className="w-16 h-16 sm:w-20 sm:h-20 opacity-90" strokeWidth={1.2} />
          </div>
          <div className="flex-1 flex items-center px-6 py-4 bg-[#005c99]">
            <h1 className="text-xl sm:text-2xl font-bold text-white">
              All users associated to our staff
            </h1>
          </div>
        </div>

        {/* Filter and Search controls */}
        <div className="flex flex-wrap items-end gap-4 mb-4">
          <div className="relative">
            <button
              type="button"
              onClick={() => setFilterOpen(!filterOpen)}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#4f4f4f] hover:bg-[#3d3d3d] text-white border border-gray-500 rounded transition"
            >
              <Filter className="w-4 h-4" />
              <span>Filter</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${filterOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={filterValue}
              onChange={(e) => setFilterValue(e.target.value)}
              className="px-3 py-2.5 border border-gray-300 rounded bg-white text-gray-800 min-w-[100px] focus:outline-none focus:ring-2 focus:ring-[#005c99]"
            >
              <option value="all">All</option>
              <option value="coadmin">Co-Admins</option>
              <option value="operator">Operators</option>
            </select>
          </div>

          <div className="flex flex-col">
            <label htmlFor="search-user" className="text-sm text-gray-700 mb-1">
              Search user
            </label>
            <input
              id="search-user"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Fullname, Username"
              className="px-3 py-2 border border-gray-300 rounded bg-white text-gray-800 w-56 focus:outline-none focus:ring-2 focus:ring-[#005c99]"
            />
          </div>

          <button
            type="button"
            onClick={handleProceed}
            className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded transition"
          >
            Proceed
          </button>
        </div>

        {/* Operators List section bar */}
        <div className="px-4 py-2.5 bg-[#4f4f4f] text-white font-medium rounded-t border border-gray-300 border-b-0">
          Operators List
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-b border border-gray-300 border-t-0 bg-white shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-teal-700 text-white">
                <th className="px-4 py-3 font-semibold text-sm">Image</th>
                <th className="px-4 py-3 font-semibold text-sm">UserName</th>
                <th className="px-4 py-3 font-semibold text-sm">Name</th>
                <th className="px-4 py-3 font-semibold text-sm">Country</th>
                <th className="px-4 py-3 font-semibold text-sm">Staff linked</th>
                <th className="px-4 py-3 font-semibold text-sm">Last Login</th>
                <th className="px-4 py-3 font-semibold text-sm">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : loadError ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-red-600">
                    {loadError}
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    No staff found.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3">
                      <div className="w-10 h-10 rounded overflow-hidden bg-gray-200 flex items-center justify-center flex-shrink-0">
                        {row.imageUrl ? (
                          isDataUrl(row.imageUrl) ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={row.imageUrl}
                              alt={row.name}
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
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => openProfile(row.id)}
                        className="text-red-600 hover:text-red-700 hover:underline font-medium"
                      >
                        {row.username}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-gray-800">{row.name}</td>
                    <td className="px-4 py-3 text-gray-700">{row.country ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-700">{row.staffLinked ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{row.lastLogin ?? '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openProfile(row.id)}
                          className="p-1.5 text-gray-500 hover:text-teal-600 hover:bg-teal-50 rounded transition"
                          title="View profile"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openSettings(row.id)}
                          className="p-1.5 text-gray-500 hover:text-teal-600 hover:bg-teal-50 rounded transition"
                          title="Settings"
                        >
                          <Settings className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition"
                          title="Delete"
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
    </div>
  );
}

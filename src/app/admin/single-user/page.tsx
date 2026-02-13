'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Filter, UserPlus } from 'lucide-react';

export default function AdminSingleUserPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const adminData = localStorage.getItem('adminUser');
    if (!adminData) {
      router.push('/');
      return;
    }
    setLoading(false);
  }, [router]);

  if (loading) return null;

  return (
    <div className="max-w-[1800px] mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Single User Management</h1>
        <p className="text-gray-600">Manage individual users, athletes, and coaches</p>
      </div>

      {/* Search and Filter Bar */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 mb-6">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search users by name, email, or ID..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button className="flex items-center gap-2 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition">
            <Filter className="w-5 h-5" />
            Filter
          </button>
          <button className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
            <UserPlus className="w-5 h-5" />
            Add User
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">ID</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Name</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Email</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Type</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Status</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            <tr className="hover:bg-gray-50">
              <td className="px-6 py-4 text-sm text-gray-900">#001</td>
              <td className="px-6 py-4 text-sm font-medium text-gray-900">John Doe</td>
              <td className="px-6 py-4 text-sm text-gray-600">john@example.com</td>
              <td className="px-6 py-4">
                <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                  Athlete
                </span>
              </td>
              <td className="px-6 py-4">
                <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                  Active
                </span>
              </td>
              <td className="px-6 py-4">
                <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                  Edit
                </button>
              </td>
            </tr>
            {/* Add more rows as needed */}
          </tbody>
        </table>
      </div>
    </div>
  );
}

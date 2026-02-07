'use client';

import { useState } from 'react';
import Link from 'next/link';
import AdminNavbar from '@/components/AdminNavbar';
import AdminLeftSidebar from '@/components/admin/AdminLeftSidebar';
import AdminRightSidebar from '@/components/admin/AdminRightSidebar';
import { Search, Filter, MoreHorizontal, Edit, Trash2 } from 'lucide-react';

export default function UsersPage() {
  const [users] = useState([
    { id: 1, name: 'John Doe', email: 'john@example.com', type: 'Athlete', status: 'Active', joined: '2024-01-15' },
    { id: 2, name: 'Sarah Smith', email: 'sarah@example.com', type: 'Coach', status: 'Active', joined: '2024-01-16' },
    { id: 3, name: 'Milan Tigers', email: 'contact@tigers.com', type: 'Team', status: 'Pending', joined: '2024-01-17' },
  ]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <AdminNavbar />
      
      <div className="flex flex-1 overflow-hidden h-[calc(100vh-120px)]">
        <AdminLeftSidebar />
        
        <main className="flex-1 overflow-y-auto p-6 bg-white">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold text-gray-900">General List of Users</h1>
              <div className="flex gap-3">
                <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                  <Filter className="w-4 h-4" />
                  Filter
                </button>
                <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  Add User
                </button>
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search users..." 
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Users Table */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50 text-gray-700 font-semibold text-sm">
                  <tr>
                    <th className="px-6 py-3 border-b border-gray-200">Name</th>
                    <th className="px-6 py-3 border-b border-gray-200">Email</th>
                    <th className="px-6 py-3 border-b border-gray-200">Type</th>
                    <th className="px-6 py-3 border-b border-gray-200">Status</th>
                    <th className="px-6 py-3 border-b border-gray-200">Joined</th>
                    <th className="px-6 py-3 border-b border-gray-200 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{user.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{user.email}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium">
                          {user.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          user.status === 'Active' ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'
                        }`}>
                          {user.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{user.joined}</td>
                      <td className="px-6 py-4 text-sm text-right">
                        <button className="text-gray-400 hover:text-gray-600">
                          <MoreHorizontal className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="mt-4 text-sm text-gray-500 text-center">
              Showing {users.length} users
            </div>
          </div>
        </main>
        
        <AdminRightSidebar />
      </div>
    </div>
  );
}

'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { User, Key, ChevronRight } from 'lucide-react';

const PRIMARY_TABS = [
  { id: 'profile', label: 'Profile' },
  { id: 'curriculum', label: 'curriculum' },
  { id: 'settings', label: 'Settings' },
  { id: 'super-admin', label: 'Super Admin settings' },
  { id: 'assign-coadmin', label: 'Assign a new Co-admin' },
  { id: 'customers', label: 'My Customers' },
  { id: 'orders', label: 'Orders' },
];

const SECONDARY_TABS = [
  { id: 'payments', label: 'Payments' },
  { id: 'visits', label: 'Visits' },
  { id: 'mylist', label: 'My list' },
  { id: 'logins', label: 'Logins' },
];

export default function OperatorSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [activeSecondary, setActiveSecondary] = useState('payments');

  // Change password (main)
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');

  // Alternate password
  const [alternateOneAccessOnly, setAlternateOneAccessOnly] = useState(false);
  const [alternatePassword, setAlternatePassword] = useState('');
  const [alternateRepeatPassword, setAlternateRepeatPassword] = useState('');

  const handleResetPassword = () => {
    // TODO: call API to change main password
  };

  const handleResetAlternatePassword = () => {
    // TODO: call API to set alternate password
  };

  return (
    <div className="min-h-full bg-gray-100">
      {/* Primary tabs */}
      <div className="flex flex-wrap gap-0 bg-[#4f4f4f] border-b border-gray-600">
        {PRIMARY_TABS.map((tab) => {
          const href =
            tab.id === 'profile' ? `/operators/profile/${id}` :
            tab.id === 'settings' ? `/operators/settings/${id}` :
            tab.id === 'super-admin' ? `/operators/operator_coadmin_settings/${id}/40` :
            tab.id === 'customers' ? `/operators/myCustomers/${id}` : '#';
          const isActive = tab.id === 'settings';
          return (
            <Link
              key={tab.id}
              href={href}
              className={`px-4 py-2.5 text-sm font-medium transition ${
                isActive ? 'bg-black text-white' : 'text-gray-300 hover:text-white hover:bg-gray-600'
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {/* Secondary tabs */}
      <div className="flex flex-wrap gap-0 bg-[#4f4f4f] border-b border-gray-600">
        {SECONDARY_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`px-4 py-2 text-sm font-medium transition ${
              activeSecondary === tab.id ? 'bg-black text-white' : 'text-gray-300 hover:text-white hover:bg-gray-600'
            }`}
            onClick={() => setActiveSecondary(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="max-w-3xl mx-auto px-6 py-6 space-y-6">
        {/* Operator info: photo, name, role, Delete Profile */}
        <section className="bg-gray-200 rounded-lg border border-gray-300 p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded overflow-hidden bg-gray-300 flex items-center justify-center border border-gray-400 flex-shrink-0">
              <User className="w-7 h-7 text-gray-500" />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900">Elio Blasevich</p>
              <p className="text-sm text-red-600 font-medium">Operator</p>
            </div>
          </div>
          <button
            type="button"
            className="px-4 py-2 bg-[#4f4f4f] hover:bg-[#3d3d3d] text-white text-sm rounded"
          >
            Delete Profile
          </button>
        </section>

        {/* Change Password (main) */}
        <section className="bg-gray-200 rounded-lg border border-gray-300 p-6">
          <h2 className="flex items-center gap-2 text-base font-semibold text-gray-800 mb-1">
            <Key className="w-5 h-5 text-gray-600" />
            Password
          </h2>
          <p className="text-sm text-gray-600 mb-4">Change Password</p>
          <div className="space-y-3 max-w-md">
            <div>
              <label className="block text-sm text-gray-700 mb-1">Old Password</label>
              <input
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-400 rounded bg-white text-gray-900"
                placeholder=""
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-400 rounded bg-white text-gray-900"
                placeholder=""
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Repeat Password</label>
              <input
                type="password"
                value={repeatPassword}
                onChange={(e) => setRepeatPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-400 rounded bg-white text-gray-900"
                placeholder=""
              />
            </div>
            <button
              type="button"
              onClick={handleResetPassword}
              className="flex items-center gap-1 px-4 py-2 bg-[#4f4f4f] hover:bg-[#3d3d3d] text-white text-sm rounded mt-2"
            >
              Reset Password <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </section>

        {/* Alternate Password */}
        <section className="bg-gray-200 rounded-lg border border-gray-300 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-2">
            <div>
              <h2 className="text-base font-semibold text-gray-800">Alternate Password</h2>
              <p className="text-sm text-gray-600 mt-0.5">(you can give it to others for temporary use)</p>
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer whitespace-nowrap">
              <input
                type="checkbox"
                checked={alternateOneAccessOnly}
                onChange={(e) => setAlternateOneAccessOnly(e.target.checked)}
                className="rounded border-gray-400"
              />
              set as 1 acces only
            </label>
          </div>
          <div className="space-y-3 max-w-md mt-4">
            <div>
              <label className="block text-sm text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={alternatePassword}
                onChange={(e) => setAlternatePassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-400 rounded bg-white text-gray-900"
                placeholder="************"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Repeat Password</label>
              <input
                type="password"
                value={alternateRepeatPassword}
                onChange={(e) => setAlternateRepeatPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-400 rounded bg-white text-gray-900"
                placeholder=""
              />
            </div>
            <button
              type="button"
              onClick={handleResetAlternatePassword}
              className="flex items-center gap-1 px-4 py-2 bg-[#4f4f4f] hover:bg-[#3d3d3d] text-white text-sm rounded mt-2"
            >
              Reset Password <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

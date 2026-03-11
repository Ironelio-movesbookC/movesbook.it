'use client';

import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { User, Eye, Settings, Trash2, Link2, Printer } from 'lucide-react';

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

interface CustomerRow {
  id: string;
  username: string;
  name: string;
  imageUrl?: string | null;
  country: string;
  language: string;
  lastLogin: string;
}

const MOCK_CUSTOMERS: CustomerRow[] = [
  {
    id: '550_0',
    username: 'magiw',
    name: 'Ironelio Buonocore',
    imageUrl: null,
    country: 'Finland',
    language: 'English',
    lastLogin: '2026-17 February',
  },
  {
    id: '550_1',
    username: 'magiw',
    name: 'Ironelio Buonocore',
    imageUrl: null,
    country: 'Finland',
    language: 'English',
    lastLogin: '2026-17 February',
  },
];

export default function MyCustomersPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [operatorName, setOperatorName] = useState('Lerkos');
  const [customers, setCustomers] = useState<CustomerRow[]>(MOCK_CUSTOMERS);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeSecondary, setActiveSecondary] = useState('payments');

  const openCustomerDetails = (customerId: string) => {
    router.push(`/subscriptionuserlists/historyuser/${customerId}`);
  };

  const openCustomerHistoryStatus = (customerId: string) => {
    router.push(`/subscriptionuserlists/historystatus/${customerId}`);
  };

  const handlePrint = () => window.print();

  return (
    <div className="min-h-full bg-gray-100">
      {/* Operator context bar */}
      <div className="flex items-center gap-3 px-4 py-3 bg-gray-200 border-b border-gray-300">
        <span className="text-red-600 font-medium">Operator</span>
        <input
          type="text"
          value={operatorName}
          onChange={(e) => setOperatorName(e.target.value)}
          className="px-3 py-1.5 border border-gray-400 rounded bg-white text-gray-900 w-32 max-w-[200px]"
        />
      </div>

      {/* Primary tabs */}
      <div className="flex flex-wrap gap-0 bg-[#4f4f4f] border-b border-gray-600">
        {PRIMARY_TABS.map((tab) => {
          const href =
            tab.id === 'profile' ? `/operators/profile/${id}` :
            tab.id === 'settings' ? `/operators/settings/${id}` :
            tab.id === 'super-admin' ? `/operators/operator_coadmin_settings/${id}/40` :
            tab.id === 'customers' ? `/operators/myCustomers/${id}` : '#';
          const isActive = tab.id === 'customers';
          return (
            <Link
              key={tab.id}
              href={href}
              className={`px-4 py-2.5 text-sm font-medium transition ${isActive ? 'bg-black text-white' : 'text-gray-300 hover:text-white hover:bg-gray-600'}`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {/* Secondary tabs */}
      <div className="flex flex-wrap gap-0 bg-gray-300 border-b border-gray-400">
        {SECONDARY_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-400 hover:text-gray-900 transition`}
            onClick={() => setActiveSecondary(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6">
        {/* Users assigned to operator bar + pagination + print */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-100 border border-amber-200 rounded text-gray-800 font-medium">
            <Link2 className="w-5 h-5 text-amber-700 flex-shrink-0" />
            <span>Users assigned to operator</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 border border-gray-400 rounded bg-white text-gray-700 text-sm hover:bg-gray-50"
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
                onClick={() => setCurrentPage((p) => p + 1)}
                className="px-3 py-1.5 border border-gray-400 rounded bg-white text-gray-700 text-sm hover:bg-gray-50"
              >
                Next
              </button>
            </div>
            <button
              type="button"
              onClick={handlePrint}
              className="p-2 text-gray-600 hover:bg-gray-200 rounded"
              title="Print"
            >
              <Printer className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Table */}
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
              {customers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    No customers assigned. Connect to your API to load users assigned to this operator.
                  </td>
                </tr>
              ) : (
                customers.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" aria-hidden />
                        <div className="w-10 h-10 rounded overflow-hidden bg-gray-200 flex items-center justify-center flex-shrink-0">
                          {row.imageUrl ? (
                            <Image src={row.imageUrl} alt={row.name} width={40} height={40} className="object-cover w-full h-full" />
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

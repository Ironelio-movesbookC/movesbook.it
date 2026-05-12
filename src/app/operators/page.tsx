'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useState } from 'react';
import {
  Filter,
  ChevronDown,
  Eye,
  Settings,
  Globe,
  Printer,
} from 'lucide-react';

interface OperatorRow {
  id: string;
  username: string;
  operatorName: string;
  imageUrl?: string | null;
  country: string;
  role: string;
  regions?: string | null;
  lastLogin?: string | null;
  email: string;
}

const MOCK_OPERATORS: OperatorRow[] = [
  { id: '1', username: 'operatorSeven', operatorName: '', country: 'Andorra', role: 'Agent', regions: null, lastLogin: null, email: 'swapnilb@datalogysoftware.com', imageUrl: null },
  { id: '2', username: 'User15', operatorName: 'UserFIFTEEN Movesbook', country: 'India', role: '', regions: null, lastLogin: null, email: 'movesbook15@gmail.com', imageUrl: null },
  { id: '3', username: 'Lerkos', operatorName: 'Elio Blasevich', country: 'India', role: 'Movesbook staff', regions: null, lastLogin: null, email: 'lerkos000@gmail.com', imageUrl: null },
];

type TabId = 'only-staff' | 'all-operators' | 'agents';

export default function OperatorsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>('all-operators');
  const [rows, setRows] = useState<OperatorRow[]>(MOCK_OPERATORS);
  const [filterValue, setFilterValue] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);

  const handleProceed = () => {
    // TODO: apply filter + search
  };

  const openProfile = (id: string) => router.push(`/operators/profile/${id}`);
  const openSettings = (id: string) => router.push(`/operators/settings/${id}`);

  return (
    <div className="min-h-full bg-gray-50">
      <div className="max-w-[1800px] mx-auto px-6 py-6">
        {/* Tabs: Only staff, All Operators, Agents */}
        <div className="flex gap-0 mb-0">
          <button
            type="button"
            onClick={() => setActiveTab('only-staff')}
            className={`px-4 py-2.5 text-sm font-medium rounded-t transition ${activeTab === 'only-staff' ? 'bg-[#4f4f4f] text-white' : 'bg-gray-300 text-gray-700 hover:bg-gray-400'}`}
          >
            Only staff
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('all-operators')}
            className={`px-4 py-2.5 text-sm font-medium rounded-t transition ${activeTab === 'all-operators' ? 'bg-[#4f4f4f] text-white' : 'bg-gray-300 text-gray-700 hover:bg-gray-400'}`}
          >
            All Operators
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('agents')}
            className={`px-4 py-2.5 text-sm font-medium rounded-t transition ${activeTab === 'agents' ? 'bg-[#4f4f4f] text-white' : 'bg-gray-300 text-gray-700 hover:bg-gray-400'}`}
          >
            Agents
          </button>
        </div>

        {/* Purple banner */}
        <div className="flex items-center gap-3 px-6 py-4 bg-purple-700 text-white rounded-t-none rounded-b overflow-hidden border border-t-0 border-gray-300 shadow-sm">
          <Globe className="w-10 h-10 flex-shrink-0 opacity-90" />
          <h1 className="text-xl font-bold">
            Operators and Agents/Sub-agents of the whole world
          </h1>
        </div>

        {/* Filter, Search, Proceed, Print, Add New Operator */}
        <div className="flex flex-wrap items-end gap-4 py-4">
          <button
            type="button"
            onClick={() => setFilterOpen(!filterOpen)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#4f4f4f] hover:bg-[#3d3d3d] text-white border border-gray-500 rounded transition"
          >
            <Filter className="w-4 h-4" />
            <span>Filter</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${filterOpen ? 'rotate-180' : ''}`} />
          </button>
          <select
            value={filterValue}
            onChange={(e) => setFilterValue(e.target.value)}
            className="px-3 py-2.5 border border-gray-300 rounded bg-white text-gray-800 min-w-[100px]"
          >
            <option value="all">All</option>
          </select>
          <div className="flex flex-col">
            <label htmlFor="search-operators" className="text-sm text-gray-700 mb-1">Search user</label>
            <input
              id="search-operators"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Fullname, Username"
              className="px-3 py-2 border border-gray-300 rounded bg-white text-gray-800 w-56"
            />
          </div>
          <button
            type="button"
            onClick={handleProceed}
            className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded transition"
          >
            Proceed
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-500 hover:bg-gray-600 text-white rounded transition"
          >
            <Printer className="w-4 h-4" /> Print
          </button>
          <button
            type="button"
            className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded transition"
          >
            Add New Operator
          </button>
        </div>

        {/* Operators List bar */}
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
                <th className="px-4 py-3 font-semibold text-sm">Operator Name</th>
                <th className="px-4 py-3 font-semibold text-sm">Country</th>
                <th className="px-4 py-3 font-semibold text-sm">Role</th>
                <th className="px-4 py-3 font-semibold text-sm">Regions</th>
                <th className="px-4 py-3 font-semibold text-sm">Last Login</th>
                <th className="px-4 py-3 font-semibold text-sm">Email</th>
                <th className="px-4 py-3 font-semibold text-sm">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                    No operators. Connect to your API or add a new operator.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3">
                      <div className="w-10 h-10 rounded overflow-hidden bg-gray-200 flex items-center justify-center flex-shrink-0">
                        {row.imageUrl ? (
                          <Image src={row.imageUrl} alt="" width={40} height={40} className="object-cover w-full h-full" />
                        ) : (
                          <span className="text-xs text-gray-500 text-center px-1">NO IMAGE</span>
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
                    <td className="px-4 py-3 text-gray-800">{row.operatorName || '—'}</td>
                    <td className="px-4 py-3 text-gray-700">{row.country}</td>
                    <td className="px-4 py-3 text-gray-700">{row.role || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{row.regions ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{row.lastLogin ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-700">{row.email}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openProfile(row.id)}
                          className="p-1.5 text-gray-500 hover:text-teal-600 hover:bg-teal-50 rounded transition"
                          title="View"
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

'use client';

import { useParams } from 'next/navigation';
import Image from 'next/image';
import { useState } from 'react';
import { User, Mail, Calendar, CreditCard } from 'lucide-react';

// Mock data matching PHP reference (movesbook.net/subscriptionuserlists/historystatus/550_0)
const MOCK_USER = {
  fullname: 'Ironelio Buonocore',
  age: '32M',
  typeOfUser: 'Club',
  locality: 'Mercogliano',
  country: 'Finland',
  sport: 'American football',
  state: '',
  imageUrl: null as string | null,
  startDate: '14 Aug 2018',
  endDate: '31 Dec 2026',
  suspendAccess: false,
  suspend: false,
};

const STATUS_TABS = [
  'IPurchases',
  'Profile',
  "Admin's settings",
  'Functions',
  'IDCards',
  'Cards Status',
  'Devices',
  'Delete posts',
  'Alert msg',
];

interface SubscriptionRow {
  id: string;
  fullName: string;
  userName: string;
  type: string;
  version: string;
  dateStart: string;
  dateEnd: string;
  logs: string;
  status: string;
}

const MOCK_SUBSCRIPTIONS: SubscriptionRow[] = [
  { id: '1', fullName: 'Ironelio Buonocore', userName: 'magiw', type: 'Club', version: 'Club Premium', dateStart: '2018-08-14', dateEnd: '2022-08-16', logs: '-', status: 'Expired' },
  { id: '2', fullName: 'Ironelio Buonocore', userName: 'magiw', type: 'Club', version: 'Club Premium', dateStart: '2017-10-05', dateEnd: '2018-08-13', logs: '-', status: 'Expired' },
];

export default function HistoryStatusPage() {
  const params = useParams();
  const id = params?.id as string; // e.g. "550_0"

  const [user] = useState(MOCK_USER);
  const [startDate, setStartDate] = useState(user.startDate);
  const [endDate, setEndDate] = useState(user.endDate);
  const [suspendAccess, setSuspendAccess] = useState(user.suspendAccess);
  const [suspend, setSuspend] = useState(user.suspend);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [ordering, setOrdering] = useState('');

  return (
    <div className="min-h-full bg-gray-100">
      <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">
        <h1 className="text-xl font-semibold text-gray-800">Panel control about the User</h1>
        {/* Top profile summary */}
        <section className="bg-gray-200 rounded-lg border border-gray-300 p-6">
          <div className="flex flex-wrap gap-6">
            <div className="flex flex-col items-center gap-2">
              <div className="w-24 h-24 rounded overflow-hidden bg-gray-300 flex items-center justify-center border border-gray-400 flex-shrink-0">
                {user.imageUrl ? (
                  <Image src={user.imageUrl} alt={user.fullname} width={96} height={96} className="object-cover w-full h-full" />
                ) : (
                  <User className="w-12 h-12 text-gray-500" />
                )}
              </div>
              <button type="button" className="flex items-center gap-1 px-3 py-1.5 bg-[#4f4f4f] hover:bg-[#3d3d3d] text-white text-sm rounded">
                <Mail className="w-4 h-4" /> Send mail
              </button>
            </div>
            <div className="flex-1 grid gap-2 sm:grid-cols-2 text-sm">
              <div><span className="text-gray-600">Name: </span><span className="text-gray-900">{user.fullname}</span></div>
              <div><span className="text-gray-600">Age: </span><span className="text-gray-900">{user.age}</span></div>
              <div><span className="text-gray-600">Type of User: </span><span className="text-gray-900">{user.typeOfUser}</span></div>
              <div><span className="text-gray-600">Locality: </span><span className="text-gray-900">{user.locality}</span></div>
              <div><span className="text-gray-600">Country: </span><span className="text-gray-900">{user.country}</span></div>
              <div><span className="text-gray-600">Sport: </span><span className="text-gray-900">{user.sport}</span></div>
              <div><span className="text-gray-600">State: </span><span className="text-gray-500">{user.state || '—'}</span></div>
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Start</span>
                <input type="text" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="px-2 py-1 border border-gray-400 rounded bg-white text-sm w-28" />
                <Calendar className="w-4 h-4 text-gray-500" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">End</span>
                <input type="text" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="px-2 py-1 border border-gray-400 rounded bg-white text-sm w-28" />
                <Calendar className="w-4 h-4 text-gray-500" />
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={suspendAccess} onChange={(e) => setSuspendAccess(e.target.checked)} className="rounded border-gray-400" />
                Suspend access control
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={suspend} onChange={(e) => setSuspend(e.target.checked)} className="rounded border-gray-400" />
                Suspend
              </label>
              <button type="button" className="px-4 py-2 bg-[#4f4f4f] hover:bg-[#3d3d3d] text-white text-sm rounded flex items-center gap-1">
                <CreditCard className="w-4 h-4" /> Exhaustion status
              </button>
            </div>
          </div>
        </section>

        {/* Main tabs */}
        <div className="flex flex-wrap gap-0 bg-[#4f4f4f] rounded-t overflow-hidden">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-2 text-sm font-medium transition ${activeTab === tab ? 'bg-black text-white' : 'text-gray-300 hover:text-white hover:bg-gray-600'}`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Details of subscription - Club */}
        <section className="bg-white rounded-b border border-gray-300 border-t-0 overflow-hidden">
          <h2 className="px-4 py-2 text-base font-semibold text-gray-800 border-b border-gray-200">Details of subscription - Club</h2>
          <div className="px-4 py-3 bg-purple-100 border-b border-purple-200">
            <h3 className="font-semibold text-purple-900 text-sm">Historical Club&apos;s subscriptions to the Network</h3>
          </div>
          <div className="p-4 flex flex-wrap gap-6">
            <div className="w-14 h-14 rounded overflow-hidden bg-gray-200 flex items-center justify-center border border-gray-300 flex-shrink-0">
              <User className="w-7 h-7 text-gray-500" />
            </div>
            <div className="flex-1 space-y-1 text-sm">
              <div><span className="text-gray-600">Full Name: </span><span className="text-gray-900">{user.fullname}</span></div>
              <div><span className="text-gray-600">Username: </span><span className="text-gray-900">magiw</span></div>
              <div><span className="text-gray-600">Official Clubname: </span><span className="text-gray-900">Club Magiw Avellino</span></div>
              <div><span className="text-gray-600">Country: </span><span className="text-gray-900">Italy</span></div>
              <div><span className="text-gray-600">Location: </span><span className="text-gray-900">Mercogliano</span></div>
              <div><span className="text-gray-600">Sport: </span><span className="text-gray-900">Gym</span></div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" className="rounded border-gray-400" defaultChecked />
                Tag the user
              </label>
              <button type="button" className="px-3 py-1.5 border border-gray-400 rounded bg-white text-sm">Put as favourite</button>
              <select className="px-2 py-1 border border-gray-400 rounded bg-white text-sm">
                <option>Medium priority</option>
              </select>
            </div>
          </div>

          {/* Controls: Filter, Ordering, Proceed, Print, Send Msg, Send mail, Delete account */}
          <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-t border-gray-200 bg-gray-50">
            <select value={filter} onChange={(e) => setFilter(e.target.value)} className="px-3 py-1.5 border border-gray-400 rounded bg-white text-sm">
              <option value="">Filter</option>
            </select>
            <select value={ordering} onChange={(e) => setOrdering(e.target.value)} className="px-3 py-1.5 border border-gray-400 rounded bg-white text-sm">
              <option value="">Ordering</option>
            </select>
            <button type="button" className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded">Proceed</button>
            <span className="text-gray-400">|</span>
            <button type="button" className="text-sm text-blue-600 hover:underline">Print</button>
            <button type="button" className="text-sm text-blue-600 hover:underline">Send Msg</button>
            <button type="button" className="text-sm text-blue-600 hover:underline">Send mail</button>
            <button type="button" className="text-sm text-red-600 hover:underline">Delete account</button>
            <label className="ml-auto flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" className="rounded border-gray-400" />
              Select all
            </label>
          </div>

          {/* Subscription history table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-teal-700 text-white">
                  <th className="px-4 py-2 font-semibold">Full Name</th>
                  <th className="px-4 py-2 font-semibold">User Name</th>
                  <th className="px-4 py-2 font-semibold">Type</th>
                  <th className="px-4 py-2 font-semibold">Version</th>
                  <th className="px-4 py-2 font-semibold">Date Start</th>
                  <th className="px-4 py-2 font-semibold">Date End</th>
                  <th className="px-4 py-2 font-semibold">Logs</th>
                  <th className="px-4 py-2 font-semibold w-8">E</th>
                  <th className="px-4 py-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {MOCK_SUBSCRIPTIONS.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-gray-900">{row.fullName}</td>
                    <td className="px-4 py-2 text-gray-800">{row.userName}</td>
                    <td className="px-4 py-2 text-gray-700">{row.type}</td>
                    <td className="px-4 py-2 text-gray-700">{row.version}</td>
                    <td className="px-4 py-2 text-gray-700">{row.dateStart}</td>
                    <td className="px-4 py-2 text-gray-700">{row.dateEnd}</td>
                    <td className="px-4 py-2 text-gray-600">{row.logs}</td>
                    <td className="px-4 py-2"></td>
                    <td className="px-4 py-2"><span className="text-red-600 font-medium">{row.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

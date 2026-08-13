'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import AdminFoodDatabasePanel from '@/components/admin/AdminFoodDatabasePanel';

const USER_TYPES = [
  { id: 1, role: 'Athlete', title: 'Coach' },
  { id: 2, role: 'Club', title: 'Club admin' },
  { id: 3, role: 'Athlete', title: 'Professional athlete' },
  { id: 4, role: 'Athlete', title: 'Personal trainer' },
  { id: 5, role: 'Club', title: 'Club owner' },
  { id: 6, role: 'Athlete', title: 'Generic member' },
  { id: 7, role: 'Coach', title: 'Personal trainer' },
  { id: 8, role: 'Coach', title: 'Instructor' },
  { id: 9, role: 'Club', title: 'CEO' },
  { id: 10, role: 'Athlete', title: 'Amatorial team' },
  { id: 11, role: 'Club', title: 'President' },
  { id: 12, role: 'Club', title: 'Director' },
  { id: 13, role: 'Team', title: 'Football Coach' },
  { id: 14, role: 'Coach', title: 'Coachanti' },
  { id: 15, role: 'Coach', title: 'Old Coachanti' },
  { id: 16, role: 'Coach', title: 'Coach' },
];

function resolvePanel(panel: string | null): 'user-types' | 'foods-and-dishes' {
  if (panel === 'foods' || panel === 'foods-and-dishes') return 'foods-and-dishes';
  return 'user-types';
}

function UserTypesPanel() {
  return (
    <div className="flex-1 bg-white p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <span className="text-gray-700 font-medium">User Types</span>

          <div className="relative">
            <select className="appearance-none bg-white border border-gray-300 px-4 py-1.5 pr-8 rounded-sm text-sm focus:outline-none focus:border-gray-400 w-40 text-gray-500">
              <option>Select Role</option>
              <option>Athlete</option>
              <option>Coach</option>
              <option>Club</option>
              <option>Team</option>
            </select>
            <ChevronDown className="w-4 h-4 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <div className="relative">
            <select className="appearance-none bg-white border border-gray-300 px-4 py-1.5 pr-8 rounded-sm text-sm focus:outline-none focus:border-gray-400 w-32 text-gray-500">
              <option>Ordering</option>
              <option>Id Asc</option>
              <option>Id Desc</option>
            </select>
            <ChevronDown className="w-4 h-4 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <button className="bg-[#d9534f] hover:bg-[#c9302c] text-white px-4 py-1.5 rounded-sm text-sm font-bold shadow-sm">
            Proceed
          </button>
        </div>

        <button className="bg-[#333] hover:bg-black text-white px-4 py-2 text-sm font-bold shadow-sm bg-gradient-to-b from-[#444] to-[#222]">
          New User Typology
        </button>
      </div>

      <div className="border border-gray-200 mb-6 p-4 bg-[#fafafa]">
        <h3 className="font-bold text-gray-800 mb-2 text-sm">Versions — promocode discount</h3>
        <label className="flex items-start gap-3 text-sm text-gray-700 cursor-pointer">
          <input type="checkbox" className="mt-1" defaultChecked />
          <span>
            Check how much Discount will be done every 100 points (used when promocodes grant credits
            that convert to subscription discount). Configure the discount percentage on each
            promocode and on subscription versions.
          </span>
        </label>
        <div className="mt-3 flex items-center gap-2 text-sm">
          <span>Discount every 100 points (%)</span>
          <input
            type="number"
            min={0}
            max={100}
            defaultValue={0}
            className="w-20 border border-gray-300 px-2 py-1 rounded-sm"
          />
        </div>
      </div>

      <div className="border border-gray-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-white border-b border-gray-200">
              <th className="text-left py-2 px-4 font-bold text-gray-800 w-16">Id</th>
              <th className="text-left py-2 px-4 font-bold text-gray-800 w-48">Role</th>
              <th className="text-left py-2 px-4 font-bold text-gray-800">Title</th>
              <th className="text-right py-2 px-4 font-bold text-gray-800 w-64">Actions</th>
            </tr>
          </thead>
          <tbody>
            {USER_TYPES.map((user, index) => (
              <tr
                key={user.id}
                className={`border-b border-gray-200 hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-[#f9f9f9]'}`}
              >
                <td className="py-2 px-4 text-gray-600">{user.id}</td>
                <td className="py-2 px-4 text-gray-600">{user.role}</td>
                <td className="py-2 px-4 text-gray-600">{user.title}</td>
                <td className="py-2 px-4 text-right">
                  <div className="flex justify-end gap-1">
                    <button className="bg-[#333] text-white px-3 py-1 text-xs font-bold hover:bg-black transition rounded-sm">
                      View
                    </button>
                    <button className="bg-[#333] text-white px-3 py-1 text-xs font-bold hover:bg-black transition rounded-sm">
                      Edit
                    </button>
                    <button className="bg-[#333] text-white px-3 py-1 text-xs font-bold hover:bg-black transition rounded-sm">
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function GlobalSettingsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const panel = resolvePanel(searchParams?.get('panel') ?? null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const adminData = localStorage.getItem('adminUser');
    const adminToken = localStorage.getItem('adminToken');
    if (!adminData || !adminToken) {
      router.push('/');
      return;
    }
    try {
      JSON.parse(adminData);
      setLoading(false);
    } catch {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('adminUser');
      localStorage.removeItem('adminToken');
      router.push('/');
    }
  }, [router]);

  if (loading) return null;

  return (
    <div className="h-full flex flex-col bg-gray-100">
      <div className="bg-[#a51d2d] text-white py-2 font-bold text-center text-xl uppercase shadow-md relative z-10 border-b-4 border-[#800000]">
        System Dashboard
      </div>

      <div className="flex flex-1 w-full min-w-0 min-h-0">
        {panel === 'foods-and-dishes' ? (
          <AdminFoodDatabasePanel embedded />
        ) : (
          <UserTypesPanel />
        )}
      </div>
    </div>
  );
}

export default function GlobalSettingsPage() {
  return (
    <Suspense fallback={null}>
      <GlobalSettingsPageContent />
    </Suspense>
  );
}

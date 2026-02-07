'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail, AlignJustify } from 'lucide-react';

// Mock data for users
const MOCK_CONNECTED = [
  { name: 'vovovovo', location: '', role: '', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=vovovovo' },
  { name: 'Stefano', location: 'Italy Pavia', role: '', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Stefano' },
  { name: 'Enzo', location: 'Italy Torre del Greco', role: '', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Enzo' },
  { name: 'admin2222', location: 'Bangladesh', role: '', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin2222' },
  { name: 'admin', location: 'Andorra', role: '', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin' },
];

const MOCK_NEWEST = [
  { name: 'renato', location: '', role: 'Athletic', roleColor: 'text-[#0088cc]', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=renato' },
  { name: 'usermb101', location: '', role: 'Athletic', roleColor: 'text-[#0088cc]', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=usermb101' },
  { name: 'usermb102', location: '', role: 'Athletic', roleColor: 'text-[#0088cc]', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=usermb102' },
  { name: 'usermb104', location: '', role: 'Cycling', roleColor: 'text-[#0088cc]', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=usermb104' },
  { name: 'usermb105', location: '', role: 'Cycling', roleColor: 'text-[#0088cc]', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=usermb105' },
  { name: 'lucky', location: '', role: 'Athletic', roleColor: 'text-[#0088cc]', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=lucky' },
];

const MOCK_LAST_LOGGED = [
  { name: 'admin', location: '', role: 'American football', roleColor: 'text-[#0088cc]', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin' },
  { name: 'alessia', location: 'Argentina Buenos Aires', role: 'Athletic', roleColor: 'text-[#0088cc]', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alessia' },
  { name: 'magiw', location: 'Italy Mercogliano', role: 'American football', roleColor: 'text-[#0088cc]', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=magiw' },
];

const SidebarBlock = ({ title, viewAllLink, children }: { title: string, viewAllLink: string, children: React.ReactNode }) => (
  <div className="mb-3 border border-[#dcdcdc] bg-white shadow-sm">
    <div className="bg-[#333] bg-gradient-to-b from-[#444] to-[#222] text-white px-2 py-1.5 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <AlignJustify className="w-4 h-4 text-gray-400" />
        <span className="font-bold text-xs uppercase">{title}</span>
      </div>
      <Link href={viewAllLink} className="text-[10px] text-white hover:underline">
        View All
      </Link>
    </div>
    <div className="p-2">
      {children}
    </div>
  </div>
);

const UserListItem = ({ user }: { user: any }) => (
  <div className="flex gap-2 items-start border-b border-[#eee] py-2 last:border-0">
    <div className="w-10 h-10 bg-white p-0.5 border border-[#ccc] shadow-sm flex-shrink-0">
      <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
    </div>
    <div className="flex flex-col text-[11px] leading-tight">
      <Link href="#" className="font-bold text-[#333] hover:underline mb-0.5">{user.name}</Link>
      {user.location && <span className="text-[#333] mb-0.5">{user.location}</span>}
      {user.role && <Link href="#" className={`font-bold ${user.roleColor || 'text-[#333]'} hover:underline mb-0.5`}>{user.role}</Link>}
      <Link href="#" className="flex items-center gap-1 text-[#333] hover:underline mt-0.5">
        <Mail className="w-3 h-3" />
        <span>Send Message</span>
      </Link>
    </div>
  </div>
);

export default function AdminRightSidebar() {
  const [activeTab, setActiveTab] = useState<'country' | 'list'>('country');

  const countries = [
    { name: 'Italy', online: 0, all: 6 },
    { name: 'Andorra', online: 0, all: 16 },
    { name: 'India', online: 0, all: 8 },
    { name: 'United Arab Emirates', online: 0, all: 7 },
    { name: 'Ukraine', online: 1, all: 2 },
    { name: 'Bangladesh', online: 0, all: 2 },
    { name: 'Afghanistan', online: 0, all: 2 },
    { name: 'Angola', online: 0, all: 1 },
    { name: 'Latvia', online: 0, all: 1 },
    { name: 'Myanmar [Burma]', online: 0, all: 1 },
  ];

  const totalOnline = 1;
  const totalAll = 54;

  return (
    <div className="w-[280px] bg-[#f2f2f2] border-l border-[#dcdcdc] flex flex-col h-full flex-shrink-0 text-sm p-2 overflow-y-auto font-sans">
      
      {/* Block 1: Current Users */}
      <SidebarBlock title="Current Users" viewAllLink="/admin/users/current_users">
        <div>
          {/* Tabs */}
          <div className="flex gap-2 mb-2 justify-center">
            <button
              onClick={() => setActiveTab('country')}
              className={`py-1 px-3 text-center text-[11px] font-bold rounded-sm border shadow-sm transition-colors ${
                activeTab === 'country' 
                  ? 'bg-[#222] text-white border-black' 
                  : 'bg-[#f0f0f0] text-[#333] border-[#ccc]'
              }`}
            >
              ..for country
            </button>
            <button
              onClick={() => setActiveTab('list')}
              className={`py-1 px-3 text-center text-[11px] font-bold rounded-sm border shadow-sm transition-colors ${
                activeTab === 'list' 
                  ? 'bg-[#222] text-white border-black' 
                  : 'bg-[#222] text-white border-black'
              }`}
            >
              List of users
            </button>
          </div>

          {activeTab === 'country' && (
            <>
              {/* Dropdown */}
              <div className="flex items-center justify-between mb-2 text-[11px]">
                <span className="text-[#333]">Select type of users</span>
                <select className="border border-[#ccc] bg-white rounded-sm px-1 py-0.5 w-[100px] outline-none">
                  <option>All Users</option>
                  <option>Athletes</option>
                  <option>Coaches</option>
                </select>
              </div>

              {/* Table */}
              <div className="border border-[#aeaeae] bg-white text-[11px]">
                {/* Header */}
                <div className="grid grid-cols-[1fr_40px_35px] bg-[#d1d1e0] text-[#333] border-b border-[#aeaeae]">
                  <div className="px-2 py-1">Country</div>
                  <div className="px-1 py-1 text-center border-l border-[#bfbfcf] bg-[#c2c2d6]">Online</div>
                  <div className="px-1 py-1 text-center border-l border-[#bfbfcf] bg-[#c2c2d6]">All</div>
                </div>

                {/* Total Row */}
                <div className="grid grid-cols-[1fr_40px_35px] bg-[#004d40] text-white font-bold border-b border-[#aeaeae]">
                  <div className="px-2 py-1 text-[#ffff00]">Total</div>
                  <div className="px-1 py-1 text-center border-l border-[#00332a] text-[#ffff00]">{totalOnline}</div>
                  <div className="px-1 py-1 text-center border-l border-[#00332a] text-[#ffff00]">{totalAll}</div>
                </div>

                {/* Country List */}
                <div className="max-h-[200px] overflow-y-auto">
                  {countries.map((country, index) => (
                    <div key={index} className="grid grid-cols-[1fr_40px_35px] border-b border-[#eee] hover:bg-[#f5f5f5]">
                      <div className="px-2 py-1 truncate text-[#333]">{country.name}</div>
                      <div className="px-1 py-1 text-center border-l border-[#eee] text-[#333]">{country.online}</div>
                      <div className="px-1 py-1 text-center border-l border-[#eee] text-[#333]">{country.all}</div>
                    </div>
                  ))}
                </div>
                
                <div className="text-right p-1 bg-[#f9f9f9] border-t border-[#eee]">
                  <Link href="#" className="text-[10px] text-[#333] hover:underline">View all</Link>
                </div>
              </div>
            </>
          )}
        </div>
      </SidebarBlock>

      {/* Block 2: USERS CONNECTED */}
      <SidebarBlock title="USERS CONNECTED" viewAllLink="/admin/users/club_users">
        <div className="space-y-2 mb-2">
            <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-[#333]">Type of user</span>
                <select className="border border-[#ccc] bg-white rounded-sm px-1 py-0.5 w-[120px] outline-none">
                    <option>All users</option>
                </select>
            </div>
            <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-[#333]">Country</span>
                <select className="border border-[#ccc] bg-white rounded-sm px-1 py-0.5 w-[120px] outline-none">
                    <option>All country</option>
                </select>
            </div>
        </div>
        <div className="max-h-[300px] overflow-y-auto">
          {MOCK_CONNECTED.map((user, i) => (
            <UserListItem key={i} user={user} />
          ))}
        </div>
      </SidebarBlock>

      {/* Block 3: Newest Users */}
      <SidebarBlock title="Newest Users" viewAllLink="/admin/users/newest_members">
        <div className="space-y-2 mb-2">
            <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-[#333]">Country</span>
                <select className="border border-[#ccc] bg-white rounded-sm px-1 py-0.5 w-[120px] outline-none">
                    <option>All Countries</option>
                </select>
            </div>
        </div>
        <div className="max-h-[300px] overflow-y-auto">
          {MOCK_NEWEST.map((user, i) => (
            <UserListItem key={i} user={user} />
          ))}
        </div>
      </SidebarBlock>

      {/* Block 4: Last Logged */}
      <SidebarBlock title="Last Logged" viewAllLink="/admin/users/logged_users">
        <div className="space-y-1 mb-2">
            <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-[#333]">Date login</span>
                <select className="border border-[#ccc] bg-white rounded-sm px-1 py-0.5 w-[120px] outline-none">
                    <option>Today</option>
                </select>
            </div>
            <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-[#333]">Type of user</span>
                <select className="border border-[#ccc] bg-white rounded-sm px-1 py-0.5 w-[120px] outline-none">
                    <option>All users</option>
                </select>
            </div>
            <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-[#333]">Country</span>
                <select className="border border-[#ccc] bg-white rounded-sm px-1 py-0.5 w-[120px] outline-none">
                    <option>All Countries</option>
                </select>
            </div>
        </div>
        <div className="max-h-[300px] overflow-y-auto">
          {MOCK_LAST_LOGGED.map((user, i) => (
            <UserListItem key={i} user={user} />
          ))}
        </div>
      </SidebarBlock>

    </div>
  );
}
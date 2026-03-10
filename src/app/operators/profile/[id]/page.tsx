'use client';

import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { User, Globe } from 'lucide-react';

// Mock data matching PHP reference (movesbook.net/operators/profile/1455)
const MOCK_PROFILE = {
  username: 'Lerkos',
  name: 'Elio',
  surname: 'Blasevich',
  role: 'Operator',
  roleOption: 'Movesbook staff',
  country: 'India',
  countryCode: 'IN',
  regionsManaged: true,
  region: 'Goa',
  email: 'lerkos000@gmail.com',
  alternateEmail: 'lerkos001@gmail.com',
  phone1: '081',
  phone2: '8844426',
  cellular1: '347',
  cellular2: '7418117',
  facebook: 'www.facebook.com/ironello',
  twitter: '',
  website: 'www.pivotx.net',
  blogsite: '',
  location: 'test oper',
  imageUrl: null as string | null,
};

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

export default function OperatorProfilePage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const [profile, setProfile] = useState(MOCK_PROFILE);
  const [activePrimary, setActivePrimary] = useState('profile');
  const [activeSecondary, setActiveSecondary] = useState('payments');

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
          return (
            <Link
              key={tab.id}
              href={href}
              className={`px-4 py-2.5 text-sm font-medium transition ${
                activePrimary === tab.id
                  ? 'bg-black text-white'
                  : 'text-gray-300 hover:text-white hover:bg-gray-600'
              }`}
              onClick={() => setActivePrimary(tab.id)}
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
              activeSecondary === tab.id
                ? 'bg-black text-white'
                : 'text-gray-300 hover:text-white hover:bg-gray-600'
            }`}
            onClick={() => setActiveSecondary(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">
        {/* Section 1: Profile summary & actions */}
        <section className="bg-gray-200 rounded-lg border border-gray-300 p-6 flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <div className="flex flex-col items-center flex-shrink-0">
            <div className="w-24 h-24 rounded overflow-hidden bg-gray-300 flex items-center justify-center border border-gray-400">
              {profile.imageUrl ? (
                <Image src={profile.imageUrl} alt={profile.username} width={96} height={96} className="object-cover w-full h-full" />
              ) : (
                <User className="w-12 h-12 text-gray-500" />
              )}
            </div>
            <p className="mt-2 text-lg font-bold text-gray-900">{profile.username}</p>
            <p className="text-sm text-red-600 font-medium">{profile.role}</p>
            <button type="button" className="mt-2 px-3 py-1.5 bg-gray-500 hover:bg-gray-600 text-white text-sm rounded">
              Change photo
            </button>
          </div>
          <div className="flex-1" />
          <div className="flex flex-col gap-2">
            <button type="button" className="px-4 py-2 bg-[#4f4f4f] hover:bg-[#3d3d3d] text-white text-sm rounded">
              Delete Profile
            </button>
            <button type="button" className="px-4 py-2 bg-[#4f4f4f] hover:bg-[#3d3d3d] text-white text-sm rounded">
              Reset Profile
            </button>
          </div>
        </section>

        {/* Section 2: Personal information */}
        <section className="bg-gray-200 rounded-lg border border-gray-300 p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Personal Information</h2>
          <div className="grid gap-4 sm:grid-cols-[auto_1fr] sm:items-center">
            <label className="text-sm text-gray-700 sm:text-right">Username</label>
            <input
              type="text"
              value={profile.username}
              onChange={(e) => setProfile({ ...profile, username: e.target.value })}
              className="px-3 py-2 border border-gray-400 rounded bg-white text-gray-900"
            />
            <label className="text-sm text-gray-700 sm:text-right">Name</label>
            <input
              type="text"
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              className="px-3 py-2 border border-gray-400 rounded bg-white text-gray-900"
            />
            <label className="text-sm text-gray-700 sm:text-right">SurName</label>
            <input
              type="text"
              value={profile.surname}
              onChange={(e) => setProfile({ ...profile, surname: e.target.value })}
              className="px-3 py-2 border border-gray-400 rounded bg-white text-gray-900"
            />
            <label className="text-sm text-gray-700 sm:text-right">Country</label>
            <div className="flex items-center gap-2">
              <select
                value={profile.country}
                onChange={(e) => setProfile({ ...profile, country: e.target.value })}
                className="px-3 py-2 border border-gray-400 rounded bg-white text-gray-900 flex-1"
              >
                <option>India</option>
                <option>Italy</option>
                <option>United States</option>
              </select>
              <span className="text-lg" title="Country flag">🇮🇳</span>
            </div>
            <label className="text-sm text-gray-700 sm:text-right">Role</label>
            <select
              value={profile.roleOption}
              onChange={(e) => setProfile({ ...profile, roleOption: e.target.value })}
              className="px-3 py-2 border border-gray-400 rounded bg-white text-gray-900"
            >
              <option>Movesbook staff</option>
              <option>Operator</option>
              <option>Co-Admin</option>
            </select>
            <label className="text-sm text-gray-700 sm:text-right">Regions managed</label>
            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="checkbox"
                checked={profile.regionsManaged}
                onChange={(e) => setProfile({ ...profile, regionsManaged: e.target.checked })}
                className="rounded border-gray-400"
              />
              <select
                value={profile.region}
                onChange={(e) => setProfile({ ...profile, region: e.target.value })}
                className="px-3 py-2 border border-gray-400 rounded bg-white text-gray-900"
              >
                <option>Goa</option>
                <option>Karnataka</option>
              </select>
              <Globe className="w-4 h-4 text-gray-600 ml-1" />
            </div>
          </div>
        </section>

        {/* Section 3: Contact and social */}
        <section className="bg-gray-200 rounded-lg border border-gray-300 p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Contact and Social</h2>
          <div className="grid gap-4 sm:grid-cols-[auto_1fr] sm:items-center">
            <label className="text-sm text-gray-700 sm:text-right">Email</label>
            <input
              type="email"
              value={profile.email}
              onChange={(e) => setProfile({ ...profile, email: e.target.value })}
              className="px-3 py-2 border border-gray-400 rounded bg-white text-gray-900"
            />
            <label className="text-sm text-gray-700 sm:text-right">Alternate Email</label>
            <input
              type="email"
              value={profile.alternateEmail}
              onChange={(e) => setProfile({ ...profile, alternateEmail: e.target.value })}
              className="px-3 py-2 border border-gray-400 rounded bg-white text-gray-900"
            />
            <label className="text-sm text-gray-700 sm:text-right">Phone</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={profile.phone1}
                onChange={(e) => setProfile({ ...profile, phone1: e.target.value })}
                className="px-3 py-2 border border-gray-400 rounded bg-white text-gray-900 w-20"
              />
              <input
                type="text"
                value={profile.phone2}
                onChange={(e) => setProfile({ ...profile, phone2: e.target.value })}
                className="px-3 py-2 border border-gray-400 rounded bg-white text-gray-900 flex-1"
              />
            </div>
            <label className="text-sm text-gray-700 sm:text-right">Cellular</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={profile.cellular1}
                onChange={(e) => setProfile({ ...profile, cellular1: e.target.value })}
                className="px-3 py-2 border border-gray-400 rounded bg-white text-gray-900 w-20"
              />
              <input
                type="text"
                value={profile.cellular2}
                onChange={(e) => setProfile({ ...profile, cellular2: e.target.value })}
                className="px-3 py-2 border border-gray-400 rounded bg-white text-gray-900 flex-1"
              />
            </div>
            <div className="sm:col-span-2 font-bold text-gray-800 mt-2">Social Sites</div>
            <label className="text-sm text-gray-700 sm:text-right">Facebook</label>
            <input
              type="text"
              value={profile.facebook}
              onChange={(e) => setProfile({ ...profile, facebook: e.target.value })}
              className="px-3 py-2 border border-gray-400 rounded bg-white text-gray-900"
            />
            <label className="text-sm text-gray-700 sm:text-right">Twitter</label>
            <input
              type="text"
              value={profile.twitter}
              onChange={(e) => setProfile({ ...profile, twitter: e.target.value })}
              placeholder=""
              className="px-3 py-2 border border-gray-400 rounded bg-white text-gray-900"
            />
            <label className="text-sm text-gray-700 sm:text-right">My Website</label>
            <input
              type="text"
              value={profile.website}
              onChange={(e) => setProfile({ ...profile, website: e.target.value })}
              className="px-3 py-2 border border-gray-400 rounded bg-white text-gray-900"
            />
            <label className="text-sm text-gray-700 sm:text-right">My Blogsite</label>
            <input
              type="text"
              value={profile.blogsite}
              onChange={(e) => setProfile({ ...profile, blogsite: e.target.value })}
              placeholder=""
              className="px-3 py-2 border border-gray-400 rounded bg-white text-gray-900"
            />
            <label className="text-sm text-gray-700 sm:text-right">Location</label>
            <input
              type="text"
              value={profile.location}
              onChange={(e) => setProfile({ ...profile, location: e.target.value })}
              className="px-3 py-2 border border-gray-400 rounded bg-white text-gray-900"
            />
          </div>
        </section>
      </div>
    </div>
  );
}

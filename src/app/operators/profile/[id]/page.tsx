'use client';

import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { User, Globe } from 'lucide-react';
import { COUNTRIES, COUNTRIES_WITH_CODES } from '@/lib/news/countries';
import { getRegionsForCountry } from '@/constants/countryRegions.constants';

type OperatorProfileState = {
  username: string;
  name: string;
  surname: string;
  role: string;
  roleOption: string;
  country: string;
  countryCode: string;
  regionsManaged: boolean;
  region: string;
  email: string;
  alternateEmail: string;
  phone1: string;
  phone2: string;
  cellular1: string;
  cellular2: string;
  facebook: string;
  twitter: string;
  website: string;
  blogsite: string;
  otherSite: string;
  location: string;
  imageUrl: string | null;
};

const EMPTY_PROFILE: OperatorProfileState = {
  username: '',
  name: '',
  surname: '',
  role: 'Operator',
  roleOption: 'Movesbook staff',
  country: '',
  countryCode: '',
  regionsManaged: false,
  region: '',
  email: '',
  alternateEmail: '',
  phone1: '',
  phone2: '',
  cellular1: '',
  cellular2: '',
  facebook: '',
  twitter: '',
  website: '',
  blogsite: '',
  otherSite: '',
  location: '',
  imageUrl: null,
};

const isDataUrl = (src?: string | null) =>
  typeof src === 'string' && src.startsWith('data:image/');

function flagEmojiFromCode(code: string): string {
  const cc = (code || '').trim().toUpperCase();
  if (cc.length !== 2) return '';
  const A = 0x1f1e6;
  const base = 'A'.charCodeAt(0);
  const first = A + (cc.charCodeAt(0) - base);
  const second = A + (cc.charCodeAt(1) - base);
  return String.fromCodePoint(first, second);
}

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
  const [profile, setProfile] = useState<OperatorProfileState>(EMPTY_PROFILE);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [busyAction, setBusyAction] = useState<'delete' | 'photo' | ''>('');
  const [activePrimary, setActivePrimary] = useState('profile');
  const [activeSecondary, setActiveSecondary] = useState('payments');

  const regionOptions = useMemo(
    () => getRegionsForCountry(profile.country),
    [profile.country],
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setLoadError('');
      setSuccess('');
      try {
        const token = localStorage.getItem('adminToken');
        if (!token) {
          setLoadError('Admin session not found. Please login again.');
          return;
        }

        const res = await fetch(`/api/admin/operators/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || 'Failed to load operator profile');

        const o = data?.operator || {};
        const country = String(o.country ?? '').trim();
        const code = COUNTRIES_WITH_CODES.find((c) => c.name === country)?.id || '';
        const region = String(o.regions ?? '').trim();
        const opts = country ? getRegionsForCountry(country) : [];

        const next: OperatorProfileState = {
          username: String(o.username ?? ''),
          name: String(o.name ?? ''),
          surname: String(o.surname ?? ''),
          role: 'Operator',
          roleOption: String(o.roleLabel ?? 'Movesbook staff'),
          country,
          countryCode: code,
          regionsManaged: Boolean(region),
          region: region && opts.includes(region) ? region : region || '',
          email: String(o.email ?? ''),
          alternateEmail: String(o.alternateEmail ?? ''),
          phone1: String(o.phonePrefix ?? ''),
          phone2: String(o.phoneNumber ?? ''),
          cellular1: String(o.cellularPrefix ?? ''),
          cellular2: String(o.cellularNumber ?? ''),
          facebook: String(o.facebook ?? ''),
          twitter: String(o.twitter ?? ''),
          website: String(o.website ?? ''),
          blogsite: String(o.blogsite ?? ''),
          otherSite: String(o.otherSite ?? ''),
          location: String(o.otherInfos ?? ''),
          imageUrl: o.imageUrl ? String(o.imageUrl) : null,
        };

        if (!cancelled) setProfile(next);
      } catch (e: any) {
        if (!cancelled) setLoadError(e?.message || 'Failed to load operator profile');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (id) void load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleReset = async () => {
    setBusyAction('photo'); // reuse "busy" to disable controls
    setLoadError('');
    setSuccess('');
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) {
        setLoadError('Admin session not found. Please login again.');
        return;
      }

      const res = await fetch(`/api/admin/operators/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          username: profile.username,
          email: profile.email,
          name: profile.name,
          surname: profile.surname,
          country: profile.country || null,
          regions: profile.region || null,
          roleLabel: profile.roleOption || null,
          alternateEmail: profile.alternateEmail || null,
          phonePrefix: profile.phone1 || null,
          phoneNumber: profile.phone2 || null,
          cellularPrefix: profile.cellular1 || null,
          cellularNumber: profile.cellular2 || null,
          facebook: profile.facebook || null,
          twitter: profile.twitter || null,
          website: profile.website || null,
          blogsite: profile.blogsite || null,
          otherSite: profile.otherSite || null,
          otherInfos: profile.location || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to update operator');

      setSuccess('Profile updated successfully.');
    } catch (e: any) {
      setLoadError(e?.message || 'Failed to update operator');
    } finally {
      setBusyAction('');
    }
  };

  const handleDelete = async () => {
    const ok = window.confirm('Delete this operator profile? This cannot be undone.');
    if (!ok) return;

    setBusyAction('delete');
    setLoadError('');
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) {
        setLoadError('Admin session not found. Please login again.');
        return;
      }

      const res = await fetch(`/api/admin/operators/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to delete operator');

      router.push('/operators');
    } catch (e: any) {
      setLoadError(e?.message || 'Failed to delete operator');
    } finally {
      setBusyAction('');
    }
  };

  const handlePhotoSelected = async (file: File | null) => {
    if (!file) return;

    setBusyAction('photo');
    setLoadError('');
    setSuccess('');
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) {
        setLoadError('Admin session not found. Please login again.');
        return;
      }

      const form = new FormData();
      form.append('file', file);

      const res = await fetch(`/api/admin/operators/${id}/photo`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to upload photo');

      setProfile((prev) => ({ ...prev, imageUrl: String(data?.imageUrl ?? '') || null }));
    } catch (e: any) {
      setLoadError(e?.message || 'Failed to upload photo');
    } finally {
      setBusyAction('');
    }
  };

  const handleCountryChange = (value: string) => {
    setProfile((prev) => {
      const country = value;
      const opts = country ? getRegionsForCountry(country) : [];
      const region =
        country && prev.region && opts.includes(prev.region) ? prev.region : '';
      const countryCode = COUNTRIES_WITH_CODES.find((c) => c.name === country)?.id || '';
      return {
        ...prev,
        country,
        countryCode,
        region,
        regionsManaged: Boolean(region),
      };
    });
  };

  return (
    <div className="min-h-full bg-gray-100">
      {/* Primary tabs */}
      <div className="flex flex-wrap gap-0 bg-[#4f4f4f] border-b border-gray-600">
        {PRIMARY_TABS.map((tab) => {
          const href =
            tab.id === 'profile' ? `/operators/profile/${id}` :
            tab.id === 'settings' ? `/operators/password-settings/${id}` :
            tab.id === 'super-admin' ? `/operators/super-admin-settings/${id}` :
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
        {(loadError || success || loading) && (
          <div
            className={`rounded border px-4 py-3 text-sm ${
              loadError
                ? 'border-red-200 bg-red-50 text-red-700'
                : success
                  ? 'border-green-200 bg-green-50 text-green-700'
                  : 'border-gray-200 bg-white text-gray-700'
            }`}
          >
            {loadError ? loadError : success ? success : 'Loading operator profile...'}
          </div>
        )}

        {/* Section 1: Profile summary & actions */}
        <section className="bg-gray-200 rounded-lg border border-gray-300 p-6 flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <div className="flex flex-col items-center flex-shrink-0">
            <div className="w-24 h-24 rounded overflow-hidden bg-gray-300 flex items-center justify-center border border-gray-400">
              {profile.imageUrl ? (
                isDataUrl(profile.imageUrl) ? (
                  // Next/Image can reject `data:` URLs in some setups; <img> is safest here.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.imageUrl}
                    alt={profile.username}
                    width={96}
                    height={96}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <Image
                    src={profile.imageUrl}
                    alt={profile.username}
                    width={96}
                    height={96}
                    className="object-cover w-full h-full"
                  />
                )
              ) : (
                <User className="w-12 h-12 text-gray-500" />
              )}
            </div>
            <p className="mt-2 text-lg font-bold text-gray-900">{profile.username}</p>
            <p className="text-sm text-red-600 font-medium">{profile.role}</p>
            <label className="mt-2 px-3 py-1.5 bg-gray-500 hover:bg-gray-600 text-white text-sm rounded cursor-pointer select-none">
              {busyAction === 'photo' ? 'Uploading...' : 'Change photo'}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={busyAction !== '' || loading}
                onChange={(e) => handlePhotoSelected(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>
          <div className="flex-1" />
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={handleDelete}
              disabled={busyAction !== '' || loading}
              className="px-4 py-2 bg-[#4f4f4f] hover:bg-[#3d3d3d] disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm rounded"
            >
              Delete Profile
            </button>
            <button
              type="button"
              onClick={handleReset}
              disabled={busyAction !== '' || loading}
              className="px-4 py-2 bg-[#4f4f4f] hover:bg-[#3d3d3d] disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm rounded"
            >
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
                onChange={(e) => handleCountryChange(e.target.value)}
                className="px-3 py-2 border border-gray-400 rounded bg-white text-gray-900 flex-1"
              >
                <option value="">Select country</option>
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <span className="text-lg" title="Country flag">
                {flagEmojiFromCode(profile.countryCode) || '—'}
              </span>
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
                onChange={(e) =>
                  setProfile((prev) => ({
                    ...prev,
                    regionsManaged: e.target.checked,
                    region: e.target.checked ? prev.region : '',
                  }))
                }
                className="rounded border-gray-400"
              />
              <select
                value={profile.region}
                onChange={(e) =>
                  setProfile((prev) => ({
                    ...prev,
                    region: e.target.value,
                    regionsManaged: Boolean(e.target.value),
                  }))
                }
                className="px-3 py-2 border border-gray-400 rounded bg-white text-gray-900"
                disabled={!profile.country}
              >
                <option value="">
                  {profile.country ? 'Select region' : 'Select country first'}
                </option>
                {regionOptions.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
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
            <label className="text-sm text-gray-700 sm:text-right">Other Site</label>
            <input
              type="text"
              value={profile.otherSite}
              onChange={(e) => setProfile({ ...profile, otherSite: e.target.value })}
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

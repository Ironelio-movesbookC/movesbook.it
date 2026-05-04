'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Key, User } from 'lucide-react';

const PRIMARY_TABS = [
  { id: 'profile', label: 'Profile' },
  { id: 'curriculum', label: 'curriculum' },
  { id: 'settings', label: 'Settings' },
  { id: 'super-admin', label: 'Super Admin settings' },
  { id: 'assign-coadmin', label: 'Assign a new Co-admin' },
  { id: 'customers', label: 'My Customers' },
  { id: 'orders', label: 'Orders' },
] as const;

type HeaderInfo = {
  fullName: string;
  country: string;
  imageUrl: string | null;
};

const isDataUrl = (src?: string | null) =>
  typeof src === 'string' && src.startsWith('data:image/');

function YesNoToggle({
  name,
  value,
  onChange,
}: {
  name: string;
  value: boolean | null;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="inline-flex items-center gap-3">
      <label className="inline-flex items-center gap-1 text-sm">
        <input
          type="radio"
          name={name}
          checked={value === true}
          onChange={() => onChange(true)}
        />
        Y
      </label>
      <label className="inline-flex items-center gap-1 text-sm">
        <input
          type="radio"
          name={name}
          checked={value === false}
          onChange={() => onChange(false)}
        />
        N
      </label>
    </div>
  );
}

export default function OperatorSuperAdminSettingsPage() {
  const params = useParams();
  const id = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [header, setHeader] = useState<HeaderInfo>({
    fullName: '—',
    country: '—',
    imageUrl: null,
  });

  const [country, setCountry] = useState('Andorra');
  const [language, setLanguage] = useState('English');
  const [idCardCode, setIdCardCode] = useState('');
  const [commissionPct, setCommissionPct] = useState('');
  const [autoAssignCommission, setAutoAssignCommission] = useState(false);

  const [operatorPerms, setOperatorPerms] = useState<Record<string, { my: boolean; other: boolean }>>({
    'List of Operators': { my: true, other: true },
    'View of all payments': { my: false, other: false },
    'View of all statistics': { my: false, other: false },
    'Faculty to make modifies regarding sections allowed': { my: false, other: false },
    'Faculty to delete regarding sections allowed': { my: false, other: false },
    Advertising: { my: false, other: false },
    'Setting Subscriptions': { my: false, other: false },
    'Functions Setting': { my: false, other: false },
    'Package Setting': { my: false, other: false },
    'Info Settings': { my: false, other: false },
    'Language (of your country)': { my: false, other: false },
    'Settings for users': { my: false, other: false },
  });

  const [otherSettings, setOtherSettings] = useState<Record<string, { my: boolean; other: boolean }>>({
    'Subscription section': { my: false, other: false },
    'Historical Access Logs': { my: false, other: false },
    'Bugs and error reports': { my: false, other: false },
    'Club section(except payments)': { my: false, other: false },
  });

  const [otherPerms, setOtherPerms] = useState<Record<string, boolean>>({
    'Other options(messages,block section,extend subscription)': false,
    'Logins about other operators of your country': false,
  });

  const [postPerms, setPostPerms] = useState<Record<string, boolean>>({
    'Allow operator to publish articles': false,
    'Allow the operator to publish posts': false,
    'Allow operator to operate the blog of movesbook': false,
    'Allow the operator to publish reviews': false,
  });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setLoadError('');
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
        if (!res.ok) throw new Error(data?.error || 'Failed to load operator');
        const o = data?.operator || {};
        const fullName = `${String(o.name ?? '')} ${String(o.surname ?? '')}`.trim() || '—';
        const c = String(o.country ?? '—');
        const imageUrl = o.imageUrl ? String(o.imageUrl) : null;
        if (!cancelled) setHeader({ fullName, country: c, imageUrl });
      } catch (e: any) {
        if (!cancelled) setLoadError(e?.message || 'Failed to load operator');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (id) void load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <div className="min-h-full bg-gray-100">
      {/* Primary tabs */}
      <div className="flex flex-wrap gap-0 bg-[#4f4f4f] border-b border-gray-600">
        {PRIMARY_TABS.map((tab) => {
          const href =
            tab.id === 'profile'
              ? `/operators/profile/${id}`
              : tab.id === 'settings'
                ? `/operators/password-settings/${id}`
                : tab.id === 'super-admin'
                  ? `/operators/super-admin-settings/${id}`
                  : tab.id === 'customers'
                    ? `/operators/myCustomers/${id}`
                    : '#';
          const isActive = tab.id === 'super-admin';
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

      <div className="max-w-5xl mx-auto px-6 py-6 space-y-4">
        {(loadError || loading) && (
          <div
            className={`rounded border px-4 py-3 text-sm ${
              loadError ? 'border-red-200 bg-red-50 text-red-700' : 'border-gray-200 bg-white text-gray-700'
            }`}
          >
            {loadError ? loadError : 'Loading...'}
          </div>
        )}

        {/* Header line with key + buttons */}
        <div className="bg-white border border-gray-300 rounded p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gray-100 border border-gray-300 overflow-hidden flex items-center justify-center">
              {header.imageUrl ? (
                isDataUrl(header.imageUrl) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={header.imageUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={header.imageUrl} alt="" className="w-full h-full object-cover" />
                )
              ) : (
                <User className="w-7 h-7 text-gray-500" />
              )}
            </div>
            <div>
              <div className="text-red-600 font-semibold">Operator</div>
              <div className="text-sm text-gray-700">{header.fullName}</div>
              <div className="text-xs text-gray-500">{header.country}</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Key className="w-8 h-8 text-yellow-600" />
            <button type="button" className="px-4 py-2 bg-[#4f4f4f] text-white text-sm rounded">
              Edit
            </button>
            <button type="button" className="px-4 py-2 bg-[#4f4f4f] text-white text-sm rounded">
              Delete Profile
            </button>
          </div>
        </div>

        {/* Form header fields */}
        <div className="bg-white border border-gray-300 rounded p-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-[180px_1fr] sm:items-center">
            <label className="text-sm text-gray-700 sm:text-right">Country</label>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded bg-white text-gray-900"
            >
              <option>Andorra</option>
              <option>India</option>
              <option>United States</option>
            </select>

            <label className="text-sm text-gray-700 sm:text-right">Language for Operator</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded bg-white text-gray-900"
            >
              <option>English</option>
              <option>Italian</option>
              <option>French</option>
            </select>

            <label className="text-sm text-gray-700 sm:text-right">ID card code</label>
            <input
              value={idCardCode}
              onChange={(e) => setIdCardCode(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded bg-sky-50 text-gray-900"
            />

            <label className="text-sm text-gray-700 sm:text-right">% Commission</label>
            <input
              value={commissionPct}
              onChange={(e) => setCommissionPct(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded bg-white text-gray-900 w-24"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={autoAssignCommission}
              onChange={(e) => setAutoAssignCommission(e.target.checked)}
              className="rounded border-gray-400"
            />
            Automatically assigns the commission (but as not yet paid) when a customer assigned to him makes into an order
          </label>

          {/* Operator permissions card */}
          <div className="border border-gray-300 rounded">
            <div className="bg-[#0b3a66] text-white font-semibold px-4 py-2 flex items-center justify-between">
              <span>Operator</span>
              <div className="text-xs font-semibold">
                <span className="mr-8">My Country</span>
                <span>Other Countries</span>
              </div>
            </div>

            <div className="divide-y divide-gray-200">
              {Object.entries(operatorPerms).map(([label, v]) => (
                <div key={label} className="px-4 py-3 flex items-center justify-between gap-4">
                  <div className="text-sm font-semibold text-gray-800">{label}</div>
                  <div className="flex items-center gap-10">
                    <YesNoToggle
                      name={`op-${label}-my`}
                      value={v.my}
                      onChange={(nv) =>
                        setOperatorPerms((p) => ({ ...p, [label]: { ...p[label], my: nv } }))
                      }
                    />
                    <YesNoToggle
                      name={`op-${label}-other`}
                      value={v.other}
                      onChange={(nv) =>
                        setOperatorPerms((p) => ({ ...p, [label]: { ...p[label], other: nv } }))
                      }
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="px-4 py-3">
              <div className="text-sm font-semibold text-red-700 mb-2">Other Permissions</div>
              {Object.entries(otherPerms).map(([label, checked]) => (
                <label key={label} className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => setOtherPerms((p) => ({ ...p, [label]: e.target.checked }))}
                    className="rounded border-gray-400"
                  />
                  {label}
                </label>
              ))}
            </div>

            <div className="px-4 py-3 border-t border-gray-200">
              <div className="text-sm font-semibold text-red-700 mb-2">Permissions on posts</div>
              <div className="grid gap-2 sm:grid-cols-2">
                {Object.entries(postPerms).map(([label, checked]) => (
                  <label key={label} className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => setPostPerms((p) => ({ ...p, [label]: e.target.checked }))}
                      className="rounded border-gray-400"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            <div className="bg-[#7b0010] text-white font-semibold px-4 py-2">System Dashboard</div>
            <div className="divide-y divide-gray-200">
              {[
                'Advertising',
                'Setting Subscriptions',
                'Functions Setting',
                'Package Setting',
                'Info Settings',
                'Language (of your country)',
                'Settings for users',
              ].map((label) => {
                const v = operatorPerms[label];
                return (
                  <div key={label} className="px-4 py-3 flex items-center justify-between">
                    <div className="text-sm font-semibold text-gray-800">{label}</div>
                    <YesNoToggle
                      name={`dash-${label}`}
                      value={v?.my ?? false}
                      onChange={(nv) =>
                        setOperatorPerms((p) => ({
                          ...p,
                          [label]: { ...(p[label] || { my: false, other: false }), my: nv },
                        }))
                      }
                    />
                  </div>
                );
              })}
            </div>

            <div className="bg-gray-300 text-gray-800 font-semibold px-4 py-2">Other Settings</div>
            <div className="px-4 py-3">
              <div className="text-sm font-semibold mb-3">Permission of Access about Network members data</div>
              <div className="grid grid-cols-[1fr_180px_180px] text-xs font-semibold text-gray-700 border-b border-gray-300 pb-2">
                <div />
                <div className="text-center">My Country</div>
                <div className="text-center">Other Countries</div>
              </div>
              <div className="divide-y divide-gray-200">
                {Object.entries(otherSettings).map(([label, v]) => (
                  <div key={label} className="grid grid-cols-[1fr_180px_180px] items-center py-2">
                    <div className="text-sm text-gray-800">{label}</div>
                    <div className="text-center">
                      <YesNoToggle
                        name={`other-${label}-my`}
                        value={v.my}
                        onChange={(nv) => setOtherSettings((p) => ({ ...p, [label]: { ...p[label], my: nv } }))}
                      />
                    </div>
                    <div className="text-center">
                      <YesNoToggle
                        name={`other-${label}-other`}
                        value={v.other}
                        onChange={(nv) =>
                          setOtherSettings((p) => ({ ...p, [label]: { ...p[label], other: nv } }))
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 px-4 py-6">
              <button type="button" className="px-6 py-2 bg-red-600 text-white text-sm rounded">
                Save
              </button>
              <button type="button" className="px-6 py-2 bg-gray-700 text-white text-sm rounded">
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const TABS = [
  { key: 'typologies', label: 'Typologies', enabled: true },
  { key: 'list_prices', label: 'List prices', enabled: false },
  { key: 'timetable', label: 'Timetable', enabled: false },
  { key: 'rfid', label: 'Rfld/Card readers', enabled: false },
  { key: 'overview', label: 'Overview', enabled: false }
] as const;

export default function AdminClubsSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]['key']>('typologies');

  useEffect(() => {
    const adminData = localStorage.getItem('adminUser');
    if (!adminData) {
      router.push('/');
      return;
    }
    setLoading(false);
  }, [router]);

  if (loading) return null;

  // Keep the same page template as /admin/clubs by preserving the wrapper.
  return (
    <div className="min-h-full bg-[#ececec]">
      <div className="border-b border-gray-300 bg-gray-100 px-3 sm:px-4">
        <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            const base =
              'relative -mb-px px-1 py-3 text-sm font-semibold transition select-none';
            const className = `${base} ${
              isActive
                ? 'text-gray-950'
                : tab.enabled
                  ? 'text-gray-500 hover:text-gray-950'
                  : 'cursor-not-allowed text-gray-400'
            }`;

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  if (!tab.enabled) return;
                  setActiveTab(tab.key);
                }}
                disabled={!tab.enabled}
                className={className}
                title={tab.enabled ? undefined : 'Build this section later'}
                aria-current={isActive ? 'page' : undefined}
              >
                {tab.label}
                {isActive && <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-red-600" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}


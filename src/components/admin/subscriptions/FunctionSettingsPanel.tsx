'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { FunctionSettingsData, FunctionSettingsTab } from '@/types/adminFunctionSettings';
import {
  FUNCTION_SETTING_CATEGORIES,
  getFunctionList,
  getFunctionSettingsBasePath,
  saveFunctionSettingsData,
} from '@/lib/admin/functionSettingsMock';
import SubscriptionSystemDashboardHeader from './SubscriptionSystemDashboardHeader';
import FunctionSettingsTabs from './FunctionSettingsTabs';

type FunctionSettingsPanelProps = {
  tab: FunctionSettingsTab;
  functionId: number;
  initialData: FunctionSettingsData;
  leftSidebarTitle: string;
};

function OnOffToggle({
  name,
  enabled,
  onChange,
}: {
  name: string;
  enabled: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-end gap-4 pr-4">
      <label className="flex items-center gap-1 text-sm text-gray-700 cursor-pointer">
        <input
          type="radio"
          name={name}
          checked={enabled}
          onChange={() => onChange(true)}
          className="cursor-pointer"
        />
        ON
      </label>
      <label className="flex items-center gap-1 text-sm text-gray-700 cursor-pointer">
        <input
          type="radio"
          name={name}
          checked={!enabled}
          onChange={() => onChange(false)}
          className="cursor-pointer"
        />
        OFF
      </label>
    </div>
  );
}

export default function FunctionSettingsPanel({
  tab,
  functionId,
  initialData,
  leftSidebarTitle,
}: FunctionSettingsPanelProps) {
  const router = useRouter();
  const functions = getFunctionList(tab);
  const basePath = getFunctionSettingsBasePath(tab);
  const [data, setData] = useState(initialData);
  const [saving, setSaving] = useState(false);

  const updateAvailability = (versionKey: string, enabled: boolean) => {
    setData((prev) => ({
      ...prev,
      availability: { ...prev.availability, [versionKey]: enabled },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    saveFunctionSettingsData(data);
    await new Promise((r) => setTimeout(r, 300));
    setSaving(false);
  };

  return (
    <div className="h-full flex flex-col bg-gray-100">
      <SubscriptionSystemDashboardHeader />

      <FunctionSettingsTabs activeTab={tab} />

      <div className="flex flex-1 min-h-0">
        <div className="w-[220px] shrink-0 border-r border-gray-300 bg-white flex flex-col">
          <div className="bg-[#e6e6e6] border-b border-gray-300 px-3 py-2 text-sm font-bold text-gray-800 text-center">
            {leftSidebarTitle}
          </div>
          <div className="flex-1 overflow-y-auto">
            {functions.map((fn) => {
              const isActive = fn.id === functionId;
              return (
                <Link
                  key={fn.id}
                  href={`${basePath}/${fn.id}`}
                  className={`block px-3 py-2 text-sm border-b border-gray-200 transition-colors ${
                    isActive
                      ? 'bg-[#b0b0b0] text-gray-900 font-semibold'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {fn.name}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-white">
          <div className="bg-[#e6e6e6] border-b border-gray-300 px-4 py-2 text-sm font-bold text-gray-800 text-center">
            Available Functionality Setting of Array for the users
          </div>

          <div className="p-0">
            {FUNCTION_SETTING_CATEGORIES.map((category) => (
              <div key={category.key} className="border-b border-gray-300">
                <div className="bg-[#4a4a4a] text-white px-4 py-1.5 text-sm font-bold">
                  {category.label}
                </div>
                {category.versions.map((version, index) => (
                  <div
                    key={version.key}
                    className={`flex items-center justify-between border-b border-gray-200 ${
                      index % 2 === 0 ? 'bg-white' : 'bg-[#f5f5f5]'
                    }`}
                  >
                    <span className="px-4 py-2 text-sm text-gray-800">{version.label}</span>
                    <OnOffToggle
                      name={`fn-${functionId}-${version.key}`}
                      enabled={data.availability[version.key] ?? false}
                      onChange={(enabled) => updateAvailability(version.key, enabled)}
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div className="flex justify-center gap-3 py-6 bg-gray-50 border-t border-gray-200">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="bg-[#333] hover:bg-black text-white px-8 py-2 text-sm font-bold disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              type="button"
              onClick={() => router.push('/subscriptions/subscription_settings')}
              className="bg-[#333] hover:bg-black text-white px-8 py-2 text-sm font-bold"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Check, Pencil } from 'lucide-react';
import type { ManagementFeatureRow, ManagementSettingsData } from '@/types/adminFunctionSettings';
import {
  getManagementFeatureEditHref,
  saveManagementSettingsData,
} from '@/lib/admin/managementFunctionSettingsMock';
import SubscriptionSystemDashboardHeader from './SubscriptionSystemDashboardHeader';
import FunctionSettingsTabs from './FunctionSettingsTabs';
import FunctionKeycodeEditor from './FunctionKeycodeEditor';
import SubscriptionLanguageTabs from './SubscriptionLanguageTabs';

type FunctionManagementSettingsPanelProps = {
  lang: string;
  initialData: ManagementSettingsData;
};

function TierCheck({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="mx-auto flex h-6 w-6 items-center justify-center"
      aria-label={checked ? 'Enabled' : 'Disabled'}
    >
      {checked ? <Check className="h-5 w-5 text-[#5cb85c] stroke-[3]" /> : null}
    </button>
  );
}

export default function FunctionManagementSettingsPanel({
  lang,
  initialData,
}: FunctionManagementSettingsPanelProps) {
  const router = useRouter();
  const [data, setData] = useState(initialData);
  const [saving, setSaving] = useState(false);

  const updateFeature = (id: number, patch: Partial<ManagementFeatureRow>) => {
    setData((prev) => ({
      ...prev,
      features: prev.features.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    }));
  };

  const handleLangChange = (nextLang: string) => {
    saveManagementSettingsData(data);
    router.push(`/subscriptions/function_settings_mang/${nextLang}`);
  };

  const handleSave = async () => {
    setSaving(true);
    saveManagementSettingsData(data);
    await new Promise((r) => setTimeout(r, 300));
    setSaving(false);
  };

  return (
    <div className="h-full flex flex-col bg-gray-100">
      <SubscriptionSystemDashboardHeader />
      <FunctionSettingsTabs activeTab="management" lang={lang} />

      <div className="flex-1 overflow-y-auto bg-white">
        <SubscriptionLanguageTabs
          activeLang={lang}
          onChange={handleLangChange}
          label="Select a language to edit the available functions"
        />

        <div className="bg-[#a51d2d] text-white py-2 font-bold text-center text-base border-b-4 border-[#800000]">
          Management Area
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-[#e6e6e6] border-b border-gray-300">
                <th className="border border-gray-300 px-3 py-2 text-left font-bold text-gray-800 min-w-[200px]">
                  List of Features
                </th>
                <th className="border border-gray-300 px-3 py-2 text-center font-bold text-gray-800 w-20">
                  Basic
                </th>
                <th className="border border-gray-300 px-3 py-2 text-center font-bold text-gray-800 w-20">
                  Prem
                </th>
                <th className="border border-gray-300 px-3 py-2 text-center font-bold text-gray-800 w-20">
                  Pro
                </th>
                <th
                  className="border border-gray-300 px-3 py-2 text-center font-bold text-gray-800"
                  colSpan={2}
                >
                  Optional
                </th>
                <th className="border border-gray-300 px-3 py-2 text-center font-bold text-gray-800 w-28">
                  Keycode
                </th>
                <th className="border border-gray-300 px-3 py-2 text-center font-bold text-gray-800 w-16">
                  Edit
                </th>
              </tr>
              <tr className="bg-[#e6e6e6] border-b border-gray-300">
                <th className="border border-gray-300" />
                <th className="border border-gray-300" />
                <th className="border border-gray-300" />
                <th className="border border-gray-300" />
                <th className="border border-gray-300 px-2 py-1 text-center text-xs font-bold text-gray-700">
                  1 Year (EURO)
                </th>
                <th className="border border-gray-300 px-2 py-1 text-center text-xs font-bold text-gray-700">
                  No Limit (EURO)
                </th>
                <th className="border border-gray-300" />
                <th className="border border-gray-300" />
              </tr>
            </thead>
            <tbody>
              {data.features.map((row, index) => {
                const inputDisabled = !row.optionalEnabled;

                return (
                  <tr
                    key={row.id}
                    className={index % 2 === 0 ? 'bg-white' : 'bg-[#f5f5f5]'}
                  >
                    <td className="border border-gray-300 px-3 py-2 text-gray-800">
                      {row.name}
                    </td>
                    <td className="border border-gray-300 px-2 py-2 text-center">
                      <TierCheck
                        checked={row.basic}
                        onChange={(basic) => updateFeature(row.id, { basic })}
                      />
                    </td>
                    <td className="border border-gray-300 px-2 py-2 text-center">
                      <TierCheck
                        checked={row.premium}
                        onChange={(premium) => updateFeature(row.id, { premium })}
                      />
                    </td>
                    <td className="border border-gray-300 px-2 py-2 text-center">
                      <TierCheck
                        checked={row.pro}
                        onChange={(pro) => updateFeature(row.id, { pro })}
                      />
                    </td>
                    <td className="border border-gray-300 px-2 py-2 text-center">
                      <input
                        type="text"
                        value={row.priceOneYear}
                        disabled={inputDisabled}
                        onChange={(e) =>
                          updateFeature(row.id, {
                            priceOneYear: Number(e.target.value) || 0,
                          })
                        }
                        className={`w-14 border border-gray-300 px-1 py-0.5 text-center text-sm ${
                          inputDisabled ? 'bg-gray-200 text-gray-500' : 'bg-[#fffacd]'
                        }`}
                      />
                    </td>
                    <td className="border border-gray-300 px-2 py-2 text-center">
                      <input
                        type="text"
                        value={row.priceNoLimit}
                        disabled={inputDisabled}
                        onChange={(e) =>
                          updateFeature(row.id, {
                            priceNoLimit: Number(e.target.value) || 0,
                          })
                        }
                        className={`w-14 border border-gray-300 px-1 py-0.5 text-center text-sm ${
                          inputDisabled ? 'bg-gray-200 text-gray-500' : 'bg-[#fffacd]'
                        }`}
                      />
                    </td>
                    <td className="border border-gray-300 px-2 py-2 text-center align-top">
                      <FunctionKeycodeEditor tab="management" functionId={row.id} compact />
                    </td>
                    <td className="border border-gray-300 px-2 py-2 text-center">
                      <button
                        type="button"
                        onClick={() =>
                          router.push(getManagementFeatureEditHref(lang, row.id))
                        }
                        className="mx-auto flex items-center justify-center"
                        aria-label="Edit feature"
                      >
                        <Pencil className="h-4 w-4 text-[#f0ad4e]" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
  );
}

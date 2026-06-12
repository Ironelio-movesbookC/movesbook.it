'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { ManagementFeatureEditData } from '@/types/adminFunctionSettings';
import {
  PACKAGE_FEATURES,
  saveManagementFeatureEditData,
  getManagementFeatureEditHref,
} from '@/lib/admin/managementFunctionSettingsMock';
import SubscriptionSystemDashboardHeader from './SubscriptionSystemDashboardHeader';
import FunctionSettingsTabs from './FunctionSettingsTabs';
import SubscriptionLanguageTabs from './SubscriptionLanguageTabs';

type FunctionManagementEditPanelProps = {
  initialData: ManagementFeatureEditData;
};

export default function FunctionManagementEditPanel({
  initialData,
}: FunctionManagementEditPanelProps) {
  const router = useRouter();
  const [data, setData] = useState(initialData);
  const [submitting, setSubmitting] = useState(false);

  const update = (patch: Partial<ManagementFeatureEditData>) => {
    setData((prev) => ({ ...prev, ...patch }));
  };

  const handleLangChange = (nextLang: string) => {
    saveManagementFeatureEditData(data);
    router.push(getManagementFeatureEditHref(nextLang, data.id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    saveManagementFeatureEditData(data);
    await new Promise((r) => setTimeout(r, 300));
    setSubmitting(false);
    router.push(`/subscriptions/function_settings_mang/${data.lang}`);
  };

  return (
    <div className="h-full flex flex-col bg-gray-100">
      <SubscriptionSystemDashboardHeader />
      <FunctionSettingsTabs activeTab="management" lang={data.lang} />

      <div className="flex-1 overflow-y-auto bg-white">
        <SubscriptionLanguageTabs
          activeLang={data.lang}
          onChange={handleLangChange}
          label="Select a language to edit the available functions"
        />

        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto p-6">
          <div className="border border-gray-300">
            <div className="bg-[#e6e6e6] border-b border-gray-300 px-4 py-2 text-sm font-bold text-gray-800">
              Edit setting of the functionality
            </div>

            <div className="p-6 space-y-5 bg-white">
              <div className="flex items-center gap-4">
                <label className="text-sm text-gray-700 w-48 shrink-0">Functions</label>
                <input
                  type="text"
                  value={data.functionName}
                  readOnly
                  className="flex-1 border border-gray-300 bg-gray-200 px-3 py-1.5 text-sm text-gray-600"
                />
              </div>

              <div className="flex items-center gap-4">
                <label className="text-sm text-gray-700 w-48 shrink-0">
                  Linked to this package feature
                </label>
                <select
                  value={data.linkedPackageFeature}
                  onChange={(e) => update({ linkedPackageFeature: e.target.value })}
                  className="flex-1 border border-gray-300 bg-white px-3 py-1.5 text-sm"
                >
                  {PACKAGE_FEATURES.map((opt) => (
                    <option key={opt.value || 'empty'} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-start gap-4">
                <label className="text-sm text-gray-700 w-48 shrink-0 pt-1">Description</label>
                <textarea
                  value={data.description}
                  onChange={(e) => update({ description: e.target.value })}
                  rows={5}
                  className="flex-1 border border-gray-300 bg-white px-3 py-2 text-sm resize-y min-h-[120px]"
                />
              </div>

              <div className="flex items-center gap-4">
                <label className="text-sm text-gray-700 w-48 shrink-0">Status</label>
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="radio"
                      name="status"
                      checked={data.status === 'publish'}
                      onChange={() => update({ status: 'publish' })}
                    />
                    Publish
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="radio"
                      name="status"
                      checked={data.status === 'unpublish'}
                      onChange={() => update({ status: 'unpublish' })}
                    />
                    Unpublish
                  </label>
                </div>
              </div>

              <div className="pt-2">
                <p className="text-sm font-medium text-gray-800 mb-3">
                  Activate in these versions
                </p>

                <div className="border border-gray-300">
                  <div className="bg-[#4a4a4a] text-white px-4 py-1.5 text-sm font-bold">
                    Club
                  </div>

                  <div className="p-4 space-y-4">
                    <div className="border border-gray-300 p-4">
                      <p className="text-sm text-gray-700 mb-3">Include in these versions</p>
                      <div className="flex flex-wrap gap-6">
                        {(
                          [
                            ['basic', 'Base'],
                            ['premium', 'Prem'],
                            ['pro', 'Pro'],
                          ] as const
                        ).map(([key, label]) => (
                          <label key={key} className="flex items-center gap-2 text-sm text-gray-700">
                            <input
                              type="checkbox"
                              checked={data.clubVersions[key]}
                              onChange={(e) =>
                                update({
                                  clubVersions: {
                                    ...data.clubVersions,
                                    [key]: e.target.checked,
                                  },
                                })
                              }
                            />
                            {label}
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="border border-gray-300 p-4">
                      <label className="flex items-center gap-2 text-sm text-gray-700 mb-4">
                        <input
                          type="checkbox"
                          checked={data.optionalSubscription}
                          onChange={(e) => update({ optionalSubscription: e.target.checked })}
                        />
                        Optional subscription if not already included
                      </label>

                      <div className="flex flex-wrap items-center gap-8 pl-6">
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-gray-700 border border-red-400 px-2 py-0.5">
                            1 year
                          </span>
                          <span className="text-sm text-gray-700">Cost in Euro</span>
                          <input
                            type="text"
                            value={data.priceOneYear}
                            disabled={!data.optionalSubscription}
                            onChange={(e) =>
                              update({ priceOneYear: Number(e.target.value) || 0 })
                            }
                            className={`w-16 border border-gray-300 px-2 py-1 text-sm text-center ${
                              data.optionalSubscription ? 'bg-[#fffacd]' : 'bg-gray-200'
                            }`}
                          />
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-gray-700 border border-red-400 px-2 py-0.5">
                            No limit
                          </span>
                          <span className="text-sm text-gray-700">Cost in Euro</span>
                          <input
                            type="text"
                            value={data.priceNoLimit}
                            disabled={!data.optionalSubscription}
                            onChange={(e) =>
                              update({ priceNoLimit: Number(e.target.value) || 0 })
                            }
                            className={`w-16 border border-gray-300 px-2 py-1 text-sm text-center ${
                              data.optionalSubscription ? 'bg-[#fffacd]' : 'bg-gray-200'
                            }`}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-center pt-8 pb-6">
            <button
              type="submit"
              disabled={submitting}
              className="bg-[#333] hover:bg-black text-white px-12 py-2.5 text-sm font-bold disabled:opacity-60"
            >
              {submitting ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

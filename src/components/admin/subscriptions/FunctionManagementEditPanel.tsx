'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { ManagementFeatureEditData } from '@/types/adminFunctionSettings';
import {
  getEnglishFunctionName,
  PACKAGE_FEATURES,
  saveManagementFeatureEditData,
  getManagementFeatureEditHref,
} from '@/lib/admin/managementFunctionSettingsMock';
import SubscriptionSystemDashboardHeader from './SubscriptionSystemDashboardHeader';
import FunctionSettingsTabs from './FunctionSettingsTabs';
import SubscriptionLanguageTabs from './SubscriptionLanguageTabs';
import FunctionKeycodeEditor from './FunctionKeycodeEditor';

type FunctionManagementEditPanelProps = {
  initialData: ManagementFeatureEditData;
};

export default function FunctionManagementEditPanel({
  initialData,
}: FunctionManagementEditPanelProps) {
  const router = useRouter();
  const [data, setData] = useState(initialData);
  const [submitting, setSubmitting] = useState(false);
  const englishReferenceName = getEnglishFunctionName(data.id);

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

  const isEnglish = data.lang === 'en';

  return (
    <div className="flex h-full flex-col bg-gray-100">
      <SubscriptionSystemDashboardHeader />
      <FunctionSettingsTabs activeTab="management" lang={data.lang} />

      <div className="flex-1 overflow-y-auto bg-white">
        <form onSubmit={handleSubmit} className="mx-auto max-w-4xl p-6">
          <div className="border border-gray-300">
            <div className="border-b border-gray-300 bg-[#e6e6e6] px-4 py-2 text-sm font-bold text-gray-800">
              Activate in these versions
            </div>

            <div className="space-y-4 bg-white p-6">
              <p className="text-xs text-gray-600">
                Version activation and optional pricing apply to all languages (not per language).
              </p>

              <div className="border border-gray-300">
                <div className="bg-[#4a4a4a] px-4 py-1.5 text-sm font-bold text-white">Club</div>

                <div className="space-y-4 p-4">
                  <div className="border border-gray-300 p-4">
                    <p className="mb-3 text-sm text-gray-700">Include in these versions</p>
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
                    <label className="mb-4 flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={data.optionalSubscription}
                        onChange={(e) => update({ optionalSubscription: e.target.checked })}
                      />
                      Optional subscription if not already included
                    </label>

                    <div className="flex flex-wrap items-center gap-8 pl-6">
                      <div className="flex items-center gap-3">
                        <span className="border border-red-400 px-2 py-0.5 text-sm text-gray-700">
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
                          className={`w-16 border border-gray-300 px-2 py-1 text-center text-sm ${
                            data.optionalSubscription ? 'bg-[#fffacd]' : 'bg-gray-200'
                          }`}
                        />
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="border border-red-400 px-2 py-0.5 text-sm text-gray-700">
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
                          className={`w-16 border border-gray-300 px-2 py-1 text-center text-sm ${
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

          <div className="mt-6 border border-gray-300">
            <div className="border-b border-gray-300 bg-[#e6e6e6] px-4 py-2 text-sm font-bold text-gray-800">
              Edit setting of the functionality
            </div>

            <SubscriptionLanguageTabs
              activeLang={data.lang}
              onChange={handleLangChange}
              label="Select a language to edit the available functions"
            />

            <div className="space-y-5 bg-white p-6">
              <div className="flex items-start gap-4 border-b border-gray-200 pb-4">
                <label className="w-48 shrink-0 pt-1 text-sm text-gray-700">Keycode</label>
                <div className="flex-1">
                  <FunctionKeycodeEditor tab="management" functionId={data.id} />
                  <p className="mt-1 text-xs text-gray-500">
                    Unique identifier for this function in Movesbook (max 10 alphanumeric).
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <label className="w-48 shrink-0 text-sm text-gray-700">Functions</label>
                <div className="flex-1 space-y-1">
                  <input
                    type="text"
                    value={data.functionName}
                    readOnly={isEnglish}
                    onChange={(e) => update({ functionName: e.target.value })}
                    className={`w-full border border-gray-300 px-3 py-1.5 text-sm ${
                      isEnglish ? 'bg-gray-200 text-gray-600' : 'bg-white text-gray-900'
                    }`}
                  />
                  {!isEnglish ? (
                    <p className="text-xs text-gray-500">
                      English reference: <span className="font-medium">{englishReferenceName}</span>
                    </p>
                  ) : (
                    <p className="text-xs text-gray-500">
                      English title is the reference and cannot be edited here.
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <label className="w-48 shrink-0 text-sm text-gray-700">
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
                <label className="w-48 shrink-0 pt-1 text-sm text-gray-700">Description</label>
                <textarea
                  value={data.description}
                  onChange={(e) => update({ description: e.target.value })}
                  rows={5}
                  className="min-h-[120px] flex-1 resize-y border border-gray-300 bg-white px-3 py-2 text-sm"
                />
              </div>

              <div className="flex items-center gap-4">
                <label className="w-48 shrink-0 text-sm text-gray-700">Status</label>
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
            </div>
          </div>

          <div className="flex justify-center pb-6 pt-8">
            <button
              type="submit"
              disabled={submitting}
              className="bg-[#333] px-12 py-2.5 text-sm font-bold text-white hover:bg-black disabled:opacity-60"
            >
              {submitting ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

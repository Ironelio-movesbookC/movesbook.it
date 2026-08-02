'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { SubscriptionEditData } from '@/types/adminSubscriptionSettings';
import {
  getSubscriptionById,
  saveSubscriptionEditData,
} from '@/lib/admin/subscriptionSettingsMock';
import SubscriptionSystemDashboardHeader from './SubscriptionSystemDashboardHeader';
import SubscriptionGeneralForm from './SubscriptionGeneralForm';
import SubscriptionEditSettingsForm from './SubscriptionEditSettingsForm';
import SubscriptionExpirationSections from './SubscriptionExpirationSections';

type EditSubscriptionPanelProps = {
  subscriptionId: number;
  lang: string;
  initialData: SubscriptionEditData;
};

export default function EditSubscriptionPanel({
  subscriptionId,
  lang,
  initialData,
}: EditSubscriptionPanelProps) {
  const router = useRouter();
  const row = getSubscriptionById(subscriptionId);
  const [data, setData] = useState(initialData);
  const [activeLang, setActiveLang] = useState(lang || 'en');
  const [saving, setSaving] = useState(false);

  if (!row) {
    return (
      <div className="p-6 text-gray-600">
        Subscription not found.
      </div>
    );
  }

  const handleSave = async () => {
    setSaving(true);
    saveSubscriptionEditData(data);
    await new Promise((r) => setTimeout(r, 300));
    setSaving(false);
    router.push('/subscriptions/subscription_settings');
  };

  const handleCancel = () => {
    router.push('/subscriptions/subscription_settings');
  };

  const settingsVariant =
    row.userType === 'coach' || row.userType === 'team' || row.userType === 'group'
      ? 'coach'
      : 'athlete';

  return (
    <div className="h-full flex flex-col bg-gray-100">
      <SubscriptionSystemDashboardHeader />
      <div className="flex-1 overflow-y-auto p-4 lg:p-6 max-w-5xl">
        <SubscriptionGeneralForm
          general={data.general}
          row={row}
          activeLang={activeLang}
          onLangChange={setActiveLang}
          onChange={(general) => setData({ ...data, general })}
        />

        <SubscriptionEditSettingsForm
          settings={data.settings}
          userType={row.userType}
          variant={settingsVariant}
          daysValue={row.days2 || row.days1}
          onChange={(settings) => setData({ ...data, settings })}
        />

        <SubscriptionExpirationSections
          settings={data.settings}
          activeLang={activeLang}
          onLangChange={setActiveLang}
          versionName={row.name}
          onChange={(settings) => setData({ ...data, settings })}
        />

        <div className="flex justify-center gap-3 py-6">
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
            onClick={handleCancel}
            className="bg-[#333] hover:bg-black text-white px-8 py-2 text-sm font-bold"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

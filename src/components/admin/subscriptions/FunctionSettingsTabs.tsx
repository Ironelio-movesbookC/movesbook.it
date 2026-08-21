'use client';

import Link from 'next/link';
import type { FunctionSettingsTab } from '@/types/adminFunctionSettings';
import { getFunctionSettingsTabHref } from '@/lib/admin/functionSettingsMock';

type FunctionSettingsTabsProps = {
  activeTab: FunctionSettingsTab;
  lang?: string;
};

const TABS: { key: FunctionSettingsTab; label: string }[] = [
  { key: 'social', label: 'Social' },
  { key: 'training', label: 'Training' },
  { key: 'management', label: 'Management' },
];

export default function FunctionSettingsTabs({ activeTab, lang = 'en' }: FunctionSettingsTabsProps) {
  return (
    <div className="flex justify-center gap-0 border-b border-gray-300 bg-white py-3">
      {TABS.map((tab) => {
        const isActive = tab.key === activeTab;
        return (
          <Link
            key={tab.key}
            href={getFunctionSettingsTabHref(tab.key, lang)}
            className={`px-8 py-2 text-sm font-bold border border-gray-800 ${
              isActive ? 'bg-black text-white' : 'bg-[#333] text-white hover:bg-black'
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}

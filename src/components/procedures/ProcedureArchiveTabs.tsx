'use client';

import Link from 'next/link';
import type { ProcedureTab } from './types';

type Props = {
  tabs: ProcedureTab[];
  activeTab: string;
};

export default function ProcedureArchiveTabs({ tabs, activeTab }: Props) {
  const tabClass = (tabId: string) =>
    `px-4 py-2 text-sm font-medium rounded-t border-b-2 ${
      activeTab === tabId
        ? 'border-teal-600 text-teal-700 bg-white'
        : 'border-transparent text-gray-600 hover:text-teal-600'
    }`;

  return (
    <div className="border-b border-gray-200 mb-4">
      <nav className="flex flex-wrap gap-1">
        {tabs.map((tab) => (
          <Link key={tab.id} href={tab.href} className={tabClass(tab.id)}>
            {tab.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

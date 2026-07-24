'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import type { ProcedureTab } from './types';

type Props = {
  tabs: ProcedureTab[];
  activeTab: string;
  actions?: ReactNode;
};

export default function ProcedureArchiveTabs({ tabs, activeTab, actions }: Props) {
  const tabClass = (tabId: string) =>
    `px-4 py-2 text-sm font-medium rounded-t border-b-2 ${
      activeTab === tabId
        ? 'border-teal-600 text-teal-700 bg-white'
        : 'border-transparent text-gray-600 hover:text-teal-600'
    }`;

  return (
    <div className="mb-4 border-b border-gray-200">
      <nav className="flex flex-wrap items-end gap-1">
        {tabs.map((tab) => (
          <Link key={tab.id} href={tab.href} className={tabClass(tab.id)}>
            {tab.label}
          </Link>
        ))}
        {actions}
      </nav>
    </div>
  );
}

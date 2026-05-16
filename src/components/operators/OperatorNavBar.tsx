'use client';

import Link from 'next/link';
import {
  OPERATOR_NAV_TABS,
  getOperatorNavHref,
  type OperatorNavTabId,
  type OperatorNavVariant,
} from '@/lib/operatorNavTabs';

type OperatorNavBarProps = {
  operatorId: string;
  activeTabId: OperatorNavTabId;
  variant: OperatorNavVariant;
};

export function OperatorNavBar({ operatorId, activeTabId, variant }: OperatorNavBarProps) {
  return (
    <div className="flex flex-nowrap gap-0 overflow-x-auto bg-[#4f4f4f] border-b border-gray-600">
      {OPERATOR_NAV_TABS.map((tab) => {
        const href = getOperatorNavHref(tab.id, operatorId, variant);
        const isActive = activeTabId === tab.id;
        return (
          <Link
            key={tab.id}
            href={href}
            onClick={() => {
              try {
                sessionStorage.setItem('operatorNavVariant', JSON.stringify(variant));
              } catch {
                /* ignore */
              }
            }}
            className={`flex-shrink-0 whitespace-nowrap px-4 py-2.5 text-sm font-medium transition ${
              isActive ? 'bg-black text-white' : 'text-gray-300 hover:text-white hover:bg-gray-600'
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}

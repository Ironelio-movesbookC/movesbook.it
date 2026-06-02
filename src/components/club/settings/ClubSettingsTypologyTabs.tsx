'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type TabItem = {
  label: string;
  href: string;
  match: (pathname: string) => boolean;
  disabled?: boolean;
};

type ClubSettingsTypologyTabsProps = {
  timetableTypologyId?: string | null;
};

export default function ClubSettingsTypologyTabs({ timetableTypologyId }: ClubSettingsTypologyTabsProps) {
  const pathname = usePathname() ?? '';
  const timetableHref = timetableTypologyId
    ? `/club/settings/typology_subscription/timetable/${encodeURIComponent(timetableTypologyId)}`
    : '/club/settings/typology_subscription/timetable';

  const tabs: TabItem[] = [
    {
      label: 'Typologies',
      href: '/club/settings/typology_subscription',
      match: (path) => path === '/club/settings/typology_subscription'
    },
    {
      label: 'List prices',
      href: '/club/settings/typology_subscription/pricelist',
      match: (path) => path.includes('/typology_subscription/pricelist')
    },
    {
      label: 'Timetable',
      href: timetableHref,
      match: (path) => path.includes('/typology_subscription/timetable')
    },
    {
      label: 'RfId/Card readers',
      href: '/club/settings/typology_subscription/active_reader',
      match: (path) => path.includes('/typology_subscription/active_reader')
    },
    {
      label: 'Overview',
      href: '/club/settings/typology_subscription/activity_overview',
      match: (path) => path.includes('/typology_subscription/activity_overview')
    }
  ];

  return (
    <div className="border-b border-gray-200 bg-gray-50">
      <div className="flex flex-wrap items-end">
        {tabs.map((tab) => {
          const active = tab.match(pathname);
          const className = `border-r border-gray-200 px-4 py-3 text-sm font-semibold transition ${
            active ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-white'
          } ${tab.disabled ? 'cursor-not-allowed opacity-60' : ''}`;

          return (
            <Link key={tab.label} href={tab.href} className={className}>
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

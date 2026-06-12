'use client';

import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import type { SubscriptionUserType } from '@/types/adminSubscriptionSettings';
import {
  getSubscriptionRowsByUserType,
  SUBSCRIPTION_LIST_ROWS,
} from '@/lib/admin/subscriptionSettingsMock';
import SubscriptionSystemDashboardHeader from './SubscriptionSystemDashboardHeader';
import SubscriptionSettingsTable from './SubscriptionSettingsTable';

const USER_TYPE_PARAM_MAP: Record<string, SubscriptionUserType> = {
  athlete: 'athlete',
  'single-users': 'athlete',
  coach: 'coach',
  coaches: 'coach',
  team: 'team',
  teams: 'team',
  group: 'group',
  groups: 'group',
  club: 'club',
  clubs: 'club',
};

function resolveUserType(param: string | null): SubscriptionUserType | null {
  if (!param) return null;
  return USER_TYPE_PARAM_MAP[param.toLowerCase()] ?? null;
}

export default function SubscriptionSettingsPanel() {
  const searchParams = useSearchParams();
  const userType = resolveUserType(searchParams?.get('userType') ?? null);
  const [showFreeLabel, setShowFreeLabel] = useState(false);
  const [defaultRowId, setDefaultRowId] = useState(
    SUBSCRIPTION_LIST_ROWS.find((r) => r.isDefault)?.id,
  );

  const rows = useMemo(() => getSubscriptionRowsByUserType(userType), [userType]);

  return (
    <div className="h-full flex flex-col bg-gray-100">
      <SubscriptionSystemDashboardHeader />
      <SubscriptionSettingsTable
        rows={rows}
        userTypeFilter={userType}
        showFreeLabel={showFreeLabel}
        onShowFreeLabelChange={setShowFreeLabel}
        defaultRowId={defaultRowId}
        onDefaultChange={setDefaultRowId}
      />
    </div>
  );
}

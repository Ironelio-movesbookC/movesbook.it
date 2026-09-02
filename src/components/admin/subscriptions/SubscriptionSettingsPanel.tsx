'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import type { SubscriptionUserType } from '@/types/adminSubscriptionSettings';
import {
  getSubscriptionListRows,
  getSubscriptionRowsByUserType,
  SUBSCRIPTION_SETTINGS_UPDATED_EVENT,
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
    () => getSubscriptionListRows().find((r) => r.isDefault)?.id,
  );
  const [rowsRevision, setRowsRevision] = useState(0);

  useEffect(() => {
    const refresh = () => setRowsRevision((value) => value + 1);
    window.addEventListener(SUBSCRIPTION_SETTINGS_UPDATED_EVENT, refresh);
    window.addEventListener('focus', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(SUBSCRIPTION_SETTINGS_UPDATED_EVENT, refresh);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  const rows = useMemo(() => {
    void rowsRevision; // re-read mock store when settings update events fire
    return getSubscriptionRowsByUserType(userType);
  }, [userType, rowsRevision]);

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

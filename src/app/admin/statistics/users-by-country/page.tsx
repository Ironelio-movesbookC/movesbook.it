'use client';

import { useMemo, useState } from 'react';
import StatisticsPageShell, {
  StatisticsSelect,
  usersByCountryFilterOptions,
} from '@/components/admin/statistics/StatisticsPageShell';
import { StatisticsVerticalCountryBars } from '@/components/admin/statistics/StatisticsCharts';
import VersionDistributionDrilldown from '@/components/admin/statistics/VersionDistributionDrilldown';
import { useAdminStatistics } from '@/components/admin/statistics/useAdminStatistics';
import { aggregateVersionsForScope } from '@/lib/admin/statisticsDrilldown';
import {
  STATS_KIND_LABELS,
  STATS_USER_KINDS,
  type StatsUserKind,
} from '@/lib/admin/statisticsKinds';

export default function UsersByCountryBarsPage() {
  const { authChecked, loading, error, data, filters, setFilters } = useAdminStatistics({
    enableUserType: true,
    enableCountry: false,
    initial: { userType: 'all' },
  });
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);

  const onlyKind =
    filters.userType === 'except_groups' ? 'all' : filters.userType;
  const isSingleType =
    onlyKind !== 'all' && STATS_USER_KINDS.includes(onlyKind as StatsUserKind);

  const drilldown = useMemo(() => {
    if (!data?.usersLite || !selectedCountry || !isSingleType) return null;
    return aggregateVersionsForScope(data.usersLite, {
      country: selectedCountry,
      kind: onlyKind as StatsUserKind,
    });
  }, [data?.usersLite, selectedCountry, isSingleType, onlyKind]);

  if (!authChecked) return null;

  return (
    <StatisticsPageShell
      title="Vertical Bargraph of users for countries"
      description="Start with “Each type of users” (5 bars per country). Click a bar (or legend) to filter to that type only. Then click a country to see version distribution."
      totalUsers={data?.totalUsers ?? 0}
      incomeEuro={data?.incomeEuro ?? 0}
      loading={loading}
      error={error}
      filters={
        <StatisticsSelect
          id="userType"
          label="Type of user"
          value={filters.userType === 'except_groups' ? 'all' : filters.userType}
          onChange={(userType) => {
            setSelectedCountry(null);
            setFilters((f) => ({
              ...f,
              userType: userType as StatsUserKind | 'all',
            }));
          }}
          options={usersByCountryFilterOptions()}
        />
      }
    >
      <StatisticsVerticalCountryBars
        rows={data?.countriesBars ?? []}
        onlyKind={onlyKind}
        onKindSelect={(kind) => {
          setSelectedCountry(null);
          setFilters((f) => ({ ...f, userType: kind }));
        }}
        onCountrySelect={isSingleType ? setSelectedCountry : undefined}
      />
      {isSingleType && selectedCountry && drilldown ? (
        <VersionDistributionDrilldown
          title={`${STATS_KIND_LABELS[onlyKind as StatsUserKind]} — ${selectedCountry}`}
          subtitle="Distribution of the versions"
          total={drilldown.total}
          bars={drilldown.bars}
          slices={drilldown.slices}
          userKind={onlyKind as StatsUserKind}
          onClear={() => setSelectedCountry(null)}
        />
      ) : null}
    </StatisticsPageShell>
  );
}

'use client';

import { useMemo, useState } from 'react';
import StatisticsPageShell, {
  StatisticsSelect,
  countryFilterOptions,
  userTypeFilterOptions,
} from '@/components/admin/statistics/StatisticsPageShell';
import { StatisticsVersionsBars } from '@/components/admin/statistics/StatisticsCharts';
import UserTypeDistributionDrilldown from '@/components/admin/statistics/UserTypeDistributionDrilldown';
import { useAdminStatistics } from '@/components/admin/statistics/useAdminStatistics';
import { aggregateKindsForVersion } from '@/lib/admin/statisticsDrilldown';
import type { StatsUserKind, StatsVersionBucket } from '@/lib/admin/statisticsKinds';

export default function VersionsByCountryPage() {
  const { authChecked, loading, error, data, filters, setFilters } = useAdminStatistics({
    enableCountry: true,
    enableUserType: true,
  });
  const [selectedVersion, setSelectedVersion] = useState<StatsVersionBucket | null>(null);

  const drilldown = useMemo(() => {
    if (!data?.usersLite || !selectedVersion) return null;
    return aggregateKindsForVersion(data.usersLite, {
      version: selectedVersion,
      country: filters.country || null,
      kind:
        filters.userType === 'all' || filters.userType === 'except_groups'
          ? filters.userType === 'except_groups'
            ? 'except_groups'
            : 'all'
          : filters.userType,
    });
  }, [data?.usersLite, selectedVersion, filters.country, filters.userType]);

  if (!authChecked) return null;

  const scopeLabel = filters.country
    ? filters.country
    : 'World';
  const typeLabel =
    filters.userType === 'all'
      ? 'all types'
      : filters.userType === 'except_groups'
        ? 'all except Groups'
        : filters.userType;

  return (
    <StatisticsPageShell
      title="Bargraph versions for country"
      description="Bars for subscription versions (Trial, Base, Premium, Professional). Filter by country and/or type of user. Click a version to see its distribution among user types."
      totalUsers={data?.totalUsers ?? 0}
      incomeEuro={data?.incomeEuro ?? 0}
      loading={loading}
      error={error}
      filters={
        <>
          <StatisticsSelect
            id="country"
            label="Country"
            value={filters.country}
            onChange={(country) => {
              setSelectedVersion(null);
              setFilters((f) => ({ ...f, country }));
            }}
            options={countryFilterOptions(data?.countries ?? [])}
          />
          <StatisticsSelect
            id="userType"
            label="Type of user"
            value={filters.userType}
            onChange={(userType) => {
              setSelectedVersion(null);
              setFilters((f) => ({
                ...f,
                userType: userType as StatsUserKind | 'all',
              }));
            }}
            options={userTypeFilterOptions(true)}
          />
        </>
      }
    >
      <StatisticsVersionsBars
        rows={data?.versions ?? []}
        onVersionSelect={setSelectedVersion}
      />
      {selectedVersion && drilldown ? (
        <UserTypeDistributionDrilldown
          title={`Distribution — ${scopeLabel}`}
          subtitle={`${selectedVersion} · ${typeLabel}`}
          total={drilldown.total}
          slices={drilldown.slices}
          onClear={() => setSelectedVersion(null)}
        />
      ) : null}
    </StatisticsPageShell>
  );
}

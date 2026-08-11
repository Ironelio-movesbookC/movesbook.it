'use client';

import StatisticsPageShell, {
  StatisticsSelect,
  countryFilterOptions,
  userTypeFilterOptions,
} from '@/components/admin/statistics/StatisticsPageShell';
import { StatisticsVersionsBars } from '@/components/admin/statistics/StatisticsCharts';
import { useAdminStatistics } from '@/components/admin/statistics/useAdminStatistics';
import type { StatsUserKind } from '@/lib/admin/statisticsKinds';

export default function VersionsByCountryPage() {
  const { authChecked, loading, error, data, filters, setFilters } = useAdminStatistics({
    enableCountry: true,
    enableUserType: true,
  });

  if (!authChecked) return null;

  return (
    <StatisticsPageShell
      title="Bargraph versions for country"
      description="Horizontal bars for subscription versions (Trial, Base, Premium, Professional). Filter by country and/or type of user."
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
            onChange={(country) => setFilters((f) => ({ ...f, country }))}
            options={countryFilterOptions(data?.countries ?? [])}
          />
          <StatisticsSelect
            id="userType"
            label="Type of user"
            value={filters.userType}
            onChange={(userType) =>
              setFilters((f) => ({
                ...f,
                userType: userType as StatsUserKind | 'all',
              }))
            }
            options={userTypeFilterOptions(true)}
          />
        </>
      }
    >
      <StatisticsVersionsBars rows={data?.versions ?? []} />
    </StatisticsPageShell>
  );
}

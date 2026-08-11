'use client';

import StatisticsPageShell, {
  StatisticsSelect,
  userTypeFilterOptions,
} from '@/components/admin/statistics/StatisticsPageShell';
import { StatisticsVerticalCountryBars } from '@/components/admin/statistics/StatisticsCharts';
import { useAdminStatistics } from '@/components/admin/statistics/useAdminStatistics';
import type { StatsUserKind } from '@/lib/admin/statisticsKinds';

export default function UsersByCountryBarsPage() {
  const { authChecked, loading, error, data, filters, setFilters } = useAdminStatistics({
    enableUserType: true,
    enableCountry: false,
  });

  if (!authChecked) return null;

  return (
    <StatisticsPageShell
      title="Vertical Bargraph of users for countries"
      description="Countries listed vertically. For each country, five bars show Single users, Coaches, Teams, Clubs and Groups. Filter by type of user."
      totalUsers={data?.totalUsers ?? 0}
      incomeEuro={data?.incomeEuro ?? 0}
      loading={loading}
      error={error}
      filters={
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
      }
    >
      <StatisticsVerticalCountryBars
        rows={data?.countriesBars ?? []}
        onlyKind={filters.userType}
      />
    </StatisticsPageShell>
  );
}

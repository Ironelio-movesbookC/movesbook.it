'use client';

import StatisticsPageShell, {
  StatisticsSelect,
  userTypeFilterOptions,
} from '@/components/admin/statistics/StatisticsPageShell';
import { StatisticsPieBlock } from '@/components/admin/statistics/StatisticsCharts';
import { useAdminStatistics } from '@/components/admin/statistics/useAdminStatistics';
import type { StatsUserKind } from '@/lib/admin/statisticsKinds';

export default function TypeByCountryPage() {
  const { authChecked, loading, error, data, filters, setFilters } = useAdminStatistics({
    enableTypeKind: true,
    typeCountriesN: 15,
    enableCountry: false,
  });

  if (!authChecked) return null;

  const block = data?.typeByCountry;

  return (
    <StatisticsPageShell
      title="Pie of distribution of a type of user"
      description="Select a user type and see its distribution across the first 15 countries with higher registrations."
      totalUsers={block?.total ?? data?.totalUsers ?? 0}
      incomeEuro={data?.incomeEuro ?? 0}
      loading={loading}
      error={error}
      filters={
        <StatisticsSelect
          id="typeKind"
          label="Type of user"
          value={filters.typeKind}
          onChange={(typeKind) =>
            setFilters((f) => ({ ...f, typeKind: typeKind as StatsUserKind }))
          }
          options={userTypeFilterOptions(false)}
        />
      }
    >
      <div className="max-w-2xl mx-auto">
        <StatisticsPieBlock
          title={`${block?.label ?? 'Type'} — top 15 countries`}
          subtitle={block ? `${block.total} users of this type` : undefined}
          slices={block?.countries ?? []}
          height={360}
        />
      </div>
    </StatisticsPageShell>
  );
}

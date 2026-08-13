'use client';

import StatisticsPageShell, {
  StatisticsSelect,
  countryFilterOptions,
} from '@/components/admin/statistics/StatisticsPageShell';
import { StatisticsPieBlock } from '@/components/admin/statistics/StatisticsCharts';
import { useAdminStatistics } from '@/components/admin/statistics/useAdminStatistics';

export default function UsersDistributionPage() {
  const { authChecked, loading, error, data, filters, setFilters } = useAdminStatistics({
    enableCountry: true,
  });

  if (!authChecked) return null;

  return (
    <StatisticsPageShell
      title="Pie of distribution users"
      description="Distribution of users among Athletes (Single users), Coaches, Teams, Clubs and Groups worldwide. Filter by country."
      totalUsers={data?.totalUsers ?? 0}
      incomeEuro={data?.incomeEuro ?? 0}
      loading={loading}
      error={error}
      filters={
        <StatisticsSelect
          id="country"
          label="Country"
          value={filters.country}
          onChange={(country) => setFilters((f) => ({ ...f, country }))}
          options={countryFilterOptions(data?.countries ?? [])}
        />
      }
    >
      <div className="max-w-2xl mx-auto">
        <StatisticsPieBlock
          title={filters.country ? `Distribution — ${filters.country}` : 'Distribution — World'}
          subtitle={
            data
              ? `Total users: ${data.worldDistribution.total}`
              : undefined
          }
          slices={data?.worldDistribution.slices ?? []}
          kindColors
          height={340}
        />
      </div>
      {data && data.worldDistribution.total > 0 ? (
        <div className="mt-4 bg-white border border-[#cfcfcf] p-4 text-sm">
          <p className="font-semibold mb-2">
            Current users = {data.worldDistribution.total}
          </p>
          <ul className="space-y-1 text-[#333]">
            {data.worldDistribution.slices.map((s) => (
              <li key={s.key}>
                {s.label} {s.count} ({s.percent}%)
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </StatisticsPageShell>
  );
}

'use client';

import StatisticsPageShell from '@/components/admin/statistics/StatisticsPageShell';
import { StatisticsPieBlock } from '@/components/admin/statistics/StatisticsCharts';
import { useAdminStatistics } from '@/components/admin/statistics/useAdminStatistics';

export default function AllTypesByCountryPage() {
  const { authChecked, loading, error, data } = useAdminStatistics({
    typeCountriesN: 15,
    enableCountry: false,
  });

  if (!authChecked) return null;

  // Show first 4 types prominently (Single, Coaches, Teams, Clubs); Groups scrolls below.
  const blocks = data?.allTypesByCountry ?? [];

  return (
    <StatisticsPageShell
      title="Pie of distribution of all the types of users"
      description="Four pies on the first screen (Single users, Coaches, Teams, Clubs). Groups is below — each pie shows that type across the top 15 countries."
      totalUsers={data?.totalUsers ?? 0}
      incomeEuro={data?.incomeEuro ?? 0}
      loading={loading}
      error={error}
    >
      <div className="max-h-[75vh] overflow-y-auto pr-1">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {blocks.map((block) => (
            <StatisticsPieBlock
              key={block.kind}
              title={block.label}
              subtitle={`${block.total} users — top 15 countries`}
              slices={block.countries}
              height={280}
            />
          ))}
        </div>
      </div>
    </StatisticsPageShell>
  );
}

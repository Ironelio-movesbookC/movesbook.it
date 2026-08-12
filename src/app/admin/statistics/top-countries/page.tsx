'use client';

import StatisticsPageShell from '@/components/admin/statistics/StatisticsPageShell';
import { StatisticsPieBlock } from '@/components/admin/statistics/StatisticsCharts';
import { useAdminStatistics } from '@/components/admin/statistics/useAdminStatistics';

export default function TopCountriesDistributionPage() {
  const { authChecked, loading, error, data } = useAdminStatistics({
    topCountriesN: 8,
    enableCountry: false,
  });

  if (!authChecked) return null;

  return (
    <StatisticsPageShell
      title="Pie of distribution in the 8 Countries with higher registrations"
      description="Two pies per row. Scroll to see all top countries."
      totalUsers={data?.totalUsers ?? 0}
      incomeEuro={data?.incomeEuro ?? 0}
      loading={loading}
      error={error}
    >
      <div className="max-h-[70vh] overflow-y-auto pr-1">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(data?.topCountries ?? []).map((row) => (
            <StatisticsPieBlock
              key={row.country}
              title={row.country}
              subtitle={`${row.total} registrations`}
              slices={row.distribution.slices}
              kindColors
              height={260}
            />
          ))}
        </div>
        {!loading && (data?.topCountries?.length ?? 0) === 0 ? (
          <div className="bg-white border border-[#cfcfcf] p-8 text-center text-[#888]">
            No country registrations yet.
          </div>
        ) : null}
      </div>
    </StatisticsPageShell>
  );
}

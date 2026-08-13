'use client';

import { useEffect, useRef } from 'react';
import { StatisticsPieBlock } from '@/components/admin/statistics/StatisticsCharts';
import type { StatsSlice } from '@/lib/admin/buildStatistics';

type UserTypeDistributionDrilldownProps = {
  title: string;
  subtitle?: string;
  total: number;
  slices: StatsSlice[];
  onClear?: () => void;
};

/** User-type pie after clicking a version bar (uses Athletes/Coaches/… colors). */
export default function UserTypeDistributionDrilldown({
  title,
  subtitle,
  total,
  slices,
  onClear,
}: UserTypeDistributionDrilldownProps) {
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const id = window.requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    return () => window.cancelAnimationFrame(id);
  }, [title, subtitle, total]);

  return (
    <div ref={sectionRef} className="mt-4 scroll-mt-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#941751]">
            Distribution among types of users
          </p>
          <h2 className="text-lg font-bold text-[#222] mt-0.5">{title}</h2>
          {subtitle ? <p className="text-sm text-[#555] mt-0.5">{subtitle}</p> : null}
          <p className="text-sm text-[#666] mt-1">Total users: {total}</p>
        </div>
        {onClear ? (
          <button
            type="button"
            onClick={onClear}
            className="shrink-0 text-sm px-3 py-1.5 border border-[#bbb] bg-white hover:bg-[#f3f3f3]"
          >
            Clear selection
          </button>
        ) : null}
      </div>
      <div className="max-w-xl">
        <StatisticsPieBlock
          title={title}
          subtitle={`Total users: ${total}`}
          slices={slices}
          kindColors
          height={300}
        />
      </div>
    </div>
  );
}

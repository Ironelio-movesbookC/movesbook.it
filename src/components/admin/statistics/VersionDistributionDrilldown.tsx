'use client';

import { useEffect, useRef } from 'react';
import { StatisticsPieBlock, StatisticsVersionsBars } from '@/components/admin/statistics/StatisticsCharts';
import type { StatsSlice, VersionBar } from '@/lib/admin/buildStatistics';
import {
  STATS_KIND_COLORS,
  STATS_USER_KINDS,
  type StatsUserKind,
  type StatsVersionBucket,
} from '@/lib/admin/statisticsKinds';

type VersionDistributionDrilldownProps = {
  title: string;
  subtitle?: string;
  total: number;
  bars: VersionBar[];
  slices: StatsSlice[];
  /**
   * When the drill-down is scoped to one user type, paint bar + pie
   * with that type’s color (Athletes blue, Clubs red, …).
   */
  userKind?: StatsUserKind | null;
  onClear?: () => void;
  /** Open admin/all for a specific version bar. */
  onOpenBarList?: (version: StatsVersionBucket) => void;
  /** Open admin/all for the whole drill-down selection. */
  onOpenUsersList?: () => void;
};

/** Shared chart area height so bar + pie cards match. */
const DRILLDOWN_CHART_HEIGHT = 300;

function accentForKind(kind: StatsUserKind | null | undefined): string | undefined {
  if (!kind) return undefined;
  if (!STATS_USER_KINDS.includes(kind)) return undefined;
  return STATS_KIND_COLORS[kind];
}

/** Bar (counts) + pie (%) for version distribution after a drill-down click. */
export default function VersionDistributionDrilldown({
  title,
  subtitle,
  total,
  bars,
  slices,
  userKind,
  onClear,
  onOpenBarList,
  onOpenUsersList,
}: VersionDistributionDrilldownProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const accent = accentForKind(userKind);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    // Wait a frame so layout is ready after selection mounts.
    const id = window.requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    return () => window.cancelAnimationFrame(id);
  }, [title, subtitle, total, userKind]);

  return (
    <div ref={sectionRef} className="mt-4 scroll-mt-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#941751]">
            Distribution of the versions
          </p>
          <h2 className="text-lg font-bold text-[#222] mt-0.5">{title}</h2>
          {subtitle ? <p className="text-sm text-[#555] mt-0.5">{subtitle}</p> : null}
          <p className="text-sm text-[#666] mt-1">Users in selection: {total}</p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {onOpenUsersList ? (
            <button
              type="button"
              onClick={onOpenUsersList}
              className="text-sm px-3 py-1.5 border border-[#058592] bg-[#e8f4f5] text-[#058592] font-semibold hover:bg-[#d5eef0]"
            >
              Open users list
            </button>
          ) : null}
          {onClear ? (
            <button
              type="button"
              onClick={onClear}
              className="text-sm px-3 py-1.5 border border-[#bbb] bg-white hover:bg-[#f3f3f3]"
            >
              Clear selection
            </button>
          ) : null}
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
        <div className="flex flex-col min-h-0">
          <p className="text-xs font-semibold text-[#333] mb-2 shrink-0">
            Bar — number of users
          </p>
          <StatisticsVersionsBars
            rows={bars}
            height={DRILLDOWN_CHART_HEIGHT}
            className="h-full min-h-[360px]"
            fillColor={accent}
            onOpenBarList={onOpenBarList}
          />
        </div>
        <div className="flex flex-col min-h-0">
          <p className="text-xs font-semibold text-[#333] mb-2 shrink-0">
            Pie — % of versions
          </p>
          <StatisticsPieBlock
            title="Versions share"
            subtitle={`${total} users`}
            slices={slices}
            versionColors={!accent}
            uniformColor={accent}
            height={DRILLDOWN_CHART_HEIGHT}
            className="h-full min-h-[360px]"
          />
        </div>
      </div>
    </div>
  );
}

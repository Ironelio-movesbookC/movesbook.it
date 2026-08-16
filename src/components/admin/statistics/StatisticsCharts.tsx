'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Sector,
  LabelList,
} from 'recharts';
import {
  STATS_KIND_COLORS,
  STATS_KIND_LABELS,
  STATS_USER_KINDS,
  STATS_VERSION_COLORS,
  type StatsUserKind,
  type StatsVersionBucket,
} from '@/lib/admin/statisticsKinds';
import type { StatsSlice } from '@/lib/admin/buildStatistics';

const COUNTRY_PALETTE = [
  '#058592',
  '#941751',
  '#ff8d00',
  '#2f6b3a',
  '#4a5d8c',
  '#b45309',
  '#0f766e',
  '#7c2d12',
  '#1d4ed8',
  '#be123c',
  '#365314',
  '#6b21a8',
  '#0369a1',
  '#a16207',
  '#334155',
];

type PieBlockProps = {
  title: string;
  subtitle?: string;
  slices: StatsSlice[];
  /** When true, colors follow StatsUserKind keys */
  kindColors?: boolean;
  /** When true, colors follow StatsVersionBucket keys */
  versionColors?: boolean;
  /** Paint every slice with one color (e.g. selected user-type accent). */
  uniformColor?: string;
  /** Color chip shown above the title (user-type accent without recoloring slices). */
  titleSwatchColor?: string;
  height?: number;
  /** Extra classes on the outer card (e.g. h-full for equal-height grids). */
  className?: string;
  /** Called when a slice / legend item is selected (null when cleared). */
  onSelect?: (slice: StatsSlice | null) => void;
};

function PieTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; payload?: StatsSlice }>;
}) {
  if (!active || !payload?.[0]) return null;
  const row = payload[0].payload;
  const name = payload[0].name ?? row?.label ?? '';
  const value = payload[0].value ?? row?.count ?? 0;
  const percent = row?.percent;
  return (
    <div className="bg-white border border-[#ccc] px-3 py-2 text-xs shadow-sm">
      <div className="font-semibold">{name}</div>
      <div>
        {value}
        {percent != null ? ` (${percent}%)` : ''}
      </div>
    </div>
  );
}

function ActivePieShape(props: {
  cx?: number;
  cy?: number;
  innerRadius?: number;
  outerRadius?: number;
  startAngle?: number;
  endAngle?: number;
  fill?: string;
}) {
  const { cx = 0, cy = 0, innerRadius = 0, outerRadius = 0, startAngle = 0, endAngle = 0, fill } =
    props;
  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={Math.max(0, innerRadius - 2)}
        outerRadius={outerRadius + 10}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        stroke="#1f1f1f"
        strokeWidth={2}
      />
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={outerRadius + 12}
        outerRadius={outerRadius + 16}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        opacity={0.55}
      />
    </g>
  );
}

export function StatisticsPieBlock({
  title,
  subtitle,
  slices,
  kindColors,
  versionColors,
  uniformColor,
  titleSwatchColor,
  height = 280,
  className,
  onSelect,
}: PieBlockProps) {
  const chartData = useMemo(() => slices.filter((s) => s.count > 0), [slices]);
  const legendData = useMemo(() => {
    const positive = slices.filter((s) => s.count > 0);
    const rest = slices.find(
      (s) => (s.key === '__rest_of_world__' || s.key === '__others__') && s.count === 0,
    );
    return rest ? [...positive, rest] : positive;
  }, [slices]);
  const empty = chartData.length === 0;

  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const activeKey = hoveredKey ?? selectedKey;
  const activeIndex = activeKey == null ? undefined : chartData.findIndex((s) => s.key === activeKey);

  const colorFor = (entry: StatsSlice, index: number) => {
    if (uniformColor) return uniformColor;
    if (kindColors) {
      return (
        STATS_KIND_COLORS[entry.key as StatsUserKind] ??
        COUNTRY_PALETTE[index % COUNTRY_PALETTE.length]
      );
    }
    if (versionColors) {
      return (
        STATS_VERSION_COLORS[entry.key as StatsVersionBucket] ??
        COUNTRY_PALETTE[index % COUNTRY_PALETTE.length]
      );
    }
    return COUNTRY_PALETTE[index % COUNTRY_PALETTE.length];
  };

  const toggleSelect = (key: string) => {
    setSelectedKey((prev) => {
      const next = prev === key ? null : key;
      if (onSelect) {
        const slice = next ? slices.find((s) => s.key === next) ?? null : null;
        onSelect(slice);
      }
      return next;
    });
  };

  return (
    <div
      className={`bg-white border border-[#cfcfcf] p-3 flex flex-col overflow-hidden ${className ?? ''}`}
    >
      <div className="mb-2 shrink-0">
        {titleSwatchColor ? (
          <span
            className="mb-1.5 inline-block h-3.5 w-8 rounded-sm border border-black/10"
            style={{ backgroundColor: titleSwatchColor }}
            title="Type of user color"
            aria-hidden
          />
        ) : null}
        <h3 className="font-bold text-[#222] text-lg">{title}</h3>
        {subtitle ? <p className="text-base text-[#666] mt-0.5">{subtitle}</p> : null}
      </div>
      {empty ? (
        <div className="flex-1 flex items-center justify-center text-base text-[#888] min-h-[200px]">
          No data
        </div>
      ) : (
        <>
          <div className="w-full shrink-0" style={{ height }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                <Pie
                  data={chartData}
                  dataKey="count"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  outerRadius="68%"
                  innerRadius="36%"
                  paddingAngle={1}
                  {...(activeIndex != null && activeIndex >= 0
                    ? {
                        activeIndex,
                        activeShape: ActivePieShape,
                      }
                    : {})}
                  onMouseEnter={(_, index) => setHoveredKey(chartData[index]?.key ?? null)}
                  onMouseLeave={() => setHoveredKey(null)}
                  onClick={(_, index) => {
                    const key = chartData[index]?.key;
                    if (key) toggleSelect(key);
                  }}
                  style={{ cursor: 'pointer', outline: 'none' }}
                >
                  {chartData.map((entry, index) => {
                    const isActive = activeKey === entry.key;
                    const dimmed = activeKey != null && !isActive;
                    return (
                      <Cell
                        key={entry.key}
                        fill={colorFor(entry, index)}
                        stroke="#fff"
                        strokeWidth={isActive ? 2 : 1}
                        fillOpacity={dimmed ? 0.35 : 1}
                        style={{ cursor: 'pointer', outline: 'none', transition: 'fill-opacity 120ms ease' }}
                      />
                    );
                  })}
                </Pie>
                <Tooltip content={<PieTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-3 pt-3 border-t border-[#e8e8e8] grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-base text-[#333]">
            {legendData.map((entry, index) => {
              const isActive = activeKey === entry.key;
              const dimmed = activeKey != null && !isActive;
              const isRest =
                entry.key === '__rest_of_world__' || entry.key === '__others__';
              return (
                <li key={entry.key}>
                  <button
                    type="button"
                    className={`w-full flex items-center gap-2 min-w-0 rounded px-1.5 py-1.5 text-left transition ${
                      isActive
                        ? 'bg-[#e8f4f5] ring-1 ring-[#058592]'
                        : 'hover:bg-[#f3f3f3]'
                    } ${dimmed ? 'opacity-45' : ''} ${isRest ? 'font-semibold' : ''}`}
                    onMouseEnter={() => setHoveredKey(entry.key)}
                    onMouseLeave={() => setHoveredKey(null)}
                    onFocus={() => setHoveredKey(entry.key)}
                    onBlur={() => setHoveredKey(null)}
                    onClick={() => toggleSelect(entry.key)}
                  >
                    <span
                      className="inline-block w-3 h-3 shrink-0 rounded-sm"
                      style={{ backgroundColor: colorFor(entry, index) }}
                      aria-hidden
                    />
                    <span
                      className="truncate text-base"
                      title={`${entry.label}: ${entry.count} (${entry.percent}%)`}
                    >
                      {entry.label} ({entry.percent}%){' '}
                      <span className="font-bold text-[#111]">{entry.count}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}

type VerticalCountryBarsProps = {
  rows: Array<{ country: string; byKind: Record<StatsUserKind, number>; total: number }>;
  /** If set, only render that kind's bar */
  onlyKind?: StatsUserKind | 'all' | 'except_groups';
  /** Fired when a country bar is clicked (single-type mode). null when cleared. */
  onCountrySelect?: (country: string | null) => void;
  /**
   * Fired when a bar/legend is clicked in “Each type of users” mode —
   * parent should set the Type of user dropdown to this kind.
   */
  onKindSelect?: (kind: StatsUserKind) => void;
  /**
   * Open the admin/all list for the users counted in this bar.
   * When set, bar clicks navigate to that list (legend still uses onKindSelect).
   */
  onOpenBarList?: (country: string, kind: StatsUserKind) => void;
};

type BarFocus = { country?: string; kind?: string };

const SIDE_TABLE_LABELS: Record<StatsUserKind, string> = {
  single: 'Athletes',
  coaches: 'Coaches',
  teams: 'Teams',
  clubs: 'Clubs',
  groups: 'Groups',
};

export function StatisticsVerticalCountryBars({
  rows,
  onlyKind = 'all',
  onCountrySelect,
  onKindSelect,
  onOpenBarList,
}: VerticalCountryBarsProps) {
  const kinds =
    onlyKind === 'all' || onlyKind === 'except_groups'
      ? onlyKind === 'except_groups'
        ? STATS_USER_KINDS.filter((k) => k !== 'groups')
        : STATS_USER_KINDS
      : STATS_USER_KINDS.filter((k) => k === onlyKind);

  const singleKindMode = kinds.length === 1;
  const colorFor = (k: StatsUserKind) => STATS_KIND_COLORS[k];
  const labelFor = (k: StatsUserKind) => SIDE_TABLE_LABELS[k];

  const [hovered, setHovered] = useState<BarFocus | null>(null);
  const [selected, setSelected] = useState<BarFocus | null>(null);
  const active = hovered ?? selected;

  const showTotals = !singleKindMode;
  const colCount = kinds.length + (showTotals ? 1 : 0);
  const headerH = 28;
  const axisBottomH = 28;
  /** Tall enough for thick bars while keeping chart rows = side-table rows. */
  const barTrackH = singleKindMode ? 32 : 14;
  const barGap = singleKindMode ? 0 : 4;
  const rowPadY = singleKindMode ? 8 : 10;
  const rowHeight =
    rowPadY * 2 +
    kinds.length * barTrackH +
    Math.max(0, kinds.length - 1) * barGap;
  const labelColW = 120;
  const sideColWidth = Math.max(
    showTotals ? 280 : 200,
    colCount * (showTotals ? 52 : 56) + 8,
  );

  const maxValue = useMemo(() => {
    let max = 1;
    for (const row of rows) {
      for (const k of kinds) {
        max = Math.max(max, row.byKind[k] ?? 0);
      }
    }
    return max;
  }, [rows, kinds]);

  const axisTicks = useMemo(() => {
    const nice = Math.ceil(maxValue);
    const step = Math.max(1, Math.ceil(nice / 4));
    const ticks: number[] = [];
    for (let v = 0; v <= nice; v += step) ticks.push(v);
    if (ticks[ticks.length - 1] !== nice) ticks.push(nice);
    return ticks;
  }, [maxValue]);

  const rowTotal = (row: { byKind: Record<StatsUserKind, number>; total: number }) =>
    kinds.reduce((s, k) => s + (row.byKind[k] ?? 0), 0) || row.total;

  const isCellActive = (country: string, kind: string) => {
    if (!active) return false;
    if (active.country && active.kind) return active.country === country && active.kind === kind;
    if (active.country) return active.country === country;
    if (active.kind) return active.kind === kind;
    return false;
  };

  const isCellDimmed = (country: string, kind: string) => {
    if (!active) return false;
    return !isCellActive(country, kind);
  };

  const handleBarClick = (country: string, kind: StatsUserKind) => {
    if (!country) return;
    if (!singleKindMode) {
      onKindSelect?.(kind);
      onOpenBarList?.(country, kind);
      return;
    }
    setSelected((prev) => {
      const cleared =
        prev?.country === country && prev?.kind === kind ? null : { country, kind };
      onCountrySelect?.(cleared?.country ?? null);
      if (cleared) onOpenBarList?.(country, kind);
      return cleared;
    });
  };

  if (rows.length === 0) {
    return (
      <div className="bg-white border border-[#cfcfcf] p-8 text-center text-[#888]">No data</div>
    );
  }

  return (
    <div className="bg-white border border-[#cfcfcf] p-3 overflow-x-auto">
      <div className="flex gap-3 items-start min-w-[720px]">
        <div className="flex-1 min-w-[420px]">
          <div
            className="flex flex-wrap items-center gap-x-3 gap-y-1 px-1 text-[11px] font-semibold border-b border-[#eee] box-border"
            style={{ height: headerH }}
          >
            {kinds.map((k) => (
              <button
                key={k}
                type="button"
                className="inline-flex items-center gap-1.5 hover:opacity-80"
                onMouseEnter={() => setHovered({ kind: k })}
                onMouseLeave={() => setHovered(null)}
                onClick={() => {
                  if (!singleKindMode) onKindSelect?.(k);
                  else
                    setSelected((prev) =>
                      prev?.kind === k && !prev.country ? null : { kind: k },
                    );
                }}
              >
                <span
                  className="inline-block h-2.5 w-2.5 rounded-sm"
                  style={{ backgroundColor: colorFor(k) }}
                  aria-hidden
                />
                <span style={{ color: colorFor(k) }}>{labelFor(k)}</span>
              </button>
            ))}
          </div>

          <div>
            {rows.map((row) => {
              const rowActive = active?.country === row.country;
              return (
                <div
                  key={row.country}
                  className={`flex items-stretch border-b border-[#eee] box-border ${
                    rowActive ? 'bg-[#e8f4f5]' : 'bg-white'
                  }`}
                  style={{ height: rowHeight }}
                  onMouseEnter={() => setHovered({ country: row.country })}
                  onMouseLeave={() => setHovered(null)}
                >
                  <div
                    className="shrink-0 flex items-center truncate text-[11px] text-[#333] px-1.5"
                    style={{ width: labelColW }}
                    title={row.country}
                  >
                    {row.country}
                  </div>
                  <div
                    className="relative flex-1 min-w-0 px-1 flex flex-col justify-center"
                    style={{ gap: barGap, paddingTop: rowPadY, paddingBottom: rowPadY }}
                  >
                    <div
                      className="pointer-events-none absolute left-1 right-1"
                      style={{ top: rowPadY, bottom: rowPadY }}
                    >
                      {axisTicks.map((t) => (
                        <div
                          key={`g-${row.country}-${t}`}
                          className="absolute top-0 bottom-0 w-px bg-[#ececec]"
                          style={{ left: `${(t / maxValue) * 100}%` }}
                        />
                      ))}
                    </div>
                    {kinds.map((k) => {
                      const value = row.byKind[k] ?? 0;
                      const pct = Math.max(0, Math.min(100, (value / maxValue) * 100));
                      const dimmed = isCellDimmed(row.country, k);
                      const cellActive = isCellActive(row.country, k);
                      return (
                        <button
                          key={k}
                          type="button"
                          className="relative z-[1] flex items-center gap-1.5 w-full text-left shrink-0"
                          style={{ height: barTrackH }}
                          title={`${row.country} · ${labelFor(k)}: ${value}`}
                          onMouseEnter={() => setHovered({ country: row.country, kind: k })}
                          onMouseLeave={() => setHovered({ country: row.country })}
                          onClick={() => handleBarClick(row.country, k)}
                        >
                          <div className="relative flex-1 h-full min-w-0 rounded-sm bg-[#ececec]">
                            <div
                              className="h-full rounded-sm transition-[width,opacity] duration-150"
                              style={{
                                width: `${pct}%`,
                                minWidth: value > 0 ? 4 : 0,
                                backgroundColor: colorFor(k),
                                opacity: dimmed ? 0.28 : 1,
                                boxShadow: cellActive
                                  ? `inset 0 0 0 2px ${colorFor(k)}`
                                  : undefined,
                              }}
                            />
                          </div>
                          {singleKindMode ? (
                            <span className="w-8 shrink-0 text-right text-xs font-bold tabular-nums text-[#222]">
                              {value}
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div
            className="flex border-t border-[#eee] text-[10px] text-[#666] tabular-nums"
            style={{ height: axisBottomH }}
          >
            <div className="shrink-0" style={{ width: labelColW }} />
            <div className="relative flex-1 min-w-0 px-1">
              {axisTicks.map((t) => (
                <span
                  key={`tick-${t}`}
                  className="absolute top-1.5 -translate-x-1/2"
                  style={{ left: `${(t / maxValue) * 100}%` }}
                >
                  {t}
                </span>
              ))}
            </div>
            {singleKindMode ? <div className="w-8 shrink-0" /> : null}
          </div>
        </div>

        <div
          className="shrink-0 border border-[#ddd] bg-[#fafafa] overflow-hidden"
          style={{ width: sideColWidth }}
        >
          <div
            className="grid border-b border-[#ddd] bg-[#f0f0f0] text-[10px] font-semibold text-[#333] uppercase tracking-wide box-border"
            style={{
              gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))`,
              height: headerH,
            }}
          >
            {kinds.map((k) => (
              <button
                key={k}
                type="button"
                className="flex items-center justify-center px-0.5 text-center border-l border-[#e0e0e0] first:border-l-0 hover:bg-[#e8e8e8]"
                style={{ color: colorFor(k) }}
                title={singleKindMode ? labelFor(k) : `Show only ${labelFor(k)}`}
                onClick={() => {
                  if (!singleKindMode) onKindSelect?.(k);
                }}
              >
                {labelFor(k)}
              </button>
            ))}
            {showTotals ? (
              <div
                className="flex items-center justify-center px-0.5 text-center border-l border-[#e0e0e0] font-bold"
                style={{ color: '#dc2626' }}
                title="Total users in country"
              >
                Totals
              </div>
            ) : null}
          </div>
          <div className="flex flex-col">
            {rows.map((row) => {
              const rowActive = active?.country === row.country;
              const total = rowTotal(row);
              return (
                <div
                  key={row.country}
                  className={`grid shrink-0 border-b border-[#eee] text-xs box-border ${
                    rowActive ? 'bg-[#e8f4f5]' : 'bg-white'
                  }`}
                  style={{
                    gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))`,
                    height: rowHeight,
                  }}
                  onMouseEnter={() => setHovered({ country: row.country })}
                  onMouseLeave={() => setHovered(null)}
                >
                  {kinds.map((k) => {
                    const value = row.byKind[k] ?? 0;
                    const cellActive = isCellActive(row.country, k);
                    return (
                      <button
                        key={k}
                        type="button"
                        className={`flex items-center justify-center border-l border-[#f0f0f0] first:border-l-0 font-semibold tabular-nums ${
                          cellActive ? 'ring-1 ring-inset ring-[#058592]' : ''
                        } hover:bg-[#f3f3f3]`}
                        style={{ color: value > 0 ? colorFor(k) : '#bbb' }}
                        title={`${row.country} · ${labelFor(k)}: ${value}`}
                        onClick={() => handleBarClick(row.country, k)}
                      >
                        {value}
                      </button>
                    );
                  })}
                  {showTotals ? (
                    <div
                      className="flex items-center justify-center border-l border-[#f0f0f0] font-bold tabular-nums"
                      style={{ color: '#dc2626' }}
                      title={`${row.country} · Total: ${total}`}
                    >
                      {total}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
          <div style={{ height: axisBottomH }} className="bg-[#fafafa] border-t border-[#eee]" />
        </div>
      </div>
    </div>
  );
}

type VersionsBarsProps = {
  rows: Array<{ version: StatsVersionBucket; count: number }>;
  onVersionSelect?: (version: StatsVersionBucket | null) => void;
  /** Open admin/all for users counted in this version bar. */
  onOpenBarList?: (version: StatsVersionBucket) => void;
  height?: number;
  className?: string;
  /** Override fill for all bars (e.g. selected user-type accent). */
  fillColor?: string;
};

function VersionAxisTick({
  x = 0,
  y = 0,
  payload,
  counts,
}: {
  x?: number | string;
  y?: number | string;
  payload?: { value?: string };
  counts: Record<string, number>;
}) {
  const version = String(payload?.value ?? '');
  const count = counts[version] ?? 0;
  const tx = typeof x === 'number' ? x : Number(x) || 0;
  const ty = typeof y === 'number' ? y : Number(y) || 0;
  return (
    <g transform={`translate(${tx},${ty})`}>
      <text dy={14} textAnchor="middle" fill="#333" fontSize={12}>
        {version}
      </text>
      <text dy={32} textAnchor="middle" fill="#941751" fontSize={14} fontWeight={800}>
        {count}
      </text>
    </g>
  );
}

export function StatisticsVersionsBars({
  rows,
  onVersionSelect,
  onOpenBarList,
  height = 360,
  className,
  fillColor,
}: VersionsBarsProps) {
  const chartHeight = Math.max(height, 200);
  const hostRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const update = () => {
      const next = Math.floor(el.getBoundingClientRect().width);
      if (next > 0) setWidth(next);
    };
    update();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null;
    ro?.observe(el);
    window.addEventListener('resize', update);
    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', update);
    };
  }, []);

  const data = rows.map((r) => ({
    version: r.version,
    count: r.count,
    fill: fillColor ?? STATS_VERSION_COLORS[r.version],
  }));

  const countsByVersion = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of rows) map[r.version] = r.count;
    return map;
  }, [rows]);

  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const activeKey = hoveredKey ?? selectedKey;

  const toggleSelect = (key: string) => {
    setSelectedKey((prev) => {
      const next = prev === key ? null : key;
      onVersionSelect?.(next as StatsVersionBucket | null);
      if (next) onOpenBarList?.(next as StatsVersionBucket);
      return next;
    });
  };

  if (data.every((d) => d.count === 0)) {
    return (
      <div
        className={`bg-white border border-[#cfcfcf] p-8 text-center text-[#888] ${className ?? ''}`}
      >
        No data
      </div>
    );
  }

  return (
    <div className={`bg-white border border-[#cfcfcf] p-3 ${className ?? ''}`}>
      <div ref={hostRef} className="w-full overflow-hidden" style={{ height: chartHeight }}>
        <BarChart
          width={Math.max(width, 280)}
          height={chartHeight}
          data={data}
          margin={{ top: 28, right: 24, left: 8, bottom: 40 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
          <XAxis
            dataKey="version"
            interval={0}
            tick={(props) => <VersionAxisTick {...props} counts={countsByVersion} />}
            height={44}
          />
          <YAxis allowDecimals={false} />
          <Tooltip
            formatter={(value) => [value, 'Users']}
            labelFormatter={(label) => String(label)}
          />
          <Bar
            dataKey="count"
            name="Users"
            maxBarSize={64}
            cursor="pointer"
            onMouseEnter={(entry) => {
              const version = String((entry as { version?: string }).version ?? '');
              if (version) setHoveredKey(version);
            }}
            onMouseLeave={() => setHoveredKey(null)}
            onClick={(entry) => {
              const version = String((entry as { version?: string }).version ?? '');
              if (version) toggleSelect(version);
            }}
          >
            <LabelList
              dataKey="count"
              position="top"
              fill="#222"
              fontSize={13}
              fontWeight={700}
            />
            {data.map((entry) => {
              const isActive = activeKey === entry.version;
              const dimmed = activeKey != null && !isActive;
              return (
                <Cell
                  key={entry.version}
                  fill={entry.fill}
                  fillOpacity={dimmed ? 0.28 : 1}
                  stroke={isActive ? entry.fill : 'transparent'}
                  strokeWidth={isActive ? 4 : 0}
                  strokeOpacity={isActive ? 1 : 0}
                  style={{ transition: 'fill-opacity 120ms ease' }}
                />
              );
            })}
          </Bar>
        </BarChart>
      </div>
    </div>
  );
}

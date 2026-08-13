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
  Legend,
  Sector,
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
        <h3 className="font-bold text-[#222] text-sm">{title}</h3>
        {subtitle ? <p className="text-xs text-[#666] mt-0.5">{subtitle}</p> : null}
      </div>
      {empty ? (
        <div className="flex-1 flex items-center justify-center text-sm text-[#888] min-h-[200px]">
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
          <ul className="mt-3 pt-3 border-t border-[#e8e8e8] grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-[#333]">
            {legendData.map((entry, index) => {
              const isActive = activeKey === entry.key;
              const dimmed = activeKey != null && !isActive;
              const isRest =
                entry.key === '__rest_of_world__' || entry.key === '__others__';
              return (
                <li key={entry.key}>
                  <button
                    type="button"
                    className={`w-full flex items-center gap-2 min-w-0 rounded px-1.5 py-1 text-left transition ${
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
                      className="inline-block w-2.5 h-2.5 shrink-0 rounded-sm"
                      style={{ backgroundColor: colorFor(entry, index) }}
                      aria-hidden
                    />
                    <span className="truncate" title={`${entry.label} (${entry.percent}%)`}>
                      {entry.label} ({entry.percent}%)
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

  const data = rows.map((row) => {
    const point: Record<string, string | number> = { country: row.country };
    for (const k of kinds) point[k] = row.byKind[k] ?? 0;
    return point;
  });

  const hostRef = useRef<HTMLDivElement>(null);
  const [chartWidth, setChartWidth] = useState(640);

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const update = () => {
      const next = Math.floor(el.getBoundingClientRect().width);
      if (next > 0) setChartWidth(next);
    };
    update();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null;
    ro?.observe(el);
    window.addEventListener('resize', update);
    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [kinds.length, data.length]);

  const [hovered, setHovered] = useState<BarFocus | null>(null);
  const [selected, setSelected] = useState<BarFocus | null>(null);
  const active = hovered ?? selected;

  const rowHeight = singleKindMode ? 44 : 52;
  const chartHeight = Math.max(360, data.length * rowHeight + 56);

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

  const selectCountry = (country: string, kind: StatsUserKind) => {
    setSelected((prev) => {
      const cleared =
        prev?.country === country && prev?.kind === kind ? null : { country, kind };
      onCountrySelect?.(cleared?.country ?? null);
      return cleared;
    });
  };

  const handleBarClick = (country: string, kind: StatsUserKind) => {
    if (!country) return;
    if (!singleKindMode) {
      // Filter dropdown to this user type; hide the other 4 bars.
      onKindSelect?.(kind);
      return;
    }
    selectCountry(country, kind);
  };

  const kindFromLegendLabel = (value: unknown): StatsUserKind | undefined => {
    const label = String(value ?? '');
    return kinds.find(
      (k) => labelFor(k) === label || STATS_KIND_LABELS[k] === label,
    );
  };

  if (data.length === 0) {
    return (
      <div className="bg-white border border-[#cfcfcf] p-8 text-center text-[#888]">No data</div>
    );
  }

  return (
    <div className="bg-white border border-[#cfcfcf] p-3 overflow-x-auto">
      <div className="flex gap-3 items-stretch min-w-[720px]">
        <div ref={hostRef} className="flex-1 min-w-[420px]" style={{ height: chartHeight }}>
          <BarChart
            width={Math.max(chartWidth, 320)}
            height={chartHeight}
            data={data}
            layout="vertical"
            margin={{ top: 28, right: singleKindMode ? 36 : 12, left: 8, bottom: 8 }}
            barCategoryGap="18%"
            barGap={3}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
            <XAxis type="number" allowDecimals={false} />
            <YAxis
              type="category"
              dataKey="country"
              width={120}
              tick={{ fontSize: 11 }}
              interval={0}
            />
            <Tooltip />
            <Legend
              verticalAlign="top"
              height={28}
              onMouseEnter={(item) => {
                const kind = kindFromLegendLabel(item.value);
                if (kind) setHovered({ kind });
              }}
              onMouseLeave={() => setHovered(null)}
              onClick={(item) => {
                const kind = kindFromLegendLabel(item.value);
                if (!kind) return;
                if (!singleKindMode) {
                  onKindSelect?.(kind);
                  return;
                }
                setSelected((prev) => (prev?.kind === kind && !prev.country ? null : { kind }));
              }}
            />
            {kinds.map((k) => (
              <Bar
                key={k}
                dataKey={k}
                name={labelFor(k)}
                fill={colorFor(k)}
                maxBarSize={singleKindMode ? 38 : 34}
                barSize={singleKindMode ? 32 : 28}
                cursor="pointer"
                label={
                  singleKindMode
                    ? {
                        position: 'right',
                        fill: '#333',
                        fontSize: 12,
                        fontWeight: 600,
                      }
                    : false
                }
                onMouseEnter={(entry) => {
                  const country = String((entry as { country?: string }).country ?? '');
                  if (country) setHovered({ country, kind: k });
                }}
                onMouseLeave={() => setHovered(null)}
                onClick={(entry) => {
                  const country = String((entry as { country?: string }).country ?? '');
                  handleBarClick(country, k);
                }}
              >
                {data.map((row) => {
                  const country = String(row.country);
                  const activeCell = isCellActive(country, k);
                  const dimmed = isCellDimmed(country, k);
                  const color = colorFor(k);
                  return (
                    <Cell
                      key={`${country}-${k}`}
                      fill={color}
                      fillOpacity={dimmed ? 0.28 : 1}
                      stroke={activeCell ? color : 'transparent'}
                      strokeWidth={activeCell ? 3 : 0}
                      strokeOpacity={activeCell ? 1 : 0}
                      style={{ transition: 'fill-opacity 120ms ease' }}
                    />
                  );
                })}
              </Bar>
            ))}
          </BarChart>
        </div>

        <div
          className="shrink-0 border border-[#ddd] bg-[#fafafa] overflow-hidden"
          style={{ width: Math.max(220, kinds.length * 56 + 8) }}
        >
          <div
            className="grid border-b border-[#ddd] bg-[#f0f0f0] text-[10px] font-semibold text-[#333] uppercase tracking-wide"
            style={{
              gridTemplateColumns: `repeat(${kinds.length}, minmax(0, 1fr))`,
              height: 28,
            }}
          >
            {kinds.map((k) => (
              <button
                key={k}
                type="button"
                className="flex items-center justify-center px-0.5 text-center border-l border-[#e0e0e0] first:border-l-0 hover:bg-[#e8e8e8]"
                style={{ color: colorFor(k) }}
                title={
                  singleKindMode
                    ? labelFor(k)
                    : `Show only ${labelFor(k)}`
                }
                onClick={() => {
                  if (!singleKindMode) onKindSelect?.(k);
                }}
              >
                {labelFor(k)}
              </button>
            ))}
          </div>
          <div style={{ height: chartHeight - 28 }} className="flex flex-col">
            {rows.map((row) => {
              const rowActive = active?.country === row.country;
              return (
                <div
                  key={row.country}
                  className={`grid flex-1 min-h-0 border-b border-[#eee] last:border-b-0 text-xs ${
                    rowActive ? 'bg-[#e8f4f5]' : 'bg-white'
                  }`}
                  style={{ gridTemplateColumns: `repeat(${kinds.length}, minmax(0, 1fr))` }}
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
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

type VersionsBarsProps = {
  rows: Array<{ version: StatsVersionBucket; count: number }>;
  onVersionSelect?: (version: StatsVersionBucket | null) => void;
  height?: number;
  className?: string;
  /** Override fill for all bars (e.g. selected user-type accent). */
  fillColor?: string;
};

export function StatisticsVersionsBars({
  rows,
  onVersionSelect,
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

  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const activeKey = hoveredKey ?? selectedKey;

  const toggleSelect = (key: string) => {
    setSelectedKey((prev) => {
      const next = prev === key ? null : key;
      if (onVersionSelect) {
        onVersionSelect(next as StatsVersionBucket | null);
      }
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
          margin={{ top: 12, right: 24, left: 8, bottom: 8 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
          <XAxis dataKey="version" />
          <YAxis allowDecimals={false} />
          <Tooltip />
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

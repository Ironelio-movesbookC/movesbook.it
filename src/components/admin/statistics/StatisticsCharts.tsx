'use client';

import { useMemo, useState } from 'react';
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
  height?: number;
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
  height = 280,
}: PieBlockProps) {
  const data = useMemo(() => slices.filter((s) => s.count > 0), [slices]);
  const empty = data.length === 0;

  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const activeKey = hoveredKey ?? selectedKey;
  const activeIndex = activeKey == null ? undefined : data.findIndex((s) => s.key === activeKey);

  const colorFor = (entry: StatsSlice, index: number) =>
    kindColors
      ? STATS_KIND_COLORS[entry.key as StatsUserKind] ?? COUNTRY_PALETTE[index % COUNTRY_PALETTE.length]
      : COUNTRY_PALETTE[index % COUNTRY_PALETTE.length];

  const toggleSelect = (key: string) => {
    setSelectedKey((prev) => (prev === key ? null : key));
  };

  return (
    <div className="bg-white border border-[#cfcfcf] p-3 h-full flex flex-col overflow-hidden">
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
                  data={data}
                  dataKey="count"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  outerRadius="68%"
                  innerRadius="36%"
                  paddingAngle={1}
                  activeIndex={activeIndex != null && activeIndex >= 0 ? activeIndex : undefined}
                  activeShape={ActivePieShape}
                  onMouseEnter={(_, index) => setHoveredKey(data[index]?.key ?? null)}
                  onMouseLeave={() => setHoveredKey(null)}
                  onClick={(_, index) => {
                    const key = data[index]?.key;
                    if (key) toggleSelect(key);
                  }}
                  style={{ cursor: 'pointer', outline: 'none' }}
                >
                  {data.map((entry, index) => {
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
            {data.map((entry, index) => {
              const isActive = activeKey === entry.key;
              const dimmed = activeKey != null && !isActive;
              return (
                <li key={entry.key}>
                  <button
                    type="button"
                    className={`w-full flex items-center gap-2 min-w-0 rounded px-1.5 py-1 text-left transition ${
                      isActive
                        ? 'bg-[#e8f4f5] ring-1 ring-[#058592]/
                        : 'hover:bg-[#f3f3f3]'
                    } ${dimmed ? 'opacity-45' : ''}`}
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
  onlyKind?: StatsUserKind | 'all';
};

type BarFocus = { country?: string; kind?: string };

export function StatisticsVerticalCountryBars({ rows, onlyKind = 'all' }: VerticalCountryBarsProps) {
  const kinds =
    onlyKind === 'all' ? STATS_USER_KINDS : STATS_USER_KINDS.filter((k) => k === onlyKind);

  const data = rows.map((row) => {
    const point: Record<string, string | number> = { country: row.country };
    for (const k of kinds) point[k] = row.byKind[k] ?? 0;
    return point;
  });

  const [hovered, setHovered] = useState<BarFocus | null>(null);
  const [selected, setSelected] = useState<BarFocus | null>(null);
  const active = hovered ?? selected;

  const chartHeight = Math.max(320, data.length * 36);

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

  const toggleSelect = (next: BarFocus) => {
    setSelected((prev) => {
      if (prev?.country === next.country && prev?.kind === next.kind) return null;
      return next;
    });
  };

  if (data.length === 0) {
    return (
      <div className="bg-white border border-[#cfcfcf] p-8 text-center text-[#888]">No data</div>
    );
  }

  return (
    <div className="bg-white border border-[#cfcfcf] p-3 overflow-x-auto">
      <div style={{ width: '100%', height: chartHeight, minWidth: 520 }}>
        <ResponsiveContainer>
          <BarChart data={data} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
            <XAxis type="number" allowDecimals={false} />
            <YAxis
              type="category"
              dataKey="country"
              width={120}
              tick={{ fontSize: 11 }}
            />
            <Tooltip />
            <Legend
              onMouseEnter={(item) => {
                const kind = kinds.find((k) => STATS_KIND_LABELS[k] === item.value);
                if (kind) setHovered({ kind });
              }}
              onMouseLeave={() => setHovered(null)}
              onClick={(item) => {
                const kind = kinds.find((k) => STATS_KIND_LABELS[k] === item.value);
                if (kind) toggleSelect({ kind });
              }}
            />
            {kinds.map((k) => (
              <Bar
                key={k}
                dataKey={k}
                name={STATS_KIND_LABELS[k]}
                fill={STATS_KIND_COLORS[k]}
                maxBarSize={18}
                cursor="pointer"
                onMouseEnter={(entry) => {
                  const country = String((entry as { country?: string }).country ?? '');
                  if (country) setHovered({ country, kind: k });
                }}
                onMouseLeave={() => setHovered(null)}
                onClick={(entry) => {
                  const country = String((entry as { country?: string }).country ?? '');
                  if (country) toggleSelect({ country, kind: k });
                }}
              >
                {data.map((row) => {
                  const country = String(row.country);
                  const activeCell = isCellActive(country, k);
                  const dimmed = isCellDimmed(country, k);
                  const color = STATS_KIND_COLORS[k];
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
        </ResponsiveContainer>
      </div>
    </div>
  );
}

type VersionsBarsProps = {
  rows: Array<{ version: StatsVersionBucket; count: number }>;
};

export function StatisticsVersionsBars({ rows }: VersionsBarsProps) {
  const data = rows.map((r) => ({
    version: r.version,
    count: r.count,
    fill: STATS_VERSION_COLORS[r.version],
  }));

  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const activeKey = hoveredKey ?? selectedKey;

  const toggleSelect = (key: string) => {
    setSelectedKey((prev) => (prev === key ? null : key));
  };

  if (data.every((d) => d.count === 0)) {
    return (
      <div className="bg-white border border-[#cfcfcf] p-8 text-center text-[#888]">No data</div>
    );
  }

  return (
    <div className="bg-white border border-[#cfcfcf] p-3">
      <div style={{ width: '100%', height: 360 }}>
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 12, right: 24, left: 8, bottom: 8 }}>
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
        </ResponsiveContainer>
      </div>
    </div>
  );
}

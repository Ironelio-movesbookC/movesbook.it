'use client';

import type { ReactNode } from 'react';
import {
  STATS_KIND_LABELS,
  STATS_TYPE_KIND_FILTER_LABELS,
  STATS_USER_KINDS,
  type StatsTypeKindFilter,
  type StatsUserKind,
} from '@/lib/admin/statisticsKinds';
import { formatCount, formatEuro } from '@/components/admin/statistics/useAdminStatistics';

type StatisticsPageShellProps = {
  title: string;
  description?: string;
  totalUsers: number;
  incomeEuro: number;
  loading?: boolean;
  error?: string | null;
  filters?: ReactNode;
  children: ReactNode;
};

export default function StatisticsPageShell({
  title,
  description,
  totalUsers,
  incomeEuro,
  loading,
  error,
  filters,
  children,
}: StatisticsPageShellProps) {
  return (
    <div className="h-full min-h-0 overflow-y-auto bg-[#ececec] p-3 md:p-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#058592]">
            General graphs
          </p>
          <h1 className="mt-0.5 text-xl font-bold text-[#222]">{title}</h1>
          {description ? (
            <p className="mt-0.5 max-w-3xl text-sm text-[#555]">{description}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 gap-2">
          <div className="min-w-[7.5rem] border border-[#cfcfcf] bg-white px-3 py-2">
            <div className="text-[10px] uppercase tracking-wide text-[#666]">Users</div>
            <div className="mt-0.5 text-xl font-bold text-[#058592]">
              {loading ? '…' : formatCount(totalUsers)}
            </div>
          </div>
          <div className="min-w-[7.5rem] border border-[#cfcfcf] bg-white px-3 py-2">
            <div className="text-[10px] uppercase tracking-wide text-[#666]">Income (€)</div>
            <div className="mt-0.5 text-xl font-bold text-[#941751]">
              {loading ? '…' : formatEuro(incomeEuro)}
            </div>
          </div>
        </div>
      </div>

      {filters ? (
        <div className="mb-3 flex flex-wrap items-end gap-3 border border-[#cfcfcf] bg-white p-2.5">
          {filters}
        </div>
      ) : null}

      {error ? (
        <div className="mb-3 border border-[#e0a0a0] bg-[#fde8e8] px-4 py-2.5 text-sm text-[#8a1f1f]">
          {error}
        </div>
      ) : null}

      {loading && !error ? (
        <div className="border border-[#cfcfcf] bg-white p-8 text-center text-[#666]">
          Loading statistics…
        </div>
      ) : (
        children
      )}
    </div>
  );
}

type SelectProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
};

export function StatisticsSelect({ id, label, value, onChange, options }: SelectProps) {
  return (
    <label htmlFor={id} className="flex flex-col gap-1 text-sm min-w-[180px]">
      <span className="font-semibold text-[#333]">{label}</span>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="border border-[#bbb] bg-white px-2 py-1.5 text-sm"
      >
        {options.map((opt) => (
          <option key={opt.value || 'all'} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function countryFilterOptions(countries: string[]) {
  return [
    { value: '', label: 'All countries (world)' },
    ...countries.map((c) => ({ value: c, label: c })),
  ];
}

export function userTypeFilterOptions(includeAll = true) {
  const kinds = STATS_USER_KINDS.map((k) => ({
    value: k,
    label: STATS_KIND_LABELS[k],
  }));
  return includeAll ? [{ value: 'all', label: 'All types' }, ...kinds] : kinds;
}

/** Dropdown for users-by-country bars (Each type = 5 colored bars). */
export function usersByCountryFilterOptions() {
  return [
    { value: 'all', label: 'Each type of users' },
    ...STATS_USER_KINDS.map((k) => ({
      value: k,
      label:
        k === 'single'
          ? 'Athletes'
          : k === 'clubs'
            ? 'Clubs'
            : STATS_KIND_LABELS[k],
    })),
  ];
}

/** Options for type-by-country pie (includes ALL Users / except Groups). */
export function typeKindFilterOptions() {
  const extras: StatsTypeKindFilter[] = ['all', 'except_groups'];
  return [
    ...extras.map((k) => ({ value: k, label: STATS_TYPE_KIND_FILTER_LABELS[k] })),
    ...STATS_USER_KINDS.map((k) => ({
      value: k,
      label: STATS_KIND_LABELS[k],
    })),
  ];
}

export function kindLabel(kind: StatsUserKind): string {
  return STATS_KIND_LABELS[kind];
}

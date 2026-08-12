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
    <div className="min-h-[70vh] bg-[#ececec] p-4 md:p-6">
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#058592]">
          Statistics Super Admin
        </p>
        <h1 className="text-2xl font-bold text-[#222] mt-1">{title}</h1>
        {description ? <p className="text-sm text-[#555] mt-1 max-w-3xl">{description}</p> : null}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <div className="bg-white border border-[#cfcfcf] px-4 py-3">
          <div className="text-xs uppercase tracking-wide text-[#666]">Users</div>
          <div className="text-2xl font-bold text-[#058592] mt-1">
            {loading ? '…' : formatCount(totalUsers)}
          </div>
        </div>
        <div className="bg-white border border-[#cfcfcf] px-4 py-3">
          <div className="text-xs uppercase tracking-wide text-[#666]">Income (€)</div>
          <div className="text-2xl font-bold text-[#941751] mt-1">
            {loading ? '…' : formatEuro(incomeEuro)}
          </div>
        </div>
      </div>

      {filters ? (
        <div className="bg-white border border-[#cfcfcf] p-3 mb-4 flex flex-wrap gap-3 items-end">
          {filters}
        </div>
      ) : null}

      {error ? (
        <div className="bg-[#fde8e8] border border-[#e0a0a0] text-[#8a1f1f] px-4 py-3 mb-4 text-sm">
          {error}
        </div>
      ) : null}

      {loading && !error ? (
        <div className="bg-white border border-[#cfcfcf] p-8 text-center text-[#666]">
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

'use client';

import { Suspense } from 'react';
import AdminRegisteredUsersList, {
  type StatsBarScope,
} from '@/components/admin/AdminRegisteredUsersList';
import { STATS_KIND_LABELS, type StatsUserKind } from '@/lib/admin/statisticsKinds';

type Props = {
  scope: StatsBarScope;
  onClear: () => void;
};

function scopeTitle(scope: StatsBarScope): string {
  const parts = [
    scope.country?.trim() || null,
    scope.kind && scope.kind !== 'all' && scope.kind !== 'except_groups'
      ? STATS_KIND_LABELS[scope.kind as StatsUserKind]
      : scope.kind === 'except_groups'
        ? 'All except Groups'
        : null,
    scope.version ? `Version ${scope.version}` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(' · ') : 'Selected bar';
}

/** All Users grid embedded under a statistics chart for the selected bar. */
export default function StatisticsBarUsersSection({ scope, onClear }: Props) {
  return (
    <div className="mt-4 scroll-mt-4 border border-[#058592] bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#058592] bg-[#058592] px-3 py-2 text-white">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-white/80">
            Related users list
          </p>
          <h2 className="text-sm font-bold">{scopeTitle(scope)}</h2>
          <p className="text-xs text-white/90">
            Same grid and actions as All Users — only the users counted in this bar
          </p>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="shrink-0 border border-white/40 bg-white/10 px-3 py-1.5 text-sm font-semibold hover:bg-white/20"
        >
          Close list
        </button>
      </div>
      <Suspense fallback={<div className="p-8 text-center text-[#666]">Loading users…</div>}>
        <AdminRegisteredUsersList
          segment="all"
          roleTitle="All Users"
          historicalSubtitle={`Users from statistics bar · ${scopeTitle(scope)}`}
          statsBarScope={scope}
          onClearStatsBar={onClear}
        />
      </Suspense>
    </div>
  );
}

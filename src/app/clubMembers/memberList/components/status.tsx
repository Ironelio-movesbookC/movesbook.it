'use client';

import { Info } from 'lucide-react';

export type MemberArchiveStatsProps = {
  currentMembers?: number;
  membersPurchased?: number;
  membersAdded?: number;
  availableSlots?: number;
  subscriptionExpirationLabel?: string;
  onPurchaseMembers?: () => void;
  onStatusAccounts?: () => void;
};

function StatCard({
  title,
  value,
  className,
}: {
  title: string;
  value: number | string;
  className: string;
}) {
  return (
    <div
      className={`min-w-[7.5rem] flex-1 rounded-md px-4 py-3 text-white shadow-sm ${className}`}
    >
      <p className="text-xs font-medium leading-tight opacity-95">{title}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums leading-none">{value}</p>
    </div>
  );
}

export default function MemberStats({
  currentMembers = 0,
  membersPurchased = 10,
  membersAdded = 0,
  availableSlots,
  subscriptionExpirationLabel = '',
  onPurchaseMembers,
  onStatusAccounts,
}: MemberArchiveStatsProps) {
  const slots =
    availableSlots != null
      ? availableSlots
      : Math.max(0, membersPurchased - currentMembers);

  return (
    <div className="mb-4 px-1 text-gray-900">
      <h1 className="mb-3 text-lg font-bold tracking-tight text-gray-900">
        Archive of Members of the Club
      </h1>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 flex-1 flex-wrap gap-2.5">
          <StatCard
            title="Current Members"
            value={currentMembers}
            className="bg-gradient-to-br from-emerald-500 to-emerald-600"
          />
          <StatCard
            title="Members purchased"
            value={membersPurchased}
            className="bg-gradient-to-br from-sky-500 to-blue-600"
          />
          <StatCard
            title="Members added"
            value={membersAdded}
            className="bg-gradient-to-br from-violet-600 to-purple-700"
          />
          <StatCard
            title="Available Slots"
            value={slots}
            className="bg-gradient-to-br from-fuchsia-400 to-pink-500"
          />
        </div>

        <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
          <button
            type="button"
            onClick={onPurchaseMembers}
            className="rounded bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700"
          >
            Purchase members
          </button>
          <button
            type="button"
            onClick={onStatusAccounts}
            className="rounded bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700"
          >
            Status accounts
          </button>
          <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-red-600">
            <span>
              Expiration date of the Subscription:{' '}
              {subscriptionExpirationLabel || '—'}
            </span>
            <span
              title="Club subscription expiration for member seats on Movesbook."
              className="inline-flex text-red-500"
            >
              <Info className="h-4 w-4" aria-hidden />
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

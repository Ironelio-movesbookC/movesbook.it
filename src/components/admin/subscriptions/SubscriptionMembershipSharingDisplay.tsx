'use client';

import { Share2 } from 'lucide-react';
import type {
  SubscriptionEditSettings,
  SubscriptionTier,
  SubscriptionUserType,
} from '@/types/adminSubscriptionSettings';

const TIERS: { key: SubscriptionTier; label: string }[] = [
  { key: 'trial', label: 'Trial' },
  { key: 'base', label: 'Base' },
  { key: 'premium', label: 'Premium' },
  { key: 'pro', label: 'Pro' },
];

/** Days value shown in availability / sharing panels (renewal duration, else first). */
export function getSubscriptionSharingDaysValue(days1: number, days2: number): number {
  return days2 || days1;
}

export type SubscriptionSharingDisplayMode = 'registration' | 'admin-preview';

type SubscriptionMembershipSharingDisplayProps = {
  settings: SubscriptionEditSettings;
  /** Subscription user type (athlete, coach, team, group, club). */
  userType: SubscriptionUserType;
  daysValue: number;
  mode?: SubscriptionSharingDisplayMode;
};

function roleLabel(userType: SubscriptionUserType): string {
  if (userType === 'athlete') return 'Athlete';
  if (userType === 'coach') return 'Coach';
  if (userType === 'team') return 'Team';
  if (userType === 'group') return 'Group';
  return 'Club';
}

function showsAthletesRelation(userType: SubscriptionUserType): boolean {
  return userType === 'coach' || userType === 'club';
}

export default function SubscriptionMembershipSharingDisplay({
  settings,
  userType,
  daysValue,
  mode = 'registration',
}: SubscriptionMembershipSharingDisplayProps) {
  const role = roleLabel(userType);
  const athletesRelation = showsAthletesRelation(userType);
  const relationLabel = athletesRelation ? 'Athletes' : 'Coaches';
  const relationLimit = athletesRelation ? settings.athletesLimit : settings.coachesLimit;
  const relationTiers = athletesRelation ? settings.athleteTiers : settings.coachTiers;

  const membershipRows = [
    { label: 'Teams', setting: settings.teams, shareLabel: 'Sharing with teams' },
    { label: 'Groups', setting: settings.groups, shareLabel: 'Sharing with groups' },
    { label: 'Clubs', setting: settings.clubs, shareLabel: 'Sharing with clubs' },
  ] as const;

  const wrapperClass =
    mode === 'admin-preview'
      ? 'rounded border border-gray-300 bg-[#fafafa] p-3 space-y-4'
      : 'space-y-6';

  return (
    <div className={wrapperClass}>
      {mode === 'admin-preview' ? (
        <p className="text-xs text-gray-600">
          Preview of sharing options shown during registration (Package → Availability shares tab)
        </p>
      ) : null}

      <div>
        <div className="mb-2 text-sm font-medium text-gray-800">Days duration</div>
        <div className="flex flex-wrap items-center gap-2">
          {TIERS.map((tier) => (
            <span
              key={tier.key}
              className="inline-flex h-10 w-14 items-center justify-center border border-gray-300 bg-[#e8e8e8] text-sm"
              title={tier.label}
            >
              {daysValue}!
            </span>
          ))}
          <span className="ml-auto border border-gray-300 px-2 py-1 text-xs text-gray-600">
            -1=Unlimited
          </span>
        </div>
      </div>

      <div>
        <div className="mb-2 text-sm font-medium text-gray-800">{relationLabel}</div>
        <div className="flex flex-wrap items-center gap-2">
          {TIERS.map((tier) => (
            <span
              key={tier.key}
              className="inline-flex h-10 w-14 items-center justify-center border border-gray-300 bg-[#e8e8e8] text-sm"
              title={tier.label}
            >
              {relationTiers[tier.key] ? relationLimit : ''}
            </span>
          ))}
        </div>
      </div>

      <div className="border border-gray-300 p-4">
        <p className="mb-3 text-sm text-gray-700">{role} can be member of....</p>
        {membershipRows.map(({ label, setting, shareLabel }) => (
          <div
            key={label}
            className="grid grid-cols-[80px_60px_32px_32px_1fr] items-center gap-2 py-1"
          >
            <span className="text-sm font-medium text-gray-700">{label}</span>
            <span className="border border-gray-300 bg-[#fffacd] px-2 py-1 text-sm text-center">
              {setting.limit}
            </span>
            <div className="flex justify-center">
              <Share2 className="h-5 w-5 text-[#5cb85c]" aria-hidden />
            </div>
            <input
              type="checkbox"
              readOnly
              checked={setting.sharingEnabled}
              className="pointer-events-none justify-self-center"
              aria-label={shareLabel}
            />
            <span className="text-sm text-gray-600">{shareLabel}</span>
          </div>
        ))}
        <p className="mt-2 text-xs text-gray-500">-1=Unlimited</p>
      </div>
    </div>
  );
}

/** Compact summary for inline registration (version selection). */
export function SubscriptionSharingSummary({
  settings,
  userType,
}: {
  settings: SubscriptionEditSettings;
  userType: SubscriptionUserType;
}) {
  const role = roleLabel(userType);
  const rows = [
    { label: 'Teams', setting: settings.teams },
    { label: 'Groups', setting: settings.groups },
    { label: 'Clubs', setting: settings.clubs },
  ] as const;

  const enabled = rows.filter((r) => r.setting.sharingEnabled);
  if (enabled.length === 0) return null;

  return (
    <div className="rounded-md border border-[#7a1f2e]/20 bg-white/90 px-3 py-2.5">
      <div className="text-[10px] font-bold uppercase tracking-wide text-[#7a1f2e]">
        Sharing options — {role}
      </div>
      <ul className="mt-1.5 space-y-1 text-sm text-gray-800">
        {enabled.map(({ label, setting }) => (
          <li key={label} className="flex items-center gap-2">
            <Share2 className="h-4 w-4 shrink-0 text-[#5cb85c]" aria-hidden />
            <span>
              {label}:{' '}
              <span className="font-semibold">
                {setting.limit === -1 ? 'Unlimited' : setting.limit}
              </span>
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-1 text-[10px] text-gray-500">
        Full details in Package → Availability shares
      </p>
    </div>
  );
}

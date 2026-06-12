'use client';

import { Share2 } from 'lucide-react';
import type {
  SubscriptionEditSettings,
  SubscriptionMembershipSetting,
  SubscriptionTier,
  SubscriptionUserType,
} from '@/types/adminSubscriptionSettings';

const TIERS: { key: SubscriptionTier; label: string }[] = [
  { key: 'trial', label: 'Trial' },
  { key: 'base', label: 'Base' },
  { key: 'premium', label: 'Premium' },
  { key: 'pro', label: 'Pro' },
];

type SubscriptionEditSettingsFormProps = {
  settings: SubscriptionEditSettings;
  userType: SubscriptionUserType;
  onChange: (settings: SubscriptionEditSettings) => void;
  variant: 'athlete' | 'coach';
};

function MembershipRow({
  label,
  setting,
  sharingLabel,
  onChange,
}: {
  label: string;
  setting: SubscriptionMembershipSetting;
  sharingLabel: string;
  onChange: (patch: Partial<SubscriptionMembershipSetting>) => void;
}) {
  return (
    <div className="grid grid-cols-[80px_60px_32px_32px_1fr] items-center gap-2 py-1">
      <span className="text-sm text-gray-700 font-medium">{label}</span>
      <input
        type="text"
        value={setting.limit}
        onChange={(e) => onChange({ limit: Number(e.target.value) || 0 })}
        className="border border-gray-300 bg-[#fffacd] px-2 py-1 text-sm w-full"
      />
      <div className="flex justify-center">
        <Share2 className="w-5 h-5 text-[#5cb85c]" />
      </div>
      <input
        type="checkbox"
        checked={setting.sharingEnabled}
        onChange={(e) => onChange({ sharingEnabled: e.target.checked })}
        className="justify-self-center"
      />
      <span className="text-sm text-gray-600">{sharingLabel}</span>
    </div>
  );
}

export default function SubscriptionEditSettingsForm({
  settings,
  userType,
  onChange,
  variant,
}: SubscriptionEditSettingsFormProps) {
  const update = (patch: Partial<SubscriptionEditSettings>) => {
    onChange({ ...settings, ...patch });
  };

  const updateMembership = (
    key: 'teams' | 'groups' | 'clubs',
    patch: Partial<SubscriptionMembershipSetting>,
  ) => {
    onChange({ ...settings, [key]: { ...settings[key], ...patch } });
  };

  const roleLabel =
    variant === 'athlete'
      ? 'Athlete'
      : userType === 'coach'
        ? 'Coach'
        : getRoleCapitalized(userType);

  return (
    <div className="border border-gray-300 mb-4">
      <div className="bg-[#e6e6e6] px-4 py-2 font-bold text-sm text-gray-800 border-b border-gray-300">
        Edit Settings
      </div>
      <div className="p-4 bg-white space-y-6">
        {variant === 'athlete' ? (
          <div>
            <p className="text-sm text-gray-700 mb-3">
              Athlete can have one or more coaches and can be invited to be one of this athlete....
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <span className="text-sm text-gray-700">Coaches</span>
              <input
                type="text"
                value={settings.coachesLimit}
                onChange={(e) => update({ coachesLimit: Number(e.target.value) || 0 })}
                className="border border-gray-300 bg-[#fffacd] px-2 py-1 text-sm w-16"
              />
              <div className="flex items-center gap-4 ml-4">
                {TIERS.map((tier) => (
                  <label key={tier.key} className="flex items-center gap-1 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={settings.coachTiers[tier.key]}
                      onChange={(e) =>
                        update({
                          coachTiers: { ...settings.coachTiers, [tier.key]: e.target.checked },
                        })
                      }
                    />
                    {tier.label}
                  </label>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-sm text-gray-700 mb-3">
              Coach can have one or more athletes and can invite athletes to be trained....
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <span className="text-sm text-gray-700">Athletes</span>
              <input
                type="text"
                value={settings.athletesLimit}
                onChange={(e) => update({ athletesLimit: Number(e.target.value) || 0 })}
                className="border border-gray-300 bg-[#fffacd] px-2 py-1 text-sm w-16"
              />
              <div className="flex items-center gap-4 ml-4">
                {TIERS.map((tier) => (
                  <label key={tier.key} className="flex items-center gap-1 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={settings.athleteTiers[tier.key]}
                      onChange={(e) =>
                        update({
                          athleteTiers: { ...settings.athleteTiers, [tier.key]: e.target.checked },
                        })
                      }
                    />
                    {tier.label}
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        <div>
          <p className="text-sm text-gray-700 mb-3">{roleLabel} can be member of....</p>
          <MembershipRow
            label="Teams"
            setting={settings.teams}
            sharingLabel="Sharing with teams"
            onChange={(patch) => updateMembership('teams', patch)}
          />
          <MembershipRow
            label="Groups"
            setting={settings.groups}
            sharingLabel="Sharing with groups"
            onChange={(patch) => updateMembership('groups', patch)}
          />
          <MembershipRow
            label="Clubs"
            setting={settings.clubs}
            sharingLabel="Sharing with clubs"
            onChange={(patch) => updateMembership('clubs', patch)}
          />
          <p className="text-xs text-gray-500 mt-2">-1=Unlimited</p>
        </div>

        <div>
          <p className="text-sm font-medium text-gray-800 mb-3">Notify at expiration</p>
          <div className="flex flex-wrap items-center gap-2 text-sm text-gray-700 mb-3">
            <span>Alert</span>
            <input
              type="text"
              value={settings.alertDaysBefore}
              onChange={(e) => update({ alertDaysBefore: Number(e.target.value) || 0 })}
              className="border border-gray-300 bg-[#fffacd] px-2 py-1 w-12 text-center"
            />
            <span>days before and</span>
            <input
              type="text"
              value={settings.alertDaysAfter}
              onChange={(e) => update({ alertDaysAfter: Number(e.target.value) || 0 })}
              className="border border-gray-300 bg-[#fffacd] px-2 py-1 w-12 text-center"
            />
            <span>days after the expiration</span>
            <label className="flex items-center gap-2 ml-4">
              <input
                type="checkbox"
                checked={settings.alertEveryDay}
                onChange={(e) => update({ alertEveryDay: e.target.checked })}
              />
              Alert every day and not only once
            </label>
          </div>
          <div className="space-y-2">
            {(
              [
                ['notifyMail', 'Mail'],
                ['notifyNetwork', 'On your network page'],
                ['notifyCellular', 'Cellular'],
                ['notifyFacebook', 'Post on Facebook'],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="flex items-center gap-3 text-sm text-gray-700">
                <Share2 className="w-5 h-5 text-[#5cb85c]" />
                <input
                  type="checkbox"
                  checked={settings[key]}
                  onChange={(e) => update({ [key]: e.target.checked })}
                />
                {label}
              </label>
            ))}
          </div>
        </div>

        {variant === 'coach' ? (
          <>
            <div>
              <p className="text-sm font-medium text-gray-800 mb-3">
                Set Data End subscription about athletes when they accept invite
              </p>
              <div className="space-y-2 text-sm text-gray-700">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="inviteEndMode"
                    checked={settings.inviteEndMode === 'own_subscription'}
                    onChange={() => update({ inviteEndMode: 'own_subscription' })}
                  />
                  Untile data end of their own subscription
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="inviteEndMode"
                    checked={settings.inviteEndMode === 'days_after_accept'}
                    onChange={() => update({ inviteEndMode: 'days_after_accept' })}
                  />
                  Untile
                  <input
                    type="text"
                    value={settings.inviteEndDays}
                    onChange={(e) => update({ inviteEndDays: Number(e.target.value) || 0 })}
                    className="border border-gray-300 bg-[#fffacd] px-2 py-1 w-12"
                  />
                  in days after acceptance of the invite
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="inviteEndMode"
                    checked={settings.inviteEndMode === 'coach_subscription'}
                    onChange={() => update({ inviteEndMode: 'coach_subscription' })}
                  />
                  Untile data end subscription of the Coach
                </label>
              </div>
            </div>

            <div>
              <p className="text-sm text-gray-700 mb-3">
                Users invited who accept the invite will be assigned this Single User version..
              </p>
              <div className="space-y-2 text-sm text-gray-700">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="invitedUserVersion"
                    checked={settings.invitedUserVersion === 'same'}
                    onChange={() => update({ invitedUserVersion: 'same' })}
                  />
                  Remain in the same version they have
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="invitedUserVersion"
                    checked={settings.invitedUserVersion === 'next'}
                    onChange={() => update({ invitedUserVersion: 'next' })}
                  />
                  Will be assigned the next version that they have as current
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="invitedUserVersion"
                    checked={settings.invitedUserVersion === 'professional'}
                    onChange={() => update({ invitedUserVersion: 'professional' })}
                  />
                  Will be assigned the Professional version
                </label>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

function getRoleCapitalized(userType: SubscriptionUserType): string {
  if (userType === 'athlete') return 'Athlete';
  if (userType === 'coach') return 'Coach';
  if (userType === 'team') return 'Team';
  if (userType === 'group') return 'Group';
  return 'Club';
}

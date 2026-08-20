'use client';

import type { ReactNode } from 'react';
import {
  CLUB_ADMIN_PUBLIC_LINK_FIELDS,
  CLUB_ADMIN_SOCIAL_PLATFORMS,
  type ClubAdminInfo,
  type ClubAdminPublicLink,
} from '@/lib/club/clubAdminInfo';

const INPUT_CLASS =
  'w-full min-w-0 px-3 py-1.5 border border-gray-400 rounded bg-white text-gray-900 text-sm focus:outline-none focus:ring-1 focus:ring-gray-500';

function FormRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[11rem_1fr] border-b border-gray-200 last:border-b-0">
      <div className="bg-gray-50/80 px-4 py-3 sm:flex sm:items-start sm:justify-end">
        <span className="text-sm font-bold text-gray-800 sm:text-right">{label}</span>
      </div>
      <div className="px-4 py-3 min-w-0">{children}</div>
    </div>
  );
}

function PublicLinkField({
  value,
  onChange,
  disabled,
  showVisibilityCheckbox,
}: {
  value: ClubAdminPublicLink;
  onChange: (next: ClubAdminPublicLink) => void;
  disabled?: boolean;
  showVisibilityCheckbox: boolean;
}) {
  return (
    <div className="space-y-2">
      <input
        type="text"
        value={value.url}
        onChange={(e) => onChange({ ...value, url: e.target.value })}
        disabled={disabled}
        className={INPUT_CLASS}
      />
      {showVisibilityCheckbox ? (
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={value.showInClubAdminInfo}
            onChange={(e) => onChange({ ...value, showInClubAdminInfo: e.target.checked })}
            disabled={disabled}
            className="rounded border-gray-400"
          />
          Show in Club admin info
        </label>
      ) : null}
    </div>
  );
}

type ClubAdminInfoFieldsProps = {
  value: ClubAdminInfo;
  onChange: (next: ClubAdminInfo) => void;
  disabled?: boolean;
  title?: string;
  /** When false, hides “Show in Club admin info” checkboxes (club staff form). */
  showVisibilityCheckboxes?: boolean;
};

export default function ClubAdminInfoFields({
  value,
  onChange,
  disabled,
  title = 'Admin Info',
  showVisibilityCheckboxes = true,
}: ClubAdminInfoFieldsProps) {
  const updateSocialSite = (index: 0 | 1, patch: Partial<ClubAdminInfo['socialSites'][0]>) => {
    const socialSites = [...value.socialSites] as ClubAdminInfo['socialSites'];
    socialSites[index] = { ...socialSites[index], ...patch };
    onChange({ ...value, socialSites });
  };

  const updateLink = (
    key: (typeof CLUB_ADMIN_PUBLIC_LINK_FIELDS)[number]['key'],
    patch: Partial<ClubAdminPublicLink>,
  ) => {
    onChange({
      ...value,
      [key]: { ...value[key], ...patch },
    });
  };

  const phoneValue = [value.phonePrefix.trim(), value.phoneNumber.trim()].filter(Boolean).join(' ');

  return (
    <div className="overflow-hidden rounded-lg border border-gray-300 shadow-sm">
      <div className="border-b border-gray-300 bg-gray-200 px-4 py-2.5">
        <h2 className="text-sm font-bold text-gray-800">{title}</h2>
      </div>
      <div className="bg-white">
        <FormRow label="Alternate Email">
          <input
            type="email"
            value={value.alternateEmail}
            onChange={(e) => onChange({ ...value, alternateEmail: e.target.value })}
            disabled={disabled}
            className={INPUT_CLASS}
          />
        </FormRow>

        <FormRow label="Phone">
          <input
            type="text"
            value={phoneValue}
            onChange={(e) =>
              onChange({
                ...value,
                phonePrefix: '',
                phoneNumber: e.target.value,
              })
            }
            disabled={disabled}
            placeholder="+39 …"
            className={`${INPUT_CLASS} max-w-md`}
          />
        </FormRow>

        {value.socialSites.map((site, index) => (
          <FormRow key={index} label="Social Site">
            <div className="flex flex-col gap-2 sm:flex-row">
              <select
                value={site.platform}
                onChange={(e) => updateSocialSite(index as 0 | 1, { platform: e.target.value })}
                disabled={disabled}
                className={`${INPUT_CLASS} shrink-0 sm:w-36`}
              >
                {CLUB_ADMIN_SOCIAL_PLATFORMS.map((platform) => (
                  <option key={platform} value={platform}>
                    {platform}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={site.url}
                onChange={(e) => updateSocialSite(index as 0 | 1, { url: e.target.value })}
                disabled={disabled}
                className={INPUT_CLASS}
              />
            </div>
          </FormRow>
        ))}

        {CLUB_ADMIN_PUBLIC_LINK_FIELDS.map(({ key, label }) => (
          <FormRow key={key} label={label}>
            <PublicLinkField
              value={value[key]}
              onChange={(next) => updateLink(key, next)}
              disabled={disabled}
              showVisibilityCheckbox={showVisibilityCheckboxes}
            />
          </FormRow>
        ))}

        <FormRow label="About Me">
          <textarea
            value={value.aboutMe}
            onChange={(e) => onChange({ ...value, aboutMe: e.target.value })}
            disabled={disabled}
            rows={5}
            className={`${INPUT_CLASS} min-h-[120px] resize-y`}
          />
        </FormRow>
      </div>
    </div>
  );
}

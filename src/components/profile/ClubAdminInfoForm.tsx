'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  CLUB_ADMIN_PUBLIC_LINK_FIELDS,
  CLUB_ADMIN_SOCIAL_PLATFORMS,
  EMPTY_CLUB_ADMIN_INFO,
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
}: {
  value: ClubAdminPublicLink;
  onChange: (next: ClubAdminPublicLink) => void;
  disabled?: boolean;
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
    </div>
  );
}

type ClubAdminInfoFormProps = {
  /** Seed YouTube when DB has no saved URL yet (from profile load). */
  profileYoutubeUrl?: string | null;
};

export default function ClubAdminInfoForm({ profileYoutubeUrl }: ClubAdminInfoFormProps) {
  const [form, setForm] = useState<ClubAdminInfo>({ ...EMPTY_CLUB_ADMIN_INFO });
  const [initialForm, setInitialForm] = useState<ClubAdminInfo>({ ...EMPTY_CLUB_ADMIN_INFO });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setMessage('Please sign in to load admin info.');
        return;
      }
      const res = await fetch('/api/user/club-admin-info', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data.error === 'string' ? data.error : 'Failed to load admin info.');
      }
      const parsed =
        data.clubAdminInfo && typeof data.clubAdminInfo === 'object'
          ? (data.clubAdminInfo as ClubAdminInfo)
          : { ...EMPTY_CLUB_ADMIN_INFO };
      const ytFromProfile = profileYoutubeUrl?.trim() ?? '';
      if (ytFromProfile && !parsed.youtube.url.trim()) {
        parsed.youtube = { ...parsed.youtube, url: ytFromProfile };
      }
      setForm(parsed);
      setInitialForm(parsed);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to load admin info.');
    } finally {
      setLoading(false);
    }
  }, [profileYoutubeUrl]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setMessage('Please sign in to save admin info.');
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/user/club-admin-info', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clubAdminInfo: form,
          youtubeChannelUrl: form.youtube.url.trim() || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data.error === 'string' ? data.error : 'Failed to save admin info.');
      }
      const saved =
        data.clubAdminInfo && typeof data.clubAdminInfo === 'object'
          ? (data.clubAdminInfo as ClubAdminInfo)
          : form;
      setForm(saved);
      setInitialForm(saved);
      setMessage(
        typeof data.message === 'string' ? data.message : 'Admin info saved successfully.',
      );
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to save admin info.');
    } finally {
      setSaving(false);
    }
  };

  const cancel = () => {
    setForm(initialForm);
    setMessage(null);
  };

  const updateSocialSite = (index: 0 | 1, patch: Partial<ClubAdminInfo['socialSites'][0]>) => {
    setForm((prev) => {
      const socialSites = [...prev.socialSites] as ClubAdminInfo['socialSites'];
      socialSites[index] = { ...socialSites[index], ...patch };
      return { ...prev, socialSites };
    });
  };

  const updateLink = (
    key: (typeof CLUB_ADMIN_PUBLIC_LINK_FIELDS)[number]['key'],
    patch: Partial<ClubAdminPublicLink>,
  ) => {
    setForm((prev) => ({
      ...prev,
      [key]: { ...prev[key], ...patch },
    }));
  };

  if (loading) {
    return (
      <div className="py-10 text-center text-sm text-gray-600">Loading admin info…</div>
    );
  }

  return (
    <div>
      <div className="rounded-lg border border-gray-300 overflow-hidden shadow-sm">
        <div className="bg-gray-200 border-b border-gray-300 px-4 py-2.5">
          <h2 className="text-sm font-bold text-gray-800">Admin Info</h2>
        </div>
        <div className="bg-white">
          <FormRow label="Alternate Email">
            <input
              type="email"
              value={form.alternateEmail}
              onChange={(e) => setForm((f) => ({ ...f, alternateEmail: e.target.value }))}
              disabled={saving}
              className={INPUT_CLASS}
            />
          </FormRow>

          <FormRow label="Phone">
            <div className="flex gap-2 max-w-md">
              <input
                type="text"
                value={form.phonePrefix}
                onChange={(e) => setForm((f) => ({ ...f, phonePrefix: e.target.value }))}
                disabled={saving}
                placeholder="+39"
                className={`${INPUT_CLASS} w-24 shrink-0`}
              />
              <input
                type="text"
                value={form.phoneNumber}
                onChange={(e) => setForm((f) => ({ ...f, phoneNumber: e.target.value }))}
                disabled={saving}
                className={INPUT_CLASS}
              />
            </div>
          </FormRow>

          {form.socialSites.map((site, index) => (
            <FormRow key={index} label="Social Site">
              <div className="flex flex-col sm:flex-row gap-2">
                <select
                  value={site.platform}
                  onChange={(e) =>
                    updateSocialSite(index as 0 | 1, { platform: e.target.value })
                  }
                  disabled={saving}
                  className={`${INPUT_CLASS} sm:w-36 shrink-0`}
                >
                  {CLUB_ADMIN_SOCIAL_PLATFORMS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={site.url}
                  onChange={(e) => updateSocialSite(index as 0 | 1, { url: e.target.value })}
                  disabled={saving}
                  className={INPUT_CLASS}
                />
              </div>
            </FormRow>
          ))}

          {CLUB_ADMIN_PUBLIC_LINK_FIELDS.map(({ key, label }) => (
            <FormRow key={key} label={label}>
              <PublicLinkField
                value={form[key]}
                onChange={(next) => updateLink(key, next)}
                disabled={saving}
              />
            </FormRow>
          ))}

          <FormRow label="About Me">
            <textarea
              value={form.aboutMe}
              onChange={(e) => setForm((f) => ({ ...f, aboutMe: e.target.value }))}
              disabled={saving}
              rows={5}
              className={`${INPUT_CLASS} resize-y min-h-[120px]`}
            />
          </FormRow>
        </div>
      </div>

      <div className="mt-6 flex flex-col items-center gap-3">
        <div className="flex flex-wrap justify-center gap-4">
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className="min-w-[7rem] px-8 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold rounded-md shadow-sm"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button
            type="button"
            onClick={cancel}
            disabled={saving}
            className="min-w-[7rem] px-8 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold rounded-md shadow-sm"
          >
            Cancel
          </button>
        </div>
        {message ? (
          <p
            role="status"
            className={`text-sm ${message.includes('success') ? 'text-green-700' : 'text-red-600'}`}
          >
            {message}
          </p>
        ) : null}
      </div>
    </div>
  );
}

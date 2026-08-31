'use client';

import { useCallback, useEffect, useState } from 'react';
import { EMPTY_CLUB_ADMIN_INFO, type ClubAdminInfo } from '@/lib/club/clubAdminInfo';
import ClubAdminInfoFields from '@/components/profile/ClubAdminInfoFields';

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

  if (loading) {
    return (
      <div className="py-10 text-center text-sm text-gray-600">Loading admin info…</div>
    );
  }

  return (
    <div>
      <ClubAdminInfoFields value={form} onChange={setForm} disabled={saving} />

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

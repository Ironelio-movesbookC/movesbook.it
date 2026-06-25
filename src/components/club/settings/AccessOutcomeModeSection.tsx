'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';

type Mode = 'EN' | 'COUNTRY_STANDARD' | 'CUSTOM';

type Props = {
  clubId?: string | null;
};

export default function AccessOutcomeModeSection({ clubId }: Props) {
  const [mode, setMode] = useState<Mode>('COUNTRY_STANDARD');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const qs = clubId ? `?clubId=${encodeURIComponent(clubId)}` : '';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/club/settings/outcome-preferences${qs}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.mode) setMode(data.mode);
    } finally {
      setLoading(false);
    }
  }, [qs]);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveMode(next: Mode) {
    setSaving(true);
    setToast(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/club/settings/outcome-preferences${qs}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ mode: next, clubId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      setMode(next);
      setToast('Outcome language mode saved.');
    } catch (e) {
      setToast(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-md border border-sky-200 bg-sky-50/60 p-4 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-sky-950">Outcome language for Access Controls</h3>
          <p className="text-xs text-sky-900/80 mt-1">
            Choose which messages are shown on card readers: English, your country standard language, or
            fully custom club messages.
          </p>
        </div>
        <Link
          href={`/club/settings/outcome_settings${qs}`}
          className="text-xs font-semibold text-sky-800 underline hover:text-sky-950"
        >
          Edit custom messages
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading…
        </div>
      ) : (
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="inline-flex items-center gap-2">
            <input
              type="radio"
              name="outcomeMode"
              checked={mode === 'EN'}
              disabled={saving}
              onChange={() => void saveMode('EN')}
            />
            English (system)
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="radio"
              name="outcomeMode"
              checked={mode === 'COUNTRY_STANDARD'}
              disabled={saving}
              onChange={() => void saveMode('COUNTRY_STANDARD')}
            />
            Country standard language
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="radio"
              name="outcomeMode"
              checked={mode === 'CUSTOM'}
              disabled={saving}
              onChange={() => void saveMode('CUSTOM')}
            />
            Custom club outcomes
          </label>
        </div>
      )}

      {toast && <p className="text-xs text-gray-700">{toast}</p>}
    </div>
  );
}

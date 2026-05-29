'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';

type SettingsField = {
  key: string;
  label: string;
  value: string;
  fieldType: 'text' | 'checkbox';
};

type ClubCardReaderAdvancedSettingsPanelProps = {
  readerId: string;
  clubId?: string | null;
  onBack: () => void;
  onSaved?: () => void;
};

export default function ClubCardReaderAdvancedSettingsPanel({
  readerId,
  clubId,
  onBack,
  onSaved,
}: ClubCardReaderAdvancedSettingsPanelProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [readerNumber, setReaderNumber] = useState('');
  const [readerType, setReaderType] = useState('');
  const [controlMode, setControlMode] = useState('');
  const [description, setDescription] = useState('');
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [fields, setFields] = useState<SettingsField[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const qs = clubId ? `?clubId=${encodeURIComponent(clubId)}` : '';
      const response = await fetch(
        `/api/club/settings/card-readers/${readerId}/advanced-settings${qs}`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || 'Unable to load advanced settings.');
      }
      setTitle(String(data.title ?? ''));
      setSubtitle(String(data.subtitle ?? ''));
      setReaderNumber(String(data.readerNumber ?? ''));
      setReaderType(String(data.readerType ?? ''));
      setControlMode(String(data.controlMode ?? ''));
      setDescription(String(data.description ?? ''));
      setSettingsId(data.settingsId != null ? String(data.settingsId) : null);
      setFields(Array.isArray(data.fields) ? data.fields : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load advanced settings.');
    } finally {
      setLoading(false);
    }
  }, [readerId, clubId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const token = localStorage.getItem('token');
      const qs = clubId ? `?clubId=${encodeURIComponent(clubId)}` : '';
      const values: Record<string, string | boolean> = {};
      for (const field of fields) {
        if (field.fieldType === 'checkbox') {
          values[field.key] = field.value === 'Y';
        } else {
          values[field.key] = field.value;
        }
      }
      const response = await fetch(
        `/api/club/settings/card-readers/${readerId}/advanced-settings${qs}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ settingsId, values }),
        }
      );
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to save settings.');
      }
      setSuccessMessage(String(data.message ?? 'Reader setting saved successfully.'));
      onSaved?.();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  }

  function updateField(key: string, value: string) {
    setFields((prev) => prev.map((f) => (f.key === key ? { ...f, value } : f)));
  }

  const inputClass =
    'h-9 w-full rounded border border-gray-400 bg-white px-2 text-sm text-gray-900';

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded border border-gray-300 bg-gray-100 text-gray-950 hover:bg-gray-200"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to readers
      </button>

      {successMessage && (
        <div className="rounded-lg border border-green-300 bg-green-50 px-4 py-3 text-sm font-medium text-green-800">
          {successMessage}
        </div>
      )}

      {error && !loading && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-gray-600">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading advanced settings…
        </div>
      ) : !error || fields.length > 0 ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="border border-purple-300 bg-purple-700 px-4 py-2 text-base font-semibold text-white">
            {title}
            {subtitle && <span className="ml-2 font-normal opacity-90">{subtitle}</span>}
          </div>

          <div className="rounded-lg border border-gray-300 bg-white p-4 space-y-3">
            <p className="font-semibold text-gray-900">Settings for this reader</p>
            <div className="grid gap-3 sm:grid-cols-3 text-sm">
              <div>
                <span className="text-gray-600">Num</span>
                <p className="font-medium">{readerNumber || '—'}</p>
              </div>
              <div>
                <span className="text-gray-600">Type</span>
                <p className="font-medium">{readerType || '—'}</p>
              </div>
              <div>
                <span className="text-gray-600">Mode of control</span>
                <p className="font-medium">{controlMode || '—'}</p>
              </div>
            </div>
            {description && (
              <p className="border-t border-gray-200 pt-2 text-sm text-gray-800">{description}</p>
            )}
          </div>

          {fields.length === 0 ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              No advanced settings table found for this reader type. Import legacy database tables to
              enable full advanced settings.
            </p>
          ) : (
            <div className="rounded-lg border border-gray-300 bg-white p-4">
              <h3 className="mb-3 font-semibold text-gray-900">General settings</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {fields.map((field) => (
                  <div key={field.key} className={field.fieldType === 'checkbox' ? 'flex items-center gap-2' : ''}>
                    {field.fieldType === 'checkbox' ? (
                      <>
                        <input
                          type="checkbox"
                          id={`adv-${field.key}`}
                          checked={field.value === 'Y'}
                          onChange={(e) => updateField(field.key, e.target.checked ? 'Y' : 'N')}
                          className="rounded border-gray-500"
                        />
                        <label htmlFor={`adv-${field.key}`} className="text-sm text-gray-800">
                          {field.label}
                        </label>
                      </>
                    ) : (
                      <>
                        <label className="block text-sm font-medium text-gray-800 mb-1">
                          {field.label}
                        </label>
                        <input
                          className={inputClass}
                          value={field.value}
                          onChange={(e) => updateField(field.key, e.target.value)}
                        />
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {fields.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded border border-gray-800 bg-gray-900 px-5 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-60"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Save
              </button>
              <button
                type="button"
                onClick={onBack}
                disabled={saving}
                className="px-4 py-2 text-sm font-semibold rounded border border-gray-300 bg-gray-100 text-gray-950 hover:bg-gray-200 disabled:opacity-60"
              >
                Cancel
              </button>
            </div>
          )}
        </form>
      ) : null}
    </div>
  );
}

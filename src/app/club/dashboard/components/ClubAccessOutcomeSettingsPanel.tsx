'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Loader2,
  Pause,
  Trash2,
  Upload,
  Volume2,
} from 'lucide-react';
import type {
  OutcomeSettingItem,
  OutcomeSettingsResponse,
  OutcomeSettingsTab,
} from '@/types/clubOutcomeSettings';

type ClubAccessOutcomeSettingsPanelProps = {
  clubId?: string | null;
  onBack?: () => void;
};

type ConfirmState = {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
};

function useDebouncedCallback<T extends unknown[]>(
  fn: (...args: T) => void,
  delayMs: number
) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  return useCallback((...args: T) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => fnRef.current(...args), delayMs);
  }, [delayMs]);
}

export default function ClubAccessOutcomeSettingsPanel({
  clubId,
  onBack,
}: ClubAccessOutcomeSettingsPanelProps) {
  const [tab, setTab] = useState<OutcomeSettingsTab>('primary');
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [data, setData] = useState<OutcomeSettingsResponse | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { code: string; message: string }>>({});
  const [outcomeMode, setOutcomeMode] = useState<'EN' | 'COUNTRY_STANDARD' | 'CUSTOM'>('COUNTRY_STANDARD');
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRefs = useRef<Record<string, HTMLAudioElement | null>>({});
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const qs = clubId ? `?clubId=${encodeURIComponent(clubId)}` : '';
  const apiQs = clubId ? `clubId=${encodeURIComponent(clubId)}` : '';

  const getLatestItem = useCallback(
    (typeId: string, fallback: OutcomeSettingItem): OutcomeSettingItem =>
      data?.items.find((row) => row.typeId === typeId) ?? fallback,
    [data?.items]
  );

  const persistItem = useCallback(
    async (item: OutcomeSettingItem): Promise<string | null> => {
      const draft = drafts[item.typeId];
      if (!draft || !data?.editable) {
        return getLatestItem(item.typeId, item).settingId;
      }

      const token = localStorage.getItem('token');
      const response = await fetch(`/api/club/settings/outcome-settings${qs}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          action: 'save',
          clubId: clubId ?? undefined,
          typeId: item.typeId,
          settingId: getLatestItem(item.typeId, item).settingId,
          code: draft.code,
          message: draft.message,
        }),
      });
      const json = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(json?.error || 'Failed to save.');
      }
      const savedId = json?.id ? String(json.id) : getLatestItem(item.typeId, item).settingId;
      if (savedId) {
        setData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            items: prev.items.map((row) =>
              row.typeId === item.typeId ? { ...row, settingId: savedId } : row
            ),
          };
        });
      }
      return savedId;
    },
    [clubId, data?.editable, drafts, getLatestItem, qs]
  );

  const load = useCallback(async (activeTab: OutcomeSettingsTab) => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const sep = apiQs ? '&' : '';
      const response = await fetch(
        `/api/club/settings/outcome-settings?${apiQs}${sep}tab=${activeTab}`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      const json = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(json?.error || 'Unable to load outcome settings.');
      }
      const payload = json as OutcomeSettingsResponse;
      setData(payload);
      if (payload.outcomeMode) {
        setOutcomeMode(payload.outcomeMode);
      } else {
        setOutcomeMode(payload.defaultOutcomeLanguage === 'custom' ? 'CUSTOM' : 'COUNTRY_STANDARD');
      }
      const nextDrafts: Record<string, { code: string; message: string }> = {};
      for (const item of payload.items) {
        nextDrafts[item.typeId] = { code: item.code, message: item.message };
      }
      setDrafts(nextDrafts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load outcome settings.');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [apiQs]);

  useEffect(() => {
    void load(tab);
  }, [load, tab]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(t);
  }, [toast]);

  const saveItem = useCallback(
    async (item: OutcomeSettingItem) => {
      if (!data?.editable) return;

      setSavingId(item.typeId);
      try {
        const savedId = await persistItem(item);
        if (savedId) {
          setToast('Saved.');
        }
      } catch (err) {
        setToast(err instanceof Error ? err.message : 'Failed to save.');
      } finally {
        setSavingId(null);
      }
    },
    [data?.editable, persistItem]
  );

  const debouncedSave = useDebouncedCallback((item: OutcomeSettingItem) => {
    void saveItem(item);
  }, 800);

  function updateDraft(typeId: string, patch: Partial<{ code: string; message: string }>, item: OutcomeSettingItem) {
    setDrafts((prev) => {
      const next = {
        ...prev,
        [typeId]: { ...prev[typeId], ...patch },
      };
      return next;
    });
    if (data?.editable) debouncedSave(item);
  }

  function handleOutcomeModeChange(value: string) {
    if (value !== 'EN' && value !== 'COUNTRY_STANDARD' && value !== 'CUSTOM') return;
    setConfirm({
      title: 'Change outcome language mode?',
      message: "You're about to change how access outcome messages are resolved for this club.",
      confirmLabel: 'Yes, change',
      onConfirm: async () => {
        setConfirm(null);
        try {
          const token = localStorage.getItem('token');
          const prefQs = clubId ? `?clubId=${encodeURIComponent(clubId)}` : '';
          const response = await fetch(`/api/club/settings/outcome-preferences${prefQs}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ mode: value, clubId }),
          });
          const json = await response.json().catch(() => null);
          if (!response.ok) throw new Error(json?.error || 'Failed to update.');
          setOutcomeMode(value);
          setToast(json?.message ?? 'Outcome mode updated.');
          await load(tab);
        } catch (err) {
          setToast(err instanceof Error ? err.message : 'Failed to update.');
        }
      },
    });
  }

  function toggleAudio(item: OutcomeSettingItem) {
    if (!item.audioUrl) return;
    const el = audioRefs.current[item.typeId];
    if (!el) return;

    if (!el.paused && playingId === item.typeId) {
      el.pause();
      setPlayingId(null);
      return;
    }

    Object.values(audioRefs.current).forEach((audio) => {
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
    });

    void el.play().catch(() => {
      setToast('Unable to play audio. Re-upload the file or check server storage.');
      setPlayingId(null);
    });
    setPlayingId(item.typeId);
    el.onended = () => setPlayingId(null);
  }

  function openUploadPicker(item: OutcomeSettingItem) {
    if (!data?.editable) return;
    const latest = getLatestItem(item.typeId, item);
    if (latest.audioFile) {
      setToast('Please remove the existing audio before uploading a new file.');
      return;
    }
    const draft = drafts[item.typeId];
    if (!latest.settingId && !draft?.message?.trim()) {
      setToast('Enter a message first, then upload audio.');
      return;
    }
    fileInputRefs.current[item.typeId]?.click();
  }

  async function uploadAudio(item: OutcomeSettingItem, file: File) {
    const latest = getLatestItem(item.typeId, item);
    if (latest.audioFile) {
      setToast('Please remove the existing audio before uploading a new file.');
      return;
    }

    setUploadingId(item.typeId);
    try {
      let settingId = latest.settingId;
      if (!settingId) {
        settingId = await persistItem(item);
      }
      if (!settingId) {
        setToast('Save the message first, then upload audio.');
        return;
      }

      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('Failed to read file.'));
        reader.readAsDataURL(file);
      });

      const token = localStorage.getItem('token');
      const response = await fetch(`/api/club/settings/outcome-settings${qs}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          settingId,
          typeId: item.typeId,
          clubId: clubId ?? undefined,
          fileName: file.name,
          file: base64,
        }),
      });
      const json = await response.json().catch(() => null);
      if (!response.ok) throw new Error(json?.error || 'Upload failed.');

      const filename = json?.filename ? String(json.filename) : null;
      const audioUrl = json?.audioUrl ? String(json.audioUrl) : null;
      const savedSettingId = json?.id ? String(json.id) : settingId;

      setData((prev) => {
        if (!prev || !filename || !audioUrl) return prev;
        return {
          ...prev,
          items: prev.items.map((row) =>
            row.typeId === item.typeId
              ? { ...row, settingId: savedSettingId, audioFile: filename, audioUrl }
              : row
          ),
        };
      });

      setToast(json?.message ?? 'Audio saved.');
      if (!filename || !audioUrl) {
        await load(tab);
      }
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploadingId(null);
    }
  }

  function removeAudio(item: OutcomeSettingItem) {
    if (!item.settingId) return;
    setConfirm({
      title: 'Delete audio?',
      message: "This action can't be undone. The audio file will be deleted.",
      confirmLabel: 'Delete',
      onConfirm: async () => {
        setConfirm(null);
        try {
          const token = localStorage.getItem('token');
          const response = await fetch(`/api/club/settings/outcome-settings${qs}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ action: 'remove-audio', settingId: item.settingId }),
          });
          const json = await response.json().catch(() => null);
          if (!response.ok) throw new Error(json?.error || 'Delete failed.');
          setToast(json?.message ?? 'Audio deleted.');
          await load(tab);
        } catch (err) {
          setToast(err instanceof Error ? err.message : 'Delete failed.');
        }
      },
    });
  }

  const btnClass =
    'px-3 py-2 text-sm font-semibold rounded border border-gray-300 bg-gray-100 text-gray-950 hover:bg-gray-200 disabled:opacity-50';

  return (
    <div className="w-full space-y-4">
      {onBack && (
        <button type="button" onClick={onBack} className={`${btnClass} inline-flex items-center gap-2`}>
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
      )}

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-gray-200 bg-gradient-to-r from-slate-800 to-slate-700 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10">
              <Volume2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white">Access of outcome settings</h1>
              <p className="text-sm text-slate-300">Configure access control outcome messages and audio</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="default-outcome-lang" className="text-xs font-medium text-slate-300">
              Outcome mode
            </label>
            <select
              id="default-outcome-lang"
              value={outcomeMode}
              onChange={(e) => handleOutcomeModeChange(e.target.value)}
              className="rounded border border-slate-500 bg-slate-900 px-2 py-1.5 text-sm text-white"
            >
              <option value="EN">English (system)</option>
              <option value="COUNTRY_STANDARD">Country standard</option>
              <option value="CUSTOM">Custom</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-1 border-b border-gray-200 bg-gray-50 px-4 pt-3">
          <button
            type="button"
            onClick={() => setTab('primary')}
            className={`rounded-t px-4 py-2 text-sm font-semibold transition-colors ${
              tab === 'primary'
                ? 'border border-b-0 border-gray-300 bg-white text-gray-900'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Fixed settings in your primary language
            {data?.primaryLanguageName ? ` (${data.primaryLanguageName})` : ''}
          </button>
          <button
            type="button"
            onClick={() => setTab('custom')}
            className={`rounded-t px-4 py-2 text-sm font-semibold transition-colors ${
              tab === 'custom'
                ? 'border border-b-0 border-gray-300 bg-white text-gray-900'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Custom settings in your language
          </button>
        </div>

        <div className="p-4">
          {toast && (
            <div className="mb-4 rounded-lg border border-green-300 bg-green-50 px-4 py-2 text-sm text-green-800">
              {toast}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-gray-600">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading settings…
            </div>
          ) : error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
          ) : (
            <>
              <div className="mb-4 rounded-lg border border-[#7d0420]/30 bg-[#7d0420] px-4 py-3 text-sm text-white">
                {data?.introParagraph}
              </div>

              {tab === 'custom' && !data?.editable && (
                <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  Outcome mode is{' '}
                  <strong>
                    {outcomeMode === 'EN'
                      ? 'English (system)'
                      : outcomeMode === 'CUSTOM'
                        ? 'Custom'
                        : 'Country standard'}
                  </strong>
                  . Choose <strong>Custom</strong> in the dropdown above to edit messages on this tab.
                </div>
              )}

              {data?.items.length === 0 ? (
                <p className="py-12 text-center text-sm text-gray-500">
                  No outcome message types found. Import legacy audio_setting_types data to populate this
                  list.
                </p>
              ) : (
                <div className="space-y-3">
                  {data?.items.map((item) => {
                    const draft = drafts[item.typeId] ?? { code: item.code, message: item.message };
                    const isSaving = savingId === item.typeId;
                    const isUploading = uploadingId === item.typeId;

                    return (
                      <div
                        key={item.typeId}
                        className="rounded-lg border border-gray-200 bg-gray-50/80 p-4 shadow-sm"
                      >
                        <p className="mb-3 text-sm font-semibold text-gray-900">{item.description}</p>
                        <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center">
                          <div className="flex items-center gap-2 sm:w-36 shrink-0">
                            <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
                              Code
                            </span>
                            {data?.editable ? (
                              <input
                                className="h-9 w-full max-w-[6rem] rounded border border-gray-300 bg-white px-2 text-center text-sm font-mono"
                                value={draft.code}
                                onChange={(e) =>
                                  updateDraft(item.typeId, { code: e.target.value }, item)
                                }
                              />
                            ) : (
                              <span className="inline-flex min-w-[4rem] items-center justify-center rounded border border-gray-300 bg-gray-200 px-2 py-1.5 text-sm font-mono font-semibold text-gray-800">
                                {draft.code || item.defaultCode}
                              </span>
                            )}
                          </div>

                          <div className="flex min-w-0 flex-1 items-center gap-2">
                            <div className={`min-w-0 flex-1 ${item.audioFile ? 'grid grid-cols-2 gap-2' : ''}`}>
                              <input
                                type="text"
                                readOnly={!data?.editable}
                                placeholder="Message"
                                className={`h-9 w-full rounded border border-gray-300 bg-blue-50/50 px-3 text-sm text-gray-900 placeholder:text-gray-500 ${
                                  data?.editable
                                    ? ''
                                    : 'cursor-default bg-blue-50/40 read-only:text-gray-800'
                                }`}
                                value={draft.message}
                                onChange={
                                  data?.editable
                                    ? (e) =>
                                        updateDraft(item.typeId, { message: e.target.value }, item)
                                    : undefined
                                }
                              />
                              {item.audioFile && (
                                <div
                                  className="flex h-9 min-w-0 items-center rounded border border-gray-200 bg-gray-50 px-3 text-sm text-gray-700"
                                  title={item.audioFile}
                                >
                                  <span className="truncate">{item.audioFile}</span>
                                </div>
                              )}
                            </div>

                            <div
                              className="flex shrink-0 items-center gap-1 border-l border-gray-300 pl-2"
                              title="Audio message"
                            >
                              {item.audioUrl && (
                                <>
                                  <audio
                                    key={item.audioUrl}
                                    ref={(el) => {
                                      audioRefs.current[item.typeId] = el;
                                    }}
                                    src={item.audioUrl}
                                    preload="none"
                                    className="hidden"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => toggleAudio(item)}
                                    className="inline-flex h-9 w-9 items-center justify-center rounded border border-gray-300 bg-white text-gray-800 hover:bg-gray-50"
                                    title={playingId === item.typeId ? 'Pause audio' : 'Play audio'}
                                    aria-label={playingId === item.typeId ? 'Pause audio' : 'Play audio'}
                                  >
                                    {playingId === item.typeId ? (
                                      <Pause className="h-4 w-4" />
                                    ) : (
                                      <Volume2 className="h-4 w-4" />
                                    )}
                                  </button>
                                </>
                              )}

                              {data?.editable && (
                                <>
                                  {!item.audioFile && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => openUploadPicker(item)}
                                        disabled={isUploading}
                                        className="inline-flex h-9 items-center gap-1 rounded border border-gray-300 bg-white px-2.5 text-xs font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50"
                                        title="Upload audio (.mp3 or .wav)"
                                      >
                                        {isUploading ? (
                                          <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                          <Upload className="h-4 w-4" />
                                        )}
                                        <span className="hidden sm:inline">Audio</span>
                                      </button>
                                      <input
                                        ref={(el) => {
                                          fileInputRefs.current[item.typeId] = el;
                                        }}
                                        type="file"
                                        accept=".mp3,.wav,audio/mpeg,audio/wav"
                                        className="hidden"
                                        disabled={isUploading}
                                        onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          if (file) void uploadAudio(item, file);
                                          e.target.value = '';
                                        }}
                                      />
                                    </>
                                  )}
                                  {item.audioFile && (
                                    <button
                                      type="button"
                                      onClick={() => removeAudio(item)}
                                      className="inline-flex h-9 w-9 items-center justify-center rounded border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                                      title="Remove audio"
                                      aria-label="Remove audio"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  )}
                                </>
                              )}

                              {!item.audioUrl && !data?.editable && (
                                <span
                                  className="inline-flex h-9 items-center px-2 text-xs text-gray-400"
                                  title="No audio file"
                                >
                                  —
                                </span>
                              )}

                              {isSaving && (
                                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-gray-500" />
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {confirm && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white shadow-xl">
            <div className="border-b border-gray-200 px-4 py-3">
              <h2 className="text-lg font-semibold text-gray-900">{confirm.title}</h2>
            </div>
            <p className="px-4 py-4 text-sm text-gray-700">{confirm.message}</p>
            <div className="flex justify-end gap-2 border-t border-gray-100 bg-gray-50 px-4 py-3">
              <button type="button" onClick={() => setConfirm(null)} className={btnClass}>
                Cancel
              </button>
              <button
                type="button"
                onClick={confirm.onConfirm}
                className="rounded border border-gray-800 bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
              >
                {confirm.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

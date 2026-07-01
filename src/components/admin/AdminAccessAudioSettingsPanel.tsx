'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Pause, Trash2, Upload, Volume2 } from 'lucide-react';
import type {
  AccessAudioSettingItem,
  AccessAudioSettingsResponse,
} from '@/types/adminAccessAudioSettings';

function useDebouncedCallback<T extends unknown[]>(fn: (...args: T) => void, delayMs: number) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  return useCallback((...args: T) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => fnRef.current(...args), delayMs);
  }, [delayMs]);
}

function getAdminToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('adminToken') || localStorage.getItem('token');
}

export default function AdminAccessAudioSettingsPanel() {
  const [lang, setLang] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [data, setData] = useState<AccessAudioSettingsResponse | null>(null);
  const [drafts, setDrafts] = useState<
    Record<string, { description: string; code: string; message: string }>
  >({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<AccessAudioSettingItem | null>(null);
  const playerRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const load = useCallback(async (activeLang: number) => {
    setLoading(true);
    setError(null);
    try {
      const token = getAdminToken();
      const response = await fetch(
        `/api/admin/settings/access-audio-settings?lang=${activeLang}`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      const json = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(json?.error || 'Unable to load access audio settings.');
      }
      const payload = json as AccessAudioSettingsResponse;
      setData(payload);
      const nextDrafts: Record<string, { description: string; code: string; message: string }> = {};
      for (const item of payload.items) {
        nextDrafts[item.typeId] = {
          description: item.description,
          code: item.code,
          message: item.message,
        };
      }
      setDrafts(nextDrafts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load access audio settings.');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(lang);
  }, [load, lang]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    return () => {
      playerRef.current?.pause();
      playerRef.current = null;
    };
  }, []);

  function getPlayer(): HTMLAudioElement {
    if (!playerRef.current) {
      playerRef.current = new Audio();
    }
    return playerRef.current;
  }

  function showPlaybackError(item: AccessAudioSettingItem) {
    setToast(
      `Unable to play audio (${item.audioFile ?? 'file'}). Re-upload on this server or check storage.`
    );
    setPlayingId(null);
  }

  const saveSetting = useCallback(
    async (item: AccessAudioSettingItem) => {
      const draft = drafts[item.typeId];
      if (!draft) return;

      setSavingKey(`setting-${item.typeId}`);
      try {
        const token = getAdminToken();
        const response = await fetch('/api/admin/settings/access-audio-settings', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            action: 'save-setting',
            lang,
            typeId: item.typeId,
            settingId: item.settingId,
            code: draft.code,
            message: draft.message,
          }),
        });
        const json = await response.json().catch(() => null);
        if (!response.ok) throw new Error(json?.error || 'Failed to save.');
        setToast(json?.message ?? 'Saved.');
        if (json?.id && !item.settingId) {
          setData((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              items: prev.items.map((row) =>
                row.typeId === item.typeId ? { ...row, settingId: String(json.id) } : row
              ),
            };
          });
        }
      } catch (err) {
        setToast(err instanceof Error ? err.message : 'Failed to save.');
      } finally {
        setSavingKey(null);
      }
    },
    [drafts, lang]
  );

  const saveDescription = useCallback(
    async (item: AccessAudioSettingItem) => {
      const draft = drafts[item.typeId];
      if (!draft || lang !== 0) return;

      setSavingKey(`desc-${item.typeId}`);
      try {
        const token = getAdminToken();
        const response = await fetch('/api/admin/settings/access-audio-settings', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            action: 'save-description',
            lang,
            typeId: item.typeId,
            description: draft.description,
          }),
        });
        const json = await response.json().catch(() => null);
        if (!response.ok) throw new Error(json?.error || 'Failed to save description.');
        setToast(json?.message ?? 'Description saved.');
      } catch (err) {
        setToast(err instanceof Error ? err.message : 'Failed to save description.');
      } finally {
        setSavingKey(null);
      }
    },
    [drafts, lang]
  );

  const debouncedSaveSetting = useDebouncedCallback((item: AccessAudioSettingItem) => {
    void saveSetting(item);
  }, 800);

  const debouncedSaveDescription = useDebouncedCallback((item: AccessAudioSettingItem) => {
    void saveDescription(item);
  }, 800);

  function updateDraft(
    typeId: string,
    patch: Partial<{ description: string; code: string; message: string }>,
    item: AccessAudioSettingItem,
    field: 'description' | 'setting' | 'code'
  ) {
    setDrafts((prev) => ({
      ...prev,
      [typeId]: { ...prev[typeId], ...patch },
    }));
    if (field === 'description' && lang === 0) debouncedSaveDescription(item);
    if (field === 'setting' && lang !== 0) debouncedSaveSetting(item);
    if (field === 'code' && lang === 0) debouncedSaveSetting(item);
  }

  const isDefaultTab = lang === 0;

  function toggleAudio(item: AccessAudioSettingItem) {
    if (!item.audioUrl) return;
    const player = getPlayer();

    if (!player.paused && playingId === item.typeId) {
      player.pause();
      setPlayingId(null);
      return;
    }

    player.pause();
    player.onended = null;
    player.onerror = null;
    player.src = item.audioUrl;
    player.load();

    player.onended = () => setPlayingId(null);
    player.onerror = () => showPlaybackError(item);

    void player.play().then(() => {
      setPlayingId(item.typeId);
    }).catch(() => {
      showPlaybackError(item);
    });
  }

  function openUploadPicker(item: AccessAudioSettingItem) {
    if (!item.settingId) {
      setToast('Please save a message before uploading an audio file.');
      return;
    }
    if (item.audioFile) {
      setToast('Please remove the existing audio before uploading a new file.');
      return;
    }
    fileInputRefs.current[item.typeId]?.click();
  }

  async function handleUpload(item: AccessAudioSettingItem, file: File) {
    if (!item.settingId) return;

    setUploadingId(item.typeId);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result ?? ''));
        reader.onerror = () => reject(new Error('Unable to read file.'));
        reader.readAsDataURL(file);
      });

      const token = getAdminToken();
      const response = await fetch('/api/admin/settings/access-audio-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          settingId: item.settingId,
          lang,
          file: base64,
        }),
      });
      const json = await response.json().catch(() => null);
      if (!response.ok) throw new Error(json?.error || 'Upload failed.');
      setToast(json?.message ?? 'Audio uploaded.');
      const filename = typeof json?.filename === 'string' ? json.filename : null;
      const audioUrl = typeof json?.audioUrl === 'string' ? json.audioUrl : null;
      if (filename) {
        setData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            items: prev.items.map((row) =>
              row.typeId === item.typeId
                ? { ...row, audioFile: filename, audioUrl: audioUrl ?? row.audioUrl }
                : row
            ),
          };
        });
      }
      await load(lang);
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploadingId(null);
    }
  }

  async function removeAudio(item: AccessAudioSettingItem) {
    if (!item.settingId) return;
    setConfirmRemove(null);
    try {
      const token = getAdminToken();
      const response = await fetch('/api/admin/settings/access-audio-settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          action: 'remove-audio',
          settingId: item.settingId,
          lang,
        }),
      });
      const json = await response.json().catch(() => null);
      if (!response.ok) throw new Error(json?.error || 'Delete failed.');
      setToast(json?.message ?? 'Audio removed.');
      await load(lang);
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Delete failed.');
    }
  }

  const languageTabs = [{ id: 0, name: 'Default' }, ...(data?.languages ?? [])];
  const activeTabName = languageTabs.find((tab) => tab.id === lang)?.name ?? 'Default';

  return (
    <div className="p-4 lg:p-6">
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-sky-200 bg-gradient-to-r from-sky-700 to-sky-600 px-4 py-5 text-white lg:px-6">
          <h1 className="text-lg font-semibold lg:text-xl">
            General settings related to audio and text messages of the access control
          </h1>
          <p className="mt-1 text-sm text-sky-100">
            System-wide outcome messages for card readers. Each language tab matches user country/nationality
            (via countries.country_lang_id).
          </p>
        </div>

        <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-medium text-gray-600">
              Currently editing:{' '}
              <span className="rounded bg-sky-100 px-2 py-0.5 text-sm font-semibold text-sky-800">
                {activeTabName}
              </span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {languageTabs.map((tab) => {
              const isActive = lang === tab.id;
              return (
              <button
                key={tab.id === 0 ? 'default' : `lang-${tab.id}`}
                type="button"
                onClick={() => setLang(tab.id)}
                aria-pressed={isActive}
                className={`rounded-md px-3 py-1.5 text-sm font-semibold transition ${
                  isActive
                    ? 'bg-sky-700 text-white shadow-sm ring-2 ring-sky-400 ring-offset-1'
                    : 'border border-gray-300 bg-white text-gray-700 hover:border-sky-300 hover:bg-sky-50'
                }`}
              >
                {tab.name}
              </button>
            );
            })}
          </div>
          {data?.introParagraph && (
            <p className="mt-3 text-sm text-gray-600">{data.introParagraph}</p>
          )}
        </div>

        {loading ? (
          <div className="flex h-64 items-center justify-center text-gray-500">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Loading settings
          </div>
        ) : error ? (
          <div className="px-4 py-12 text-center text-sm text-red-600">{error}</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {(data?.items ?? []).map((item) => {
              const draft = drafts[item.typeId] ?? {
                description: item.description,
                code: item.code,
                message: item.message,
              };
              const isSaving =
                savingKey === `setting-${item.typeId}` || savingKey === `desc-${item.typeId}`;

              return (
                <div key={item.typeId} className="grid gap-3 px-4 py-4 lg:grid-cols-[40px_1fr_auto] lg:items-start">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-gray-200 text-sm font-bold text-gray-800">
                    {item.letter}
                  </div>

                  <div className="min-w-0 space-y-3">
                    {isDefaultTab ? (
                      <input
                        value={draft.description}
                        onChange={(event) =>
                          updateDraft(item.typeId, { description: event.target.value }, item, 'description')
                        }
                        className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm outline-none focus:border-gray-500"
                        placeholder="Description"
                      />
                    ) : (
                      <p className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600">
                        {item.description}
                      </p>
                    )}

                    <div className={`grid gap-3 ${isDefaultTab ? '' : 'sm:grid-cols-[120px_1fr]'}`}>
                      <div>
                        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Code
                        </span>
                        {isDefaultTab ? (
                          <input
                            value={draft.code}
                            onChange={(event) =>
                              updateDraft(item.typeId, { code: event.target.value }, item, 'code')
                            }
                            className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm outline-none focus:border-gray-500"
                          />
                        ) : (
                          <div className="flex h-10 items-center justify-center rounded-md bg-gray-100 px-2 text-sm font-semibold text-gray-600">
                            {item.defaultCode || item.code}
                          </div>
                        )}
                      </div>
                      {!isDefaultTab && (
                        <div>
                          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Message
                          </span>
                          <div className={item.audioFile ? 'grid grid-cols-2 gap-2' : ''}>
                            <input
                              value={draft.message}
                              onChange={(event) =>
                                updateDraft(item.typeId, { message: event.target.value }, item, 'setting')
                              }
                              placeholder="Message"
                              className="h-10 w-full rounded-md border border-sky-200 bg-sky-50 px-3 text-sm outline-none focus:border-sky-400"
                            />
                            {item.audioFile && (
                              <div
                                className="flex h-10 min-w-0 items-center rounded-md border border-gray-200 bg-gray-50 px-3 text-sm text-gray-700"
                                title={item.audioFile}
                              >
                                <span className="truncate">{item.audioFile}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 lg:pt-6">
                    {isSaving && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
                    <button
                      type="button"
                      disabled={!item.audioUrl}
                      onClick={() => toggleAudio(item)}
                      className={`inline-flex h-9 w-9 items-center justify-center rounded-md border ${
                        item.audioUrl
                          ? 'border-gray-300 text-gray-700 hover:bg-gray-100'
                          : 'border-gray-200 text-gray-300'
                      }`}
                      title={item.audioUrl ? 'Play audio' : 'No audio'}
                    >
                      {playingId === item.typeId ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Volume2 className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      type="button"
                      disabled={!!item.audioFile || uploadingId === item.typeId}
                      onClick={() => openUploadPicker(item)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-40"
                      title="Upload audio"
                    >
                      {uploadingId === item.typeId ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                    </button>
                    {item.audioFile && (
                      <button
                        type="button"
                        onClick={() => setConfirmRemove(item)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-red-200 text-red-600 hover:bg-red-50"
                        title="Remove audio"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                    <input
                      ref={(node) => {
                        fileInputRefs.current[item.typeId] = node;
                      }}
                      type="file"
                      accept=".mp3,.wav,audio/mpeg,audio/wav"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) void handleUpload(item, file);
                        event.target.value = '';
                      }}
                    />
                  </div>
                </div>
              );
            })}

            {(data?.items ?? []).length === 0 && (
              <div className="px-4 py-12 text-center text-sm text-gray-500">
                No message types found. Run the outcome settings seed or import legacy audio_setting_types data.
              </div>
            )}
          </div>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-md bg-gray-900 px-4 py-2 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}

      {confirmRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">Remove audio file?</h3>
            <p className="mt-2 text-sm text-gray-600">
              This action cannot be undone. The audio file will be deleted from disk.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmRemove(null)}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void removeAudio(confirmRemove)}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

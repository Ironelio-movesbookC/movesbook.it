'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { X, Trash2, Plus } from 'lucide-react';
import { parseBannerSequenceJson } from '@/lib/profileBannerSequence';

export type BannerAlignment = 'center' | 'default';

export type ChangeBannerSaved = {
  profileBanner?: string;
  profileBannerAlignment?: BannerAlignment;
  profileBannerSequence?: string | null;
  profileBannerVideo?: string | null;
};

type TabId = 'image' | 'sequence' | 'videos' | 'embedded';

type ChangeBannerModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (patch: ChangeBannerSaved) => void;
  currentBannerPath: string | null | undefined;
  currentAlignment: BannerAlignment | null | undefined;
  /** Raw JSON from DB (`["/uploads/..."]`) */
  currentBannerSequenceJson: string | null | undefined;
  currentBannerVideoPath: string | null | undefined;
  t: (key: string) => string;
};

const MAX_SEQUENCE = 30;

export default function ChangeBannerModal({
  isOpen,
  onClose,
  onSaved,
  currentBannerPath,
  currentAlignment,
  currentBannerSequenceJson,
  currentBannerVideoPath,
  t,
}: ChangeBannerModalProps) {
  const [tab, setTab] = useState<TabId>('image');
  const [alignment, setAlignment] = useState<BannerAlignment>(currentAlignment ?? 'default');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedVideoFile, setSelectedVideoFile] = useState<File | null>(null);
  const [videoUploading, setVideoUploading] = useState(false);

  const [sequencePaths, setSequencePaths] = useState<string[]>([]);
  const [sequenceUploading, setSequenceUploading] = useState(false);
  const [sequenceSaving, setSequenceSaving] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const sequenceInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const resetLocal = useCallback(() => {
    setTab('image');
    setAlignment(currentAlignment ?? 'default');
    setSelectedFile(null);
    setError(null);
    setUploading(false);
    setSequencePaths(parseBannerSequenceJson(currentBannerSequenceJson));
    setSequenceUploading(false);
    setSequenceSaving(false);
    setSelectedVideoFile(null);
    setVideoUploading(false);
    if (inputRef.current) inputRef.current.value = '';
    if (sequenceInputRef.current) sequenceInputRef.current.value = '';
    if (videoInputRef.current) videoInputRef.current.value = '';
  }, [currentAlignment, currentBannerSequenceJson]);

  useEffect(() => {
    if (isOpen) {
      setAlignment(currentAlignment ?? 'default');
      setSelectedFile(null);
      setError(null);
      setTab('image');
      setSequencePaths(parseBannerSequenceJson(currentBannerSequenceJson));
      if (inputRef.current) inputRef.current.value = '';
      if (sequenceInputRef.current) sequenceInputRef.current.value = '';
      setSelectedVideoFile(null);
      if (videoInputRef.current) videoInputRef.current.value = '';
    }
  }, [isOpen, currentAlignment, currentBannerSequenceJson]);

  const handleClose = () => {
    resetLocal();
    onClose();
  };

  if (!isOpen) return null;

  const hasSavedBanner = Boolean(currentBannerPath?.trim());
  const hasSavedVideo = Boolean(currentBannerVideoPath?.trim());

  const handleBrowse = () => {
    setError(null);
    inputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    setSelectedFile(f ?? null);
    setError(null);
  };

  const uploadBannerFile = async (token: string, file: File): Promise<string | null> => {
    const formData = new FormData();
    formData.append('file', file);
    const uploadRes = await fetch('/api/user/profile/banner-upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    const uploadData = await uploadRes.json().catch(() => ({}));
    if (!uploadRes.ok) {
      setError((uploadData as { error?: string }).error || t('change_banner_error_upload'));
      return null;
    }
    const data = uploadData as { path?: string; imageUrl?: string };
    return data.imageUrl || data.path || null;
  };

  const handleUploadImage = async () => {
    setError(null);
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      setError(t('change_banner_error_auth'));
      return;
    }

    if (!selectedFile) {
      setError(t('change_banner_error_no_file'));
      return;
    }

    setUploading(true);
    try {
      const path = await uploadBannerFile(token, selectedFile);
      if (!path) return;

      const patchRes = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          profileBanner: path,
          profileBannerAlignment: alignment,
          profileBannerVideo: null,
          profileBannerSequence: null,
        }),
      });

      const patchData = await patchRes.json().catch(() => ({}));
      if (!patchRes.ok) {
        setError((patchData as { error?: string }).error || t('change_banner_error_save'));
        return;
      }

      const user = (patchData as {
        user?: {
          profileBanner?: string;
          profileBannerAlignment?: string | null;
          profileBannerVideo?: string | null;
          profileBannerSequence?: string | null;
        };
      }).user;
      onSaved({
        profileBanner: user?.profileBanner ?? path,
        profileBannerAlignment: (user?.profileBannerAlignment as BannerAlignment) ?? alignment,
        profileBannerVideo: user?.profileBannerVideo ?? null,
        profileBannerSequence: user?.profileBannerSequence ?? null,
      });
      setSelectedFile(null);
      if (inputRef.current) inputRef.current.value = '';
      handleClose();
    } catch {
      setError(t('change_banner_error_upload'));
    } finally {
      setUploading(false);
    }
  };

  const handleSequenceFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter((f) => f.type.startsWith('image/'));
    if (!files.length) return;

    const token = localStorage.getItem('token');
    if (!token) {
      setError(t('change_banner_error_auth'));
      return;
    }

    setError(null);
    setSequenceUploading(true);
    try {
      const next: string[] = [...sequencePaths];
      for (const file of files) {
        if (next.length >= MAX_SEQUENCE) break;
        const path = await uploadBannerFile(token, file);
        if (path) next.push(path);
      }
      setSequencePaths(next);
    } finally {
      setSequenceUploading(false);
      if (sequenceInputRef.current) sequenceInputRef.current.value = '';
    }
  };

  const removeSequenceAt = (index: number) => {
    setSequencePaths((prev) => prev.filter((_, i) => i !== index));
  };

  const clearSequence = () => {
    setSequencePaths([]);
    setError(null);
  };

  const handleSaveSequence = async () => {
    setError(null);
    const token = localStorage.getItem('token');
    if (!token) {
      setError(t('change_banner_error_auth'));
      return;
    }

    setSequenceSaving(true);
    try {
      const body =
        sequencePaths.length > 0
          ? { profileBannerSequence: JSON.stringify(sequencePaths), profileBannerVideo: null }
          : { profileBannerSequence: null, profileBannerVideo: null };

      const patchRes = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const patchData = await patchRes.json().catch(() => ({}));
      if (!patchRes.ok) {
        setError((patchData as { error?: string }).error || t('change_banner_error_save'));
        return;
      }

      const user = (patchData as {
        user?: {
          profileBanner?: string | null;
          profileBannerSequence?: string | null;
          profileBannerVideo?: string | null;
          profileBannerAlignment?: string | null;
        };
      }).user;

      onSaved({
        profileBanner: user?.profileBanner ?? undefined,
        profileBannerSequence: user?.profileBannerSequence ?? null,
        profileBannerVideo: user?.profileBannerVideo ?? null,
        profileBannerAlignment: user?.profileBannerAlignment
          ? (user.profileBannerAlignment as BannerAlignment)
          : undefined,
      });
      handleClose();
    } catch {
      setError(t('change_banner_error_save'));
    } finally {
      setSequenceSaving(false);
    }
  };

  const uploadBannerVideoFile = async (token: string, file: File): Promise<string | null> => {
    const formData = new FormData();
    formData.append('file', file);
    const uploadRes = await fetch('/api/user/profile/banner-video-upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    const uploadData = await uploadRes.json().catch(() => ({}));
    if (!uploadRes.ok) {
      setError((uploadData as { error?: string }).error || t('change_banner_error_video_upload'));
      return null;
    }
    return (uploadData as { path?: string }).path ?? null;
  };

  const handleVideoBrowse = () => {
    setError(null);
    videoInputRef.current?.click();
  };

  const handleVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    setSelectedVideoFile(f ?? null);
    setError(null);
  };

  const handleUploadVideo = async () => {
    setError(null);
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      setError(t('change_banner_error_auth'));
      return;
    }
    if (!selectedVideoFile) {
      setError(t('change_banner_error_no_video'));
      return;
    }

    setVideoUploading(true);
    try {
      const path = await uploadBannerVideoFile(token, selectedVideoFile);
      if (!path) return;

      const patchRes = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          profileBannerVideo: path,
          profileBannerSequence: null,
          profileBanner: null,
        }),
      });

      const patchData = await patchRes.json().catch(() => ({}));
      if (!patchRes.ok) {
        setError((patchData as { error?: string }).error || t('change_banner_error_save'));
        return;
      }

      const user = (patchData as {
        user?: {
          profileBannerVideo?: string | null;
          profileBanner?: string | null;
          profileBannerSequence?: string | null;
          profileBannerAlignment?: string | null;
        };
      }).user;

      onSaved({
        profileBannerVideo: user?.profileBannerVideo ?? path,
        profileBanner: user?.profileBanner ?? undefined,
        profileBannerSequence: user?.profileBannerSequence ?? null,
        profileBannerAlignment: user?.profileBannerAlignment
          ? (user.profileBannerAlignment as BannerAlignment)
          : undefined,
      });
      setSelectedVideoFile(null);
      if (videoInputRef.current) videoInputRef.current.value = '';
      handleClose();
    } catch {
      setError(t('change_banner_error_video_upload'));
    } finally {
      setVideoUploading(false);
    }
  };

  const photoCountLabel = t('change_banner_sequence_count').replace(
    /\{count\}/g,
    String(sequencePaths.length),
  );

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="change-banner-title"
    >
      <div className="bg-white rounded shadow-2xl max-w-lg w-full mx-4 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-4 py-3 bg-[#e8e8e8] border-b border-gray-300">
          <h2 id="change-banner-title" className="text-sm font-semibold tracking-wide text-gray-600">
            {t('change_banner_modal_title')}
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="p-1 rounded text-gray-600 hover:bg-gray-300/80"
            aria-label={t('btn_close')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex border-b border-gray-200 bg-[#d0d0d0]">
          {(
            [
              ['image', 'change_banner_tab_image'],
              ['sequence', 'change_banner_tab_sequence'],
              ['videos', 'change_banner_tab_videos'],
              ['embedded', 'change_banner_tab_embedded'],
            ] as const
          ).map(([id, labelKey]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`flex-1 px-2 py-2.5 text-xs font-medium transition-colors ${
                tab === id
                  ? 'bg-[#2a2a2a] text-white'
                  : 'bg-[#b8b8b8] text-black hover:bg-[#a8a8a8]'
              }`}
            >
              {t(labelKey)}
            </button>
          ))}
        </div>

        <div className="p-4 overflow-y-auto flex-1 min-h-[200px]">
          {tab === 'image' && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-800 mb-2">{t('change_banner_picture_alignment')}</p>
                <div className="flex flex-wrap gap-6">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="radio"
                      name="banner-align"
                      checked={alignment === 'center'}
                      onChange={() => setAlignment('center')}
                      className="w-4 h-4"
                    />
                    {t('change_banner_alignment_center')}
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="radio"
                      name="banner-align"
                      checked={alignment === 'default'}
                      onChange={() => setAlignment('default')}
                      className="w-4 h-4"
                    />
                    {t('change_banner_alignment_default')}
                  </label>
                </div>
              </div>

              <p className="text-sm text-gray-600">
                {!hasSavedBanner && !selectedFile ? t('change_banner_no_record') : null}
                {selectedFile ? (
                  <span className="block mt-1 text-gray-800">{selectedFile.name}</span>
                ) : null}
              </p>

              <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                className="hidden"
                onChange={handleFileChange}
              />

              {error && tab === 'image' ? <p className="text-sm text-red-600">{error}</p> : null}
            </div>
          )}

          {tab === 'sequence' && (
            <div className="space-y-3">
              <p className="text-sm text-gray-800">{t('change_banner_sequence_intro')}</p>

              <div className="relative rounded border border-gray-300 bg-[#f8fafc] p-3 min-h-[160px]">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-sm font-medium text-gray-700">{photoCountLabel}</span>
                  <button
                    type="button"
                    onClick={clearSequence}
                    disabled={sequencePaths.length === 0 || sequenceUploading}
                    className="p-1.5 rounded text-gray-600 hover:bg-gray-200 disabled:opacity-40"
                    title={t('change_banner_sequence_clear')}
                    aria-label={t('change_banner_sequence_clear')}
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 items-center">
                  {sequencePaths.map((path, idx) => (
                    <div
                      key={`${path}-${idx}`}
                      className="relative w-24 h-24 rounded border border-gray-300 overflow-hidden bg-gray-200 flex-shrink-0"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={path} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeSequenceAt(idx)}
                        className="absolute top-0.5 right-0.5 rounded-full bg-black/55 text-white p-0.5 hover:bg-black/75"
                        aria-label={t('btn_remove')}
                      >
                        <X className="w-3.5 h-3.5" strokeWidth={2.5} />
                      </button>
                    </div>
                  ))}

                  {sequencePaths.length < MAX_SEQUENCE && (
                    <button
                      type="button"
                      onClick={() => sequenceInputRef.current?.click()}
                      disabled={sequenceUploading}
                      className="w-24 h-24 rounded border-2 border-dashed border-sky-400 bg-sky-100 hover:bg-sky-200 flex flex-col items-center justify-center gap-1 flex-shrink-0 disabled:opacity-50"
                      title={t('change_banner_sequence_add')}
                      aria-label={t('change_banner_sequence_add')}
                    >
                      <span className="w-10 h-10 rounded-full bg-sky-500 text-white flex items-center justify-center shadow-sm">
                        <Plus className="w-6 h-6" strokeWidth={2.5} />
                      </span>
                    </button>
                  )}
                </div>

                <input
                  ref={sequenceInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                  multiple
                  className="hidden"
                  onChange={handleSequenceFiles}
                />

                {sequenceUploading ? (
                  <p className="text-xs text-gray-500 mt-2">{t('change_banner_uploading')}</p>
                ) : null}
              </div>

              {error && tab === 'sequence' ? <p className="text-sm text-red-600">{error}</p> : null}
            </div>
          )}

          {tab === 'videos' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                {!hasSavedVideo && !selectedVideoFile ? t('change_banner_no_record') : null}
                {selectedVideoFile ? (
                  <span className="block mt-1 text-gray-800">{selectedVideoFile.name}</span>
                ) : null}
              </p>

              <input
                ref={videoInputRef}
                type="file"
                accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
                className="hidden"
                onChange={handleVideoFileChange}
              />

              {error && tab === 'videos' ? <p className="text-sm text-red-600">{error}</p> : null}
            </div>
          )}
          {tab === 'embedded' && (
            <p className="text-sm text-gray-500">{t('change_banner_tab_placeholder')}</p>
          )}
        </div>

        {tab === 'image' && (
          <div className="flex gap-3 p-4 border-t border-gray-200 bg-[#f5f5f5]">
            <button
              type="button"
              onClick={handleBrowse}
              disabled={uploading}
              className="flex-1 py-3 rounded-lg bg-[#4a4a4a] text-white text-sm font-medium hover:bg-[#3a3a3a] disabled:opacity-50"
            >
              {t('change_banner_browse')}
            </button>
            <button
              type="button"
              onClick={handleUploadImage}
              disabled={uploading || !selectedFile}
              className="flex-1 py-3 rounded-lg bg-[#4a4a4a] text-white text-sm font-medium hover:bg-[#3a3a3a] disabled:opacity-50"
            >
              {uploading ? t('change_banner_uploading') : t('change_banner_upload_image')}
            </button>
          </div>
        )}

        {tab === 'sequence' && (
          <div className="p-4 border-t border-gray-200 bg-[#f5f5f5]">
            <button
              type="button"
              onClick={handleSaveSequence}
              disabled={sequenceSaving || sequenceUploading}
              className="w-full py-3 rounded-lg bg-[#4a4a4a] text-white text-sm font-medium hover:bg-[#3a3a3a] disabled:opacity-50"
            >
              {sequenceSaving ? t('change_banner_sequence_saving') : t('change_banner_sequence_save')}
            </button>
          </div>
        )}

        {tab === 'videos' && (
          <div className="flex gap-3 p-4 border-t border-gray-200 bg-[#f5f5f5]">
            <button
              type="button"
              onClick={handleVideoBrowse}
              disabled={videoUploading}
              className="flex-1 py-3 rounded-lg bg-[#4a4a4a] text-white text-sm font-medium hover:bg-[#3a3a3a] disabled:opacity-50"
            >
              {t('change_banner_browse')}
            </button>
            <button
              type="button"
              onClick={handleUploadVideo}
              disabled={videoUploading || !selectedVideoFile}
              className="flex-1 py-3 rounded-lg bg-[#4a4a4a] text-white text-sm font-medium hover:bg-[#3a3a3a] disabled:opacity-50"
            >
              {videoUploading ? t('change_banner_uploading') : t('change_banner_upload_video')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

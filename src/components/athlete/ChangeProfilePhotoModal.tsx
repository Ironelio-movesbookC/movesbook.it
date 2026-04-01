'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

export type ChangeProfilePhotoSaved = {
  image?: string;
};

type ChangeProfilePhotoModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (patch: ChangeProfilePhotoSaved) => void;
  currentImagePath: string | null | undefined;
  t: (key: string) => string;
};

export default function ChangeProfilePhotoModal({
  isOpen,
  onClose,
  onSaved,
  currentImagePath,
  t,
}: ChangeProfilePhotoModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const resetLocal = useCallback(() => {
    setSelectedFile(null);
    setError(null);
    setUploading(false);
    if (inputRef.current) inputRef.current.value = '';
  }, []);

  useEffect(() => {
    if (isOpen) {
      setSelectedFile(null);
      setError(null);
      if (inputRef.current) inputRef.current.value = '';
    }
  }, [isOpen]);

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(selectedFile);
    setPreviewUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [selectedFile]);

  const handleClose = () => {
    resetLocal();
    onClose();
  };

  if (!isOpen) return null;

  const hasSavedPhoto = Boolean(currentImagePath?.trim());

  const handleBrowse = () => {
    setError(null);
    inputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    setSelectedFile(f ?? null);
    setError(null);
  };

  const handleUpload = async () => {
    setError(null);
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      setError(t('change_banner_error_auth'));
      return;
    }
    if (!selectedFile) {
      setError(t('change_profile_photo_error_no_file'));
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      const uploadRes = await fetch('/api/user/profile/avatar-upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const uploadData = await uploadRes.json().catch(() => ({}));
      if (!uploadRes.ok) {
        setError((uploadData as { error?: string }).error || t('change_profile_photo_error_upload'));
        return;
      }
      const path = (uploadData as { path?: string }).path;
      if (!path) {
        setError(t('change_profile_photo_error_upload'));
        return;
      }

      const patchRes = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image: path }),
      });

      const patchData = await patchRes.json().catch(() => ({}));
      if (!patchRes.ok) {
        setError((patchData as { error?: string }).error || t('change_banner_error_save'));
        return;
      }

      const user = (patchData as { user?: { image?: string | null } }).user;
      onSaved({ image: user?.image ?? path });
      resetLocal();
      handleClose();
    } catch {
      setError(t('change_profile_photo_error_upload'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="change-profile-photo-title"
    >
      <div className="bg-white rounded shadow-2xl max-w-lg w-full mx-4 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-4 py-3 bg-[#e8e8e8] border-b border-gray-300">
          <h2 id="change-profile-photo-title" className="text-sm font-semibold tracking-wide text-gray-600">
            {t('change_profile_photo_modal_title')}
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

        <div className="p-4 overflow-y-auto flex-1 min-h-[140px]">
          <p className="text-sm text-gray-600 mb-3">{t('change_profile_photo_intro')}</p>
          <p className="text-sm text-gray-600">
            {!hasSavedPhoto && !selectedFile ? t('change_banner_no_record') : null}
            {selectedFile ? (
              <span className="block mt-1 text-gray-800">{selectedFile.name}</span>
            ) : null}
          </p>

          {previewUrl ? (
            <div className="mt-4 flex justify-center">
              <div className="w-full max-w-[min(100%,280px)] aspect-square rounded-lg border border-gray-200 bg-gray-100 overflow-hidden flex items-center justify-center">
                {/* Local file preview — not a remote URL */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt=""
                  className="max-h-full max-w-full w-auto h-auto object-contain"
                />
              </div>
            </div>
          ) : null}

          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
            className="hidden"
            onChange={handleFileChange}
          />

          {error ? <p className="text-sm text-red-600 mt-3">{error}</p> : null}
        </div>

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
            onClick={handleUpload}
            disabled={uploading || !selectedFile}
            className="flex-1 py-3 rounded-lg bg-[#4a4a4a] text-white text-sm font-medium hover:bg-[#3a3a3a] disabled:opacity-50"
          >
            {uploading ? t('change_banner_uploading') : t('change_profile_photo_upload')}
          </button>
        </div>
      </div>
    </div>
  );
}

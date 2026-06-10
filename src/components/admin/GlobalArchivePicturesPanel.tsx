'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import type { WorkoutArchiveGridRecord } from '@/types/workoutArchiveGrid';

export default function GlobalArchivePicturesPanel({
  record,
  onSave,
  saving = false,
}: {
  record: WorkoutArchiveGridRecord;
  onSave: (thumbnailUrl: string | null, pictureUrls: string[]) => Promise<void>;
  saving?: boolean;
}) {
  const [thumbnailUrl, setThumbnailUrl] = useState(record.thumbnailUrl ?? '');
  const [picturesText, setPicturesText] = useState(
    (record.pictureUrls ?? []).join('\n')
  );

  useEffect(() => {
    setThumbnailUrl(record.thumbnailUrl ?? '');
    setPicturesText((record.pictureUrls ?? []).join('\n'));
  }, [record.id, record.thumbnailUrl, record.pictureUrls]);

  const galleryUrls = picturesText
    .split('\n')
    .map((u) => u.trim())
    .filter(Boolean);

  return (
    <div className="rounded border border-dashed border-gray-300 p-3 space-y-3">
      <p className="text-xs font-bold uppercase text-gray-500">Pictures</p>

      <label className="block text-xs space-y-1">
        <span className="font-semibold text-gray-600">Thumbnail (grid icon)</span>
        <input
          type="url"
          value={thumbnailUrl}
          onChange={(e) => setThumbnailUrl(e.target.value)}
          placeholder="https://…"
          className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
        />
      </label>

      <label className="block text-xs space-y-1">
        <span className="font-semibold text-gray-600">Gallery URLs (one per line)</span>
        <textarea
          value={picturesText}
          onChange={(e) => setPicturesText(e.target.value)}
          rows={3}
          placeholder="https://…&#10;https://…"
          className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm font-mono"
        />
      </label>

      {(thumbnailUrl || galleryUrls.length > 0) && (
        <div className="flex flex-wrap gap-2 justify-center">
          {thumbnailUrl && (
            <div className="text-center">
              <p className="text-[10px] text-gray-500 mb-1">Thumbnail</p>
              <Image
                src={thumbnailUrl}
                alt=""
                width={72}
                height={72}
                unoptimized
                className="rounded object-cover border border-gray-200"
              />
            </div>
          )}
          {galleryUrls.map((url) => (
            <Image
              key={url}
              src={url}
              alt=""
              width={72}
              height={72}
              unoptimized
              className="rounded object-cover border border-gray-200"
            />
          ))}
        </div>
      )}

      <button
        type="button"
        disabled={saving}
        onClick={() =>
          void onSave(
            thumbnailUrl.trim() || null,
            galleryUrls.length > 0 ? galleryUrls : picturesText.split('\n').map((u) => u.trim()).filter(Boolean)
          )
        }
        className="w-full rounded bg-sky-700 py-1.5 text-xs font-semibold text-white hover:bg-sky-800 disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save pictures'}
      </button>
    </div>
  );
}

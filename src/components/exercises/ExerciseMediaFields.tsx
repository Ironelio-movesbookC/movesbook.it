'use client';

import { resolvePublicMediaUrl } from '@/lib/publicMediaUrl';
import { resolveExerciseVideoEmbed } from '@/constants/tools.constants';

export const EXERCISE_IMAGE_INLINE_MAX_BYTES = 2 * 1024 * 1024;

function loadLocalImageFile(
  file: File | undefined,
  inputEl: HTMLInputElement,
  onLoaded: (dataUrl: string) => void
) {
  if (!file) return;
  if (file.size > EXERCISE_IMAGE_INLINE_MAX_BYTES) {
    window.alert('Image must be 2 MB or smaller for inline storage. Use a URL instead.');
    inputEl.value = '';
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    if (typeof reader.result === 'string') onLoaded(reader.result);
  };
  reader.readAsDataURL(file);
}

/** Picture URL + load from local (same pattern as official video fields). */
export function ExercisePictureField({
  label,
  value,
  onChange,
  urlLabel,
  urlPlaceholder,
  localLabel,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  urlLabel: string;
  urlPlaceholder: string;
  localLabel: string;
}) {
  const previewSrc = value ? resolvePublicMediaUrl(value) || value : '';
  const isInline = (value || '').trim().startsWith('data:');

  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50/80 p-2">
      <p className="mb-2 text-xs font-bold text-gray-800">{label}</p>
      <label className="mb-1 block text-xs font-semibold text-gray-600">{urlLabel}</label>
      <input
        type="url"
        value={isInline ? '' : value || ''}
        onChange={(ev) => onChange(ev.target.value)}
        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
        placeholder={urlPlaceholder}
      />
      <label className="mb-1 mt-2 block text-xs font-semibold text-gray-600">{localLabel}</label>
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/*"
        className="w-full text-sm"
        onChange={(ev) => {
          const file = ev.target.files?.[0];
          if (!file) {
            if (isInline) onChange('');
            return;
          }
          loadLocalImageFile(file, ev.target, onChange);
        }}
      />
      {isInline ? (
        <p className="mt-1 text-[10px] text-emerald-800">Loaded from local file (saved with exercise).</p>
      ) : null}
      {previewSrc ? (
        <div className="mt-2 overflow-hidden rounded-lg border border-gray-200 bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewSrc} alt="" className="mx-auto max-h-32 w-full object-contain p-1" />
        </div>
      ) : null}
    </div>
  );
}

/** Inline YouTube / Vimeo / direct video preview for reference URLs (and similar). */
export function ExerciseReferenceVideoPreview({
  url,
  title,
  previewLabel,
  unavailableLabel,
  openLinkLabel,
}: {
  url: string;
  title?: string;
  previewLabel: string;
  unavailableLabel: string;
  openLinkLabel: string;
}) {
  const trimmed = (url || '').trim();
  if (!trimmed) return null;

  const embed = resolveExerciseVideoEmbed(trimmed);
  if (!embed) {
    return (
      <p className="mt-2 text-xs text-amber-800">
        {unavailableLabel}{' '}
        <a
          href={trimmed}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-blue-700 underline-offset-2 hover:underline"
        >
          {openLinkLabel}
        </a>
      </p>
    );
  }

  return (
    <div className="mt-3">
      <p className="mb-1 text-xs font-semibold text-gray-600">{previewLabel}</p>
      <div className="aspect-video w-full overflow-hidden rounded-lg border border-gray-300 bg-black shadow-sm">
        {embed.kind === 'iframe' ? (
          <iframe
            src={embed.src}
            title={title || previewLabel}
            className="h-full w-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        ) : (
          <video src={embed.src} controls className="h-full w-full" playsInline preload="metadata">
            <track kind="captions" />
          </video>
        )}
      </div>
    </div>
  );
}

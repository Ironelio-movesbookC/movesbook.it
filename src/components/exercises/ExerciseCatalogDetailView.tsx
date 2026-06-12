'use client';

/**
 * Mobile-style exercise catalog detail layout (reference mockup: video on top, muscle
 * pictures left, metadata right). Reused in Tools Settings preview today; the end-user
 * account catalog is a separate product task.
 */
import React, { useMemo, useRef } from 'react';
import { ArrowLeft, Bookmark, Download, MoreVertical, Share2 } from 'lucide-react';
import type { Exercise } from '@/constants/tools.constants';
import {
  getExerciseCatalogMuscleSummary,
  getExerciseDisplayNameForLang,
  mergeExerciseWithDefaults,
  resolveExerciseOfficialVideoSrc,
  resolveExerciseVideoEmbed,
} from '@/constants/tools.constants';
import { resolvePublicMediaUrl } from '@/lib/publicMediaUrl';

type Props = {
  exercise: Exercise;
  lang?: string;
  /** Male vs female official video / pictures. */
  sex?: 'male' | 'female';
  onSexChange?: (sex: 'male' | 'female') => void;
  onBack?: () => void;
  showHeader?: boolean;
  className?: string;
};

function CatalogPicture({ src, label }: { src: string; label: string }) {
  const resolved = src ? resolvePublicMediaUrl(src) || src : '';
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
      <p className="border-b border-gray-100 bg-white px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <div className="flex aspect-[3/4] items-center justify-center p-1">
        {resolved ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={resolved} alt="" className="max-h-full max-w-full object-contain" />
        ) : (
          <span className="text-[10px] text-gray-400">No picture</span>
        )}
      </div>
    </div>
  );
}

export default function ExerciseCatalogDetailView({
  exercise,
  lang = 'en',
  sex = 'male',
  onSexChange,
  onBack,
  showHeader = true,
  className = '',
}: Props) {
  const ex = mergeExerciseWithDefaults(exercise);
  const videoSectionRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const title = getExerciseDisplayNameForLang(ex, lang);
  const summary = useMemo(() => getExerciseCatalogMuscleSummary(ex), [ex]);

  const picA = sex === 'male' ? ex.pictureAMale : ex.pictureAFemale;
  const picB = sex === 'male' ? ex.pictureBMale : ex.pictureBFemale;
  const videoSrc = resolveExerciseOfficialVideoSrc(ex, sex);
  const videoEmbed = resolveExerciseVideoEmbed(videoSrc);
  const hasVideo = Boolean(videoSrc && videoEmbed);

  const openEquipmentVideo = () => {
    if (!hasVideo) return;
    videoSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (videoEmbed?.kind === 'video' && videoRef.current) {
      void videoRef.current.play().catch(() => undefined);
    }
    if (videoSrc.startsWith('http')) {
      window.open(videoSrc, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className={`mx-auto flex w-full max-w-md flex-col bg-white ${className}`}>
      {showHeader ? (
        <header className="flex items-center gap-2 border-b border-gray-200 px-3 py-3">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="rounded-full p-2 text-gray-700 hover:bg-gray-100"
              aria-label="Back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          ) : (
            <span className="w-9" aria-hidden />
          )}
          <h1 className="min-w-0 flex-1 truncate text-base font-bold text-gray-900">{title}</h1>
          <button
            type="button"
            className="rounded-full p-2 text-gray-500 hover:bg-gray-100"
            aria-label="More options"
            disabled
          >
            <MoreVertical className="h-5 w-5" />
          </button>
        </header>
      ) : null}

      <div ref={videoSectionRef} className="bg-black">
        {videoEmbed ? (
          videoEmbed.kind === 'iframe' ? (
            <iframe
              key={videoEmbed.src}
              src={videoEmbed.src}
              title={`${title} video`}
              className="aspect-video w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <video
              ref={videoRef}
              key={videoEmbed.src}
              src={videoEmbed.src}
              controls
              className="aspect-video w-full bg-black"
              playsInline
            >
              <track kind="captions" />
            </video>
          )
        ) : (
          <div className="flex aspect-video items-center justify-center bg-gray-900 text-sm text-gray-400">
            No official video
          </div>
        )}
      </div>

      {onSexChange ? (
        <div className="flex gap-2 border-b border-gray-100 px-3 py-2">
          {(['male', 'female'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onSexChange(s)}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                sex === s ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700'
              }`}
            >
              {s === 'male' ? 'Male' : 'Female'}
            </button>
          ))}
        </div>
      ) : null}

      <div className="flex items-center justify-end gap-3 border-b border-gray-100 px-4 py-2 text-gray-600">
        <button type="button" className="p-1 opacity-40" disabled aria-label="Download">
          <Download className="h-5 w-5" />
        </button>
        <button type="button" className="p-1 opacity-40" disabled aria-label="Bookmark">
          <Bookmark className="h-5 w-5" />
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold hover:bg-gray-50"
          onClick={() => {
            if (typeof navigator !== 'undefined' && navigator.share) {
              void navigator.share({ title, text: summary.equipment }).catch(() => undefined);
            }
          }}
        >
          <Share2 className="h-3.5 w-3.5" />
          Share
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 p-4">
        <div className="space-y-2">
          <CatalogPicture src={picA || ''} label="Picture A" />
          <CatalogPicture src={picB || ''} label="Picture B" />
        </div>

        <div className="min-w-0">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-500">Exercise details</h2>
          <dl className="space-y-0 text-sm">
            <div className="border-b border-gray-100 py-2">
              <dt className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Body part</dt>
              <dd className="mt-0.5 font-medium text-gray-900">{summary.bodyPart}</dd>
            </div>
            <div className="border-b border-gray-100 py-2">
              <dt className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Equipment</dt>
              <dd className="mt-0.5">
                {summary.equipment !== '—' && hasVideo ? (
                  <button
                    type="button"
                    onClick={openEquipmentVideo}
                    className="text-left font-semibold text-blue-700 underline-offset-2 hover:underline"
                    title="Open linked official video"
                  >
                    {summary.equipment}
                  </button>
                ) : (
                  <span className="font-medium text-gray-900">{summary.equipment}</span>
                )}
              </dd>
            </div>
            <div className="border-b border-gray-100 py-2">
              <dt className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Primary muscles</dt>
              <dd className="mt-0.5 font-medium text-gray-900">{summary.primaryMuscles}</dd>
            </div>
            <div className="py-2">
              <dt className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Secondary muscles</dt>
              <dd className="mt-0.5 font-medium text-gray-900">{summary.secondaryMuscles}</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}

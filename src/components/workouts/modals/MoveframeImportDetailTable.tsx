'use client';

import React from 'react';
import Image from 'next/image';
import { getSportDisplayName } from '@/constants/moveframe.constants';

export type MoveframeDetailMovelap = {
  repetitionNumber?: number;
  muscularSector?: string | null;
  exercise?: string | null;
  reps?: number | null;
  pause?: string | null;
  style?: string | null;
  distance?: number | null;
};

const MUSCULAR_SECTOR_IMAGES: Record<string, string> = {
  Shoulders: '/muscular/shoulders.png',
  'Anterior arms': '/muscular/Biceps.png',
  'Rear arms': '/muscular/Triceps.png',
  Forearms: '/muscular/Forearms.png',
  Chest: '/muscular/chest.png',
  Abdominals: '/muscular/abs.png',
  Intercostals: '/muscular/abs.png',
  Trapezius: '/muscular/trapezius.png',
  Lats: '/muscular/Lats.png',
  Lumbosacral: '/muscular/Lats.png',
  'Front thighs': '/muscular/quadriceps.png',
  'Hind thighs': '/muscular/hams.png',
  Calves: '/muscular/calves.png',
  Tibials: '/muscular/calves.png',
  Glutes: '/muscular/glutes.png',
};

const EXERCISE_BADGE_COLORS = ['#22c55e', '#14b8a6', '#3b82f6', '#8b5cf6', '#f97316'];

function formatMovelapReps(ml: MoveframeDetailMovelap): string {
  if (ml.reps != null) return String(ml.reps);
  if (ml.distance != null) return String(ml.distance);
  return '—';
}

function formatExerciseTitle(ml: MoveframeDetailMovelap, index: number): string {
  const num = String(ml.repetitionNumber ?? index + 1).padStart(2, '0');
  const exercise = (ml.exercise || '').trim();
  const sector = (ml.muscularSector || ml.style || '').trim();
  if (exercise) {
    if (exercise.toLowerCase().includes('exercise')) return exercise;
    return `Exercise #${num} ${exercise}`;
  }
  if (sector) return `Exercise #${num} ${sector}`;
  return `Exercise #${num}`;
}

function MuscularCell({ sector }: { sector: string }) {
  const src = MUSCULAR_SECTOR_IMAGES[sector];
  if (!src) {
    return (
      <span className="text-[11px] font-medium text-gray-800 leading-tight">{sector}</span>
    );
  }
  return (
    <div className="flex flex-col items-center gap-1 py-0.5">
      <Image
        src={src}
        alt={sector}
        width={44}
        height={44}
        className="h-11 w-11 object-contain"
        unoptimized
      />
      <span className="text-[10px] font-semibold text-gray-800 leading-tight text-center max-w-[72px]">
        {sector}
      </span>
    </div>
  );
}

function ExerciseCell({ ml, index }: { ml: MoveframeDetailMovelap; index: number }) {
  const num = String(ml.repetitionNumber ?? index + 1).padStart(2, '0');
  const badgeColor = EXERCISE_BADGE_COLORS[index % EXERCISE_BADGE_COLORS.length];
  const title = formatExerciseTitle(ml, index);

  return (
    <div className="flex items-center gap-2 min-w-0">
      <span
        className="inline-flex shrink-0 items-center justify-center min-w-[2rem] px-1.5 py-0.5 rounded text-[11px] font-bold text-white shadow-sm"
        style={{ backgroundColor: badgeColor }}
      >
        #{num}
      </span>
      <span className="text-[11px] font-semibold text-gray-900 leading-snug truncate" title={title}>
        {title}
      </span>
    </div>
  );
}

export interface MoveframeImportDetailTableProps {
  section?: { name: string; color: string | null } | null;
  sport?: string | null;
  movelaps: MoveframeDetailMovelap[];
  emptyMessage?: string;
  fallbackDescription?: string;
}

export default function MoveframeImportDetailTable({
  section,
  sport,
  movelaps,
  emptyMessage = 'Select a moveframe from the list above',
  fallbackDescription,
}: MoveframeImportDetailTableProps) {
  const sportLabel = sport ? getSportDisplayName(sport).toUpperCase() : '—';

  return (
    <div className="border-2 border-gray-900 rounded-md overflow-hidden bg-[#fffef0] shadow-sm">
      <div className="px-4 py-2 text-sm font-bold text-gray-900 border-b border-gray-300 bg-[#fef9c3]">
        Detail moveframe selected
      </div>
      <div className="overflow-x-auto max-h-[280px] overflow-y-auto bg-[#fffef0]">
        <table className="w-full text-xs border-collapse min-w-[640px]">
          <thead>
            <tr className="bg-gray-200/90">
              <th className="px-3 py-2 text-left font-bold text-gray-800 border border-gray-300">
                Workout section
              </th>
              <th className="px-3 py-2 text-left font-bold text-gray-800 border border-gray-300">
                Sport
              </th>
              <th className="px-3 py-2 text-center font-bold text-gray-800 border border-gray-300 w-[88px]">
                Muscular
              </th>
              <th className="px-3 py-2 text-left font-bold text-gray-800 border border-gray-300 min-w-[200px]">
                Exercise
              </th>
              <th className="px-3 py-2 text-center font-bold text-gray-800 border border-gray-300 w-14">
                Reps
              </th>
              <th className="px-3 py-2 text-center font-bold text-gray-800 border border-gray-300 w-16">
                Pause
              </th>
            </tr>
            <tr className="h-1.5 bg-pink-200" aria-hidden>
              <td colSpan={6} className="p-0 border-x border-gray-300" />
            </tr>
          </thead>
          <tbody>
            {movelaps.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-gray-600 border border-gray-300">
                  {fallbackDescription ?? emptyMessage}
                </td>
              </tr>
            ) : (
              movelaps.map((ml, index) => {
                const muscular = (ml.muscularSector || ml.style || '').trim();
                return (
                  <tr key={index} className="bg-[#fffef0] hover:bg-yellow-50/80">
                    <td className="px-3 py-2 align-middle border border-gray-300">
                      {section ? (
                        <span className="inline-flex items-center gap-1.5">
                          <span
                            className="w-3.5 h-3.5 rounded-sm shrink-0 border border-gray-400/30"
                            style={{ backgroundColor: section.color || '#3b82f6' }}
                          />
                          <span className="font-semibold text-gray-900">{section.name}</span>
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-3 py-2 align-middle border border-gray-300 whitespace-nowrap">
                      <span className="font-bold text-gray-900 tracking-wide">{sportLabel}</span>
                    </td>
                    <td className="px-2 py-2 align-middle border border-gray-300 text-center">
                      {muscular ? <MuscularCell sector={muscular} /> : '—'}
                    </td>
                    <td className="px-3 py-2 align-middle border border-gray-300">
                      <ExerciseCell ml={ml} index={index} />
                    </td>
                    <td className="px-3 py-2 align-middle border border-gray-300 text-center font-bold text-gray-900">
                      {formatMovelapReps(ml)}
                    </td>
                    <td className="px-3 py-2 align-middle border border-gray-300 text-center font-semibold text-gray-900 whitespace-nowrap">
                      {ml.pause?.trim() || '—'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

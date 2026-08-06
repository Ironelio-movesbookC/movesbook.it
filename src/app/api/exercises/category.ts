import { NextResponse } from 'next/server';

export const EXERCISE_LIBRARY_CATEGORIES = [
  'Isotonic\\weights',
  'Stretching',
  'Pilates',
  'Gymnastic',
  'Calistenic',
  'Spartan',
  'Crossfit',
  'Aerobic sports',
  'Martial arts',
] as const;

export type ExerciseLibraryCategory = (typeof EXERCISE_LIBRARY_CATEGORIES)[number];

const CATEGORY_SET = new Set<string>(EXERCISE_LIBRARY_CATEGORIES);

/** Normalize and validate a category query/body value. Returns null if missing or not in the library list. */
export function parseCategoryParam(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const value = typeof raw === 'string' ? raw.trim() : '';
  if (!value) return null;
  // Accept slash form as alias for Isotonic\weights
  const normalized = value === 'Isotonic/weights' ? 'Isotonic\\weights' : value;
  return CATEGORY_SET.has(normalized) ? normalized : null;
}

/** Require a valid library category; returns 400 NextResponse if missing/invalid. */
export function requireCategory(raw: string | null | undefined): string | NextResponse {
  const category = parseCategoryParam(raw);
  if (!category) {
    return NextResponse.json(
      { error: 'category is required and must be a valid exercise library category' },
      { status: 400 }
    );
  }
  return category;
}

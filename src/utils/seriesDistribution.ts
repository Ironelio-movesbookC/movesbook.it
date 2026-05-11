/**
 * Tabel to calc and distribute the series in according to the total
 * series of that area and the number of exercises.
 *
 * Source: user-supplied reference table (image).
 *
 * Level categories:
 *   'low'  → Lev 1-2  (beginner, intermediate)
 *   'mid'  → Lev 3-4  (advanced, elite)
 *   'high' → Lev 5    (professional)
 */

export type SeriesLevelCategory = 'low' | 'mid' | 'high';

import type { TrainingLevel } from '@/components/workouts/modals/PlanGymWeekModal';

/** Map a TrainingLevel string to the series-distribution level category */
export function trainingLevelToCategory(level: TrainingLevel | null | undefined): SeriesLevelCategory {
  switch (level) {
    case 'beginner':
    case 'intermediate':
      return 'low';
    case 'advanced':
    case 'elite':
      return 'mid';
    case 'professional':
      return 'high';
    default:
      return 'mid'; // sensible fallback
  }
}

/**
 * Lookup table for 1–20 total series.
 * Each entry: [low_dist, mid_dist, high_dist]
 * where each dist is an array of per-exercise series counts (descending order, heaviest first).
 */
const DIST_TABLE: Record<number, [number[], number[], number[]]> = {
  1:  [[1],             [1],             [1]          ],
  2:  [[2],             [2],             [2]          ],
  3:  [[3],             [3],             [3]          ],
  4:  [[2,2],           [4],             [4]          ],
  5:  [[3,2],           [3,2],           [5]          ],
  6:  [[2,2,2],         [3,3],           [3,3]        ],
  7:  [[3,2,2],         [4,3],           [4,3]        ],
  8:  [[3,3,2],         [4,4],           [4,4]        ],
  9:  [[3,3,3],         [3,3,3],         [5,4]        ],
  10: [[3,3,2,2],       [4,3,3],         [5,5]        ],
  11: [[3,3,3,2],       [4,4,3],         [4,4,3]      ],
  12: [[3,3,3,3],       [4,4,4],         [4,4,4]      ],
  13: [[3,3,3,2,2],     [4,3,3,3],       [5,4,4]      ],
  14: [[3,3,3,3,2],     [4,4,3,3],       [5,5,4]      ],
  15: [[3,3,3,3,3],     [4,4,4,3],       [5,5,5]      ],
  16: [[4,3,3,3,3],     [4,4,4,4],       [6,5,5]      ],
  17: [[4,4,3,3,3],     [5,4,4,4],       [6,6,5]      ],
  18: [[3,3,3,3,3,3],   [4,4,4,3,3],     [5,5,4,4]    ],
  19: [[4,3,3,3,3,3],   [4,4,4,4,3],     [5,5,5,4]    ],
  20: [[4,4,3,3,3,3],   [4,4,4,4,4],     [5,5,5,5]    ],
};

const COL_IDX: Record<SeriesLevelCategory, 0 | 1 | 2> = { low: 0, mid: 1, high: 2 };

/**
 * For series > 20: start from the base-20 distribution and increment
 * exercise series one at a time starting from exercise 1 (cycling through).
 *
 * Example (Level 1-2):
 *   20 series → [4,4,3,3,3,3]
 *   21 series → [5,4,3,3,3,3]
 *   22 series → [5,5,3,3,3,3]
 *   ...
 *   27 series → [6,5,4,4,4,4]
 */
function extendBeyond20(base: number[], extra: number): number[] {
  const result = [...base];
  for (let i = 0; i < extra; i++) {
    result[i % result.length]++;
  }
  return result;
}

/**
 * Returns the per-exercise series distribution for a given total and level.
 *
 * @param totalSeries  Total series for the muscular area (1–∞)
 * @param category     Training level category ('low' | 'mid' | 'high')
 * @returns            Array of series counts per exercise, e.g. [4, 4, 4]
 */
export function getSeriesDistribution(
  totalSeries: number,
  category: SeriesLevelCategory = 'mid',
): number[] {
  const n = Math.max(1, Math.round(totalSeries));
  const col = COL_IDX[category];

  if (n <= 20) {
    return [...(DIST_TABLE[n]?.[col] ?? simpleFallback(n))];
  }

  // > 20: use base-20 + extras
  const base = DIST_TABLE[20][col];
  return extendBeyond20([...base], n - 20);
}

/**
 * Given the distribution array, returns the number of exercises.
 */
export function exerciseCountFromDist(dist: number[]): number {
  return dist.length;
}

/**
 * Simple fallback if the table entry is somehow missing.
 * Evenly distributes series across exercises at ~3 series each.
 */
function simpleFallback(n: number): number[] {
  const count = Math.max(1, Math.round(n / 3));
  const base  = Math.floor(n / count);
  const rem   = n % count;
  return Array.from({ length: count }, (_, i) => base + (i < rem ? 1 : 0));
}

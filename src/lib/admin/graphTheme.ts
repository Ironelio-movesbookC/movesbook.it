import type { StatsUserKind, StatsVersionBucket } from '@/lib/admin/statisticsKinds';
import {
  STATS_KIND_COLORS,
  STATS_VERSION_COLORS,
} from '@/lib/admin/statisticsKinds';

/** Series colors for country / generic pie slices. */
export type StatsSeriesPalette = string[];

export type StatsColorPalette = {
  id: string;
  label: string;
  kinds: Record<StatsUserKind, string>;
  versions: Record<StatsVersionBucket, string>;
  series: StatsSeriesPalette;
};

export type StatsBackgroundTheme = {
  id: string;
  label: string;
  page: string;
  panel: string;
  text: string;
  muted: string;
  border: string;
  accent: string;
  accentAlt: string;
  /** True for dark page themes — drives legend/hover contrast. */
  isDark?: boolean;
  hoverSurface: string;
  activeSurface: string;
};

const CLASSIC_SERIES: StatsSeriesPalette = [
  '#058592',
  '#941751',
  '#ff8d00',
  '#2f6b3a',
  '#4a5d8c',
  '#b45309',
  '#0f766e',
  '#7c2d12',
  '#1d4ed8',
  '#be123c',
  '#365314',
  '#6b21a8',
  '#0369a1',
  '#a16207',
  '#334155',
];

/** Same defaults as current charts, plus Graph-project-style alternate palettes. */
export const STATS_COLOR_PALETTES: StatsColorPalette[] = [
  {
    id: 'classic',
    label: 'Classic',
    kinds: { ...STATS_KIND_COLORS },
    versions: { ...STATS_VERSION_COLORS },
    series: CLASSIC_SERIES,
  },
  {
    id: 'ocean',
    label: 'Ocean',
    kinds: {
      single: '#0d9488',
      coaches: '#0891b2',
      teams: '#0284c7',
      clubs: '#2563eb',
      groups: '#4f46e5',
    },
    versions: {
      Trial: '#64748b',
      Base: '#0d9488',
      Premium: '#0284c7',
      Professional: '#4338ca',
      Other: '#94a3b8',
    },
    series: ['#0d9488', '#0891b2', '#0284c7', '#2563eb', '#4f46e5', '#6366f1', '#0e7490', '#1d4ed8'],
  },
  {
    id: 'ember',
    label: 'Ember',
    kinds: {
      single: '#c2410c',
      coaches: '#ea580c',
      teams: '#d97706',
      clubs: '#b91c1c',
      groups: '#a16207',
    },
    versions: {
      Trial: '#78716c',
      Base: '#c2410c',
      Premium: '#ea580c',
      Professional: '#9f1239',
      Other: '#a8a29e',
    },
    series: ['#c2410c', '#ea580c', '#d97706', '#ca8a04', '#a16207', '#b91c1c', '#9a3412', '#78350f'],
  },
  {
    id: 'forest',
    label: 'Forest',
    kinds: {
      single: '#15803d',
      coaches: '#16a34a',
      teams: '#059669',
      clubs: '#0d9488',
      groups: '#0f766e',
    },
    versions: {
      Trial: '#6b7280',
      Base: '#15803d',
      Premium: '#059669',
      Professional: '#115e59',
      Other: '#86efac',
    },
    series: ['#15803d', '#16a34a', '#059669', '#0d9488', '#0f766e', '#166534', '#047857', '#065f46'],
  },
  {
    id: 'slate',
    label: 'Slate',
    kinds: {
      single: '#334155',
      coaches: '#475569',
      teams: '#64748b',
      clubs: '#0ea5e9',
      groups: '#94a3b8',
    },
    versions: {
      Trial: '#94a3b8',
      Base: '#475569',
      Premium: '#64748b',
      Professional: '#0ea5e9',
      Other: '#cbd5e1',
    },
    series: ['#334155', '#475569', '#64748b', '#0ea5e9', '#94a3b8', '#1e293b', '#38bdf8', '#cbd5e1'],
  },
];

export const STATS_BACKGROUNDS: StatsBackgroundTheme[] = [
  {
    id: 'classic',
    label: 'Classic',
    page: '#ececec',
    panel: '#ffffff',
    text: '#222222',
    muted: '#555555',
    border: '#cfcfcf',
    accent: '#058592',
    accentAlt: '#941751',
    hoverSurface: '#f3f3f3',
    activeSurface: '#e8f4f5',
  },
  {
    id: 'mist',
    label: 'Mist',
    page: 'linear-gradient(160deg, #e8f0ee 0%, #d4e4e8 45%, #c5d5c8 100%)',
    panel: 'rgba(255, 255, 255, 0.82)',
    text: '#1a2e28',
    muted: '#4a635c',
    border: 'rgba(26, 46, 40, 0.16)',
    accent: '#058592',
    accentAlt: '#941751',
    hoverSurface: 'rgba(26, 46, 40, 0.06)',
    activeSurface: 'rgba(5, 133, 146, 0.14)',
  },
  {
    id: 'night',
    label: 'Night',
    page: 'linear-gradient(160deg, #0f172a 0%, #1e293b 50%, #134e4a 100%)',
    panel: 'rgba(30, 41, 59, 0.92)',
    text: '#f1f5f9',
    muted: '#cbd5e1',
    border: 'rgba(148, 163, 184, 0.35)',
    accent: '#5eead4',
    accentAlt: '#f9a8d4',
    isDark: true,
    hoverSurface: 'rgba(255, 255, 255, 0.08)',
    activeSurface: 'rgba(94, 234, 212, 0.18)',
  },
  {
    id: 'sand',
    label: 'Sand',
    page: 'linear-gradient(160deg, #f5efe6 0%, #ebe0d0 40%, #d9c8b0 100%)',
    panel: 'rgba(255, 252, 247, 0.88)',
    text: '#3d2f1f',
    muted: '#7a6548',
    border: 'rgba(61, 47, 31, 0.16)',
    accent: '#b45309',
    accentAlt: '#9f1239',
    hoverSurface: 'rgba(61, 47, 31, 0.06)',
    activeSurface: 'rgba(180, 83, 9, 0.12)',
  },
  {
    id: 'studio',
    label: 'Studio',
    page: 'linear-gradient(145deg, #f0f4f8 0%, #dde7f0 50%, #c8d9e8 100%)',
    panel: 'rgba(255, 255, 255, 0.9)',
    text: '#1e293b',
    muted: '#64748b',
    border: 'rgba(30, 41, 59, 0.14)',
    accent: '#0369a1',
    accentAlt: '#941751',
    hoverSurface: 'rgba(30, 41, 59, 0.05)',
    activeSurface: 'rgba(3, 105, 161, 0.12)',
  },
];

'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import {
  STATS_BACKGROUNDS,
  STATS_COLOR_PALETTES,
  type StatsBackgroundTheme,
  type StatsColorPalette,
} from '@/lib/admin/graphTheme';
import type { StatsUserKind, StatsVersionBucket } from '@/lib/admin/statisticsKinds';

type StatisticsGraphThemeValue = {
  palette: StatsColorPalette;
  background: StatsBackgroundTheme;
  cyclePalette: () => void;
  cycleBackground: () => void;
  kindColor: (kind: StatsUserKind) => string;
  versionColor: (version: StatsVersionBucket) => string;
  seriesColor: (index: number) => string;
  panelStyle: CSSProperties;
  rootStyle: CSSProperties;
};

const StatisticsGraphThemeContext = createContext<StatisticsGraphThemeValue | null>(null);

function buildThemeValue(
  palette: StatsColorPalette,
  background: StatsBackgroundTheme,
  cyclePalette: () => void,
  cycleBackground: () => void,
): StatisticsGraphThemeValue {
  return {
    palette,
    background,
    cyclePalette,
    cycleBackground,
    kindColor: (kind) => palette.kinds[kind],
    versionColor: (version) => palette.versions[version],
    seriesColor: (index) => palette.series[index % palette.series.length],
    panelStyle: {
      background: background.panel,
      borderColor: background.border,
      color: background.text,
    },
    rootStyle: {
      background: background.page,
      color: background.text,
      ['--stats-panel' as string]: background.panel,
      ['--stats-muted' as string]: background.muted,
      ['--stats-border' as string]: background.border,
      ['--stats-accent' as string]: background.accent,
      ['--stats-accent-alt' as string]: background.accentAlt,
      transition: 'background 0.45s ease, color 0.35s ease',
    },
  };
}

export function StatisticsGraphThemeProvider({ children }: { children: ReactNode }) {
  const [paletteIndex, setPaletteIndex] = useState(0);
  const [bgIndex, setBgIndex] = useState(0);

  const cyclePalette = useCallback(() => {
    setPaletteIndex((i) => (i + 1) % STATS_COLOR_PALETTES.length);
  }, []);

  const cycleBackground = useCallback(() => {
    setBgIndex((i) => (i + 1) % STATS_BACKGROUNDS.length);
  }, []);

  const value = useMemo(
    () =>
      buildThemeValue(
        STATS_COLOR_PALETTES[paletteIndex] ?? STATS_COLOR_PALETTES[0],
        STATS_BACKGROUNDS[bgIndex] ?? STATS_BACKGROUNDS[0],
        cyclePalette,
        cycleBackground,
      ),
    [paletteIndex, bgIndex, cyclePalette, cycleBackground],
  );

  return (
    <StatisticsGraphThemeContext.Provider value={value}>
      {children}
    </StatisticsGraphThemeContext.Provider>
  );
}

const FALLBACK = buildThemeValue(
  STATS_COLOR_PALETTES[0],
  STATS_BACKGROUNDS[0],
  () => undefined,
  () => undefined,
);

export function useStatisticsGraphTheme(): StatisticsGraphThemeValue {
  return useContext(StatisticsGraphThemeContext) ?? FALLBACK;
}

import type {
  ClubDevicePriceGridConfig,
  ClubIdentificationCardsSettings,
  ClubIdentificationDeviceSectionConfig,
  ClubThirdPartyDevicePricelist,
} from '@/types/clubIdentificationCards';

const DEFAULT_QUANTITIES = [200, 300, 500, 1000] as const;

function calcGridTotals(grid: ClubDevicePriceGridConfig): number[] {
  return grid.quantities.map((qty, i) => {
    const unit = grid.unitPrices[i] ?? 0;
    return Math.round(qty * unit * 100) / 100;
  });
}

function withRecalculatedTotals(
  grid: ClubDevicePriceGridConfig,
): ClubDevicePriceGridConfig {
  return {
    ...grid,
    totalPrices: calcGridTotals(grid),
  };
}

const DEFAULT_THIRD_PARTY: ClubThirdPartyDevicePricelist[] = [
  {
    deviceKey: 'magnetic',
    deviceLabel: 'Magnetic Badges',
    quantities: [...DEFAULT_QUANTITIES],
    totals: [80, 90, 100, 150],
    enabled: [true, true, true, false],
  },
  {
    deviceKey: 'rfid',
    deviceLabel: 'Rfid Badges',
    quantities: [...DEFAULT_QUANTITIES],
    totals: [120, 130, 140, 180],
    enabled: [true, true, true, true],
  },
  {
    deviceKey: 'rfid_bracelets',
    deviceLabel: 'Rfid Bracelets',
    quantities: [...DEFAULT_QUANTITIES],
    totals: [150, 160, 170, 200],
    enabled: [true, true, false, false],
  },
  {
    deviceKey: 'smartcards',
    deviceLabel: 'Smartcards',
    quantities: [...DEFAULT_QUANTITIES],
    totals: [100, 110, 120, 140],
    enabled: [true, true, true, true],
  },
];

const DEFAULT_DEVICE_SECTIONS: ClubIdentificationDeviceSectionConfig[] = [
  {
    key: 'magnetic',
    label: 'Magnetic Badges',
    headerColor: '#1e4f7a',
    grids: {
      Blank: withRecalculatedTotals({
        quantities: [200, 500, 800, 1000],
        unitPrices: [0.5, 0.3, 0.25, 0.2],
        totalPrices: [],
      }),
      '1 Color': withRecalculatedTotals({
        quantities: [200, 500, 800, 1000],
        unitPrices: [0.7, 0.5, 0.4, 0.35],
        totalPrices: [],
      }),
    },
  },
  {
    key: 'rfid',
    label: 'Rfid Badges',
    headerColor: '#00a0e3',
    grids: {
      Blank: withRecalculatedTotals({
        quantities: [200, 500, 800, 1000],
        unitPrices: [1.2, 1.0, 0.9, 0.8],
        totalPrices: [],
      }),
    },
  },
  {
    key: 'rfid_bracelets',
    label: 'Rfid bracelets',
    headerColor: '#6b8fa3',
    grids: {
      Blank: withRecalculatedTotals({
        quantities: [200, 500, 800, 1000],
        unitPrices: [2, 1.8, 1.5, 1.2],
        totalPrices: [],
      }),
    },
  },
  {
    key: 'smartcards',
    label: 'smartcards',
    headerColor: '#a8d4f0',
    grids: {
      Blank: withRecalculatedTotals({
        quantities: [200, 300, 500, 1000],
        unitPrices: [1.5, 1.2, 1.0, 0.9],
        totalPrices: [],
      }),
    },
  },
];

const DEFAULT_SETTINGS: ClubIdentificationCardsSettings = {
  thirdPartyMessageEnabled: true,
  thirdPartyMessageByLang: {
    en: '',
    it: '<p>Questo messaggio viene mostrato nella pricelist di terze parti durante la registrazione del club.</p>',
  },
  thirdPartyPricelists: structuredClone(DEFAULT_THIRD_PARTY),
  deviceSections: structuredClone(DEFAULT_DEVICE_SECTIONS),
};

let cachedSettings: ClubIdentificationCardsSettings = structuredClone(DEFAULT_SETTINGS);

function recalcDeviceSections(
  sections: ClubIdentificationDeviceSectionConfig[],
): ClubIdentificationDeviceSectionConfig[] {
  return sections.map((section) => ({
    ...section,
    grids: Object.fromEntries(
      Object.entries(section.grids).map(([style, grid]) => [
        style,
        grid ? withRecalculatedTotals(grid) : grid,
      ]),
    ) as ClubIdentificationDeviceSectionConfig['grids'],
  }));
}

export function getClubIdentificationCardsSettings(): ClubIdentificationCardsSettings {
  return structuredClone(cachedSettings);
}

export function saveClubIdentificationCardsSettings(
  settings: ClubIdentificationCardsSettings,
): ClubIdentificationCardsSettings {
  const next = structuredClone(settings);
  next.deviceSections = recalcDeviceSections(next.deviceSections);
  cachedSettings = next;
  return cachedSettings;
}

export function recalcDeviceGrid(
  grid: ClubDevicePriceGridConfig,
): ClubDevicePriceGridConfig {
  return withRecalculatedTotals(grid);
}

export const CLUB_IDENTIFICATION_DEVICE_TAB_LABELS = DEFAULT_THIRD_PARTY.map(
  (p) => p.deviceLabel,
);

export const CLUB_IDENTIFICATION_STYLE_TAB_LABELS = [
  'Blank',
  '1 Color',
  '2 Color',
  '3 Color',
  'Offset',
] as const;

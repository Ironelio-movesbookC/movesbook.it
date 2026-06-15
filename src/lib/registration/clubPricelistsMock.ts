import { getSubscriptionRowsByUserType } from '@/lib/admin/subscriptionSettingsMock';
import { getManagementSettingsData } from '@/lib/admin/managementFunctionSettingsMock';

export type ClubVersionSubscriptionRow = {
  code: string;
  name: string;
  price: number;
};

export type ClubOptionalModuleRow = {
  id: number;
  name: string;
  priceNoLimit: number;
  priceOneYear: number;
};

export type ClubAccountPackRow = {
  versionKey: 'base' | 'premium' | 'pro';
  versionLabel: string;
  headerColor: string;
  packSizes: number[];
  unitPrices: number[];
  totalPrices: number[];
};

export type ClubDevicePriceGrid = {
  quantities: number[];
  unitPrices: number[];
  totalPrices: (number | string)[];
};

export type ClubIdentificationDeviceSection = {
  key: string;
  label: string;
  headerColor: string;
  grids: Record<string, ClubDevicePriceGrid>;
};

export type ClubSharingRow = {
  label: string;
  freeUntil: number | string;
  costEach: number | string;
};

export type ClubOthersVersionData = {
  key: 'base' | 'premium' | 'pro';
  label: string;
  unlimitedLegend: string;
  sharingHeader: string;
  sharingRows: ClubSharingRow[];
  exceededDevice: number | string;
  exceededPrice: number | string;
  daysDuration: number;
};

export function getClubVersionSubscriptionRows(): ClubVersionSubscriptionRow[] {
  return getSubscriptionRowsByUserType('club')
    .filter((row) => row.name)
    .map((row) => ({
      code: row.code,
      name: row.name,
      price: row.price1,
    }));
}

export function getClubOptionalModuleRows(lang: string): ClubOptionalModuleRow[] {
  const optional = getManagementSettingsData(lang).features.filter((f) => f.optionalEnabled);
  if (optional.length > 0) {
    return optional.map((f) => ({
      id: f.id,
      name: f.name,
      priceNoLimit: f.priceNoLimit,
      priceOneYear: f.priceOneYear,
    }));
  }
  return [{ id: 1, name: 'Test', priceNoLimit: 10, priceOneYear: 250 }];
}

export const CLUB_ACCOUNT_PACK_ROWS: ClubAccountPackRow[] = [
  {
    versionKey: 'base',
    versionLabel: 'VersionBase',
    headerColor: '#5cb85c',
    packSizes: [200, 300, 500, 1000],
    unitPrices: [7, 3, 5, 4],
    totalPrices: [1400, 900, 2000, 4000],
  },
  {
    versionKey: 'premium',
    versionLabel: 'VersionPremium',
    headerColor: '#9b59b6',
    packSizes: [200, 300, 500, 1000],
    unitPrices: [8, 4, 6, 5],
    totalPrices: [1600, 1200, 3000, 5000],
  },
  {
    versionKey: 'pro',
    versionLabel: 'VersionPro',
    headerColor: '#c0392b',
    packSizes: [200, 300, 500, 1000],
    unitPrices: [10, 6, 8, 7],
    totalPrices: [2000, 1800, 4000, 7000],
  },
];

export const CLUB_IDENTIFICATION_DEVICE_TABS = [
  'Magnetic Badges',
  'Rfid Badges',
  'Rfid Bracelets',
  'Smartcards',
] as const;

export const CLUB_IDENTIFICATION_STYLE_TABS = ['Blank', '1 Color', '2 Color', '3 Color', 'Offset'] as const;

export const CLUB_IDENTIFICATION_SECTIONS: ClubIdentificationDeviceSection[] = [
  {
    key: 'magnetic',
    label: 'Magnetic Badges',
    headerColor: '#1e4f7a',
    grids: {
      Blank: {
        quantities: [200, 500, 800, 1000],
        unitPrices: [0.5, 0.3, 0.25, 0.2],
        totalPrices: [100, 150, 200, 200],
      },
      '1 Color': {
        quantities: [200, 500, 800, 1000],
        unitPrices: [0.7, 0.5, 0.4, 0.35],
        totalPrices: [140, 250, 320, 350],
      },
    },
  },
  {
    key: 'rfid',
    label: 'Rfid',
    headerColor: '#00a0e3',
    grids: {
      Blank: {
        quantities: [200, 500, 800, 1000],
        unitPrices: [1.2, 1.0, 0.9, 0.8],
        totalPrices: [240, 500, 720, 800],
      },
    },
  },
  {
    key: 'rfid_bracelets',
    label: 'Rfid bracelets',
    headerColor: '#6b8fa3',
    grids: {
      Blank: {
        quantities: [200, 500, 800, 1000],
        unitPrices: [2, 1.8, 1.5, 1.2],
        totalPrices: [400, 900, 1200, 'N'],
      },
    },
  },
  {
    key: 'smartcards',
    label: 'smartcards',
    headerColor: '#a8d4f0',
    grids: {
      Blank: {
        quantities: [200, 300, 500, 1000],
        unitPrices: [1.5, 1.2, 1.0, 0.9],
        totalPrices: [300, 360, 500, 900],
      },
    },
  },
];

export const CLUB_THIRD_PARTY_PRICELIST = {
  title: 'Third party pricelist',
  subtitle: 'Prices to enable cards of another company',
  quantities: [200, 500, 800, 1000],
  totals: [310, 311, 312, 313],
};

export const CLUB_OTHERS_VERSIONS: ClubOthersVersionData[] = [
  {
    key: 'base',
    label: 'Version Base',
    unlimitedLegend: '-2=Unlimited',
    sharingHeader: 'Exceeded the free amounts',
    sharingRows: [
      { label: 'Coaches', freeUntil: 1, costEach: 40 },
      { label: 'Teams', freeUntil: 1, costEach: 10 },
      { label: 'Groups', freeUntil: 10, costEach: 20 },
      { label: 'Other Clubs', freeUntil: 1, costEach: 30 },
    ],
    exceededDevice: 2,
    exceededPrice: 15,
    daysDuration: 90,
  },
  {
    key: 'premium',
    label: 'Version Premium',
    unlimitedLegend: '-1=Unlimited',
    sharingHeader: 'Exceeded the free amounts',
    sharingRows: [
      { label: 'Coaches', freeUntil: 0, costEach: '' },
      { label: 'Teams', freeUntil: 2, costEach: '' },
      { label: 'Groups', freeUntil: -1, costEach: '' },
      { label: 'Other Clubs', freeUntil: 2, costEach: '' },
    ],
    exceededDevice: '',
    exceededPrice: '',
    daysDuration: 123,
  },
  {
    key: 'pro',
    label: 'Version Professional',
    unlimitedLegend: '-1=Unlimited',
    sharingHeader: 'Exceeded the free amounts',
    sharingRows: [
      { label: 'Coaches', freeUntil: 0, costEach: '' },
      { label: 'Teams', freeUntil: 7, costEach: '' },
      { label: 'Groups', freeUntil: 7, costEach: '' },
      { label: 'Other Clubs', freeUntil: 4, costEach: '' },
    ],
    exceededDevice: '',
    exceededPrice: '',
    daysDuration: 300,
  },
];

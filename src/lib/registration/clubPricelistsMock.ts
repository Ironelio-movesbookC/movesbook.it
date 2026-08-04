import { getSubscriptionRowsByUserType } from '@/lib/admin/subscriptionSettingsMock';
import { getManagementSettingsData } from '@/lib/admin/managementFunctionSettingsMock';
import {
  getClubAccountPackDisplayRows,
  type ClubAccountPackDisplayRow,
} from '@/lib/admin/clubAccountPackPricing';
import {
  getClubIdentificationDeviceSectionsDisplay,
  getClubThirdPartyPricelistDisplay,
} from '@/lib/admin/clubIdentificationCardPricing';
import {
  CLUB_IDENTIFICATION_DEVICE_TAB_LABELS,
  CLUB_IDENTIFICATION_STYLE_TAB_LABELS,
} from '@/lib/admin/clubIdentificationCardsMock';
import type { ClubIdentificationDeviceSectionConfig } from '@/types/clubIdentificationCards';

export type ClubVersionSubscriptionRow = {
  id: number;
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

export type ClubAccountPackRow = ClubAccountPackDisplayRow;

export function getClubAccountPackRows(): ClubAccountPackRow[] {
  return getClubAccountPackDisplayRows();
}

/** @deprecated Use getClubAccountPackRows() — reads live super-admin list prices. */
export const CLUB_ACCOUNT_PACK_ROWS: ClubAccountPackRow[] = getClubAccountPackDisplayRows();

export type ClubDevicePriceGrid = {
  quantities: number[];
  unitPrices: number[];
  totalPrices: (number | string)[];
};

export type ClubIdentificationDeviceSection = ClubIdentificationDeviceSectionConfig & {
  grids: Record<string, ClubDevicePriceGrid>;
};

export const CLUB_IDENTIFICATION_DEVICE_TABS = CLUB_IDENTIFICATION_DEVICE_TAB_LABELS;

export const CLUB_IDENTIFICATION_STYLE_TABS = [...CLUB_IDENTIFICATION_STYLE_TAB_LABELS];

export function getClubIdentificationSections(): ClubIdentificationDeviceSection[] {
  return getClubIdentificationDeviceSectionsDisplay() as ClubIdentificationDeviceSection[];
}

/** @deprecated Use getClubIdentificationSections() — reads live super-admin settings. */
export const CLUB_IDENTIFICATION_SECTIONS: ClubIdentificationDeviceSection[] =
  getClubIdentificationSections();

export function getClubThirdPartyPricelist(deviceLabel?: string) {
  const label = deviceLabel ?? CLUB_IDENTIFICATION_DEVICE_TABS[0];
  return getClubThirdPartyPricelistDisplay(label);
}

/** @deprecated Use getClubThirdPartyPricelist() — reads live super-admin settings. */
export const CLUB_THIRD_PARTY_PRICELIST = getClubThirdPartyPricelist();

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
      id: row.id,
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

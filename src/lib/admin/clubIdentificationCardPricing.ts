import type {
  ClubDevicePriceGridConfig,
  ClubIdentificationDeviceSectionConfig,
  ClubThirdPartyDevicePricelist,
} from '@/types/clubIdentificationCards';
import { getClubIdentificationCardsSettings } from '@/lib/admin/clubIdentificationCardsMock';

export type ClubIdentificationCardsDisplay = {
  thirdPartyMessageEnabled: boolean;
  thirdPartyMessageByLang: Record<string, string>;
  thirdPartyPricelists: ClubThirdPartyDevicePricelist[];
  deviceSections: ClubIdentificationDeviceSectionConfig[];
  deviceTabLabels: string[];
  styleTabLabels: readonly string[];
};

export type ClubDevicePriceGridDisplay = ClubDevicePriceGridConfig;

export function getClubIdentificationCardsDisplay(): ClubIdentificationCardsDisplay {
  const settings = getClubIdentificationCardsSettings();
  return {
    thirdPartyMessageEnabled: settings.thirdPartyMessageEnabled,
    thirdPartyMessageByLang: settings.thirdPartyMessageByLang,
    thirdPartyPricelists: settings.thirdPartyPricelists,
    deviceSections: settings.deviceSections,
    deviceTabLabels: settings.thirdPartyPricelists.map((p) => p.deviceLabel),
    styleTabLabels: ['Blank', '1 Color', '2 Color', '3 Color', 'Offset'],
  };
}

/** Legacy shape used by registration mock exports. */
export function getClubThirdPartyPricelistDisplay(deviceLabel: string) {
  const settings = getClubIdentificationCardsSettings();
  const row =
    settings.thirdPartyPricelists.find((p) => p.deviceLabel === deviceLabel) ??
    settings.thirdPartyPricelists[0];
  return {
    title: 'Third party pricelist',
    subtitle: 'Prices to enable cards of another company',
    quantities: row.quantities,
    totals: row.totals,
    enabled: row.enabled,
  };
}

export function getClubIdentificationDeviceSectionsDisplay(): ClubIdentificationDeviceSectionConfig[] {
  return getClubIdentificationCardsSettings().deviceSections;
}

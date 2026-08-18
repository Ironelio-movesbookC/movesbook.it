export type ClubIdentificationDeviceKey =
  | 'magnetic'
  | 'rfid'
  | 'rfid_bracelets'
  | 'smartcards';

export type ClubIdentificationPrintStyle =
  | 'Blank'
  | '1 Color'
  | '2 Color'
  | '3 Color'
  | 'Offset';

export type ClubDevicePriceGridConfig = {
  quantities: number[];
  unitPrices: number[];
  totalPrices: number[];
};

export type ClubThirdPartyDevicePricelist = {
  deviceKey: ClubIdentificationDeviceKey;
  deviceLabel: string;
  quantities: number[];
  totals: number[];
  enabled: boolean[];
};

export type ClubIdentificationDeviceSectionConfig = {
  key: ClubIdentificationDeviceKey;
  label: string;
  headerColor: string;
  grids: Partial<Record<ClubIdentificationPrintStyle, ClubDevicePriceGridConfig>>;
};

export type ClubIdentificationCardsSettings = {
  thirdPartyMessageEnabled: boolean;
  thirdPartyMessageByLang: Record<string, string>;
  thirdPartyPricelists: ClubThirdPartyDevicePricelist[];
  deviceSections: ClubIdentificationDeviceSectionConfig[];
};

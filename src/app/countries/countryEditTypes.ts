export type CountryRegionItem = {
  id: string;
  name: string;
};

export type CountryPartnerRecord = {
  id: string;
  name: string;
  operative: boolean;
  description: string;
  extraRows: string[];
  fileName?: string;
};

export type CountryExtendedSettings = {
  regions: CountryRegionItem[];
  distributors: CountryPartnerRecord[];
  dealers: CountryPartnerRecord[];
  annualIncome: string;
  incomeCurrency: string;
  ratioWithUs: string;
  percentageOr: number;
  virtualCost: string;
  currencyDescription: string;
  exchangeEurPerUnit: string;
  exchange1Eur: string;
  exchangeUsdPerUnit: string;
  exchange1Usd: string;
  countryPictureName: string;
};

export type CountryEditSavePayload = {
  settingCompleted: boolean;
  iso2: string;
  population: number;
  continent: string;
  officialLanguage: string;
  primaryLanguage: string;
  secondaryLanguage: string;
  currencyCode: string;
  eurRate: number;
  usdRate: number;
  regions: number;
  extended: CountryExtendedSettings;
};

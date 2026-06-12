export type FunctionSettingsTab = 'social' | 'training' | 'management';

export type FunctionSettingVersion = {
  key: string;
  label: string;
};

export type FunctionSettingCategory = {
  key: string;
  label: string;
  versions: FunctionSettingVersion[];
};

export type FunctionListItem = {
  id: number;
  name: string;
};

export type FunctionAvailabilityMap = Record<string, boolean>;

export type FunctionSettingsData = {
  functionId: number;
  tab: FunctionSettingsTab;
  availability: FunctionAvailabilityMap;
};

export type ManagementFeatureRow = {
  id: number;
  name: string;
  basic: boolean;
  premium: boolean;
  pro: boolean;
  optionalEnabled: boolean;
  priceOneYear: number;
  priceNoLimit: number;
};

export type ManagementSettingsData = {
  lang: string;
  features: ManagementFeatureRow[];
};

export type ManagementFeatureEditData = {
  id: number;
  lang: string;
  functionName: string;
  linkedPackageFeature: string;
  description: string;
  status: 'publish' | 'unpublish';
  clubVersions: {
    basic: boolean;
    premium: boolean;
    pro: boolean;
  };
  optionalSubscription: boolean;
  priceOneYear: number;
  priceNoLimit: number;
};

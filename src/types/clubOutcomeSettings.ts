export type OutcomeSettingsTab = 'primary' | 'custom';

export type OutcomeSettingItem = {
  typeId: string;
  settingId: string | null;
  description: string;
  code: string;
  defaultCode: string;
  message: string;
  audioFile: string | null;
  audioUrl: string | null;
};

export type OutcomeSettingsResponse = {
  tab: OutcomeSettingsTab;
  editable: boolean;
  primaryLanguageId: number;
  defaultOutcomeLanguage: 'custom' | 'default';
  outcomeMode?: 'EN' | 'COUNTRY_STANDARD' | 'CUSTOM';
  introParagraph: string;
  items: OutcomeSettingItem[];
};

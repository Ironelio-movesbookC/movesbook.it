export type AccessAudioLanguage = {
  id: number;
  name: string;
};

export type AccessAudioSettingItem = {
  typeId: string;
  settingId: string | null;
  descriptionId: string | null;
  letter: string;
  description: string;
  code: string;
  defaultCode: string;
  message: string;
  audioFile: string | null;
  audioUrl: string | null;
};

export type AccessAudioSettingsResponse = {
  lang: number;
  isDefaultLang: boolean;
  languages: AccessAudioLanguage[];
  introParagraph: string;
  items: AccessAudioSettingItem[];
};

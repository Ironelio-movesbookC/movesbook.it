import { ClubOutcomeMode } from '@prisma/client';

export type OutcomeLanguageDto = {
  id: string;
  legacyLangId: number | null;
  code: string;
  name: string;
};

export type AdminOutcomeItemDto = {
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

export type ClubOutcomeItemDto = {
  typeId: string;
  settingId: string | null;
  description: string;
  code: string;
  defaultCode: string;
  message: string;
  audioFile: string | null;
  audioUrl: string | null;
};

export type ResolvedOutcomeMessage = {
  outcomeTypeId: string;
  code: string;
  message: string;
  audioFile: string | null;
  audioUrl: string | null;
  languageId: string | null;
  legacyLanguageId: number | null;
  mode: ClubOutcomeMode;
  source: 'system' | 'custom';
};

export type ClubOutcomePreferences = {
  clubId: string;
  mode: ClubOutcomeMode;
};
